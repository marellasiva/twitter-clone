import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

interface UserMin { _id: string; username: string; profile: { displayName: string; avatarUrl: string } }
interface NotificationItem {
  _id: string;
  type: 'like' | 'reply' | 'follow' | 'mention' | 'retweet';
  actor: UserMin;
  tweet?: { _id: string; content: { text: string } };
  isRead: boolean;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'mentions'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/notifications');
        setItems(res.data.notifications || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter(n => filter === 'all' ? true : n.type === 'mention');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="loading-spinner"/></div>;

  return (
    <div>
      <div className="sticky top-0 bg-black/80 backdrop-blur border-b border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white">Notifications</h1>
        <div className="mt-3 flex gap-2">
          <button className={`px-3 py-1 rounded ${filter==='all'?'bg-blue-600 text-white':'bg-gray-800'}`} onClick={()=>setFilter('all')}>All</button>
          <button className={`px-3 py-1 rounded ${filter==='mentions'?'bg-blue-600 text-white':'bg-gray-800'}`} onClick={()=>setFilter('mentions')}>Mentions</button>
          <button className="ml-auto px-3 py-1 rounded bg-gray-800 hover:bg-gray-700" onClick={async()=>{ await axios.post('/notifications/read'); setItems(prev=>prev.map(i=>({...i,isRead:true}))); }}>Mark all as read</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No notifications yet</div>
      ) : filtered.map(n => (
        <div key={n._id} className={`flex gap-3 p-4 border-b border-gray-800 ${n.isRead? 'bg-transparent':'bg-gray-900/40'}`}>
          <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
            {n.actor?.profile?.avatarUrl ? (
              <img src={n.actor.profile.avatarUrl} alt={n.actor.username} className="w-10 h-10 object-cover"/>
            ) : <div className="w-10 h-10"/>}
          </div>
          <div className="min-w-0">
            <div className="text-white">
              <Link to={`/profile/${n.actor?.username}`} className="font-semibold hover:underline">{n.actor?.profile?.displayName || n.actor?.username}</Link>
              {n.type === 'follow' && <span className="text-gray-400"> followed you</span>}
              {n.type === 'like' && <span className="text-gray-400"> liked your tweet</span>}
              {n.type === 'retweet' && <span className="text-gray-400"> retweeted your tweet</span>}
              {n.type === 'reply' && <span className="text-gray-400"> replied to your tweet</span>}
              {n.type === 'mention' && <span className="text-gray-400"> mentioned you</span>}
            </div>
            {n.tweet && (
              <Link to={`/tweet/${n.tweet._id}`} className="block mt-1 text-gray-400 line-clamp-2 hover:underline">{n.tweet.content?.text}</Link>
            )}
            <div className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Notifications;


