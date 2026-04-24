import { useEffect } from 'react';
import Header from './Header';
import BottomNav from './BottomNav';
import { useLanguage } from '../../contexts/LanguageContext';

export default function Layout({ children }) {
  const { dir } = useLanguage();

  // Apply RTL/LTR direction to the root element
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === 'rtl' ? 'he' : 'en';
  }, [dir]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir={dir}>
      {/* Top navigation — hidden on mobile, visible on md+ */}
      <Header />

      {/* Main content — bottom padding on mobile to clear the bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom navigation — visible on mobile only */}
      <BottomNav />
    </div>
  );
}
