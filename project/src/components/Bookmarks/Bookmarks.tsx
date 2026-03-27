import React, { useEffect, useMemo, useState } from 'react';
import TweetList from '../Tweet/TweetList';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface Tweet {
  _id: string;
  author: {
    _id: string;
    username: string;
    profile: {
      displayName: string;
      avatarUrl: string;
      verified: boolean;
    };
  };
  content: {
    text: string;
    hashtags: string[];
    mentions: string[];
    mediaUrls: string[];
  };
  engagement: {
    likesCount: number;
    retweetsCount: number;
    repliesCount: number;
    quoteTweetsCount: number;
  };
  createdAt: string;
  isLiked?: boolean;
}

const Bookmarks: React.FC = () => {
  const { user } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const bookmarksKey = useMemo(() => (user ? `bookmarks_${user._id}` : 'bookmarks'), [user]);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = localStorage.getItem(bookmarksKey);
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (ids.length === 0) {
          setTweets([]);
          return;
        }
        // Fetch tweets by ids with naive parallel requests
        const responses = await Promise.all(ids.map(id => axios.get(`/tweets/${id}`).catch(() => null)));
        const loaded = responses
          .filter(Boolean)
          .map((r: any) => r.data.tweet)
          .filter(Boolean);
        // keep same order as bookmarks list
        const ordered = ids
          .map(id => loaded.find((t: Tweet) => t._id === id))
          .filter(Boolean) as Tweet[];
        setTweets(ordered);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookmarksKey]);

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(t => (t._id === tweetId ? { ...t, ...updates } : t)));
  };

  const handleTweetDelete = (tweetId: string) => {
    setTweets(prev => prev.filter(t => t._id !== tweetId));
    try {
      const raw = localStorage.getItem(bookmarksKey);
      const ids: string[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(bookmarksKey, JSON.stringify(ids.filter(id => id !== tweetId)));
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">Bookmarks</h1>
      </div>

      <TweetList
        tweets={tweets}
        onTweetUpdate={handleTweetUpdate}
        onTweetDelete={handleTweetDelete}
        rightAddon={(tweet) => (
          <button
            className="px-3 py-1 border border-blue-500 text-blue-400 rounded-full hover:bg-blue-900/20 text-sm"
            onClick={() => {
              try {
                const raw = localStorage.getItem(bookmarksKey);
                const ids: string[] = raw ? JSON.parse(raw) : [];
                localStorage.setItem(bookmarksKey, JSON.stringify(ids.filter(id => id !== tweet._id)));
                setTweets(prev => prev.filter(t => t._id !== tweet._id));
              } catch {}
            }}
          >
            Remove
          </button>
        )}
      />
      {tweets.length === 0 && (
        <div className="p-8 text-center text-gray-500">No bookmarks yet</div>
      )}
    </div>
  );
};

export default Bookmarks;


