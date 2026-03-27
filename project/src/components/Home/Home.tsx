import React, { useState, useEffect } from 'react';
import TweetComposer from '../Tweet/TweetComposer';
import TweetList from '../Tweet/TweetList';
import { useSocket } from '../../contexts/SocketContext';
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
  replyTo?: string;
  quoteTweetOf?: any;
  createdAt: string;
  isLiked?: boolean;
}

const Home: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [feedType, setFeedType] = useState<'timeline' | 'public'>('public');
  const [pinnedTweetId, setPinnedTweetId] = useState<string | null>(null);
  const { socket } = useSocket();

  useEffect(() => {
    // Default to public (For you)
    loadPublic();
  }, []);

  useEffect(() => {
    // Load pinned tweet id for current user if available
    try {
      const userRaw = localStorage.getItem('accessToken');
      // Can't decode easily without JWT parsing; rely on server events would be overkill.
      // Instead, just look for any pinned key in localStorage.
      const key = Object.keys(localStorage).find(k => k.startsWith('pinnedTweetId_'));
      if (key) setPinnedTweetId(localStorage.getItem(key));
    } catch {}
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('tweet_created', (data) => {
        setTweets(prev => [data.tweet, ...prev]);
      });

      return () => {
        socket.off('tweet_created');
      };
    }
  }, [socket]);

  useEffect(() => {
    const onHidden = (e: Event) => {
      const ce = e as CustomEvent<{ tweetId: string }>;
      const id = ce.detail?.tweetId;
      if (!id) return;
      setTweets(prev => prev.filter(t => t._id !== id));
    };
    window.addEventListener('hidden-tweet', onHidden as EventListener);
    return () => window.removeEventListener('hidden-tweet', onHidden as EventListener);
  }, []);

  const loadTimeline = async (before?: string) => {
    try {
      const params = new URLSearchParams();
      if (before) params.append('before', before);
      params.append('limit', '20');

      const response = await axios.get(`/tweets/timeline?${params}`);
      const newTweets = response.data.tweets;

      if (before) {
        setTweets(prev => [...prev, ...newTweets]);
      } else {
        // Surface pinned tweet on top if present
        if (pinnedTweetId) {
          const pinned = newTweets.find(t => t._id === pinnedTweetId);
          const rest = newTweets.filter(t => t._id !== pinnedTweetId);
          setTweets(pinned ? [pinned, ...rest] : newTweets);
        } else {
          setTweets(newTweets);
        }
      }

      setHasMore(response.data.hasMore);
      // If first load returns empty, fall back to public feed
      if (!before && (!newTweets || newTweets.length === 0)) {
        await loadPublic();
      } else {
        setFeedType('timeline');
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
      // On auth/connection issues, try public feed
      if (!before) {
        await loadPublic();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPublic = async (before?: string) => {
    try {
      const params = new URLSearchParams();
      if (before) params.append('before', before);
      params.append('limit', '20');
      const response = await axios.get(`/tweets/public?${params}`);
      const newTweets = response.data.tweets;
      if (before) {
        setTweets(prev => [...prev, ...newTweets]);
      } else {
        setTweets(newTweets);
      }
      setHasMore(response.data.hasMore);
      setFeedType('public');
    } catch (error) {
      console.error('Failed to load public feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTweetCreated = (newTweet: Tweet) => {
    setTweets(prev => [newTweet, ...prev]);
  };

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(tweet => 
      tweet._id === tweetId ? { ...tweet, ...updates } : tweet
    ));
  };

  const handleTweetDelete = (tweetId: string) => {
    setTweets(prev => prev.filter(t => t._id !== tweetId));
  };

  const loadMore = () => {
    if (tweets.length > 0) {
      const lastTweet = tweets[tweets.length - 1];
      if (feedType === 'timeline') {
        loadTimeline(lastTweet.createdAt);
      } else {
        loadPublic(lastTweet.createdAt);
      }
    }
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
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <div className="flex items-center gap-6">
          <button
            className={`text-xl font-bold ${feedType === 'public' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            onClick={() => { setTweets([]); setLoading(true); setFeedType('public'); loadPublic(); }}
          >
            For you
          </button>
          <button
            className={`text-xl font-bold ${feedType === 'timeline' ? 'text-white' : 'text-gray-500 hover:text-white'}`}
            onClick={() => { setTweets([]); setLoading(true); setFeedType('timeline'); loadTimeline(); }}
          >
            Following
          </button>
        </div>
      </div>

      {/* Tweet Composer */}
      <TweetComposer onTweetCreated={handleTweetCreated} />

      {/* Timeline */}
      <TweetList
        tweets={tweets}
        onTweetUpdate={handleTweetUpdate}
        onTweetDelete={handleTweetDelete}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
};

export default Home;