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

const LikesPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`/users/${username}/likes`);
        setTweets(res.data.tweets || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load likes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username]);

  useEffect(() => {
    const onLikeChanged = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const updated = ce.detail?.tweet as Tweet | undefined;
      if (!updated) return;
      setTweets(prev => prev.map(t => (t._id === updated._id ? { ...t, ...updated } : t)));
    };
    window.addEventListener('tweet-like-changed', onLikeChanged as EventListener);
    return () => window.removeEventListener('tweet-like-changed', onLikeChanged as EventListener);
  }, []);

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(t => (t._id === tweetId ? { ...t, ...updates } : t)));
  };

  const handleTweetDelete = (tweetId: string) => {
    setTweets(prev => prev.filter(t => t._id !== tweetId));
  };

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
        <h1 className="text-xl font-bold text-white">Likes</h1>
      </div>
      <TweetList
        tweets={tweets}
        onTweetUpdate={handleTweetUpdate}
        onTweetDelete={handleTweetDelete}
        rightAddon={(tweet) => (
          <button
            className="px-3 py-1 border border-red-500 text-red-400 rounded-full hover:bg-red-900/20 text-sm"
            onClick={async () => {
              try {
                const res = await axios.post(`/tweets/${tweet._id}/like`);
                if (!res.data.liked) {
                  setTweets(prev => prev.filter(t => t._id !== tweet._id));
                } else {
                  // If it stayed liked (unexpected), update count
                  handleTweetUpdate(tweet._id, {
                    isLiked: res.data.liked,
                    engagement: { ...tweet.engagement, likesCount: res.data.likesCount }
                  });
                }
              } catch (e) {
                // ignore
              }
            }}
            title="Unlike"
          >
            Unlike
          </button>
        )}
      />
    </div>
  );
};

export default LikesPage;


