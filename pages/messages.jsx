import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  HiBell,
  HiChat,
  HiChevronLeft,
  HiDocumentText,
  HiMicrophone,
  HiPause,
  HiPaperAirplane,
  HiPaperClip,
  HiPhotograph,
  HiPlay,
  HiSearch,
  HiStop,
  HiUserCircle,
  HiVideoCamera,
} from 'react-icons/hi';
import {
  FieldPath,
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { createMessageNotification } from '../lib/chat';
import { getUserProfile } from '../lib/firestore';
import { getInvoiceClientPrefillStorageKey } from '../lib/invoices';
import { registerForPushNotifications, syncGrantedPushNotifications } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return Number(value) || 0;
}

function formatMessageTime(value) {
  const millis = toMillis(value);
  if (!millis) return '';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(millis));
}

function getOtherUserId(room, currentUid) {
  const users = Array.isArray(room?.users) ? room.users : [];
  return users.find((uid) => uid !== currentUid) || users[0] || '';
}

function getRoomName(room, currentUid) {
  const otherUserId = getOtherUserId(room, currentUid);
  return room.user_names?.[otherUserId] || room.userNames?.[otherUserId] || otherUserId || 'Conversation';
}

function getAttachmentKind(message) {
  const rawType = String(message?.type || '').trim().toLowerCase();
  const rawContentType = String(message?.contentType || '').trim().toLowerCase();
  const rawUrl = String(message?.url || '').trim().toLowerCase();
  const rawFileName = String(message?.fileName || '').trim().toLowerCase();
  const combined = `${rawType} ${rawUrl} ${rawFileName}`;

  if (/(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)/.test(rawFileName) || /(application\/pdf|application\/msword|officedocument|text\/plain|application\/zip)/.test(rawContentType)) {
    return 'file';
  }
  if (/(mp3|wav|ogg|m4a|aac)$/i.test(rawFileName) || /^audio\//.test(rawContentType)) return 'audio';
  if (/(mp4|mov|webm|m4v)$/i.test(rawFileName) || /^video\//.test(rawContentType)) return 'video';
  if (/(jpg|jpeg|png|gif|webp|heic)$/i.test(rawFileName) || /^image\//.test(rawContentType)) return 'image';

  if (/(image|photo|picture|jpg|jpeg|png|gif|webp|heic)/.test(combined)) return 'image';
  if (/(video|mp4|mov|webm|m4v)/.test(combined)) return 'video';
  if (/(voice|audio|recording|mp3|wav|ogg|m4a|aac)/.test(combined)) return 'audio';
  if (/(file|document|doc|docx|pdf|xls|xlsx|ppt|pptx|txt|zip)/.test(combined)) return 'file';
  return rawType === 'text' || (!message?.url && message?.message) ? 'text' : 'file';
}

function getAttachmentLabel(kind, fileName) {
  if (fileName) return fileName;
  if (kind === 'image') return 'Image';
  if (kind === 'video') return 'Video';
  if (kind === 'audio') return 'Voice message';
  if (kind === 'file') return 'File';
  return '';
}

function getAttachmentPreview(kind, fileName) {
  if (kind === 'image') return 'Image';
  if (kind === 'video') return 'Video';
  if (kind === 'audio') return 'Voice message';
  if (kind === 'file') return fileName || 'File';
  return fileName || 'Attachment';
}

function formatAudioTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function VoiceMessageCard({ url, label, mine }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [url]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const progressLabel = duration > 0 ? formatAudioTime(duration - currentTime) : '0:00';

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }

  function seekAudio(event) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const nextTime = Number(event.target.value);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className={`overflow-hidden rounded-[22px] border ${
      mine
        ? 'border-white/15 bg-white/10'
        : 'border-slate-200 bg-slate-50'
    }`}>
      <div className={`flex items-center gap-3 px-3 py-3 ${
        mine ? 'bg-white/5' : 'bg-white'
      }`}>
        <button
          type="button"
          onClick={togglePlayback}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${
            mine
              ? 'bg-white/15 text-white hover:bg-white/20'
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? <HiPause className="h-5 w-5" /> : <HiPlay className="ml-0.5 h-5 w-5" />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <HiMicrophone className={`h-4 w-4 shrink-0 ${mine ? 'text-white/70' : 'text-primary'}`} />
            <div className={`h-1.5 flex-1 overflow-hidden rounded-full ${mine ? 'bg-white/15' : 'bg-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${mine ? 'bg-white' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`shrink-0 text-xs tabular-nums ${mine ? 'text-white/75' : 'text-slate-500'}`}>
              {progressLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seekAudio}
          className="h-2 w-full cursor-pointer accent-primary"
        />
      </div>

      <audio ref={audioRef} preload="metadata">
        <source src={url} />
      </audio>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, profile, isWorker } = useAuth();
  const { t, dir } = useLanguage();
  const supportChatHref = '/messages?support=admin';
  const signInHref = `/auth/signin?next=${encodeURIComponent(supportChatHref)}`;
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [activeRoomId, setActiveRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [supportRoomLoading, setSupportRoomLoading] = useState(false);
  const [pendingSupportRoom, setPendingSupportRoom] = useState(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStreamRef = useRef(null);
  const composerFeatures = useMemo(() => ([
    { label: 'Images', icon: HiPhotograph, inputRef: imageInputRef },
    { label: 'Videos', icon: HiVideoCamera, inputRef: videoInputRef },
    { label: 'Voice messages', icon: HiMicrophone, inputRef: audioInputRef },
    { label: 'Files', icon: HiPaperClip, inputRef: fileInputRef },
  ]), []);

  const roomItems = useMemo(() => {
    if (!pendingSupportRoom) return rooms;
    if (rooms.some((room) => room.id === pendingSupportRoom.id)) return rooms;
    return [pendingSupportRoom, ...rooms];
  }, [pendingSupportRoom, rooms]);

  const selectedRoom = useMemo(
    () => roomItems.find((room) => room.id === selectedRoomId) || null,
    [roomItems, selectedRoomId]
  );
  const activeRoom = useMemo(
    () => roomItems.find((room) => room.id === activeRoomId) || null,
    [activeRoomId, roomItems]
  );
  const activeClientUid = useMemo(
    () => getOtherUserId(activeRoom, user?.uid),
    [activeRoom, user?.uid]
  );

  const filteredRooms = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return roomItems;

    return roomItems.filter((room) => (
      getRoomName(room, user?.uid).toLowerCase().includes(searchValue) ||
      String(room.lastMessage || '').toLowerCase().includes(searchValue)
    ));
  }, [roomItems, search, user?.uid]);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setMessages([]);
      setSelectedRoomId('');
      setActiveRoomId('');
      setPendingSupportRoom(null);
      setMobileThreadOpen(false);
      setRoomsLoading(false);
      return undefined;
    }

    setRoomsLoading(true);
    const roomsQuery = query(
      collection(db, 'chat_rooms'),
      where('users', 'array-contains', user.uid)
    );

    return onSnapshot(
      roomsQuery,
      (snapshot) => {
        const nextRooms = snapshot.docs
          .map((roomDoc) => ({ id: roomDoc.id, ...roomDoc.data() }))
          .sort((a, b) => toMillis(b.lastTimestamp) - toMillis(a.lastTimestamp));
        const mergedRooms = pendingSupportRoom && !nextRooms.some((room) => room.id === pendingSupportRoom.id)
          ? [pendingSupportRoom, ...nextRooms]
          : nextRooms;

        setRooms(nextRooms);
        setRoomsLoading(false);

        if (pendingSupportRoom && nextRooms.some((room) => room.id === pendingSupportRoom.id)) {
          setPendingSupportRoom(null);
        }

        const requestedRoomId = typeof router.query.roomId === 'string' ? router.query.roomId : '';

        setSelectedRoomId((currentRoomId) => {
          if (requestedRoomId && mergedRooms.some((room) => room.id === requestedRoomId)) {
            return requestedRoomId;
          }
          if (currentRoomId && mergedRooms.some((room) => room.id === currentRoomId)) {
            return currentRoomId;
          }
          if (currentRoomId) {
            return currentRoomId;
          }
          return nextRooms[0]?.id || '';
        });

        setActiveRoomId((currentRoomId) => {
          if (requestedRoomId && mergedRooms.some((room) => room.id === requestedRoomId)) {
            return requestedRoomId;
          }
          if (currentRoomId && mergedRooms.some((room) => room.id === currentRoomId)) {
            return currentRoomId;
          }
          if (currentRoomId) {
            return currentRoomId;
          }
          return nextRooms[0]?.id || '';
        });
      },
      (error) => {
        setRoomsLoading(false);
        toast.error(error.message || t.common.error);
      }
    );
  }, [pendingSupportRoom, router.query.roomId, t.common.error, user]);

  useEffect(() => {
    if (!user || !activeRoomId) {
      setMessages([]);
      return undefined;
    }

    setMessagesLoading(true);
    const messagesQuery = query(
      collection(db, 'chat_rooms', activeRoomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        setMessages(snapshot.docs.map((messageDoc) => ({ id: messageDoc.id, ...messageDoc.data() })));
        setMessagesLoading(false);
      },
      (error) => {
        setMessagesLoading(false);
        toast.error(error.message || t.common.error);
      }
    );
  }, [activeRoomId, t.common.error, user]);

  useEffect(() => {
    if (!user || !activeRoomId) return;

    updateDoc(
      doc(db, 'chat_rooms', activeRoomId),
      new FieldPath('unreadCount', user.uid),
      0
    ).catch(() => {});
  }, [activeRoomId, user]);

  useEffect(() => {
    if (!user) return;

    syncGrantedPushNotifications(user).catch(() => {});
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    if (!recordingVoice) return undefined;

    const timer = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recordingVoice]);

  useEffect(() => () => {
    mediaRecorderRef.current?.stop?.();
    recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    if (router.query.support !== 'admin') return undefined;

    let cancelled = false;

    async function ensureAdminSupportRoom() {
      setSupportRoomLoading(true);

      try {
        const adminSnapshot = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'admin'), limit(1))
        );

        if (cancelled) return;

        if (adminSnapshot.empty) {
          toast.error('No admin account is available for chat yet.');
          return;
        }

        const adminDoc = adminSnapshot.docs[0];
        const adminUid = adminDoc.id;
        const adminProfile = adminDoc.data();
        const roomId = `support_${[user.uid, adminUid].sort().join('_')}`;
        const roomDraft = {
          id: roomId,
          users: [user.uid, adminUid],
          user_names: {
            [user.uid]: profile?.name || user.displayName || 'User',
            [adminUid]: adminProfile.name || t.messages.support,
          },
          userNames: {
            [user.uid]: profile?.name || user.displayName || 'User',
            [adminUid]: adminProfile.name || t.messages.support,
          },
          unreadCount: {
            [user.uid]: 0,
            [adminUid]: 0,
          },
          supportType: 'admin',
          isSupportRoom: true,
          lastMessage: '',
          lastTimestamp: new Date(),
        };

        setPendingSupportRoom(roomDraft);
        setSelectedRoomId(roomId);
        setActiveRoomId(roomId);
        setMobileThreadOpen(true);

        await setDoc(
          doc(db, 'chat_rooms', roomId),
          {
            ...roomDraft,
            lastTimestamp: serverTimestamp(),
          },
          { merge: true }
        );

        if (cancelled) return;

        router.replace(
          {
            pathname: '/messages',
            query: { roomId },
          },
          undefined,
          { shallow: true }
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message || t.common.error);
        }
      } finally {
        if (!cancelled) {
          setSupportRoomLoading(false);
        }
      }
    }

    ensureAdminSupportRoom();

    return () => {
      cancelled = true;
    };
  }, [profile?.name, router, router.query.support, t.common.error, t.messages.support, user]);

  useEffect(() => {
    const requestedDraft = typeof router.query.draft === 'string' ? router.query.draft : '';
    const requestedRoomId = typeof router.query.roomId === 'string' ? router.query.roomId : '';

    if (!requestedDraft || !requestedRoomId) return;
    if (activeRoomId !== requestedRoomId) return;

    setDraft((currentDraft) => currentDraft || requestedDraft);
  }, [activeRoomId, router.query.draft, router.query.roomId]);

  async function handleSendMessage(e) {
    e.preventDefault();

    const text = draft.trim();
    if (!user || !activeRoom || !text) return;

    const receiverId = getOtherUserId(activeRoom, user.uid);
    setSending(true);

    try {
      const messageRef = await addDoc(collection(db, 'chat_rooms', activeRoom.id, 'messages'), {
        fileName: null,
        message: text,
        receiverId,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        type: 'text',
        url: null,
      });

      const roomRef = doc(db, 'chat_rooms', activeRoom.id);
      if (receiverId && receiverId !== user.uid) {
        await updateDoc(
          roomRef,
          'lastMessage',
          text,
          'lastTimestamp',
          serverTimestamp(),
          new FieldPath('unreadCount', receiverId),
          increment(1),
          new FieldPath('unreadCount', user.uid),
          0
        );
      } else {
        await updateDoc(
          roomRef,
          'lastMessage',
          text,
          'lastTimestamp',
          serverTimestamp(),
          new FieldPath('unreadCount', user.uid),
          0
        );
      }

      if (receiverId && receiverId !== user.uid) {
        await createMessageNotification({
          recipientUserId: receiverId,
          senderUserId: user.uid,
          senderName: profile?.name || user.displayName || 'Someone',
          messageId: messageRef.id,
          roomId: activeRoom.id,
          text,
        });
      }

      setDraft('');
    } catch (error) {
      toast.error(error.message || t.common.error);
    } finally {
      setSending(false);
    }
  }

  async function updateRoomAfterSend(roomId, receiverId, previewText) {
    const roomRef = doc(db, 'chat_rooms', roomId);

    if (receiverId && receiverId !== user.uid) {
      await updateDoc(
        roomRef,
        'lastMessage',
        previewText,
        'lastTimestamp',
        serverTimestamp(),
        new FieldPath('unreadCount', receiverId),
        increment(1),
        new FieldPath('unreadCount', user.uid),
        0
      );
      return;
    }

    await updateDoc(
      roomRef,
      'lastMessage',
      previewText,
      'lastTimestamp',
      serverTimestamp(),
      new FieldPath('unreadCount', user.uid),
      0
    );
  }

  async function handleAttachmentSelected(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !user || !activeRoom) return;
    await uploadAttachmentFile(file, kind);
  }

  async function uploadAttachmentFile(file, kind) {
    const receiverId = getOtherUserId(activeRoom, user.uid);
    const safeFileName = file.name || `${kind}-${Date.now()}`;
    const previewText = getAttachmentPreview(kind, safeFileName);
    const extension = safeFileName.includes('.') ? safeFileName.split('.').pop() : '';
    const storagePath = [
      'chat_attachments',
      activeRoom.id,
      `${Date.now()}_${user.uid}_${kind}${extension ? `.${extension}` : ''}`,
    ].join('/');

    setUploadingAttachment(true);

    try {
      const uploaded = await uploadBytes(storageRef(storage, storagePath), file, {
        contentType: file.type || undefined,
      });
      const url = await getDownloadURL(uploaded.ref);

      const messageRef = await addDoc(collection(db, 'chat_rooms', activeRoom.id, 'messages'), {
        contentType: file.type || '',
        fileName: safeFileName,
        message: '',
        receiverId,
        senderId: user.uid,
        storagePath,
        timestamp: serverTimestamp(),
        type: kind,
        url,
      });

      await updateRoomAfterSend(activeRoom.id, receiverId, previewText);

      if (receiverId && receiverId !== user.uid) {
        await createMessageNotification({
          recipientUserId: receiverId,
          senderUserId: user.uid,
          senderName: profile?.name || user.displayName || 'Someone',
          messageId: messageRef.id,
          roomId: activeRoom.id,
          text: previewText,
        });
      }
    } catch (error) {
      toast.error(error.message || t.common.error);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleRecordVoiceToggle() {
    if (recordingVoice) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!activeRoom || !user || uploadingAttachment || sending) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice recording is not supported on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setRecordingSeconds(0);

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener('stop', async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('mp4') || mimeType.includes('mpeg') ? 'm4a' : 'webm';
        const audioBlob = new Blob(recordingChunksRef.current, { type: mimeType });

        recordingStreamRef.current?.getTracks?.().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        setRecordingVoice(false);

        if (!audioBlob.size) return;

        const recordedFile = new File(
          [audioBlob],
          `voice-message-${Date.now()}.${extension}`,
          { type: mimeType }
        );

        await uploadAttachmentFile(recordedFile, 'audio');
      });

      recorder.start();
      setRecordingVoice(true);
    } catch (error) {
      toast.error(error?.message || 'Could not start voice recording.');
    }
  }

  async function handleEnablePushNotifications() {
    setEnablingPush(true);
    try {
      await registerForPushNotifications(user);
      toast.success('Push notifications enabled.');
    } catch (error) {
      toast.error(error.message || 'Could not enable notifications.');
    } finally {
      setEnablingPush(false);
    }
  }

  async function handleGenerateInvoice() {
    if (!user || !isWorker || !activeRoom || !activeClientUid || activeRoom.isSupportRoom) {
      return;
    }

    try {
      const clientProfile = await getUserProfile(activeClientUid);
      const clientName = clientProfile?.name || getRoomName(activeRoom, user.uid) || '';
      const clientEmail = clientProfile?.email || '';
      const clientPhone = clientProfile?.phone || clientProfile?.optionalPhone || '';
      const clientCity = clientProfile?.town || clientProfile?.city || '';
      const clientPrefill = {
        clientUid: activeClientUid,
        clientName,
        clientEmail,
        clientPhone,
        clientCity,
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          getInvoiceClientPrefillStorageKey(user.uid),
          JSON.stringify(clientPrefill)
        );
      }

      await router.push('/worker/invoices');
    } catch (error) {
      toast.error(error.message || t.common.error);
    }
  }

  return (
    <>
      <Head><title>Hiro - {t.messages.title}</title></Head>

      <div className="mx-auto max-w-6xl px-4 pb-24" dir={dir}>
        <div className="flex items-center justify-between py-5">
          <h1 className="text-2xl font-extrabold text-gray-900">{t.messages.title}</h1>
          {user && (
            <button
              type="button"
              onClick={handleEnablePushNotifications}
              disabled={enablingPush}
              className="btn-ghost flex items-center gap-2 rounded-2xl px-4 py-2 text-sm"
            >
              <HiBell className="h-5 w-5" />
              <span className="hidden sm:inline">{enablingPush ? t.common.loading : 'Enable push'}</span>
            </button>
          )}
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <HiChat className="h-10 w-10 text-gray-300" />
            </div>
            <p className="mb-1 font-medium text-gray-500">{t.messages.noMessages}</p>
            <p className="mb-6 text-sm text-gray-400">{t.messages.yourMessages}</p>
            <Link
              href={signInHref}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              {t.auth.signIn}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-gray-100 bg-white shadow-card md:grid md:h-[calc(100vh-11rem)] md:grid-cols-[320px_1fr] md:overflow-hidden">
            <aside className={`${mobileThreadOpen ? 'hidden' : 'flex'} min-h-[calc(100vh-13rem)] flex-col md:flex md:min-h-0 md:border-r`}>
              <div className="border-b border-gray-100 p-4">
                <div className="mb-3 flex items-center justify-between md:hidden">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.messages.title}</p>
                    <p className="text-xs text-gray-500">Open a conversation to reply faster.</p>
                  </div>
                  <div className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
                    {filteredRooms.length}
                  </div>
                </div>
                <div className="relative">
                  <HiSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search messages"
                    className="input-field pl-12"
                  />
                </div>
              </div>

              <div className="overflow-y-auto md:min-h-0 md:flex-1">
                {roomsLoading ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-20 rounded-3xl bg-gray-100" />
                    ))}
                  </div>
                ) : supportRoomLoading && roomItems.length === 0 ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-20 rounded-3xl bg-gray-100" />
                    ))}
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <HiChat className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-3 text-sm font-medium text-gray-500">{t.messages.noMessages}</p>
                  </div>
                ) : (
                  filteredRooms.map((room) => {
                    const active = room.id === selectedRoomId;
                    const unread = Number(room.unreadCount?.[user.uid] || 0);

                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setActiveRoomId(room.id);
                          setMobileThreadOpen(true);
                        }}
                        className={`mx-3 my-2 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-[24px] px-4 py-4 text-left transition-all ${
                          room.id === activeRoomId ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary/10' : 'bg-gray-100'}`}>
                          <HiUserCircle className={`h-9 w-9 ${active ? 'text-primary' : 'text-gray-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-gray-900">{getRoomName(room, user.uid)}</p>
                            <span className="shrink-0 text-[11px] font-medium text-gray-400">
                              {formatMessageTime(room.lastTimestamp)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500">{room.lastMessage || 'No messages yet'}</p>
                        </div>
                        {unread > 0 && (
                          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <section className={`${mobileThreadOpen ? 'flex' : 'hidden'} min-h-[calc(100vh-13rem)] flex-col md:flex md:min-h-[520px]`}>
              {activeRoom ? (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4 md:px-5">
                    <button
                      type="button"
                      onClick={() => setMobileThreadOpen(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 md:hidden"
                      aria-label="Back to conversations"
                    >
                      <HiChevronLeft className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                      <HiUserCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">{getRoomName(activeRoom, user.uid)}</p>
                      <p className="text-xs text-gray-400">{activeRoom.lastMessage || 'Conversation'}</p>
                    </div>
                    {isWorker && !activeRoom.isSupportRoom && activeClientUid ? (
                      <button
                        type="button"
                        onClick={handleGenerateInvoice}
                        className="ml-auto rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                      >
                        {t.messages.generateInvoice}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 md:px-4 md:py-5">
                    {messagesLoading ? (
                      <div className="space-y-3">
                        {[0, 1, 2].map((item) => (
                          <div key={item} className="h-12 max-w-xs rounded-2xl bg-gray-100" />
                        ))}
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <HiChat className="h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-500">{t.messages.noMessages}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const mine = message.senderId === user.uid;
                          const attachmentKind = getAttachmentKind(message);
                          const hasText = Boolean(String(message.message || '').trim());
                          const attachmentUrl = String(message.url || '').trim();
                          const attachmentLabel = getAttachmentLabel(attachmentKind, message.fileName);

                          return (
                            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[78%] ${
                                  mine
                                    ? 'rounded-br-md bg-primary text-white'
                                    : 'rounded-bl-md bg-white text-gray-900'
                                }`}
                              >
                                {attachmentKind === 'image' && attachmentUrl ? (
                                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block">
                                    <img
                                      src={attachmentUrl}
                                      alt={attachmentLabel}
                                      className="max-h-72 w-full rounded-2xl object-cover"
                                    />
                                  </a>
                                ) : null}

                                {attachmentKind === 'video' && attachmentUrl ? (
                                  <video controls className="max-h-72 w-full rounded-2xl bg-black">
                                    <source src={attachmentUrl} />
                                    Your browser does not support video playback.
                                  </video>
                                ) : null}

                                {attachmentKind === 'audio' && attachmentUrl ? (
                                  <VoiceMessageCard
                                    url={attachmentUrl}
                                    label={attachmentLabel}
                                    mine={mine}
                                  />
                                ) : null}

                                {attachmentKind === 'file' && attachmentUrl ? (
                                  <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`flex items-center gap-3 rounded-2xl ${
                                      mine ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                    } p-3 transition-opacity hover:opacity-85`}
                                  >
                                    <div className={`rounded-full ${mine ? 'bg-white/15' : 'bg-white'} p-2`}>
                                      <HiDocumentText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold">{attachmentLabel}</p>
                                      <p className={`text-xs ${mine ? 'text-white/70' : 'text-slate-500'}`}>
                                        Open file
                                      </p>
                                    </div>
                                  </a>
                                ) : null}

                                {hasText ? (
                                  <p className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                                    attachmentKind !== 'text' ? 'mt-3' : ''
                                  }`}>
                                    {message.message}
                                  </p>
                                ) : null}

                                {!hasText && attachmentKind === 'text' ? (
                                  <p className="text-sm leading-6 opacity-70">Unsupported message</p>
                                ) : null}

                                <p className={`mt-1 text-[11px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
                                  {formatMessageTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 bg-white p-3 md:p-4">
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
                      {composerFeatures.map(({ label, icon: Icon, inputRef }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          disabled={uploadingAttachment || sending || !activeRoom}
                          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleRecordVoiceToggle}
                        disabled={uploadingAttachment || sending || !activeRoom}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          recordingVoice
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {recordingVoice ? <HiStop className="h-4 w-4" /> : <HiMicrophone className="h-4 w-4" />}
                        {recordingVoice ? `Stop recording ${formatAudioTime(recordingSeconds)}` : 'Record voice'}
                      </button>
                    </div>
                    {recordingVoice ? (
                      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        Recording voice message...
                        <span className="font-semibold tabular-nums">{formatAudioTime(recordingSeconds)}</span>
                      </div>
                    ) : null}
                    <p className="mb-3 text-xs text-gray-500">
                      {recordingVoice
                        ? 'Press stop to send your voice message.'
                        : uploadingAttachment
                        ? 'Uploading attachment...'
                        : 'You can send images, videos, voice messages, and files in this chat.'}
                    </p>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleAttachmentSelected('image', event)}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => handleAttachmentSelected('video', event)}
                    />
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(event) => handleAttachmentSelected('audio', event)}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => handleAttachmentSelected('file', event)}
                    />
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 md:gap-3">
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type a message"
                        className="input-field min-h-[52px]"
                      />
                      <button
                        type="submit"
                        disabled={sending || uploadingAttachment || recordingVoice || !draft.trim()}
                        className="btn-primary flex h-[52px] shrink-0 items-center gap-2 px-4"
                      >
                        <HiPaperAirplane className="h-5 w-5" />
                        <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
                  <HiChat className="h-14 w-14 text-gray-300" />
                  <p className="mt-4 font-medium text-gray-500">{t.messages.noMessages}</p>
                  <p className="mt-1 text-sm text-gray-400">{t.messages.yourMessages}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
