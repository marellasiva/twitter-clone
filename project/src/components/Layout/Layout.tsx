import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';  // Import Outlet
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import TweetModal from '../Tweet/TweetModal';

interface LayoutProps {
  children?: React.ReactNode; // optional, as children not used directly here
}

const Layout: React.FC<LayoutProps> = () => {
  const [showTweetModal, setShowTweetModal] = useState(false);
  const [quoteTweetOf, setQuoteTweetOf] = useState<string | undefined>(undefined);
  const [tweetPlaceholder, setTweetPlaceholder] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ quoteTweetOf?: string; placeholder?: string }>;
      setQuoteTweetOf(ce.detail?.quoteTweetOf);
      setTweetPlaceholder(ce.detail?.placeholder);
      setShowTweetModal(true);
    };
    window.addEventListener('open-tweet-modal', handler as EventListener);
    return () => window.removeEventListener('open-tweet-modal', handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto flex">
        <Sidebar />
        <main className="flex-1 min-h-screen border-x border-gray-800">
          <Outlet /> {/* Renders the nested route elements */}
        </main>
        <RightSidebar />
      </div>
      {showTweetModal && (
        <TweetModal onClose={() => setShowTweetModal(false)} quoteTweetOf={quoteTweetOf} placeholder={tweetPlaceholder} />
      )}
    </div>
  );
};

export default Layout;
