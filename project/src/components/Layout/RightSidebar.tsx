import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface TrendingTopic {
  hashtag: string;
  count: number;
}

interface SuggestedUser {
  _id: string;
  username: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    verified: boolean;
  };
  stats: {
    followersCount: number;
  };
}

const RightSidebar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [trending] = useState<TrendingTopic[]>([
    { hashtag: '#JavaScript', count: 125000 },
    { hashtag: '#React', count: 89000 },
    { hashtag: '#WebDev', count: 67000 },
    { hashtag: '#MongoDB', count: 45000 },
    { hashtag: '#NodeJS', count: 38000 },
  ]);

  useEffect(() => {
    // Fetch suggested users (mock data for now)
    const mockUsers: SuggestedUser[] = [
      {
        _id: '1',
        username: 'techguru',
        profile: {
          displayName: 'Tech Guru',
          avatarUrl: '',
          verified: true
        },
        stats: {
          followersCount: 125000
        }
      },
      {
        _id: '2',
        username: 'designpro',
        profile: {
          displayName: 'Design Pro',
          avatarUrl: '',
          verified: false
        },
        stats: {
          followersCount: 89000
        }
      }
    ];
    setSuggestedUsers(mockUsers);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      try {
        setSearching(true);
        const q = searchQuery.trim();
        const response = await axios.get(`/users/search/users?q=${encodeURIComponent(q)}&limit=5`);
        const users = response.data.users || [];
        // If exact match, go straight to profile
        const exact = users.find((u: any) => u.username.toLowerCase() === q.toLowerCase());
        if (exact) {
          setSearchResults([]);
          navigate(`/profile/${exact.username}`);
        } else {
          setSearchResults(users);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
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

  return (
    <div className="w-80 p-4 space-y-6">
      {/* Search */}
      <div className="sticky top-0 bg-black pb-4">
        <form onSubmit={handleSearch} action="/search">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search Twitter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
              name="q"
            />
            {(searchResults.length > 0 || searching) && (
              <div className="absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-800 rounded-xl shadow-lg z-20 p-2">
                {searching ? (
                  <div className="p-3 text-gray-400">Searching...</div>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u._id}
                      type="button"
                      onClick={() => { setSearchResults([]); navigate(`/profile/${u.username}`); }}
                      className="w-full text-left p-2 rounded hover:bg-gray-800 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                        {u.profile.avatarUrl ? (
                          <img src={u.profile.avatarUrl} alt={u.profile.displayName} className="w-8 h-8 object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm">@</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium">{u.profile.displayName}</div>
                        <div className="text-gray-500 text-sm">@{u.username}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Trending */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-xl font-bold text-white mb-4">What's happening</h2>
        <div className="space-y-3">
          {trending.map((topic, index) => (
            <div key={topic.hashtag} className="hover:bg-gray-800 p-2 rounded cursor-pointer">
              <p className="text-gray-500 text-sm">Trending in Technology</p>
              <p className="text-white font-medium">{topic.hashtag}</p>
              <p className="text-gray-500 text-sm">{formatCount(topic.count)} Tweets</p>
            </div>
          ))}
        </div>
      </div>

      {/* Who to follow */}
      <div className="bg-gray-900 rounded-2xl p-4">
        <h2 className="text-xl font-bold text-white mb-4">Who to follow</h2>
        <div className="space-y-4">
          {suggestedUsers.map((user) => (
            <div key={user._id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  {user.profile.avatarUrl ? (
                    <img
                      src={user.profile.avatarUrl}
                      alt={user.profile.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {user.profile.displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <p className="text-white font-medium">{user.profile.displayName}</p>
                    {user.profile.verified && (
                      <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm">@{user.username}</p>
                </div>
              </div>
              <button className="btn-secondary px-4 py-1 rounded-full text-sm font-medium">
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;