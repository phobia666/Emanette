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
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());
app.use("/api/admin", adminRouter)

app.get('/api/health', async (req, res) => {
  const [rows] = await pool.query('SELECT 1 AS ok');
  res.json({ server: 'up', db: rows[0].ok === 1 });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN },
});

registerSockets(io);


server.listen(process.env.PORT, () =>
  console.log(`Server on http://localhost:${process.env.PORT}`)
);