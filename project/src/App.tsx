import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import Profile from './components/Profile/Profile';
import FollowList from './components/Profile/FollowList';
import TweetDetail from './components/Tweet/TweetDetail';
import Explore from './components/Explore/Explore';
import Layout from './components/Layout/Layout';
import Bookmarks from './components/Bookmarks/Bookmarks';
import RepliesPage from './components/Profile/RepliesPage';
import LikesPage from './components/Profile/LikesPage';
import SearchUsers from './components/Search/SearchUsers';
import Messages from './components/Messages/Messages';
import Notifications from './components/Notifications/Notifications';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return user ? <Navigate to="/home" /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-black text-white">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            {/* Protected parent route with nested child routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <SocketProvider>
                  <Layout />
                </SocketProvider>
              </ProtectedRoute>
            }>
              <Route path="home" element={<Home />} />
              <Route path="explore" element={<Explore />} />
              <Route path="search" element={<SearchUsers />} />
              <Route path="bookmarks" element={<Bookmarks />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messages" element={<Messages />} />
              <Route path="profile/:username" element={<Profile />} />
              <Route path="profile/:username/replies" element={<RepliesPage />} />
              <Route path="profile/:username/likes" element={<LikesPage />} />
              <Route path="profile/:username/followers" element={<FollowList type="followers" />} />
              <Route path="profile/:username/following" element={<FollowList type="following" />} />
              <Route path="tweet/:tweetId" element={<TweetDetail />} />
              {/* Default redirect when path is "/" */}
              <Route index element={<Navigate to="home" replace />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
