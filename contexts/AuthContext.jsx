import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPhoneNumber,
  RecaptchaVerifier,
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

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phoneConfirmation, setPhoneConfirmation] = useState(null);

  // Subscribe to Firebase auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Email / Password sign-in
  async function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
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
  async function signUpWithEmail(email, password, { name, role, professions = [], city = '', phoneNumber = '' }) {
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
      lat: null,
      lng: null,
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
    role,
    city,
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

    await updateProfile(firebaseUser, { displayName: name || firebaseUser.displayName || '' });

    const baseProfileData = {
      uid: firebaseUser.uid,
      name: name || firebaseUser.displayName || '',
      role,
      email: email || '',
      town: city || '',
      phone: normalizedPhone,
      optionalPhone: optionalPhone ? normalizePhoneNumber(optionalPhone) : '',
      lat: null,
      lng: null,
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
