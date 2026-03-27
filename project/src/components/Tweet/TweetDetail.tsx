import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import TweetCard from './TweetCard';
import TweetComposer from './TweetComposer';
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

const TweetDetail: React.FC = () => {
  const { tweetId } = useParams<{ tweetId: string }>();
  const navigate = useNavigate();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tweetId) {
      loadTweet();
    }
  }, [tweetId]);

  const loadTweet = async () => {
    try {
      const response = await axios.get(`/tweets/${tweetId}`);
      setTweet(response.data.tweet);
      setReplies(response.data.replies || []);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to load tweet';
      setError(message);
      // If tweet is deleted or not found, return to previous page or home
      if (err?.response?.status === 404) {
        setTimeout(() => {
          if (window.history.length > 1) navigate(-1);
          else navigate('/home');
        }, 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTweetUpdate = (updates: Partial<Tweet>) => {
    if (tweet) {
      setTweet({ ...tweet, ...updates });
    }
  };

  const handleReplyCreated = (newReply: Tweet) => {
    setReplies(prev => [newReply, ...prev]);
    if (tweet) {
      setTweet({
        ...tweet,
        engagement: {
          ...tweet.engagement,
          repliesCount: tweet.engagement.repliesCount + 1
        }
      });
    }
  };

  const handleReplyUpdate = (replyId: string, updates: Partial<Tweet>) => {
    setReplies(prev => prev.map(reply => 
      reply._id === replyId ? { ...reply, ...updates } : reply
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !tweet) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error || 'Tweet not found'}</p>
        <Link to="/home" className="text-blue-400 hover:underline mt-4 inline-block">
          ← Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4 flex items-center space-x-4">
        <Link to="/home" className="p-2 hover:bg-gray-800 rounded-full">
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <h1 className="text-xl font-bold text-white">Tweet</h1>
      </div>

      {/* Main Tweet */}
      <div className="border-b border-gray-800">
        <TweetCard tweet={tweet} onUpdate={handleTweetUpdate} onDelete={() => window.history.back()} />
      </div>

      {/* Reply Composer */}
      <div className="border-b border-gray-800">
        <TweetComposer
          onTweetCreated={handleReplyCreated}
          replyTo={tweet._id}
          placeholder="Tweet your reply"
        />
      </div>

      {/* Replies */}
      <div>
        {replies.length > 0 ? (
          replies.map((reply) => (
            <TweetCard
              key={reply._id}
              tweet={reply}
              onUpdate={(updates) => handleReplyUpdate(reply._id, updates)}
              onDelete={() => setReplies(prev => prev.filter(r => r._id !== reply._id))}
            />
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No replies yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TweetDetail;