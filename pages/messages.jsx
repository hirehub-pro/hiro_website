import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { HiChat, HiPaperAirplane, HiSearch, HiUserCircle } from 'react-icons/hi';
import {
  FieldPath,
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
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
  const { user } = useAuth();
  const { t, dir } = useLanguage();
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const filteredRooms = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    if (!searchValue) return rooms;

    return rooms.filter((room) => (
      getRoomName(room, user?.uid).toLowerCase().includes(searchValue) ||
      String(room.lastMessage || '').toLowerCase().includes(searchValue)
    ));
  }, [rooms, search, user?.uid]);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setMessages([]);
      setSelectedRoomId('');
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

        setRooms(nextRooms);
        setRoomsLoading(false);

        setSelectedRoomId((currentRoomId) => {
          if (currentRoomId && nextRooms.some((room) => room.id === currentRoomId)) {
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
  }, [t.common.error, user]);

  useEffect(() => {
    if (!user || !selectedRoomId) {
      setMessages([]);
      return undefined;
    }

    setMessagesLoading(true);
    const messagesQuery = query(
      collection(db, 'chat_rooms', selectedRoomId, 'messages'),
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
  }, [selectedRoomId, t.common.error, user]);

  useEffect(() => {
    if (!user || !selectedRoomId) return;

    updateDoc(
      doc(db, 'chat_rooms', selectedRoomId),
      new FieldPath('unreadCount', user.uid),
      0
    ).catch(() => {});
  }, [selectedRoomId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  async function handleSendMessage(e) {
    e.preventDefault();

    const text = draft.trim();
    if (!user || !selectedRoom || !text) return;

    const receiverId = getOtherUserId(selectedRoom, user.uid);
    setSending(true);

    try {
      await addDoc(collection(db, 'chat_rooms', selectedRoom.id, 'messages'), {
        fileName: null,
        message: text,
        receiverId,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        type: 'text',
        url: null,
      });

      const roomRef = doc(db, 'chat_rooms', selectedRoom.id);
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

      setDraft('');
    } catch (error) {
      toast.error(error.message || t.common.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Head><title>Hiro - {t.messages.title}</title></Head>

      <div className="mx-auto max-w-6xl px-4 pb-24" dir={dir}>
        <div className="flex items-center justify-between py-5">
          <h1 className="text-2xl font-extrabold text-gray-900">{t.messages.title}</h1>
        </div>

        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <HiChat className="h-10 w-10 text-gray-300" />
            </div>
            <p className="mb-1 font-medium text-gray-500">{t.messages.noMessages}</p>
            <p className="mb-6 text-sm text-gray-400">{t.messages.yourMessages}</p>
            <Link
              href="/auth/signin"
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              {t.auth.signIn}
            </Link>
          </div>
        ) : (
          <div className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card md:h-[calc(100vh-11rem)] md:grid-cols-[320px_1fr]">
            <aside className="border-b border-gray-100 md:border-b-0 md:border-r">
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

              <div className="max-h-80 overflow-y-auto md:max-h-none">
                {roomsLoading ? (
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
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`flex w-full items-center gap-3 border-b border-gray-50 px-4 py-4 text-left transition-colors ${
                          active ? 'bg-primary-50' : 'hover:bg-gray-50'
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
              {selectedRoom ? (
                <>
                  <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-50">
                      <HiUserCircle className="h-8 w-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">{getRoomName(selectedRoom, user.uid)}</p>
                      <p className="text-xs text-gray-400">{selectedRoom.lastMessage || 'Conversation'}</p>
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
