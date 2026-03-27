import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

interface UserItem {
  _id: string;
  username: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    verified: boolean;
  };
  stats?: {
    followersCount: number;
    followingCount: number;
  };
}

const SearchUsers: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [users, setUsers] = useState<UserItem[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!q.trim()) return;
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/users/search/users?q=${encodeURIComponent(q)}&limit=20`);
        setUsers(res.data.users || []);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to search users');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [q]);

  return (
    <div>
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">Search: {q}</h1>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No profiles found</div>
      ) : (
        <ul>
          {users.map((u) => (
            <li key={u._id} className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <Link to={`/profile/${u.username}`} className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                  {u.profile.avatarUrl ? (
                    <img src={u.profile.avatarUrl} alt={u.profile.displayName} className="w-12 h-12 object-cover" />
                  ) : (
                    <span className="text-gray-400">@</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-bold">{u.profile.displayName || u.username}</span>
                    {u.profile.verified && (
                      <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="text-gray-500 text-sm">@{u.username}</div>
                </div>
              </Link>
              <button
                className="px-4 py-1 rounded-full font-bold border btn-secondary"
                onClick={async () => {
                  try {
                    const res = await axios.post('/dm/conversations', { userId: u._id });
                    navigate(`/messages?c=${res.data.conversation._id}`);
                  } catch {}
                }}
              >
                Message
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchUsers;


