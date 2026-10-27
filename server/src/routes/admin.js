import { Router } from 'express';
import { createSession } from '../services/sessionEngine.js';

export const adminRouter = Router();

adminRouter.use((req, res, next) =>
  req.header('x-admin-key') === process.env.ADMIN_KEY
    ? next()
    : res.status(401).json({ error: 'Unauthorized' }));

adminRouter.post('/sessions', async (req, res) => {
  try {
    res.json(await createSession(req.body.quizId));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});