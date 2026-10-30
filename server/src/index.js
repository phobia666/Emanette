import * as engine from './services/sessionEngine.js';
import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { pool } from './db.js';
import { registerSockets } from './sockets/handlers.js';
import { adminRouter } from './routes/admin.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());
app.use('/api/admin', adminRouter);

// B3. Public route GET /api/sessions/:code/info
app.get('/api/sessions/:code/info', async (req, res) => {
  try {
    const info = await engine.getSessionInfo(req.params.code);
    if (!info) return res.status(404).json({ error: 'Session not found' });
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', async (req, res) => {
  const [rows] = await pool.query('SELECT 1 AS ok');
  res.json({ server: 'up', db: rows[0].ok === 1 });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || '*' },
});

registerSockets(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`Server on http://localhost:${PORT}`)
);
