import React, { useEffect, useRef, useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, User, Pin, Bookmark, Link as LinkIcon } from 'lucide-react';
import TweetComposer from './TweetComposer';
import { useAuth } from '../../contexts/AuthContext';
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

interface TweetCardProps {
  tweet: Tweet;
  onUpdate: (updates: Partial<Tweet>) => void;
  onDelete?: () => void;
}

const TweetCard: React.FC<TweetCardProps> = ({ tweet, onUpdate, onDelete }) => {
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const openedAtRef = useRef<number>(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    if (loading) return;
    setLoading(true);

    try {
      const response = await axios.post(`/tweets/${tweet._id}/like`);
      onUpdate({
        isLiked: response.data.liked,
        engagement: {
          ...tweet.engagement,
          likesCount: response.data.likesCount
        }
      });
      try {
        const detail = {
          tweetId: tweet._id,
          liked: response.data.liked,
          likesCount: response.data.likesCount,
          tweet: {
            ...tweet,
            isLiked: response.data.liked,
            engagement: { ...tweet.engagement, likesCount: response.data.likesCount }
          }
        };
        window.dispatchEvent(new CustomEvent('tweet-like-changed', { detail }));
      } catch {}
    } catch (error: any) {
      console.error('Failed to like tweet:', error);
      try {
        if (error?.response?.data?.error) {
          alert(error.response.data.error);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const [showReplies, setShowReplies] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replies, setReplies] = useState<Array<{ _id: string; author: any; content: { text: string }; createdAt: string }>>([]);

  const handleComment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Close other cards' reply panes, then open this one
    try { window.dispatchEvent(new CustomEvent('close-all-replies', { detail: { except: tweet._id } })); } catch {}
    const next = !showReplies || (showReplies && false);
    setShowReplies(true);
    if (!showReplies && replies.length === 0 && !repliesLoading) {
      setRepliesLoading(true);
      try {
        const res = await axios.get(`/tweets/${tweet._id}`);
        setReplies(res.data.replies || []);
      } catch (err) {
        // ignore
      } finally {
        setRepliesLoading(false);
      }
    }
  };

  const handleRetweet = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const event = new CustomEvent('open-tweet-modal', { detail: { quoteTweetOf: tweet._id, placeholder: 'Add a comment' } });
    window.dispatchEvent(event);
  };

  // Listen for global close so only one reply pane is open at a time
  useEffect(() => {
    const onClose = (e: Event) => {
      const ce = e as CustomEvent<{ except?: string }>;
      if (ce.detail?.except !== tweet._id) {
        setShowReplies(false);
      }
    };
    window.addEventListener('close-all-replies', onClose as EventListener);
    return () => window.removeEventListener('close-all-replies', onClose as EventListener);
  }, [tweet._id]);

  const renderTweetText = (text: string) => {
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <span key={index} className="text-blue-400 hover:underline cursor-pointer">
            {word}
          </span>
        );
      } else if (word.startsWith('@')) {
        return (
          <span key={index} className="text-blue-400 hover:underline cursor-pointer">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  const isOwnTweet = user?._id === tweet.author._id;
  const bookmarksKey = user ? `bookmarks_${user._id}` : 'bookmarks';
  const pinnedKey = user ? `pinnedTweetId_${user._id}` : 'pinnedTweetId';

  const isBookmarked = (() => {
    try {
      const arr = JSON.parse(localStorage.getItem(bookmarksKey) || '[]');
      return Array.isArray(arr) && arr.includes(tweet._id);
    } catch { return false; }
  })();

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem(bookmarksKey);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      const exists = arr.includes(tweet._id);
      const next = exists ? arr.filter(id => id !== tweet._id) : [...arr, tweet._id];
      localStorage.setItem(bookmarksKey, JSON.stringify(next));
    } catch {}
    setMenuOpen(false);
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwnTweet) return;
    try {
      const current = localStorage.getItem(pinnedKey);
      if (current === tweet._id) {
        localStorage.removeItem(pinnedKey);
      } else {
        localStorage.setItem(pinnedKey, tweet._id);
      }
    } catch {}
    setMenuOpen(false);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/tweet/${tweet._id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback
      const temp = document.createElement('input');
      temp.value = url;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }
    setMenuOpen(false);
  };

  const handleHide = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = localStorage.getItem('hiddenTweets');
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(tweet._id)) {
        arr.push(tweet._id);
        localStorage.setItem('hiddenTweets', JSON.stringify(arr));
      }
      window.dispatchEvent(new CustomEvent('hidden-tweet', { detail: { tweetId: tweet._id } }));
    } catch {}
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent | TouchEvent | PointerEvent) => {
      // Ignore immediately after opening to prevent open+close race
      if (Date.now() - openedAtRef.current < 120) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('pointerdown', onDocClick, true);
    document.addEventListener('touchstart', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('pointerdown', onDocClick, true);
      document.removeEventListener('touchstart', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOwnTweet || loading) return;
    const confirmed = window.confirm('Delete this tweet?');
    if (!confirmed) return;
    setLoading(true);
    try {
      await axios.delete(`/tweets/${tweet._id}`);
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Failed to delete tweet:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="block" onClick={() => navigate(`/tweet/${tweet._id}`)} role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==='Enter') navigate(`/tweet/${tweet._id}`); }}>
      <article className="border-b border-gray-800 p-4 hover:bg-gray-950/50 transition-colors cursor-pointer">
        <div className="flex space-x-3">
          {/* Avatar */}
          <Link 
            to={`/profile/${tweet.author.username}`}
            className="flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
              {tweet.author.profile.avatarUrl ? (
                <img
                  src={tweet.author.profile.avatarUrl}
                  alt={tweet.author.profile.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <User className="h-6 w-6 text-gray-400" />
              )}
            </div>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-1">
              <Link
                to={`/profile/${tweet.author.username}`}
                className="font-bold text-white hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {tweet.author.profile.displayName}
              </Link>
              {tweet.author.profile.verified && (
                <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
              <span className="text-gray-500">@{tweet.author.username}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">{formatDate(tweet.createdAt)}</span>
              
              <div className="ml-auto relative" ref={menuRef}>
                <button
                  className="p-2 hover:bg-gray-800 rounded-full"
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); openedAtRef.current = Date.now(); setMenuOpen(o => !o); }}
                  title="More"
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-lg z-10" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                    {isOwnTweet && (
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800"
                        onClick={handlePinToggle}
                      >
                        <Pin className="h-4 w-4" />
                        <span>{(localStorage.getItem(pinnedKey) === tweet._id) ? 'Unpin from profile' : 'Pin to your profile'}</span>
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800"
                      onClick={handleBookmarkToggle}
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>{isBookmarked ? 'Remove Bookmark' : 'Bookmark'}</span>
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800"
                      onClick={handleCopyLink}
                    >
                      <LinkIcon className="h-4 w-4" />
                      <span>Copy link to Tweet</span>
                    </button>
                    {tweet.isLiked && (
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800"
                        onClick={handleLike}
                      >
                        <span>Remove Like</span>
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-800"
                      onClick={handleHide}
                    >
                      <span>Hide this Tweet</span>
                    </button>
                    {isOwnTweet && (
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-red-900/30 text-red-400"
                        onClick={handleDelete}
                      >
                        Delete Tweet
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tweet text */}
            <div className="tweet-text text-white mb-3">
              {renderTweetText(tweet.content.text)}
            </div>

            {/* Media */}
            {tweet.content.mediaUrls.length > 0 && (
              <div className="mb-3">
                {tweet.content.mediaUrls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt="Tweet media"
                    className="rounded-2xl max-w-full h-auto"
                  />
                ))}
              </div>
            )}

            {/* Quote tweet */}
            {tweet.quoteTweetOf && (
              <div className="border border-gray-700 rounded-2xl p-3 mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-bold text-white">
                    {tweet.quoteTweetOf.author.profile.displayName}
                  </span>
                  <span className="text-gray-500">
                    @{tweet.quoteTweetOf.author.username}
                  </span>
                </div>
                <div className="text-white">
                  {renderTweetText(tweet.quoteTweetOf.content.text)}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between max-w-md mt-3">
              <button
                className="tweet-action flex items-center space-x-2 text-gray-500 hover:text-blue-400"
                onClick={handleComment}
              >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm">{tweet.engagement.repliesCount}</span>
              </button>

              <button
                className="tweet-action flex items-center space-x-2 text-gray-500 hover:text-green-400"
                onClick={handleRetweet}
              >
                <Repeat2 className="h-5 w-5" />
                <span className="text-sm">{tweet.engagement.retweetsCount}</span>
              </button>

              <button
                className={`tweet-action flex items-center space-x-2 ${
                  tweet.isLiked ? 'liked text-red-500' : 'text-gray-500 hover:text-red-400'
                }`}
                onClick={handleLike}
                disabled={loading}
              >
                <Heart className={`h-5 w-5 ${tweet.isLiked ? 'fill-current' : ''}`} />
                <span className="text-sm">{tweet.engagement.likesCount}</span>
              </button>

              <button
                className="tweet-action text-gray-500 hover:text-blue-400"
                onClick={(e) => e.stopPropagation()}
              >
                <Share className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </article>
      {/* Inline replies thread */}
      {showReplies && (
        <div
          className="border-b border-gray-800 px-16 pb-4"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Composer for reply */}
          <div className="mb-3">
            <TweetComposer
              onTweetCreated={(newReply) => {
                setReplies(prev => [newReply, ...prev]);
                onUpdate({
                  engagement: { ...tweet.engagement, repliesCount: (tweet.engagement.repliesCount || 0) + 1 }
                });
              }}
              replyTo={tweet._id}
              placeholder="Tweet your reply"
            />
          </div>
          {/* Replies list */}
          {repliesLoading ? (
            <div className="text-gray-500 text-sm">Loading replies...</div>
          ) : replies.length === 0 ? (
            <div className="text-gray-500 text-sm">No replies yet</div>
          ) : (
            <ul className="space-y-3">
              {replies.map((r) => (
                <li key={r._id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <Link to={`/profile/${r.author?.username || ''}`} className="text-white font-semibold hover:underline" onClick={(e)=>e.stopPropagation()}>
                      {r.author?.profile?.displayName || r.author?.username || 'User'}
                    </Link>
                    <span className="text-gray-500">@{r.author?.username}</span>
                    <span className="text-gray-500">· {new Date(r.createdAt).toLocaleTimeString()}</span>
                    {user?._id === r.author?._id && (
                      <button
                        className="ml-auto px-2 py-0.5 border border-red-500 text-red-400 rounded-full hover:bg-red-900/20"
                        onClick={async (e)=>{
                          e.preventDefault(); e.stopPropagation();
                          try { await axios.delete(`/tweets/${r._id}`); setReplies(prev=>prev.filter(x=>x._id!==r._id)); onUpdate({ engagement: { ...tweet.engagement, repliesCount: Math.max(0, (tweet.engagement.repliesCount||0)-1) } }); } catch {}
                        }}
                        title="Delete reply"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="text-white pl-0.5">{r.content?.text}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TweetCard;