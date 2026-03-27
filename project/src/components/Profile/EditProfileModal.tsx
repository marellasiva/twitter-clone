import React, { useState } from 'react';
import axios from 'axios';

interface EditProfileModalProps {
  initialData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatarUrl: string;
    bannerUrl: string;
  };
  onClose: () => void;
  onSave: (data: Partial<typeof initialData>) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  initialData,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = new FormData();
      data.append('file', file);
      // Try /api/upload first
      let res;
      try {
        res = await axios.post('http://localhost:3001/api/upload', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (e: any) {
        // Fallback to /upload if /api/upload not found
        if (e?.response?.status === 404) {
          res = await axios.post('http://localhost:3001/upload', data, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          throw e;
        }
      }
      setFormData({ ...formData, [field]: res.data.url });
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg w-full max-w-md text-white max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl mb-4">Edit Profile</h2>
        {error && <div className="bg-red-700 p-2 mb-4 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block mb-1">Profile picture</label>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                  {formData.avatarUrl ? (
                    <img src={formData.avatarUrl} alt="avatar" className="w-16 h-16 object-cover" />
                  ) : (
                    <span className="text-gray-400">@</span>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'avatarUrl')} />
              </div>
            </div>
            <div>
              <label className="block mb-1">Banner image</label>
              <div className="mb-2">
                {formData.bannerUrl && (
                  <img src={formData.bannerUrl} alt="banner" className="w-full h-24 object-cover rounded" />
                )}
              </div>
              <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'bannerUrl')} />
            </div>
          </div>
          <div>
            <label className="block mb-1">Display Name</label>
            <input
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
              rows={3}
            />
          </div>
          <div>
            <label className="block mb-1">Location</label>
            <input
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
            />
          </div>
          <div>
            <label className="block mb-1">Website</label>
            <input
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
