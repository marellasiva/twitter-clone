import React, { useState, useEffect } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import TweetList from '../Tweet/TweetList';
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

interface TrendingTopic {
  hashtag: string;
  count: number;
  category: string;
}

const Explore: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [trending] = useState<TrendingTopic[]>([
    { hashtag: '#JavaScript', count: 125000, category: 'Technology' },
    { hashtag: '#React', count: 89000, category: 'Technology' },
    { hashtag: '#WebDev', count: 67000, category: 'Technology' },
    { hashtag: '#MongoDB', count: 45000, category: 'Technology' },
    { hashtag: '#NodeJS', count: 38000, category: 'Technology' },
    { hashtag: '#TypeScript', count: 32000, category: 'Technology' },
    { hashtag: '#CSS', count: 28000, category: 'Technology' },
    { hashtag: '#HTML', count: 25000, category: 'Technology' },
  ]);

  useEffect(() => {
    loadPublicTweets();
  }, []);

  const loadPublicTweets = async (before?: string) => {
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
    } catch (error) {
      console.error('Failed to load public tweets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const response = await axios.get(`/tweets/search/tweets?q=${encodeURIComponent(searchQuery)}`);
      setTweets(response.data.tweets);
      setHasMore(false);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(tweet => 
      tweet._id === tweetId ? { ...tweet, ...updates } : tweet
    ));
  };

  const loadMore = () => {
    if (tweets.length > 0 && !searchQuery) {
      const lastTweet = tweets[tweets.length - 1];
      loadPublicTweets(lastTweet.createdAt);
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setLoading(true);
    loadPublicTweets();
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white mb-4">Explore</h1>
        
        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search Twitter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Trending Topics */}
      {!searchQuery && (
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Trending</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {trending.slice(0, 6).map((topic, index) => (
              <button
                key={topic.hashtag}
                onClick={() => setSearchQuery(topic.hashtag)}
                className="text-left p-3 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <p className="text-gray-500 text-sm">{index + 1} · Trending in {topic.category}</p>
                <p className="text-white font-medium">{topic.hashtag}</p>
                <p className="text-gray-500 text-sm">{formatCount(topic.count)} Tweets</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      {searchQuery && (
        <div className="border-b border-gray-800 p-4">
          <h2 className="text-lg font-bold text-white">
            {searchLoading ? 'Searching...' : `Search results for "${searchQuery}"`}
          </h2>
        </div>
      )}

      {/* Tweets */}
      {loading || searchLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <TweetList
          tweets={tweets}
          onTweetUpdate={handleTweetUpdate}
          hasMore={hasMore && !searchQuery}
          onLoadMore={loadMore}
        />
      )}
    </div>
  );
};

export default Explore;