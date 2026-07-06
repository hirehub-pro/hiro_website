import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { HiPhotograph, HiPlus, HiStar } from 'react-icons/hi';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import { FiGlobe, FiLink as FiLinkIcon, FiMapPin } from 'react-icons/fi';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import {
  resolveUserProfile,
  getWorkerProjects,
  getWorkerReviews,
  addProject,
  addReview,
  updateUserProfile,
} from '../../lib/firestore';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProjectsGallery from '../../components/profile/ProjectsGallery';
import ReviewsList from '../../components/profile/ReviewsList';
import ProfileScheduleView from '../../components/profile/ProfileScheduleView';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getProfilePageSeo } from '../../lib/page-seo';
import { absoluteUrl } from '../../lib/seo-locale';
import { buildProfilePath, buildProfileSlug } from '../../lib/profile-routing';
import { slugifyProfession } from '../../lib/search-routing';
import { createTaxAuthorityAuthorizationUrl, getTaxAuthorityConnectionStatus } from '../../lib/taxAuthority';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const CityMapPickerModal = dynamic(() => import('../../components/auth/CityMapPickerModal'), {
  ssr: false,
});

const SOCIAL_ICON_MAP = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  website: FiGlobe,
  other: FiLinkIcon,
};

const SOCIAL_STYLE_MAP = {
  facebook: 'bg-blue-50 text-blue-600 ring-blue-100 hover:bg-blue-100',
  instagram: 'bg-pink-50 text-pink-600 ring-pink-100 hover:bg-pink-100',
  tiktok: 'bg-slate-100 text-slate-900 ring-slate-200 hover:bg-slate-200',
  website: 'bg-emerald-50 text-emerald-600 ring-emerald-100 hover:bg-emerald-100',
  other: 'bg-violet-50 text-violet-600 ring-violet-100 hover:bg-violet-100',
};

function normalizeExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function getNormalizedSocialLinks(profile) {
  return (Array.isArray(profile?.socialLinks) ? profile.socialLinks : [])
    .map((item) => ({
      type: String(item?.type || 'other').trim().toLowerCase(),
      name: String(item?.name || '').trim(),
      url: normalizeExternalUrl(item?.url),
    }))
    .filter((item) => item.url);
}

function createEmptySocialLink() {
  return {
    type: 'website',
    name: '',
    url: '',
  };
}

function getHebrewProfessionLabels(professions, professionItems) {
  const items = Array.isArray(professionItems) ? professionItems : [];
  const labelBySlug = items.reduce((acc, item) => {
    const label = String(item?.he || item?.en || item?.logo || '').trim();
    if (!label) return acc;

    [item?.value, item?.en, item?.he, item?.ar, item?.logo]
      .map(slugifyProfession)
      .filter(Boolean)
      .forEach((slug) => {
        acc[slug] = label;
      });

    return acc;
  }, {});

  return (Array.isArray(professions) ? professions : [])
    .map((profession) => {
      const raw = String(profession || '').trim();
      if (!raw) return '';
      return labelBySlug[slugifyProfession(raw)] || raw;
    })
    .filter(Boolean)
    .slice(0, 3);
}

function createContactDraft(profile) {
  return {
    phone: String(profile?.phone || '').trim(),
    optionalPhone: String(profile?.optionalPhone || profile?.secondaryPhone || '').trim(),
    email: String(profile?.email || '').trim(),
    town: String(profile?.town || profile?.city || '').trim(),
    lat: Number.isFinite(profile?.lat) ? Number(profile.lat) : null,
    lng: Number.isFinite(profile?.lng) ? Number(profile.lng) : null,
  };
}

function buildProfileAvatarUrl(profile) {
  return profile?.profileImageUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || 'U')}&background=1976D2&color=fff&size=400`;
}

function serializeFirestoreValue(value) {
  if (!value) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)])
    );
  }
  return value;
}

function normalizeDateKey(input) {
  if (!input || typeof input !== 'string') return null;
  const parts = input.split('-').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  return `${year}-${month}-${day}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parseDateKey(key) {
  const normalized = normalizeDateKey(key);
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map((p) => Number.parseInt(p, 10));
  return new Date(year, month - 1, day);
}

function sortDateKeys(keys) {
  return [...keys].sort((a, b) => parseDateKey(a) - parseDateKey(b));
}

function addVacationDay(vacations, dayKey) {
  const normalizedDay = normalizeDateKey(dayKey);
  if (!normalizedDay) return vacations || [];

  const target = parseDateKey(normalizedDay);
  const ranges = (vacations || [])
    .map((vacation) => {
      const start = parseDateKey(vacation?.start);
      const end = parseDateKey(vacation?.end);
      if (!start || !end) return null;
      return { start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);

  let nextStart = target;
  let nextEnd = target;
  const nextRanges = [];

  ranges.forEach((range) => {
    const previousDay = new Date(nextStart);
    previousDay.setDate(previousDay.getDate() - 1);

    const nextDay = new Date(nextEnd);
    nextDay.setDate(nextDay.getDate() + 1);

    if (range.end < previousDay || range.start > nextDay) {
      nextRanges.push(range);
      return;
    }

    if (range.start < nextStart) nextStart = range.start;
    if (range.end > nextEnd) nextEnd = range.end;
  });

  nextRanges.push({ start: nextStart, end: nextEnd });

  return nextRanges
    .sort((a, b) => a.start - b.start)
    .map((range) => ({
      start: formatDateKey(range.start),
      end: formatDateKey(range.end),
    }));
}

function removeVacationDay(vacations, dayKey) {
  const normalizedDay = normalizeDateKey(dayKey);
  if (!normalizedDay) return vacations || [];

  const target = parseDateKey(normalizedDay);

  return (vacations || []).flatMap((vacation) => {
    const start = parseDateKey(vacation?.start);
    const end = parseDateKey(vacation?.end);
    if (!start || !end) return [];

    if (target < start || target > end) {
      return [{ start: formatDateKey(start), end: formatDateKey(end) }];
    }

    if (formatDateKey(start) === normalizedDay && formatDateKey(end) === normalizedDay) {
      return [];
    }

    if (formatDateKey(start) === normalizedDay) {
      const newStart = new Date(start);
      newStart.setDate(newStart.getDate() + 1);
      return [{ start: formatDateKey(newStart), end: formatDateKey(end) }];
    }

    if (formatDateKey(end) === normalizedDay) {
      const newEnd = new Date(end);
      newEnd.setDate(newEnd.getDate() - 1);
      return [{ start: formatDateKey(start), end: formatDateKey(newEnd) }];
    }

    const leftEnd = new Date(target);
    leftEnd.setDate(leftEnd.getDate() - 1);
    const rightStart = new Date(target);
    rightStart.setDate(rightStart.getDate() + 1);

    return [
      { start: formatDateKey(start), end: formatDateKey(leftEnd) },
      { start: formatDateKey(rightStart), end: formatDateKey(end) },
    ];
  });
}

export default function ProfilePage({
  initialProfile = null,
  initialProjects = [],
  initialReviews = [],
  initialProfileRoute = '',
}) {
  const router            = useRouter();
  const profileRoute      = typeof router.query.uid === 'string' ? router.query.uid : '';
  const { user, profile: myProfile } = useAuth();
  const { t, locale }     = useLanguage();

  const [profile, setProfile]     = useState(initialProfile);
  const [projects, setProjects]   = useState(initialProjects);
  const [reviews, setReviews]     = useState(initialReviews);
  const [tab, setTab]             = useState('projects');
  const [loadingProfile, setLoadingProfile] = useState(!initialProfile);
  const [loadingData, setLoadingData]       = useState(false);
  const [loadedProfileRoute, setLoadedProfileRoute] = useState(initialProfileRoute);
  const [loadedDataUid, setLoadedDataUid] = useState(initialProfile?.uid || '');
  const [workerSchedule, setWorkerSchedule] = useState(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(formatDateKey(new Date()));
  const [noteText, setNoteText] = useState('');

  // Review form state
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialEditorOpen, setSocialEditorOpen] = useState(false);
  const [editingSocialLinks, setEditingSocialLinks] = useState([]);
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);
  const [avatarActionSheetOpen, setAvatarActionSheetOpen] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [contactEditorOpen, setContactEditorOpen] = useState(false);
  const [contactCityPickerOpen, setContactCityPickerOpen] = useState(false);
  const [savingContactInfo, setSavingContactInfo] = useState(false);
  const [contactDraft, setContactDraft] = useState(createContactDraft(null));
  const [bioEditorOpen, setBioEditorOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [professionEditorOpen, setProfessionEditorOpen] = useState(false);
  const [professionOptions, setProfessionOptions] = useState([]);
  const [professionsLoading, setProfessionsLoading] = useState(true);
  const [editingProfessions, setEditingProfessions] = useState([]);
  const [professionSearch, setProfessionSearch] = useState('');
  const [savingProfessions, setSavingProfessions] = useState(false);
  const [taxAuthorityConnecting, setTaxAuthorityConnecting] = useState(false);
  const [taxAuthorityConnected, setTaxAuthorityConnected] = useState(null);
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [projectMediaFiles, setProjectMediaFiles] = useState([]);
  const [projectMediaPreviews, setProjectMediaPreviews] = useState([]);
  const [savingProject, setSavingProject] = useState(false);
  const avatarInputRef = useRef(null);
  const projectImageInputRef = useRef(null);
  const socialLinks = getNormalizedSocialLinks(profile);
  const uid = profile?.uid || '';
  const isOwnProfile = user?.uid === profile?.uid;
  const canonicalUrl = profile ? absoluteUrl(buildProfilePath(profile)) : absoluteUrl('/search');

  useEffect(() => {
    if (!profileRoute) return;
    if (loadedProfileRoute === profileRoute) {
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);
    resolveUserProfile(profileRoute)
      .then((nextProfile) => {
        setProfile(nextProfile);
        setLoadedProfileRoute(profileRoute);
        setLoadedDataUid('');
      })
      .catch(console.error)
      .finally(() => setLoadingProfile(false));
  }, [profileRoute, loadedProfileRoute]);

  useEffect(() => {
    if (!isOwnProfile || profile?.role !== 'worker') {
      setTaxAuthorityConnected(null);
      return undefined;
    }

    let active = true;

    async function loadTaxAuthorityStatus() {
      try {
        const status = await getTaxAuthorityConnectionStatus();
        if (active) {
          setTaxAuthorityConnected(Boolean(status?.connected));
        }
      } catch (error) {
        if (active) {
          setTaxAuthorityConnected(false);
        }
      }
    }

    loadTaxAuthorityStatus();

    return () => {
      active = false;
    };
  }, [isOwnProfile, profile?.role]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfessions() {
      setProfessionsLoading(true);
      try {
        const professionsSnap = await getDoc(doc(db, 'metadata', 'professions'));
        if (!isMounted) return;

        const items = (professionsSnap.data()?.items || [])
          .map((item, index) => {
            const label = item[locale] || item.en || item.he || item.ar || item.logo || `Profession ${index + 1}`;
            const value = item.en || item.logo || label;

            return {
              id: String(item.id ?? index),
              label,
              he: item.he || item.en || item.logo || label,
              en: item.en || item.logo || label,
              ar: item.ar || '',
              logo: item.logo || '',
              value,
            };
          })
          .sort((a, b) => Number(a.id) - Number(b.id));

        setProfessionOptions(items);
      } catch (error) {
        if (isMounted) {
          toast.error('Failed to load professions');
          setProfessionOptions([]);
        }
      } finally {
        if (isMounted) {
          setProfessionsLoading(false);
        }
      }
    }

    loadProfessions();

    return () => {
      isMounted = false;
    };
  }, [locale]);

  useEffect(() => {
    if (!uid) return;
    if (loadedDataUid === uid) return;
    setLoadingData(true);
    Promise.all([getWorkerProjects(uid), getWorkerReviews(uid)])
      .then(([p, r]) => {
        setProjects(p);
        setReviews(r);
        setLoadedDataUid(uid);
        setProfile((current) => current ? ({
          ...current,
          projectCount: p.length,
          reviewCount: current.reviewCount ?? r.length,
        }) : current);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [uid, loadedDataUid]);

  useEffect(() => {
    const loadSchedule = async () => {
      if (!uid || profile?.role !== 'worker') {
        setWorkerSchedule(null);
        return;
      }

      try {
        setLoadingSchedule(true);
        const scheduleRef = doc(db, 'users', uid, 'Schedule', 'info');
        const scheduleSnap = await getDoc(scheduleRef);
        setWorkerSchedule(scheduleSnap.exists() ? scheduleSnap.data() : null);
      } catch (error) {
        console.error('Failed to load schedule:', error);
        setWorkerSchedule(null);
      } finally {
        setLoadingSchedule(false);
      }
    };

    loadSchedule();
  }, [uid, profile?.role]);

  useEffect(() => {
    setNoteText('');
  }, [selectedDate]);

  useEffect(() => {
    const previews = projectMediaFiles.map((file) => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      name: file.name,
    }));
    setProjectMediaPreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [projectMediaFiles]);

  useEffect(() => {
    if (!socialEditorOpen) return;

    setEditingSocialLinks(
      (Array.isArray(profile?.socialLinks) ? profile.socialLinks : []).map((item) => ({
        type: String(item?.type || 'website').trim().toLowerCase() || 'website',
        name: String(item?.name || '').trim(),
        url: String(item?.url || '').trim(),
      }))
    );
  }, [profile?.socialLinks, socialEditorOpen]);

  const professionLabelMap = useMemo(() => (
    professionOptions.reduce((acc, item) => {
      acc[item.value] = item.label;
      return acc;
    }, {})
  ), [professionOptions]);

  const displayProfessions = useMemo(() => (
    (Array.isArray(profile?.professions) ? profile.professions : []).map((value) => (
      professionLabelMap[value] || value
    ))
  ), [profile?.professions, professionLabelMap]);
  const seoProfessionLabels = professionOptions.length > 0
    ? getHebrewProfessionLabels(profile?.professions, professionOptions)
    : profile?.professionLabelsHe;
  const seo = getProfilePageSeo(profile, { professionLabels: seoProfessionLabels });

  const filteredProfessionOptions = useMemo(() => {
    const searchValue = professionSearch.trim().toLowerCase();
    if (!searchValue) return professionOptions;

    return professionOptions.filter((item) => (
      item.label.toLowerCase().includes(searchValue) || item.value.toLowerCase().includes(searchValue)
    ));
  }, [professionOptions, professionSearch]);

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!user) return toast.error('Sign in to leave a review');
    setSubmitting(true);
    try {
      await addReview(uid, {
        rating,
        comment,
        userName: myProfile?.name || user.displayName || 'Anonymous',
      });
      toast.success('Review submitted!');
      setComment('');
      setRating(5);
      const updated = await getWorkerReviews(uid);
      setReviews(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenSocialEditor() {
    setEditingSocialLinks(
      (Array.isArray(profile?.socialLinks) ? profile.socialLinks : []).map((item) => ({
        type: String(item?.type || 'website').trim().toLowerCase() || 'website',
        name: String(item?.name || '').trim(),
        url: String(item?.url || '').trim(),
      }))
    );
    setSocialEditorOpen(true);
  }

  function handleOpenContactEditor() {
    setContactDraft(createContactDraft(profile));
    setContactEditorOpen(true);
  }

  function handleOpenBioEditor() {
    setBioDraft(String(profile?.description || ''));
    setBioEditorOpen(true);
  }

  function handleOpenProfessionEditor() {
    setEditingProfessions(Array.isArray(profile?.professions) ? profile.professions : []);
    setProfessionSearch('');
    setProfessionEditorOpen(true);
  }

  function handleContactDraftChange(field, value) {
    setContactDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleContactCityConfirm(location) {
    setContactDraft((current) => ({
      ...current,
      town: location.city,
      lat: location.lat,
      lng: location.lng,
    }));
    setContactCityPickerOpen(false);
  }

  function handleSocialLinkChange(index, field, value) {
    setEditingSocialLinks((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function toggleProfessionSelection(value) {
    setEditingProfessions((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  }

  function handleAddSocialLink() {
    setEditingSocialLinks((current) => [...current, createEmptySocialLink()]);
  }

  function handleDeleteSocialLink(index) {
    setEditingSocialLinks((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSaveSocialLinks() {
    if (!isOwnProfile || !profile?.uid) return;

    const nextSocialLinks = editingSocialLinks
      .map((item) => ({
        type: String(item?.type || 'other').trim().toLowerCase() || 'other',
        name: String(item?.name || '').trim(),
        url: String(item?.url || '').trim(),
      }))
      .filter((item) => item.url);

    if (nextSocialLinks.some((item) => !item.url)) {
      toast.error('Each social link needs a URL');
      return;
    }

    try {
      setSavingSocialLinks(true);
      await updateUserProfile(profile.uid, {
        socialLinks: nextSocialLinks,
      });
      setProfile((current) => current ? ({
        ...current,
        socialLinks: nextSocialLinks,
      }) : current);
      setSocialEditorOpen(false);
      toast.success('Social links updated');
    } catch (error) {
      console.error('Failed to save social links:', error);
      toast.error('Failed to save social links');
    } finally {
      setSavingSocialLinks(false);
    }
  }

  async function handleSaveContactInfo() {
    if (!isOwnProfile || !profile?.uid) return;

    const nextContactInfo = {
      phone: String(contactDraft.phone || '').trim(),
      optionalPhone: String(contactDraft.optionalPhone || '').trim(),
      secondaryPhone: String(contactDraft.optionalPhone || '').trim(),
      email: String(contactDraft.email || '').trim(),
      town: String(contactDraft.town || '').trim(),
      city: String(contactDraft.town || '').trim(),
      lat: Number.isFinite(contactDraft.lat) ? Number(contactDraft.lat) : null,
      lng: Number.isFinite(contactDraft.lng) ? Number(contactDraft.lng) : null,
    };

    try {
      setSavingContactInfo(true);
      await updateUserProfile(profile.uid, nextContactInfo);
      setProfile((current) => current ? ({
        ...current,
        ...nextContactInfo,
      }) : current);
      setContactEditorOpen(false);
      toast.success('Contact information updated');
    } catch (error) {
      console.error('Failed to save contact information:', error);
      toast.error('Failed to save contact information');
    } finally {
      setSavingContactInfo(false);
    }
  }

  async function handleSaveBio() {
    if (!isOwnProfile || !profile?.uid) return;

    const nextDescription = String(bioDraft || '').trim();

    try {
      setSavingBio(true);
      await updateUserProfile(profile.uid, {
        description: nextDescription,
      });
      setProfile((current) => current ? ({
        ...current,
        description: nextDescription,
      }) : current);
      setBioEditorOpen(false);
      toast.success('Biography updated');
    } catch (error) {
      console.error('Failed to save biography:', error);
      toast.error('Failed to save biography');
    } finally {
      setSavingBio(false);
    }
  }

  async function handleSaveProfessions() {
    if (!isOwnProfile || !profile?.uid) return;

    try {
      setSavingProfessions(true);
      await updateUserProfile(profile.uid, {
        professions: editingProfessions,
      });
      setProfile((current) => current ? ({
        ...current,
        professions: editingProfessions,
      }) : current);
      setProfessionEditorOpen(false);
      toast.success('Professions updated');
    } catch (error) {
      console.error('Failed to save professions:', error);
      toast.error('Failed to save professions');
    } finally {
      setSavingProfessions(false);
    }
  }

  function handleAvatarClick() {
    if (isOwnProfile) {
      setAvatarActionSheetOpen(true);
      return;
    }

    setAvatarViewerOpen(true);
  }

  function handleAvatarEditRequest() {
    setAvatarActionSheetOpen(false);
    avatarInputRef.current?.click();
  }

  function resetProjectForm() {
    setProjectDescription('');
    setProjectMediaFiles([]);
  }

  function handleOpenProjectEditor() {
    if (!isOwnProfile || profile?.role !== 'worker') return;
    resetProjectForm();
    setProjectEditorOpen(true);
  }

  function handleCloseProjectEditor() {
    if (savingProject) return;
    setProjectEditorOpen(false);
    resetProjectForm();
  }

  function handleProjectMediaChange(e) {
    const selectedFiles = Array.from(e.target.files || []);
    e.target.value = '';

    if (selectedFiles.length === 0) return;

    const validFiles = selectedFiles.filter((file) => (
      file.type.startsWith('image/') || file.type.startsWith('video/')
    ));

    if (validFiles.length !== selectedFiles.length) {
      toast.error(t.profile.projectMediaTypeError || 'Choose image or video files only');
    }

    if (validFiles.length === 0) return;

    setProjectMediaFiles((current) => {
      const nextFiles = [...current, ...validFiles].slice(0, 5);
      if (current.length + validFiles.length > 5) {
        toast.error(t.profile.projectMediaLimit || 'You can add up to 5 files');
      }
      return nextFiles;
    });
  }

  function handleRemoveProjectMedia(index) {
    if (savingProject) return;
    setProjectMediaFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function getProjectMediaKind(file) {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('image/')) return 'image';
    return 'file';
  }

  function getProjectMediaExtension(file) {
    const fallback = getProjectMediaKind(file) === 'video' ? 'mp4' : 'jpg';
    return (file.name.split('.').pop() || fallback).toLowerCase();
  }

  function getProjectMediaContentType(file) {
    if (file.type) return file.type;
    return getProjectMediaKind(file) === 'video' ? 'video/mp4' : 'image/jpeg';
  }

  async function uploadProjectMedia(file, index) {
    const kind = getProjectMediaKind(file);
    const extension = getProjectMediaExtension(file);
    const path = `project_media/${profile.uid}/project-${Date.now()}-${index}.${extension}`;
    const uploaded = await uploadBytes(storageRef(storage, path), file, {
      contentType: getProjectMediaContentType(file),
    });

    return {
      type: kind,
      url: await getDownloadURL(uploaded.ref),
      storagePath: path,
      contentType: getProjectMediaContentType(file),
      name: file.name,
    };
  }

  function getPrimaryProjectImageUrl(media) {
    const firstImage = media.find((item) => item.type === 'image' && item.url);
    if (firstImage) return firstImage.url;

    const firstItem = media.find((item) => item.url);
    return firstItem?.url || '';
  }

  async function handleSaveProject() {
    if (!isOwnProfile || !profile?.uid || profile?.role !== 'worker') return;

    const description = projectDescription.trim();
    if (projectMediaFiles.length === 0) {
      toast.error(t.profile.projectMediaRequired || 'Choose project photos or videos');
      return;
    }

    if (projectMediaFiles.length > 5) {
      toast.error(t.profile.projectMediaLimit || 'You can add up to 5 files');
      return;
    }

    try {
      setSavingProject(true);
      const media = await Promise.all(projectMediaFiles.map(uploadProjectMedia));
      const imageUrl = getPrimaryProjectImageUrl(media);

      await addProject(profile.uid, { description, imageUrl, media });
      const nextProjects = await getWorkerProjects(profile.uid);
      setProjects(nextProjects);
      setLoadedDataUid(profile.uid);
      setProfile((current) => current ? ({
        ...current,
        projectCount: nextProjects.length,
      }) : current);
      setProjectEditorOpen(false);
      resetProjectForm();
      toast.success(t.profile.projectAdded || 'Project added');
    } catch (error) {
      console.error('Failed to add project:', error);
      toast.error(t.profile.projectAddFailed || 'Failed to add project');
    } finally {
      setSavingProject(false);
    }
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file || !profile?.uid || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    try {
      setUploadingAvatar(true);
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const storagePath = `profile_images/${profile.uid}/avatar-${Date.now()}.${extension}`;
      const uploaded = await uploadBytes(storageRef(storage, storagePath), file, {
        contentType: file.type || 'image/jpeg',
      });
      const nextProfileImageUrl = await getDownloadURL(uploaded.ref);

      await updateUserProfile(profile.uid, {
        profileImageUrl: nextProfileImageUrl,
      });

      setProfile((current) => current ? ({
        ...current,
        profileImageUrl: nextProfileImageUrl,
      }) : current);
      toast.success('Profile photo updated');
      setAvatarViewerOpen(true);
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      toast.error('Failed to update profile photo');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleOpenMessage() {
    if (!profile?.uid) return;

    if (!user) {
      router.push(`/auth/signin?next=${encodeURIComponent(`/profile/${profile.uid}`)}`);
      return;
    }

    if (user.uid === profile.uid) {
      router.push('/messages');
      return;
    }

    const roomId = [user.uid, profile.uid].sort().join('_');
    const roomDraft = {
      users: [user.uid, profile.uid],
      user_names: {
        [user.uid]: myProfile?.name || user.displayName || 'User',
        [profile.uid]: profile.name || 'Worker',
      },
      userNames: {
        [user.uid]: myProfile?.name || user.displayName || 'User',
        [profile.uid]: profile.name || 'Worker',
      },
      unreadCount: {
        [user.uid]: 0,
        [profile.uid]: 0,
      },
      lastMessage: '',
      lastTimestamp: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'chat_rooms', roomId), roomDraft, { merge: true });
      router.push(`/messages?roomId=${encodeURIComponent(roomId)}`);
    } catch (error) {
      console.error('Failed to open chat room:', error);
      toast.error('Could not open chat right now');
    }
  }

  async function handleConnectTaxAuthority() {
    if (!isOwnProfile || taxAuthorityConnecting) return;

    try {
      setTaxAuthorityConnecting(true);
      const { authorizationUrl } = await createTaxAuthorityAuthorizationUrl();
      if (!authorizationUrl) {
        throw new Error('Tax Authority authorization URL was not returned.');
      }
      window.open(authorizationUrl, '_blank', 'noopener,noreferrer');
      toast.success(t.profile.taxAuthorityOpened);
    } catch (error) {
      toast.error(error?.message || 'Could not open Tax Authority authorization.');
    } finally {
      setTaxAuthorityConnecting(false);
    }
  }

  async function updateSelectedDayStatus(status) {
    if (!user || user.uid !== uid || profile?.role !== 'worker') {
      toast.error('Only the worker can update this schedule');
      return;
    }

    const dayKey = normalizeDateKey(selectedDate);
    if (!dayKey) {
      toast.error('Invalid date selected');
      return;
    }

    const baseSchedule = workerSchedule || {};
    const nextAvailableDates = new Set(
      (baseSchedule.availableDates || []).map(normalizeDateKey).filter(Boolean)
    );
    const nextPartialWorkDays = { ...(baseSchedule.partialWorkDays || {}) };
    const nextVacations = removeVacationDay(baseSchedule.vacations || [], dayKey);

    delete nextPartialWorkDays[dayKey];

    if (status === 'workday') {
      nextAvailableDates.add(dayKey);
    }

    if (status === 'vacation') {
      nextAvailableDates.delete(dayKey);
    }

    let finalVacations = nextVacations;
    if (status === 'vacation') {
      finalVacations = addVacationDay(nextVacations, dayKey);
    }

    const nextSchedule = {
      ...baseSchedule,
      availableDates: sortDateKeys(Array.from(nextAvailableDates)),
      partialWorkDays: nextPartialWorkDays,
      vacations: finalVacations,
    };

    try {
      setSavingSchedule(true);
      await setDoc(doc(db, 'users', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
      setWorkerSchedule(nextSchedule);
      toast.success(status === 'vacation' ? 'Day marked as vacation' : 'Day marked as work day');
    } catch (error) {
      console.error('Failed to update schedule day:', error);
      toast.error('Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  }

  async function addNoteToSelectedDay() {
    if (!user || user.uid !== uid || profile?.role !== 'worker') {
      toast.error('Only the worker can update this schedule');
      return;
    }

    const dayKey = normalizeDateKey(selectedDate);
    const trimmedNote = noteText.trim();

    if (!dayKey) {
      toast.error('Invalid date selected');
      return;
    }

    if (!trimmedNote) {
      toast.error('Write a note first');
      return;
    }

    const baseSchedule = workerSchedule || {};
    const nextReminders = {
      ...(baseSchedule.allReminders || {}),
    };

    const existingDayReminders = Array.isArray(nextReminders[dayKey])
      ? nextReminders[dayKey]
      : [];

    nextReminders[dayKey] = [
      ...existingDayReminders,
      {
        id: `${Date.now()}`,
        text: trimmedNote,
        timestamp: new Date().toISOString(),
      },
    ];

    const nextSchedule = {
      ...baseSchedule,
      allReminders: nextReminders,
    };

    try {
      setSavingSchedule(true);
      await setDoc(doc(db, 'users', uid, 'Schedule', 'info'), nextSchedule, { merge: true });
      setWorkerSchedule(nextSchedule);
      setNoteText('');
      toast.success('Note added');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to save note');
    } finally {
      setSavingSchedule(false);
    }
  }

  const tabs = [
    { key: 'projects', label: t.profile.projects },
    { key: 'reviews',  label: t.profile.reviews },
    { key: 'about',    label: t.profile.about },
    ...(profile?.role === 'worker' ? [{ key: 'schedule', label: t.profile.scheduleSection }] : []),
  ];

  const shouldShowWorkerActions = profile?.role === 'worker' && !isOwnProfile;
  const canEditSchedule = user?.uid === uid && profile?.role === 'worker';
  const avatarUrl = buildProfileAvatarUrl(profile);

  const availableDateSet = new Set(
    (workerSchedule?.availableDates || [])
      .map(normalizeDateKey)
      .filter(Boolean)
  );

  const reminderMap = Object.entries(workerSchedule?.allReminders || {}).reduce((acc, [key, value]) => {
    const normalized = normalizeDateKey(key);
    if (normalized) acc[normalized] = Array.isArray(value) ? value : [];
    return acc;
  }, {});

  const partialMap = Object.entries(workerSchedule?.partialWorkDays || {}).reduce((acc, [key, value]) => {
    const normalized = normalizeDateKey(key);
    if (normalized) acc[normalized] = value;
    return acc;
  }, {});

  const vacationRanges = (workerSchedule?.vacations || [])
    .map((vacation) => {
      const start = parseDateKey(vacation?.start);
      const end = parseDateKey(vacation?.end);
      if (!start || !end) return null;
      return {
        start,
        end,
        startKey: formatDateKey(start),
        endKey: formatDateKey(end),
      };
    })
    .filter(Boolean);

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);

  const daysInMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0
  ).getDate();
  const firstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1
  ).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarCells.push(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
  }

  const selectedReminders = reminderMap[selectedDate] || [];
  const selectedPartial = partialMap[selectedDate] || null;
  const selectedVacation = vacationRanges.find((vacation) => {
    const current = parseDateKey(selectedDate);
    if (!current) return false;
    return current >= vacation.start && current <= vacation.end;
  });
  const profileImageUrl = String(profile?.profileImageUrl || '').trim();
  const projectImageUrls = (Array.isArray(projects) ? projects : [])
    .map((project) => String(project?.imageUrl || '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const previewImageUrls = [
    profileImageUrl,
    ...projectImageUrls,
  ].filter(Boolean);
  const profileStructuredData = profile ? {
    '@context': 'https://schema.org',
    '@type': profile.role === 'worker' ? 'LocalBusiness' : 'Person',
    name: profile.name || 'Hiro profile',
    description: seo.description,
    url: canonicalUrl,
    ...(previewImageUrls.length > 0 ? { image: previewImageUrls } : {}),
    ...(profile.role === 'worker' && displayProfessions.length > 0
      ? { knowsAbout: displayProfessions.slice(0, 3) }
      : {}),
    ...(profile.town || profile.city
      ? { areaServed: profile.town || profile.city }
      : {}),
  } : null;

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="h-48 bg-gradient-to-br from-indigo-200 to-cyan-200" />
        <div className="flex flex-col items-center -mt-14 px-4">
          <div className="w-28 h-28 rounded-full bg-gray-300 ring-4 ring-white" />
          <div className="h-5 bg-gray-300 rounded-xl w-36 mt-4" />
          <div className="h-3.5 bg-gray-200 rounded-xl w-28 mt-2" />
          <div className="flex gap-3 mt-5">
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
            <div className="w-20 h-16 rounded-2xl bg-gray-200" />
          </div>
          <div className="flex gap-3 mt-5 w-64">
            <div className="flex-1 h-12 rounded-2xl bg-gray-300" />
            <div className="flex-1 h-12 rounded-2xl bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        {previewImageUrls.map((imageUrl, index) => (
          <meta key={`og-image-${index}-${imageUrl}`} property="og:image" content={imageUrl} />
        ))}
        {previewImageUrls.map((imageUrl, index) => (
          <meta key={`og-image-secure-${index}-${imageUrl}`} property="og:image:secure_url" content={imageUrl} />
        ))}
        {previewImageUrls.length > 0 ? <meta property="og:image:alt" content={profile.name || seo.title} /> : null}
        {previewImageUrls.length > 0 ? <meta name="twitter:card" content="summary_large_image" /> : null}
        {previewImageUrls[0] ? <meta name="twitter:image" content={previewImageUrls[0]} /> : null}
        <link rel="canonical" href={canonicalUrl} />
        {profileStructuredData ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(profileStructuredData) }}
          />
        ) : null}
      </Head>

      <ProfileHeader
        profile={profile}
        displayProfessions={displayProfessions}
        showContactActions={shouldShowWorkerActions}
        onMessageClick={handleOpenMessage}
        onAvatarClick={handleAvatarClick}
        onProfessionsClick={isOwnProfile ? handleOpenProfessionEditor : null}
        onTaxAuthorityConnectClick={isOwnProfile && taxAuthorityConnected === false ? handleConnectTaxAuthority : null}
        taxAuthorityConnecting={taxAuthorityConnecting}
      />

      <div className="mt-4 border-t border-gray-100" />

      <div className="sticky top-0 md:top-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-30">
        <div className="max-w-2xl mx-auto px-2 py-2">
          <div className="overflow-x-auto scrollbar-hide md:overflow-visible">
            <div className="flex min-w-max items-center gap-1.5 md:min-w-0 md:justify-center">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={clsx(
                    'relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                    tab === tb.key
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  )}
                >
                  {tb.label}
                  {tab === tb.key && (
                    <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {isOwnProfile && profile?.role === 'worker' && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:justify-center md:overflow-visible">
              <Link
                href="/worker/invoices"
                className="shrink-0 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                {t.invoices.shortTitle}
              </Link>
              <Link
                href="/worker/invoices/saved"
                className="shrink-0 rounded-2xl bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
              >
                {t.invoices.savedButton}
              </Link>
              <Link
                href="/worker/dashboard"
                className="shrink-0 rounded-2xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-100"
              >
                {t.nav.dashboard}
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {tab === 'projects' && (
          <div className="space-y-4">
            {isOwnProfile && profile?.role === 'worker' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleOpenProjectEditor}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  <HiPlus className="h-4 w-4" />
                  {t.profile.addProject || 'Add project'}
                </button>
              </div>
            )}
            <ProjectsGallery projects={projects} loading={loadingData} profileUid={uid} />
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-5">
            <ReviewsList reviews={reviews} loading={loadingData} />

            {user && uid !== user.uid && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
                    <HiStar className="w-4 h-4 text-amber-500" />
                  </span>
                  {t.profile.writeReview}
                </h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t.profile.yourRating}</p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="transition-transform active:scale-90"
                        >
                          <HiStar
                            className={`w-8 h-8 transition-colors ${s <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-gray-200'}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t.profile.yourComment}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm resize-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-primary to-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 shadow-sm"
                  >
                    {submitting ? t.common.loading : t.profile.submitReview}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {tab === 'about' && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📝</span>
                  {t.profile.bio}
                </h3>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleOpenBioEditor}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
              </div>
              {profile.description ? (
                <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {isOwnProfile ? t.profile.addBioPrompt : t.profile.noBio}
                </p>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-sky-50 flex items-center justify-center text-base">🔗</span>
                    Social links
                  </h3>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={handleOpenSocialEditor}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Edit links
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((item, index) => {
                    const Icon = SOCIAL_ICON_MAP[item.type] || FiLinkIcon;
                    const label = item.name || item.type || 'Link';
                    const style = SOCIAL_STYLE_MAP[item.type] || SOCIAL_STYLE_MAP.other;

                    return (
                      <a
                        key={`${item.type}-${item.url}-${index}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={label}
                        title={label}
                        className={clsx(
                          'flex h-11 w-11 items-center justify-center rounded-full ring-1 transition-all duration-200 hover:-translate-y-0.5',
                          style
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {socialLinks.length === 0 && isOwnProfile && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-sky-50 flex items-center justify-center text-base">🔗</span>
                      Social links
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">Add your social media and website links to your profile.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenSocialEditor}
                    className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Add links
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center text-base">📋</span>
                  {t.profile.contactInfo}
                </h3>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleOpenContactEditor}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Edit information
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50">
                {profile.phone && (
                  <InfoRow label="Contact" value={profile.phone} icon="📞" />
                )}
                {(profile.optionalPhone || profile.secondaryPhone) && (
                  <InfoRow label="Secondary" value={profile.optionalPhone || profile.secondaryPhone} icon="📱" />
                )}
                {profile.email && (
                  <InfoRow label="Email" value={profile.email} icon="✉️" />
                )}
                {(profile.town || profile.city) && (
                  <InfoRow label="Town" value={profile.town || profile.city} icon="🏙️" />
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'schedule' && profile.role === 'worker' && (
          <ProfileScheduleView uid={uid} profile={profile} />
        )}

      </div>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {avatarActionSheetOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-[30px] bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-950">Profile photo</h3>
            <p className="mt-1 text-sm text-slate-500">Choose what you want to do with your profile picture.</p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setAvatarActionSheetOpen(false);
                  setAvatarViewerOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Show full photo
              </button>
              <button
                type="button"
                onClick={handleAvatarEditRequest}
                disabled={uploadingAvatar}
                className="w-full rounded-2xl bg-primary px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
              >
                {uploadingAvatar ? 'Uploading...' : 'Edit photo'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAvatarActionSheetOpen(false)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {avatarViewerOpen && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          onClick={() => setAvatarViewerOpen(false)}
        >
          <button
            type="button"
            onClick={() => setAvatarViewerOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            aria-label="Close profile photo"
          >
            ✕
          </button>
          <div
            className="relative h-[70vh] w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={avatarUrl}
              alt={profile.name || 'Profile photo'}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}

      {contactEditorOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[121] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Contact Info</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">Edit information</h3>
                <p className="mt-1 text-sm text-slate-500">Update the contact details shown in your About section.</p>
              </div>
              <button
                type="button"
                onClick={() => setContactEditorOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close contact information editor"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Primary phone</label>
                <input
                  type="tel"
                  value={contactDraft.phone}
                  readOnly
                  className="input-field cursor-not-allowed bg-gray-100 text-gray-500"
                />
                <p className="mt-2 text-xs text-gray-500">Your main phone number cannot be edited here.</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary phone</label>
                <input
                  type="tel"
                  value={contactDraft.optionalPhone}
                  onChange={(e) => handleContactDraftChange('optionalPhone', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  value={contactDraft.email}
                  onChange={(e) => handleContactDraftChange('email', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Town / City</label>
                <button
                  type="button"
                  onClick={() => setContactCityPickerOpen(true)}
                  className="input-field flex items-center justify-between text-left"
                >
                  <span className={clsx('truncate', contactDraft.town ? 'text-gray-800' : 'text-gray-400')}>
                    {contactDraft.town || 'Choose city on map'}
                  </span>
                  <FiMapPin className="h-4 w-4 text-primary" />
                </button>
                <p className="mt-2 text-xs text-gray-500">Selecting a city here also saves its map coordinates.</p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setContactEditorOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContactInfo}
                disabled={savingContactInfo}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingContactInfo ? 'Saving...' : 'Save information'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CityMapPickerModal
        isOpen={contactCityPickerOpen}
        initialCity={contactDraft.town}
        initialLat={contactDraft.lat}
        initialLng={contactDraft.lng}
        onClose={() => setContactCityPickerOpen(false)}
        onConfirm={handleContactCityConfirm}
      />

      {projectEditorOpen && isOwnProfile && profile?.role === 'worker' && (
        <div className="fixed inset-0 z-[122] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">{t.profile.projects}</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">{t.profile.addProject || 'Add project'}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.profile.addProjectSubtitle || 'Upload a photo and short description for your portfolio.'}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseProjectEditor}
                disabled={savingProject}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close project editor"
              >
                x
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.profile.projectMedia || 'Project photos or videos'}
                </label>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => projectImageInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      projectImageInputRef.current?.click();
                    }
                  }}
                  className="relative flex min-h-[180px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-primary/30 bg-primary/5 text-left transition hover:bg-primary/10"
                >
                  {projectMediaPreviews.length > 0 ? (
                    <span className="grid w-full grid-cols-2 gap-2 p-2 sm:grid-cols-3">
                      {projectMediaPreviews.map((preview, index) => (
                        <span key={`${preview.url}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
                          {preview.type === 'video' ? (
                            <video
                              src={preview.url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <span
                              className="block h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${preview.url})` }}
                              aria-hidden="true"
                            />
                          )}
                          <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold uppercase text-white">
                            {preview.type}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemoveProjectMedia(index);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRemoveProjectMedia(index);
                              }
                            }}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm font-bold text-slate-700 shadow-sm"
                            aria-label="Remove project media"
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="flex flex-col items-center gap-3 px-6 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                        <HiPhotograph className="h-7 w-7" />
                      </span>
                      <span className="text-sm font-semibold text-primary">
                        {t.profile.chooseProjectMedia || 'Choose files'}
                      </span>
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t.profile.projectMediaHelp || 'Add up to 5 images or videos.'}
                </p>
                <input
                  ref={projectImageInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleProjectMediaChange}
                  className="hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t.profile.projectDescription || 'Description'}
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                  maxLength={280}
                  placeholder={t.profile.projectDescriptionPlaceholder || 'What work did you complete?'}
                  className="input-field min-h-[120px] resize-none"
                />
                <p className="mt-2 text-xs text-slate-400">{projectDescription.length}/280</p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={handleCloseProjectEditor}
                disabled={savingProject}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t.common.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={savingProject}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProject ? (t.common.loading || 'Loading...') : (t.profile.saveProject || 'Save project')}
              </button>
            </div>
          </div>
        </div>
      )}

      {bioEditorOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[121] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Biography</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">Edit biography</h3>
                <p className="mt-1 text-sm text-slate-500">Update the short bio shown in your About section.</p>
              </div>
              <button
                type="button"
                onClick={() => setBioEditorOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close biography editor"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Biography</label>
              <textarea
                rows={8}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                placeholder="Tell people about your experience, services, or background"
                className="input-field min-h-[220px] resize-none"
              />
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setBioEditorOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={savingBio}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingBio ? 'Saving...' : 'Save biography'}
              </button>
            </div>
          </div>
        </div>
      )}

      {professionEditorOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[121] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Professions</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">Edit professions</h3>
                <p className="mt-1 text-sm text-slate-500">Choose the professions shown under your name.</p>
              </div>
              <button
                type="button"
                onClick={() => setProfessionEditorOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close professions editor"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {professionsLoading ? (
                <p className="text-sm text-slate-500">Loading professions...</p>
              ) : professionOptions.length === 0 ? (
                <p className="text-sm text-slate-500">No professions available right now.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
                    <input
                      type="text"
                      value={professionSearch}
                      onChange={(e) => setProfessionSearch(e.target.value)}
                      placeholder="Search professions"
                      className="input-field"
                    />
                  </div>

                  {editingProfessions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editingProfessions.map((value) => (
                        <button
                          key={`selected-${value}`}
                          type="button"
                          onClick={() => toggleProfessionSelection(value)}
                          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          {professionLabelMap[value] || value} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="overflow-hidden rounded-[24px] border border-slate-200">
                    {filteredProfessionOptions.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-slate-500">No professions match your search.</p>
                    ) : (
                      <div className="max-h-[340px] overflow-y-auto">
                        {filteredProfessionOptions.map((item) => {
                          const active = editingProfessions.includes(item.value);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleProfessionSelection(item.value)}
                              className={clsx(
                                'flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors last:border-b-0',
                                active ? 'bg-primary/5 text-primary' : 'bg-white text-slate-700 hover:bg-slate-50'
                              )}
                            >
                              <span className="font-medium">{professionLabelMap[item.value] || item.label}</span>
                              <span
                                className={clsx(
                                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                                  active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'
                                )}
                              >
                                {active ? '✓' : '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setProfessionEditorOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfessions}
                disabled={savingProfessions || professionsLoading}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfessions ? 'Saving...' : 'Save professions'}
              </button>
            </div>
          </div>
        </div>
      )}

      {socialEditorOpen && isOwnProfile && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="flex h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-[32px]">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Social Links</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950">Manage your links</h3>
                <p className="mt-1 text-sm text-slate-500">Add, edit, or remove links shown in your About section.</p>
              </div>
              <button
                type="button"
                onClick={() => setSocialEditorOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close social links editor"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {editingSocialLinks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No links yet. Add your first one below.
                </div>
              )}

              {editingSocialLinks.map((item, index) => (
                <div key={`social-link-edit-${index}`} className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Type</label>
                      <select
                        value={item.type}
                        onChange={(e) => handleSocialLinkChange(index, 'type', e.target.value)}
                        className="input-field"
                      >
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="website">Website</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">URL</label>
                      <input
                        type="text"
                        value={item.url}
                        onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                        placeholder="https://example.com"
                        className="input-field"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteSocialLink(index)}
                        className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 sm:w-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name (optional)</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleSocialLinkChange(index, 'name', e.target.value)}
                      placeholder="Displayed label"
                      className="input-field"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddSocialLink}
                className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
              >
                Add link
              </button>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setSocialEditorOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSocialLinks}
                disabled={savingSocialLinks}
                className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSocialLinks ? 'Saving...' : 'Save links'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="font-semibold text-gray-900 text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const profileRoute = String(params?.uid || '').trim();

  if (!profileRoute) {
    return { notFound: true };
  }

  try {
    const initialProfile = await resolveUserProfile(profileRoute);

    if (!initialProfile) {
      return { notFound: true };
    }

    const canonicalSlug = buildProfileSlug(initialProfile);
    if (profileRoute !== canonicalSlug) {
      return {
        redirect: {
          destination: `/profile/${canonicalSlug}`,
          permanent: false,
        },
      };
    }

    const uid = initialProfile.uid;
    const [initialProjects, initialReviews, professionsSnap] = await Promise.all([
      getWorkerProjects(uid),
      getWorkerReviews(uid),
      getDoc(doc(db, 'metadata', 'professions')).catch(() => null),
    ]);
    const professionLabelsHe = getHebrewProfessionLabels(
      initialProfile.professions,
      professionsSnap?.data()?.items
    );

    const profileWithCounts = {
      ...initialProfile,
      professionLabelsHe,
      projectCount: initialProjects.length,
      reviewCount: initialProfile.reviewCount ?? initialReviews.length,
    };

    return {
      props: serializeFirestoreValue({
        initialProfile: profileWithCounts,
        initialProjects,
        initialReviews,
        initialProfileRoute: profileRoute,
      }),
    };
  } catch (error) {
    console.error('Failed to render profile server-side:', error);
    return { notFound: true };
  }
}
