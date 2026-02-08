import './load-env.js';

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { gmailRouter } from './routes/gmail.js';
import { aiRouter } from './routes/ai.js';
import { groupsRouter } from './routes/groups.js';

const app = express();
const envFrontend = process.env.FRONTEND_URL?.trim();
const corsOrigins = [
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  ...(envFrontend ? [envFrontend] : []),
];
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/gmail', gmailRouter);
app.use('/api/ai', aiRouter);
app.use('/api/groups', groupsRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = app.listen(config.port, () => {
  console.log(`UnClutter API at http://localhost:${config.port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${config.port} is already in use. Stop the other process or run:\n  npx kill-port ${config.port}\n`);
    process.exit(1);
  }
  throw err;
});
