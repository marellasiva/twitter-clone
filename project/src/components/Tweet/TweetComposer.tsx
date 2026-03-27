import React, { useRef, useState } from 'react';
import { Image, Smile, Clock, MapPin, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface TweetComposerProps {
  onTweetCreated: (tweet: any) => void;
  replyTo?: string;
  quoteTweetOf?: string;
  placeholder?: string;
}

const TweetComposer: React.FC<TweetComposerProps> = ({ 
  onTweetCreated, 
  replyTo, 
  quoteTweetOf,
  placeholder = "What's happening?" 
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const [showEmoji, setShowEmoji] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>('');
  const [geo, setGeo] = useState<{lat:number, lng:number} | null>(null);

  const uploadOne = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res.data.url || res.data.path || res.data.fileUrl;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const res2 = await axios.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res2.data.url || res2.data.path || res2.data.fileUrl;
      }
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && mediaFiles.length === 0) || loading) return;

    setLoading(true);
    try {
      const tweetData: any = { text: text.trim() };
      if (replyTo) tweetData.replyTo = replyTo;
      if (quoteTweetOf) tweetData.quoteTweetOf = quoteTweetOf;
      if (geo) tweetData.location = { lat: geo.lat, lng: geo.lng };
      if (scheduleAt) {
        const scheduled = JSON.parse(localStorage.getItem('scheduled_tweets') || '[]');
        scheduled.push({ when: scheduleAt, data: tweetData, media: mediaFiles.map(f => ({ name: f.name })) });
        localStorage.setItem('scheduled_tweets', JSON.stringify(scheduled));
        setText(''); setMediaFiles([]); setMediaPreviews([]); setScheduleAt('');
        alert('Tweet scheduled');
        return;
      }
      if (mediaFiles.length > 0) {
        const urls: string[] = [];
        for (const f of mediaFiles) {
          const url = await uploadOne(f);
          if (url) urls.push(url);
        }
        tweetData.mediaUrls = urls;
      }

      const response = await axios.post('/tweets', tweetData);
      onTweetCreated(response.data.tweet);
      setText('');
      setMediaFiles([]);
      setMediaPreviews([]);
      try {
        window.dispatchEvent(new CustomEvent('tweet-reply-created', { detail: { tweet: response.data.tweet } }));
      } catch {}
    } catch (error) {
      console.error('Failed to create tweet:', error);
    } finally {
      setLoading(false);
    }
  };

  const remainingChars = 280 - text.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="tweet-composer">
      <div className="flex space-x-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
            {user?.profile.avatarUrl ? (
              <img
                src={user.profile.avatarUrl}
                alt={user.profile.displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-gray-400" />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="w-full resize-none bg-transparent text-white text-xl placeholder-gray-500 border-none outline-none"
              rows={3}
            />

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-800 rounded-full text-blue-400"
                  title="Add photo or video"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="h-5 w-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length === 0) return;
                    setMediaFiles(prev => [...prev, ...files]);
                    const readers = files.map(file => new Promise<string>((resolve) => {
                      const r = new FileReader();
                      r.onload = () => resolve(String(r.result || ''));
                      r.readAsDataURL(file);
                    }));
                    Promise.all(readers).then(urls => setMediaPreviews(prev => [...prev, ...urls]));
                  }}
                />
                <button
                  type="button"
                  className="p-2 hover:bg-gray-800 rounded-full text-blue-400"
                  title="Add emoji"
                  onClick={() => setShowEmoji(v => !v)}
                >
                  <Smile className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-800 rounded-full text-blue-400"
                  title="Schedule tweet"
                  onClick={() => {
                    const when = prompt('Schedule at (YYYY-MM-DD HH:mm, 24h)');
                    if (!when) return;
                    const iso = when.replace(' ', 'T') + ':00';
                    if (!Number.isNaN(Date.parse(iso))) setScheduleAt(iso);
                    else alert('Invalid date/time');
                  }}
                >
                  <Clock className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-800 rounded-full text-blue-400"
                  title="Add location"
                  onClick={() => {
                    if (!navigator.geolocation) return alert('Geolocation not supported');
                    navigator.geolocation.getCurrentPosition(
                      p => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }),
                      () => alert('Unable to get location'),
                      { enableHighAccuracy: true, timeout: 8000 }
                    );
                  }}
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                {mediaPreviews.length > 0 && (
                  <div className="flex gap-2 flex-wrap max-w-[420px]">
                    {mediaPreviews.map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt="media" className="w-24 h-24 object-cover rounded-lg border border-gray-700" />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-black/70 hover:bg-black text-white rounded-full px-2 py-0.5 text-xs hidden group-hover:block"
                          onClick={() => {
                            setMediaPreviews(prev => prev.filter((_, i) => i !== idx));
                            setMediaFiles(prev => prev.filter((_, i) => i !== idx));
                          }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                {showEmoji && (
                  <div className="absolute mt-[-220px] bg-black border border-gray-700 rounded p-2 grid grid-cols-8 gap-1 z-20">
                    {['😀','😁','😂','🤣','😊','😍','😎','😢','😭','😡','👍','🙏','🔥','💯','🎉','✨','✅','❌','❤️','💙','🧡','💜','💚','🤍','⭐'].map(e => (
                      <button key={e} className="hover:bg-gray-800 rounded" onClick={() => { setText(t => t + e); setShowEmoji(false); }}>{e}</button>
                    ))}
                  </div>
                )}
                {scheduleAt && (
                  <div className="text-xs text-gray-400">Scheduled: {new Date(scheduleAt).toLocaleString()}</div>
                )}
                {geo && (
                  <div className="text-xs text-gray-400">Location set</div>
                )}
                {/* Character count */}
                {text.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
                      {remainingChars}
                    </div>
                    <div className="w-8 h-8 relative">
                      <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke="#333"
                          strokeWidth="2"
                        />
                        <circle
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke={isOverLimit ? "#ef4444" : "#1d9bf0"}
                          strokeWidth="2"
                          strokeDasharray={`${Math.min(100, (text.length / 280) * 100) * 0.88} 88`}
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Tweet button */}
                <button
                  type="submit"
                  disabled={(!text.trim() && mediaFiles.length === 0) || loading || isOverLimit}
                  className="btn-primary px-6 py-2 rounded-full font-bold disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2"></div>
                      {replyTo ? 'Replying...' : 'Tweeting...'}
                    </div>
                  ) : (
                    replyTo ? 'Reply' : 'Tweet'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TweetComposer;