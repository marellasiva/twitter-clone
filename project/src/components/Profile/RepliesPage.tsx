import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import TweetList from '../Tweet/TweetList';

interface Tweet {
  _id: string;
  author: { _id: string; username: string; profile: { displayName: string; avatarUrl: string; verified: boolean; } };
  content: { text: string; hashtags: string[]; mentions: string[]; mediaUrls: string[] };
  engagement: { likesCount: number; retweetsCount: number; repliesCount: number; quoteTweetsCount: number };
  createdAt: string;
  isLiked?: boolean;
}

const RepliesPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/users/${username}/replies`);
        setTweets(res.data.tweets || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load replies');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  useEffect(() => {
    const onReplyCreated = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const t = ce.detail?.tweet as Tweet | undefined;
      if (!t) return;
      if (t.author?.username?.toLowerCase?.() === username?.toLowerCase?.() || true) {
        setTweets(prev => [t, ...prev]);
      }
    };
    window.addEventListener('tweet-reply-created', onReplyCreated as EventListener);
    return () => window.removeEventListener('tweet-reply-created', onReplyCreated as EventListener);
  }, [username]);

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(t => (t._id === tweetId ? { ...t, ...updates } : t)));
  };

  // handleTweetDelete removed as it's not used in this component

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="loading-spinner"></div></div>;
  }
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error}</p>
        <Link to={`/profile/${username}`} className="text-blue-400 hover:underline mt-4 inline-block">← Back to Profile</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">Tweets & replies</h1>
      </div>
      <TweetList tweets={tweets} onTweetUpdate={handleTweetUpdate} />
    </div>
  );
};

export default RepliesPage;


