import Head from 'next/head';
import { HiChat, HiSearch } from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import Link from 'next/link';

export default function MessagesPage() {
  const { user } = useAuth();
  const { t }    = useLanguage();

  return (
    <>
      <Head><title>HireHub – {t.messages.title}</title></Head>

      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-5">
          <h1 className="text-2xl font-extrabold text-gray-900">{t.messages.title}</h1>
          <button className="p-2 rounded-xl hover:bg-gray-100">
            <HiSearch className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* HireHub Support banner */}
        <div className="bg-primary rounded-2xl p-4 flex items-center gap-3 mb-5 shadow-sm">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-2xl">🎧</span>
          </div>
          <div className="flex-1 text-white">
            <p className="font-bold text-sm">HireHub Support</p>
            <p className="text-xs text-white/80">{t.messages.supportSub}</p>
          </div>
          <button className="text-white/80 text-lg">›</button>
        </div>

        {/* Empty state */}
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <HiChat className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">{t.messages.noMessages}</p>
            <p className="text-sm text-gray-400 mb-6">{t.messages.yourMessages}</p>
            <Link
              href="/auth/signin"
              className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-primary-dark transition-colors"
            >
              {t.auth.signIn}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <HiChat className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">{t.messages.noMessages}</p>
            <p className="text-sm text-gray-400 mt-1">{t.messages.yourMessages}</p>
          </div>
        )}
      </div>
    </>
  );
}
