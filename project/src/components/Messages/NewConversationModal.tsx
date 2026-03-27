import React, { useState } from 'react';
import axios from 'axios';

interface Props {
  onClose: () => void;
  onStarted: (conversation: any) => void;
}

const NewConversationModal: React.FC<Props> = ({ onClose, onStarted }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState('');

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/users/search/users`, { params: { q: query, limit: 10 } });
      setResults(res.data.users || []);
      setSelected(0);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const start = async (userId: string) => {
    setLoading(true);
    try {
      const res = await axios.post('/dm/conversations', { userId });
      onStarted(res.data.conversation);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-gray-900 text-white rounded-lg w-full max-w-lg p-4" onClick={(e)=>e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-3">New message</h3>
        {error && <div className="bg-red-700 p-2 rounded mb-2">{error}</div>}
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-gray-800 rounded px-3 py-2"
            placeholder="Search by username or name"
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            onKeyDown={(e)=>{
              if (e.key === 'Enter') {
                if (results.length === 1) { start(results[0]._id); }
                else if (results.length > 1) { start(results[Math.max(0, Math.min(selected, results.length-1))]._id); }
                else { search(); }
              } else if (e.key === 'ArrowDown') {
                setSelected(s => Math.min((results.length-1), s+1));
              } else if (e.key === 'ArrowUp') {
                setSelected(s => Math.max(0, s-1));
              }
            }}
          />
          <button className="btn-primary px-4 py-2 rounded" onClick={search} disabled={loading}>Search</button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {loading ? <div className="text-gray-400">Searching...</div> : results.length === 0 ? <div className="text-gray-500">No results</div> : results.map((u, idx) => (
            <div key={u._id} className={`flex items-center justify-between p-2 border border-gray-800 rounded ${idx===selected ? 'bg-gray-800' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                  {u.profile?.avatarUrl ? <img src={u.profile.avatarUrl} alt={u.username} className="w-10 h-10 object-cover"/> : <span className="text-gray-400">@</span>}
                </div>
                <div>
                  <div className="font-medium">{u.profile?.displayName || u.username}</div>
                  <div className="text-gray-500 text-sm">@{u.username}</div>
                </div>
              </div>
              <button className="btn-primary px-3 py-1 rounded" onClick={()=>start(u._id)} disabled={loading}>Start</button>
            </div>
          ))}
        </div>
        <div className="text-right mt-3">
          <button className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;


