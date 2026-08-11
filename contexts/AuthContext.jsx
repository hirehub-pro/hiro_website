import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  reauthenticateWithCredential,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { getUserProfile } from '../lib/firestore';

const AuthContext = createContext(null);

function clearRecaptchaVerifier() {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (error) {
      // Ignore teardown errors from stale widgets.
    }
  }

  window.recaptchaVerifier = null;
  window.recaptchaContainerId = null;
}

function detectPlatform() {
  if (typeof navigator === 'undefined') {
    return 'web';
  }

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  return 'web';
}

function getFirebaseAuthMessage(error) {
  switch (error?.code) {
    case 'auth/argument-error':
    case 'auth/invalid-phone-number':
      return 'Enter a valid phone number, including the country code if needed.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-app-credential':
      return 'Phone verification could not start. Refresh the page and try again.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.';
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return 'This email is already used by another account.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a little before trying again.';
    case 'auth/invalid-verification-code':
      return 'The verification code is incorrect.';
    case 'auth/code-expired':
      return 'The verification code expired. Please request a new code.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

function maskEmail(email) {
  const normalizedEmail = String(email || '').trim();
  const [localPart, domain] = normalizedEmail.split('@');

  if (!localPart || !domain) {
    return normalizedEmail;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || ''}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
  }

  return `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart[localPart.length - 1]}@${domain}`;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);
  const [invoiceBuilderVerifiedUid, setInvoiceBuilderVerifiedUid] = useState('');

  async function syncAuthEmailToUserProfile(firebaseUser, userProfile) {
    const authEmail = String(firebaseUser?.email || '').trim();
    if (!firebaseUser?.uid || !authEmail) {
      return userProfile;
    }

    const profileEmail = String(userProfile?.email || '').trim();
    const authEmailVerified = firebaseUser.emailVerified === true;
    if (profileEmail === authEmail && userProfile?.emailVerified === authEmailVerified) {
      return userProfile;
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      email: authEmail,
      emailVerified: authEmailVerified,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return {
      ...(userProfile || {}),
      uid: firebaseUser.uid,
      email: authEmail,
      emailVerified: authEmailVerified,
    };
  }

  // Subscribe to Firebase auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await firebaseUser.reload();
        } catch (error) {
          // The cached user is still usable if refresh fails temporarily.
        }

        const refreshedUser = auth.currentUser || firebaseUser;
        setUser(refreshedUser);

        const userProfile = await getUserProfile(refreshedUser.uid);
        const syncedProfile = await syncAuthEmailToUserProfile(refreshedUser, userProfile);
        setProfile(syncedProfile);
      } else {
        setUser(null);
        setProfile(null);
        setInvoiceBuilderVerifiedUid('');
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Email / Password sign-in
  async function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function verifyPhonePassword(phoneNumber, password) {
    const userDoc = await getUserDocByPhone(phoneNumber);
    const email = String(userDoc?.data()?.email || '').trim();

    if (!userDoc || !email) {
      throw new Error('No password sign-in account was found for this phone number.');
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await signOut(auth);
      return true;
    } catch (error) {
      try {
        await signOut(auth);
      } catch (signOutError) {
        // Keep the original auth error below.
      }

      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        throw new Error('The phone number or password is incorrect.');
      }

      throw new Error(getFirebaseAuthMessage(error));
    }
  }

  async function verifyInvoiceBuilderIdentity(phoneNumber, password) {
    const firebaseUser = auth.currentUser;
    const submittedPhone = String(phoneNumber || '').trim();
    const storedPhone = String(profile?.phone || firebaseUser?.phoneNumber || '').trim();
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const accountPhone = normalizePhoneNumber(storedPhone);
    const email = String(firebaseUser?.email || profile?.email || '').trim();

    if (!firebaseUser || !email || !submittedPhone || !storedPhone || normalizedPhone !== accountPhone) {
      throw new Error('The phone number or password is incorrect.');
    }

    try {
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      setInvoiceBuilderVerifiedUid(firebaseUser.uid);
      return true;
    } catch (error) {
      if (
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/user-not-found'
      ) {
        throw new Error('The phone number or password is incorrect.');
      }

      throw new Error(getFirebaseAuthMessage(error));
    }
  }

  async function getPasswordResetEmailHint(phoneNumber) {
    const userDoc = await getUserDocByPhone(phoneNumber);
    const email = String(userDoc?.data()?.email || '').trim();

    if (!userDoc || !email) {
      throw new Error('No password sign-in account was found for this phone number.');
    }

    return maskEmail(email);
  }

  async function sendPasswordResetForPhone(phoneNumber, emailInput) {
    const userDoc = await getUserDocByPhone(phoneNumber);
    const email = String(userDoc?.data()?.email || '').trim();
    const submittedEmail = String(emailInput || '').trim().toLowerCase();

    if (!userDoc || !email) {
      throw new Error('No password sign-in account was found for this phone number.');
    }

    if (!submittedEmail || submittedEmail !== email.toLowerCase()) {
      throw new Error('The phone number and email do not match.');
    }

    try {
      await sendPasswordResetEmail(auth, email);
      return email;
    } catch (error) {
      throw new Error(getFirebaseAuthMessage(error));
    }
  }

  function normalizePhoneNumber(phoneNumber) {
    const rawValue = String(phoneNumber || '').trim();

    if (rawValue.startsWith('+')) {
      return `+${rawValue.slice(1).replace(/\D/g, '')}`;
    }

    const digits = rawValue.replace(/\D/g, '');

    if (digits.startsWith('00')) {
      return `+${digits.slice(2)}`;
    }

    if (digits.startsWith('0')) {
      return `+972${digits.slice(1)}`;
    }

    return `+${digits}`;
  }

  async function isPhoneInUse(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', normalizedPhone), limit(1));
    const snap = await getDocs(q);
    return snap.size > 0;
  }

  async function getUserDocByPhone(phoneNumber) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phone', '==', normalizedPhone), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    return snap.docs[0];
  }

  async function checkPhoneAvailability(phoneNumber) {
    if (!String(phoneNumber || '').trim()) {
      return false;
    }

    const exists = await isPhoneInUse(phoneNumber);
    return !exists;
  }

  function getRecaptchaVerifier(containerId = 'recaptcha-container') {
    if (typeof window === 'undefined') {
      throw new Error('Phone sign-in is only available in the browser.');
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error('The verification widget is not ready yet. Please try again.');
    }

    const shouldRecreateVerifier =
      !window.recaptchaVerifier ||
      window.recaptchaContainerId !== containerId;

    if (shouldRecreateVerifier) {
      clearRecaptchaVerifier();
      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {},
      });
      window.recaptchaContainerId = containerId;
    }

    return window.recaptchaVerifier;
  }

  async function sendPhoneVerification(phoneNumber, containerId = 'recaptcha-container') {
    const formattedPhoneNumber = normalizePhoneNumber(phoneNumber);
    if (formattedPhoneNumber.length < 8) {
      throw new Error('Enter a valid phone number.');
    }

    try {
      const verifier = getRecaptchaVerifier(containerId);
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, verifier);

      setPhoneConfirmation(confirmationResult);

      return {
        confirmationResult,
        formattedPhoneNumber,
      };
    } catch (error) {
      clearRecaptchaVerifier();
      throw new Error(getFirebaseAuthMessage(error));
    }
  }

  async function confirmPhoneVerification(code) {
    if (!phoneConfirmation) {
      throw new Error('Please request a verification code first.');
    }

    try {
      const credential = await phoneConfirmation.confirm(code);
      setPhoneConfirmation(null);
      return credential;
    } catch (error) {
      throw new Error(getFirebaseAuthMessage(error));
    }
  }

  const resetPhoneVerification = useCallback(() => {
    setPhoneConfirmation(null);
    clearRecaptchaVerifier();
  }, []);

  // Email / Password sign-up
  async function signUpWithEmail(email, password, {
    name,
    role,
    professions = [],
    city = '',
    phoneNumber = '',
    lat = null,
    lng = null,
  }) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const alreadyExists = await isPhoneInUse(normalizedPhone);
    if (alreadyExists) {
      throw new Error('This phone number is already registered.');
    }

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    const profileData = {
      uid: cred.user.uid,
      name,
      role,
      email,
      professions: role === 'worker' ? professions : [],
      town: city,
      avgRating: 0,
      reviewCount: 0,
      profileViews: 0,
      businessVerificationStatus: 'pending',
      profileImageUrl: '',
      description: '',
      phone: normalizedPhone,
      optionalPhone: '',
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      platform: detectPlatform(),
      fcmToken: '',
      lastTokenUpdate: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    setProfile({ uid: cred.user.uid, ...profileData });
    return cred;
  }

  async function completePhoneSignUp({
    name,
    email = '',
    password = '',
    role,
    city,
    lat = null,
    lng = null,
    phoneNumber,
    professions = [],
    workRadius = 0,
    optionalPhone = '',
    description = '',
    subscription = null,
  }) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error('Please verify your phone number first.');
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber || firebaseUser.phoneNumber || '');
    const existingByPhone = await getUserDocByPhone(normalizedPhone);
    if (existingByPhone && existingByPhone.id !== firebaseUser.uid) {
      throw new Error('This phone number is already registered.');
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    const existingUserSnap = await getDoc(userRef);
    const normalizedEmail = String(email || '').trim();

    if (normalizedEmail && password) {
      const hasPasswordProvider = firebaseUser.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      if (!hasPasswordProvider) {
        try {
          const emailCredential = EmailAuthProvider.credential(normalizedEmail, password);
          await linkWithCredential(firebaseUser, emailCredential);
        } catch (error) {
          throw new Error(getFirebaseAuthMessage(error));
        }
      }
    }

    await updateProfile(firebaseUser, { displayName: name || firebaseUser.displayName || '' });

    const baseProfileData = {
      uid: firebaseUser.uid,
      name: name || firebaseUser.displayName || '',
      role,
      email: normalizedEmail,
      town: city || '',
      phone: normalizedPhone,
      optionalPhone: optionalPhone ? normalizePhoneNumber(optionalPhone) : '',
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      profileImageUrl: '',
      description: description || '',
      platform: detectPlatform(),
      fcmToken: '',
      lastTokenUpdate: serverTimestamp(),
      createdAt: existingUserSnap.exists() ? (existingUserSnap.data().createdAt || serverTimestamp()) : serverTimestamp(),
      profileViews: 0,
      businessVerificationStatus: 'pending',
    };

    const workerData = role === 'worker'
      ? {
          professions: Array.isArray(professions) ? professions : [],
          isSubscribed: Boolean(subscription?.isSubscribed),
          subscriptionStatus: subscription?.status || (subscription?.isSubscribed ? 'active' : 'inactive'),
          subscriptionPlan: subscription?.plan || '',
          subscriptionAmount: Number(subscription?.amount) || 0,
          subscriptionCurrency: subscription?.currency || 'ILS',
          subscriptionStartedAt: subscription?.isSubscribed ? serverTimestamp() : null,
          workRadius: Number(workRadius) || 0,
          avgRating: 0,
          reviewCount: 0,
        }
      : {
          professions: [],
          avgRating: 0,
          reviewCount: 0,
        };

    const profileData = {
      ...baseProfileData,
      ...workerData,
    };

    await setDoc(userRef, profileData, { merge: true });
    const latestProfile = await getUserProfile(firebaseUser.uid);
    setProfile(latestProfile || { uid: firebaseUser.uid, ...profileData });

    return firebaseUser;
  }

  // Anonymous guest sign-in (creates a lightweight guest profile if first time)
  async function signInAsGuest() {
    let cred;
    try {
      cred = await signInAnonymously(auth);
    } catch (error) {
      throw new Error(getFirebaseAuthMessage(error));
    }

    const snap = await getDoc(doc(db, 'users', cred.user.uid));

    if (!snap.exists()) {
      const profileData = {
        uid: cred.user.uid,
        name: 'Guest',
        role: 'guest',
        email: '',
        professions: [],
        town: '',
        avgRating: 0,
        reviewCount: 0,
        profileViews: 0,
        businessVerificationStatus: 'pending',
        profileImageUrl: '',
        description: '',
        phone: '',
        optionalPhone: '',
        lat: null,
        lng: null,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', cred.user.uid), profileData);
      setProfile({ uid: cred.user.uid, ...profileData });
    } else {
      const userProfile = await getUserProfile(cred.user.uid);
      setProfile(userProfile);
    }

    return cred;
  }

  async function logOut() {
    setInvoiceBuilderVerifiedUid('');
    await signOut(auth);
    setProfile(null);
  }

  const isAdmin = profile?.role === 'admin';
  const isWorker = profile?.role === 'worker';
  const isCustomer = profile?.role === 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isWorker,
        isCustomer,
        signInWithEmail,
        verifyPhonePassword,
        verifyInvoiceBuilderIdentity,
        invoiceBuilderIdentityVerified: Boolean(user?.uid && invoiceBuilderVerifiedUid === user.uid),
        getPasswordResetEmailHint,
        sendPasswordResetForPhone,
        signUpWithEmail,
        checkPhoneAvailability,
        completePhoneSignUp,
        signInAsGuest,
        sendPhoneVerification,
        confirmPhoneVerification,
        resetPhoneVerification,
        logOut,
        setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
