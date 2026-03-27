import express from 'express';
import User from '../models/User.js';
import Tweet from '../models/Tweet.js';

const router = express.Router();

// DEVELOPMENT ONLY: Seed a few users and tweets if database is empty
router.post('/dev', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const tweetCount = await Tweet.countDocuments();

    if (userCount > 0 && tweetCount > 0) {
      return res.json({ message: 'Seed skipped - data already exists' });
    }

    const demoUsers = [
      { username: 'reactnews', email: 'reactnews@example.com', password: 'password', profile: { displayName: 'React News', verified: true } },
      { username: 'jsdaily', email: 'jsdaily@example.com', password: 'password', profile: { displayName: 'JS Daily', verified: true } },
      { username: 'devtips', email: 'devtips@example.com', password: 'password', profile: { displayName: 'Dev Tips' } },
      { username: 'nodebytes', email: 'nodebytes@example.com', password: 'password', profile: { displayName: 'Node Bytes' } },
      { username: 'webtrends', email: 'webtrends@example.com', password: 'password', profile: { displayName: 'Web Trends' } }
    ];

    const createdUsers = [];
    for (const u of demoUsers) {
      const user = new User(u);
      await user.save();
      createdUsers.push(user);
    }

    const texts = [
      'Hooks or Signals? Loving the DX improvements in modern UI libs. #React',
      'Tip: Use debounce for input-driven requests to save bandwidth. #WebDev',
      'Did you try node --watch for instant reloads? #NodeJS',
      'TS 5.x has some great ergonomics around decorators. #TypeScript',
      'Edge runtime + server components feels magical. #React',
      'Remember to index your MongoDB queries. Huge perf gains. #MongoDB',
      'Vite + React = blazing fast dev loop. #Vite',
      'Pro tip: memoize expensive selectors to cut re-renders. #Performance',
      'Ship small, ship often. CI keeps you honest. #DevTips',
      'Reading RFCs is underrated. #Engineering'
    ];

    const tweets = [];
    for (let i = 0; i < texts.length; i++) {
      const author = createdUsers[i % createdUsers.length];
      const t = new Tweet({
        author: author._id,
        content: { text: texts[i], mediaUrls: [] },
        visibility: 'public'
      });
      await t.save();
      tweets.push(t);
      await author.updateOne({ $inc: { 'stats.tweetsCount': 1 } });
    }

    res.json({ message: 'Seeded demo users and tweets', users: createdUsers.length, tweets: tweets.length });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed demo data' });
  }
});

export default router;


