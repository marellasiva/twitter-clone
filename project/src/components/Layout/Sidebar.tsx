import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Bell, Mail, Bookmark, User, Twitter, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { icon: Home, label: 'Home', path: '/home' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Mail, label: 'Messages', path: '/messages' },
    { icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { icon: User, label: 'Profile', path: `/profile/${user?.username}` },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 h-screen sticky top-0 p-4">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="mb-8">
          <Twitter className="h-8 w-8 text-blue-400" />
        </div>

        {/* Navigation */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center space-x-4 p-3 rounded-full transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-900/20 text-blue-400'
                      : 'hover:bg-gray-900 text-white'
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xl font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tweet Button */}
          <button
            className="btn-primary w-full mt-8 py-3 px-6 rounded-full font-bold text-lg"
            onClick={() => window.dispatchEvent(new Event('open-tweet-modal'))}
          >
            Tweet
          </button>
        </nav>

        {/* User Menu */}
        <div className="mt-auto">
          <div className="flex items-center justify-between p-3 rounded-full hover:bg-gray-900 cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                {user?.profile.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt={user.profile.displayName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user?.profile.displayName}
                </p>
                <p className="text-gray-400 text-sm truncate">
                  @{user?.username}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-800 rounded-full"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;