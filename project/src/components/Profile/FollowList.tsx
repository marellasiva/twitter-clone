import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

interface UserListItem {
  _id: string;
  username: string;
  profile: {
    displayName: string;
    avatarUrl: string;
    verified: boolean;
    bio?: string;
  };
  stats?: {
    followersCount: number;
    followingCount: number;
  };
}

const FollowList: React.FC<{ type: 'followers' | 'following' }> = ({ type }) => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      if (!username) return;
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`/users/${username}/${type}`);
        setUsers(response.data.users || []);
      } catch (err: any) {
        setError(err.response?.data?.error || `Failed to load ${type}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, type]);

  const toggleFollow = async (target: UserListItem) => {
    if (!user || busyIds[target._id]) return;
    setBusyIds(prev => ({ ...prev, [target._id]: true }));
    try {
      // optimistic UI: invert based on a simple heuristic (not known here), so refetch instead
      // Call appropriate endpoint based on whether current user follows target
      // We don't have isFollowing flag here, so just try follow then fallback to unfollow on 400
      await axios.post(`/follows/${target._id}`);
    } catch (err: any) {
      // If already following, unfollow
      try {
        await axios.delete(`/follows/${target._id}`);
      } catch {
        // ignore
      }
    } finally {
      // refresh list to reflect changes
      try {
        const response = await axios.get(`/users/${username}/${type}`);
        setUsers(response.data.users || []);
      } catch {}
      setBusyIds(prev => ({ ...prev, [target._id]: false }));
    }
  };

  return (
    <div>
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4 flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-800 rounded-full">
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{type === 'followers' ? 'Followers' : 'Following'}</h1>
          <p className="text-sm text-gray-500">@{username}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-400">{error}</div>
      ) : users.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No {type} yet</div>
      ) : (
        <ul>
          {users.map(u => (
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
                  {u.profile.bio && (
                    <div className="text-gray-300 text-sm mt-1 line-clamp-2">{u.profile.bio}</div>
                  )}
                </div>
              </Link>
              {user && user.username !== u.username && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFollow(u)}
                    disabled={!!busyIds[u._id]}
                    className={`px-4 py-1 rounded-full font-bold border ${busyIds[u._id] ? 'opacity-60' : 'hover:opacity-90'} btn-secondary`}
                  >
                    {busyIds[u._id] ? '...' : 'Follow/Unfollow'}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await axios.post('/dm/conversations', { userId: u._id });
                        navigate(`/messages?c=${res.data.conversation._id}`);
                      } catch (e) {
                        // ignore
                      }
                    }}
                    className="px-4 py-1 rounded-full font-bold border btn-secondary"
                  >
                    Message
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FollowList;


