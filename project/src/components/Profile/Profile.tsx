import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EditProfileModal from './EditProfileModal';
import TweetList from '../Tweet/TweetList';
import axios from 'axios';
import { useSocket } from '../../contexts/SocketContext';

interface UserProfile {
  _id: string;
  username: string;
  profile: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatarUrl: string;
    bannerUrl: string;
    verified: boolean;
  };
  stats: {
    followersCount: number;
    followingCount: number;
    tweetsCount: number;
    likesCount: number;
  };
  createdAt: string;
}

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

const Profile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tweetsLoading, setTweetsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (username) {
      loadProfile();
      loadUserTweets();
    }
  }, [username]);

  useEffect(() => {
    if (!socket || !profile) return;
    const onNewTweet = (data: any) => {
      // Only insert if the tweet belongs to this profile
      if (data?.tweet?.author?._id === profile._id || data?.tweet?.author === profile._id) {
        setTweets(prev => [data.tweet, ...prev]);
      }
    };
    socket.on('tweet_created', onNewTweet);
    return () => { socket.off('tweet_created', onNewTweet); };
  }, [socket, profile]);

  const loadProfile = async () => {
    try {
      const response = await axios.get(`/users/${username}`);
      setProfile(response.data.user);
      setIsFollowing(response.data.isFollowing);
      setIsOwnProfile(response.data.isOwnProfile);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadUserTweets = async () => {
    try {
      const response = await axios.get(`/users/${username}/tweets`);
      setTweets(response.data.tweets);
    } catch (err: any) {
      console.error('Failed to load user tweets:', err);
    } finally {
      setTweetsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`/follows/${profile._id}`);
        setIsFollowing(false);
        setProfile({
          ...profile,
          stats: {
            ...profile.stats,
            followersCount: profile.stats.followersCount - 1
          }
        });
      } else {
        await axios.post(`/follows/${profile._id}`);
        setIsFollowing(true);
        setProfile({
          ...profile,
          stats: {
            ...profile.stats,
            followersCount: profile.stats.followersCount + 1
          }
        });
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTweetUpdate = (tweetId: string, updates: Partial<Tweet>) => {
    setTweets(prev => prev.map(tweet => 
      tweet._id === tweetId ? { ...tweet, ...updates } : tweet
    ));
  };

  const handleTweetDelete = (tweetId: string) => {
    setTweets(prev => prev.filter(t => t._id !== tweetId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">{error || 'Profile not found'}</p>
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
        <div>
          <h1 className="text-xl font-bold text-white">{profile.profile.displayName}</h1>
          <p className="text-sm text-gray-500">{formatCount(profile.stats.tweetsCount)} Tweets</p>
        </div>
      </div>

      {/* Profile Header */}
      <div>
        {/* Banner */}
        <div className="profile-banner">
          {profile.profile.bannerUrl && (
            <img
              src={profile.profile.bannerUrl}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="px-4 pb-4">
          <div className="flex justify-between items-start mb-4">
            {/* Avatar */}
            <div className="profile-avatar">
              <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center">
                {profile.profile.avatarUrl ? (
                  <img
                    src={profile.profile.avatarUrl}
                    alt={profile.profile.displayName}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4">
              {isOwnProfile ? (
                <button className="btn-secondary px-6 py-2 rounded-full font-bold" onClick={() => setShowEditModal(true)}>
                  <Settings className="h-4 w-4 mr-2 inline" />
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 rounded-full font-bold ${
                      isFollowing
                        ? 'btn-secondary hover:bg-red-900 hover:text-red-400 hover:border-red-400'
                        : 'btn-primary'
                    }`}
                  >
                    {followLoading ? (
                      <div className="loading-spinner"></div>
                    ) : isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </button>
                  <button
                    className="btn-secondary px-6 py-2 rounded-full font-bold"
                    onClick={async () => {
                      try {
                        const res = await axios.post('/dm/conversations', { userId: profile._id });
                        const convoId = res.data.conversation._id;
                        navigate(`/messages?c=${convoId}`);
                      } catch (e) {
                        console.error('Start conversation failed', e);
                      }
                    }}
                  >
                    Message
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Name and Username */}
          <div className="mb-3">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white">
                {profile.profile.displayName}
              </h1>
              {profile.profile.verified && (
                <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <p className="text-gray-500">@{profile.username}</p>
          </div>

          {/* Bio */}
          {profile.profile.bio && (
            <p className="text-white mb-3">{profile.profile.bio}</p>
          )}

          {/* Details */}
          <div className="flex flex-wrap items-center space-x-4 text-gray-500 text-sm mb-3">
            {profile.profile.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{profile.profile.location}</span>
              </div>
            )}
            {profile.profile.website && (
              <div className="flex items-center space-x-1">
                <LinkIcon className="h-4 w-4" />
                <a
                  href={profile.profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  {profile.profile.website}
                </a>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {formatDate(profile.createdAt)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex space-x-6 text-sm">
            <Link
              to={`/profile/${profile.username}/following`}
              className="hover:underline"
            >
              <span className="font-bold text-white">
                {formatCount(profile.stats.followingCount)}
              </span>
              <span className="text-gray-500 ml-1">Following</span>
            </Link>
            <Link
              to={`/profile/${profile.username}/followers`}
              className="hover:underline"
            >
              <span className="font-bold text-white">
                {formatCount(profile.stats.followersCount)}
              </span>
              <span className="text-gray-500 ml-1">Followers</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex">
          <button className="flex-1 py-4 text-center font-medium text-white border-b-2 border-blue-400">
            Tweets
          </button>
          <Link to={`/profile/${profile.username}/replies`} className="flex-1 py-4 text-center font-medium text-gray-500 hover:text-white">
            Tweets & replies
          </Link>
          <button className="flex-1 py-4 text-center font-medium text-gray-500 hover:text-white">
            Media
          </button>
          <Link to={`/profile/${profile.username}/likes`} className="flex-1 py-4 text-center font-medium text-gray-500 hover:text-white">
            Likes
          </Link>
        </div>
      </div>

      {/* Tweets */}
      {tweetsLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <TweetList tweets={tweets} onTweetUpdate={handleTweetUpdate} onTweetDelete={handleTweetDelete} />
      )}
      {isOwnProfile && profile && showEditModal && (
        <EditProfileModal
          initialData={{
            displayName: profile.profile.displayName || '',
            bio: profile.profile.bio || '',
            location: profile.profile.location || '',
            website: profile.profile.website || '',
            avatarUrl: profile.profile.avatarUrl || '',
            bannerUrl: profile.profile.bannerUrl || ''
          }}
          onClose={() => setShowEditModal(false)}
          onSave={async (data) => {
            await updateProfile(data);
            setProfile(prev => prev ? ({
              ...prev,
              profile: {
                ...prev.profile,
                ...data
              }
            }) : prev);
          }}
        />
      )}
    </div>
  );
};

export default Profile;