import React from 'react';
import TweetCard from './TweetCard';
import ReactMemo from 'react';

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

interface TweetListProps {
  tweets: Tweet[];
  onTweetUpdate: (tweetId: string, updates: Partial<Tweet>) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onTweetDelete?: (tweetId: string) => void;
  rightAddon?: (tweet: Tweet) => React.ReactNode;
}

const TweetList: React.FC<TweetListProps> = ({ 
  tweets, 
  onTweetUpdate, 
  hasMore, 
  onLoadMore,
  onTweetDelete,
  rightAddon
}) => {
  return (
    <div>
      {tweets.map((tweet) => (
        <div key={tweet._id} className="relative">
          {rightAddon && (
            <div className="absolute right-4 top-4 z-10">
              {rightAddon(tweet)}
            </div>
          )}
          <TweetCard
            tweet={tweet}
            onUpdate={(updates) => onTweetUpdate(tweet._id, updates)}
            onDelete={() => onTweetDelete && onTweetDelete(tweet._id)}
          />
        </div>
      ))}
      
      {hasMore && onLoadMore && (
        <div className="p-4 text-center">
          <button
            onClick={onLoadMore}
            className="btn-secondary px-6 py-2 rounded-full"
          >
            Load more tweets
          </button>
        </div>
      )}
      
      {tweets.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No tweets to show</p>
        </div>
      )}
    </div>
  );
};

export default TweetList;