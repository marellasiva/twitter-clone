import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import NewConversationModal from './NewConversationModal';

interface Participant {
  _id: string;
  username: string;
  profile: { displayName: string; avatarUrl: string };
}

interface Conversation {
  _id: string;
  participants: Participant[];
  lastMessageAt: string;
  lastMessageText?: string;
}

interface DirectMessage {
  _id: string;
  from: Participant;
  to: Participant;
  text: string;
  createdAt: string;
}

const Messages: React.FC = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showNew, setShowNew] = useState(false);
  // Removed unused search state variables

  const me = useMemo(() => user, [user]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const isBlocked = (userId?: string) => !!userId && blockedUsers.includes(userId);

  // Preload cached conversations/messages and URL param before network
  useEffect(() => {
    try {
      const cachedConvos = sessionStorage.getItem('dm_conversations');
      if (cachedConvos) {
        const parsed = JSON.parse(cachedConvos) as Conversation[];
        setConversations(parsed);
      }
      const url = new URL(window.location.href);
      const cid = url.searchParams.get('c');
      const stored = localStorage.getItem('dm_active_id');
      if (cid) setActiveId(cid);
      else if (stored) setActiveId(stored);
    } catch {}
  }, []);

  // Load conversations and blocked users
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [conversationsRes, blocksRes] = await Promise.all([
          axios.get('/dm/conversations'),
          axios.get('/blocks')
        ]);
        setConversations(conversationsRes.data.conversations || []);
        // Cache conversations for instant restore next time
        sessionStorage.setItem('dm_conversations', JSON.stringify(conversationsRes.data.conversations || []));
        setBlockedUsers(blocksRes.data.blocks.map((b: any) => b.blocked._id));
        // Auto-select by query param ?c=, else from localStorage, else first
        const url = new URL(window.location.href);
        const cid = url.searchParams.get('c');
        const stored = localStorage.getItem('dm_active_id');
        if (cid) setActiveId(cid);
        else if (stored && conversationsRes.data.conversations?.some((c: any) => c._id === stored)) setActiveId(stored);
        else if (conversationsRes.data.conversations?.length > 0) setActiveId(conversationsRes.data.conversations[0]._id);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Keep URL and localStorage in sync with activeId
  useEffect(() => {
    if (!activeId) return;
    // Update query param ?c=activeId without full reload
    const url = new URL(window.location.href);
    if (url.searchParams.get('c') !== activeId) {
      url.searchParams.set('c', activeId);
      window.history.replaceState({}, '', url.toString());
    }
    localStorage.setItem('dm_active_id', activeId);
  }, [activeId]);

  // Load messages for active (use cache immediately, then refresh)
  useEffect(() => {
    const load = async () => {
      if (!activeId) return;
      // Ensure active conversation exists in list; if not, fetch it
      try {
        if (!conversations.some(c => c._id === activeId)) {
          const res = await axios.get(`/dm/conversations/${activeId}`);
          const convo = res.data.conversation as Conversation;
          setConversations(prev => [convo, ...prev]);
          sessionStorage.setItem('dm_conversations', JSON.stringify([convo, ...conversations]));
        }
      } catch (e) {
        // ignore; fetch might fail if deleted
      }
      // show cached instantly if present
      try {
        const cached = sessionStorage.getItem(`dm_msgs_${activeId}`);
        if (cached) setMessages(JSON.parse(cached));
      } catch {}
      // then refresh from server
      const res = await axios.get('/dm/messages', { params: { conversationId: activeId, limit: 50 } });
      const list = res.data.messages || [];
      setMessages(list);
      // If the conversation is missing in the left list, synthesize it from the message participants
      if (!conversations.some(c => c._id === activeId) && list.length > 0) {
        const first = list[0];
        const meId = me?._id;
        const other = first.from?._id === meId ? first.to : first.from;
        if (other) {
          const synthetic: Conversation = {
            _id: activeId,
            participants: [
              { _id: meId as string, username: me?.username || 'me', profile: { displayName: me?.profile?.displayName || me?.username || 'Me', avatarUrl: me?.profile?.avatarUrl || '' } } as any,
              other as any
            ],
            lastMessageAt: first.createdAt,
            lastMessageText: first.text
          };
          setConversations(prev => {
            // Check if already exists before adding
            if (prev.some(c => c._id === activeId)) return prev;
            return [synthetic, ...prev];
          });
          try { 
            const updated = [synthetic, ...conversations.filter(c => c._id !== activeId)];
            sessionStorage.setItem('dm_conversations', JSON.stringify(updated)); 
          } catch {}
        }
      }
      sessionStorage.setItem(`dm_msgs_${activeId}`, JSON.stringify(list));
      // Focus composer when a conversation opens
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    load();
  }, [activeId]);

  // Live receive
  useEffect(() => {
    if (!socket) return;
    const onDm = (payload: any) => {
      if (isBlocked(payload.from?._id)) return;
      // If message belongs to active convo, append; otherwise bump conversations
      if (payload.conversationId === activeId) {
        setMessages(prev => [...prev, {
          _id: payload.id,
          from: payload.from,
          to: payload.to,
          text: payload.text,
          createdAt: payload.timestamp
        } as any]);
      }
      setConversations(prev => prev.map(c => c._id === payload.conversationId ? { ...c, lastMessageText: payload.text, lastMessageAt: new Date(payload.timestamp).toISOString() } : c));
    };
    socket.on('dm_receive', onDm);
    return () => { socket.off('dm_receive', onDm); };
  }, [socket, activeId]);

  const otherOf = (c: Conversation) => c.participants.find(p => p._id !== me?._id) as Participant;

  const send = async () => {
    if (!text.trim() || !activeId) return;
    const convo = conversations.find(c => c._id === activeId);
    if (convo && isBlocked(otherOf(convo)?._id)) {
      alert('You have blocked this user. Unblock to send messages.');
      return;
    }
    try {
      const res = await axios.post('/dm/messages', { conversationId: activeId, text: text.trim() });
      const msg = res.data.message as DirectMessage;
      setMessages(prev => [...prev, msg]);
      setConversations(prev => prev.map(c => c._id === activeId ? { ...c, lastMessageText: msg.text, lastMessageAt: msg.createdAt } : c));
      setText('');
      inputRef.current?.focus();
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert('Cannot send message - user is blocked');
      } else {
        console.error('Failed to send message:', error);
        alert('Failed to send message');
      }
    }
  };

  const deleteConversation = async () => {
    if (!activeId) return;
    if (!confirm('Delete this conversation?')) return;
    await axios.delete(`/dm/conversations/${activeId}`);
    setConversations(prev => prev.filter(c => c._id !== activeId));
    setActiveId(null);
    setMessages([]);
  };

  const blockUser = async () => {
    if (!activeId) return;
    const convo = conversations.find(c => c._id === activeId);
    const other = convo ? otherOf(convo) : undefined;
    if (!other) return;
    if (!confirm(`Block @${other.username}? You will no longer receive messages from this user.`)) return;
    
    try {
      await axios.post(`/blocks/${other._id}`);
      setBlockedUsers(prev => [...prev, other._id]);
      setConversations(prev => prev.filter(c => otherOf(c)?._id !== other._id));
      setActiveId(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to block user:', error);
      alert('Failed to block user');
    }
  };

  const unblockUser = async () => {
    if (!activeId) return;
    const convo = conversations.find(c => c._id === activeId);
    const other = convo ? otherOf(convo) : undefined;
    if (!other) return;
    if (!confirm(`Unblock @${other.username}? They will be able to message you.`)) return;
    try {
      await axios.delete(`/blocks/${other._id}`);
      setBlockedUsers(prev => prev.filter(id => id !== other._id));
      // Optionally, re-fetch conversations if needed later
    } catch (error) {
      console.error('Failed to unblock user:', error);
      alert('Failed to unblock user');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="loading-spinner"></div></div>;
  }

  const nameOf = (p?: Participant) => p?.profile?.displayName || p?.username || 'User';

  return (
    <div className="flex h-full">
      {/* Left: Conversations */}
      <div className="w-80 border-r border-gray-800 overflow-y-auto">
        <div className="sticky top-0 bg-black/80 backdrop-blur p-4 border-b border-gray-800">
          <h2 className="text-white font-bold">Messages</h2>
          <button className="mt-3 btn-primary px-3 py-1 rounded text-sm" onClick={() => setShowNew(true)}>New message</button>
        </div>
        {conversations.length === 0 ? (
          <div className="p-4 text-gray-400">No conversations yet.</div>
        ) : conversations.map(c => {
          const other = otherOf(c);
          return (
            <button key={c._id} onClick={() => setActiveId(c._id)} className={`w-full text-left p-3 hover:bg-gray-900 ${activeId === c._id ? 'bg-gray-900' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                  {other?.profile?.avatarUrl ? <img src={other.profile.avatarUrl} alt={other.username} className="w-10 h-10 object-cover"/> : <span className="text-gray-400">@</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-white font-medium">{other?.profile?.displayName || other?.username}</div>
                  <div className="text-gray-500 text-sm line-clamp-1">{c.lastMessageText || 'Say hi'}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Thread */}
      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 bg-black/80 backdrop-blur p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {activeId ? (() => {
              const convo = conversations.find(c => c._id === activeId);
              const other = convo ? otherOf(convo) : undefined;
              return (
                <>
                  <div className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                    {other?.profile?.avatarUrl ? <img src={other.profile.avatarUrl} alt={other?.username || 'user'} className="w-9 h-9 object-cover"/> : <span className="text-gray-400 text-sm">@</span>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-bold truncate">{nameOf(other)}</div>
                    {other?.username && <div className="text-gray-500 text-sm truncate">@{other.username}</div>}
                  </div>
                </>
              );
            })() : (
              <h2 className="text-white font-bold">Select a conversation</h2>
            )}
          </div>
          {activeId && (() => {
            const convo = conversations.find(c => c._id === activeId);
            const other = convo ? otherOf(convo) : undefined;
            const blocked = other ? isBlocked(other._id) : false;
            return (
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm" onClick={deleteConversation}>Delete conversation</button>
                {!blocked ? (
                  <button className="px-3 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 text-sm" onClick={blockUser}>Block</button>
                ) : (
                  <button className="px-3 py-1 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 text-sm" onClick={unblockUser}>Unblock</button>
                )}
              </div>
            );
          })()}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(!activeId || messages.length === 0) ? (
            <div className="text-gray-400">{activeId ? 'No messages yet. Start chatting!' : 'Choose a conversation from the left.'}</div>
          ) : (
            messages.map(m => (
              <div key={m._id} className={`group max-w-[70%] ${m.from?._id === me?._id ? 'ml-auto' : ''}`}>
                <div className={`px-3 py-2 rounded-2xl ${m.from?._id === me?._id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>{m.text}</div>
                {m.from?._id === me?._id && (
                  <div className="hidden group-hover:flex gap-2 mt-1 justify-end text-xs">
                    <button
                      className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                      onClick={async () => {
                        try {
                          const text = prompt('Edit message', m.text);
                          if (text == null) return;
                          const trimmed = text.trim();
                          if (!trimmed) return alert('Message cannot be empty');
                          if (trimmed === m.text) return;
                          const res = await axios.patch(`/dm/messages/${m._id}`, { text: trimmed });
                          setMessages(prev => prev.map(x => x._id === m._id ? { ...x, text: res.data.message.text } : x));
                        } catch (error: any) {
                          console.error('Edit failed', error);
                          const msg = error?.response?.data?.error || 'Failed to edit message';
                          alert(msg);
                        }
                      }}
                    >Edit</button>
                    <button
                      className="px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
                      onClick={async () => {
                        try {
                          if (!confirm('Delete this message?')) return;
                          await axios.delete(`/dm/messages/${m._id}`);
                          setMessages(prev => prev.filter(x => x._id !== m._id));
                        } catch (error: any) {
                          console.error('Delete failed', error);
                          const msg = error?.response?.data?.error || 'Failed to delete message';
                          alert(msg);
                        }
                      }}
                    >Delete</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-gray-800 p-3 flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="Write a message"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            disabled={!activeId}
          />
          <button className="btn-primary px-4 py-2 rounded disabled:opacity-50" onClick={send} disabled={!activeId || !text.trim()}>Send</button>
        </div>
      </div>
      {showNew && (
        <NewConversationModal onClose={() => setShowNew(false)} onStarted={(convo) => { setShowNew(false); setConversations(prev => [convo, ...prev.filter(c => c._id !== convo._id)]); setActiveId(convo._id); }} />
      )}
    </div>
  );
};

export default Messages;


