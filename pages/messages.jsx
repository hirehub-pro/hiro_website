import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { HiBell, HiChat, HiPaperAirplane, HiSearch, HiUserCircle } from 'react-icons/hi';
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
import { db } from '../lib/firebase';
import { createMessageNotification } from '../lib/chat';
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
  return (room.users || []).find((uid) => uid !== currentUid) || (room.users || [])[0] || '';
}

function getRoomName(room, currentUid) {
  const otherUserId = getOtherUserId(room, currentUid);
  return room.user_names?.[otherUserId] || room.userNames?.[otherUserId] || otherUserId || 'Conversation';
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
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
  const [enablingPush, setEnablingPush] = useState(false);
  const [supportRoomLoading, setSupportRoomLoading] = useState(false);
  const [pendingSupportRoom, setPendingSupportRoom] = useState(null);
  const messagesEndRef = useRef(null);

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
          <div className="grid rounded-2xl border border-gray-100 bg-white shadow-card md:h-[calc(100vh-11rem)] md:grid-cols-[320px_1fr] md:overflow-hidden">
            <aside className="border-b border-gray-100 md:flex md:min-h-0 md:flex-col md:border-b-0 md:border-r">
              <div className="border-b border-gray-100 p-4">
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
                      <div key={item} className="h-16 rounded-2xl bg-gray-100" />
                    ))}
                  </div>
                ) : supportRoomLoading && roomItems.length === 0 ? (
                  <div className="space-y-3 p-4">
                    {[0, 1, 2].map((item) => (
                      <div key={item} className="h-16 rounded-2xl bg-gray-100" />
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
                        }}
                        className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-4 text-left transition-colors ${
                          room.id === activeRoomId ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <HiUserCircle className="h-9 w-9 text-gray-400" />
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

            <section className="flex min-h-[520px] flex-col">
              {activeRoom ? (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                      <HiUserCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">{getRoomName(activeRoom, user.uid)}</p>
                      <p className="text-xs text-gray-400">{activeRoom.lastMessage || 'Conversation'}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-5">
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

                          return (
                            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                                  mine
                                    ? 'rounded-br-md bg-primary text-white'
                                    : 'rounded-bl-md bg-white text-gray-900'
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                  {message.message || ''}
                                </p>
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

                  <form onSubmit={handleSendMessage} className="flex gap-3 border-t border-gray-100 bg-white p-4">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message"
                      className="input-field"
                    />
                    <button
                      type="submit"
                      disabled={sending || !draft.trim()}
                      className="btn-primary flex shrink-0 items-center gap-2 px-4"
                    >
                      <HiPaperAirplane className="h-5 w-5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
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
