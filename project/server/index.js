// server/index.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import tweetRoutes from './routes/tweets.js';
import userRoutes from './routes/users.js';
import followRoutes from './routes/follows.js';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import seedRoutes from './routes/seed.js';
import messagesRoutes from './routes/messages.js';
import blocksRoutes from './routes/blocks.js';
import notificationsRoutes from './routes/notifications.js';
import { checkSocketBlocking } from './middleware/blocking.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting only in production to avoid blocking dev/testing
const isProd = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 100000,
  standardHeaders: true,
  legacyHeaders: false
});
if (isProd) {
  app.use('/api/', limiter);
}

// Simple local storage for uploads (development)
// Store uploads under project/uploads relative to the server CWD (project/)
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Fallback upload endpoint (non-/api path) for older clients
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/twitter-clone')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.use(checkSocketBlocking);

io.on('connection', (socket) => {
  console.log(`User ${socket.username} connected`);
  socket.join(`user_${socket.userId}`);
  socket.on('new_tweet', (tweetData) => socket.broadcast.emit('tweet_created', tweetData));
  socket.on('dm_send', (msg) => {
    // For demo, broadcast to everyone; in production route to recipient room
    io.emit('dm_receive', msg);
  });
  socket.on('typing_reply', (data) => {
    socket.to(`tweet_${data.tweetId}`).emit('user_typing_reply', {
      userId: socket.userId,
      username: socket.username,
      tweetId: data.tweetId
    });
  });
  socket.on('disconnect', () => {
    console.log(`User ${socket.username} disconnected`);
  });
});

app.set('io', io);
app.use('/api/auth', authRoutes);
app.use('/api/tweets', tweetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/dm', messagesRoutes);
app.use('/api/blocks', blocksRoutes);
app.use('/api/notifications', notificationsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, io };
