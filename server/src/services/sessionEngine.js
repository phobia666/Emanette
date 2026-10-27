import { randomBytes, randomUUID } from 'crypto';
import { pool } from '../db.js';
import { isCorrect, calcPoints } from './scoring.js';

let io;
const sessions = new Map(); // code -> live session (in memory)

export const init = (socketServer) => { io = socketServer; };

const makeCode = () => randomBytes(3).toString('hex').toUpperCase();

function get(code) {
  const s = sessions.get(String(code).toUpperCase());
  if (!s) throw new Error('Session not found');
  return s;
}

/* ---------- create ---------- */
export async function createSession(quizId) {
  const [[quiz]] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  if (!quiz) throw new Error('Quiz not found');

  const [qs] = await pool.query(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY position', [quizId]);
  if (!qs.length) throw new Error('Quiz has no questions');

  const [opts] = await pool.query(
    'SELECT * FROM options WHERE question_id IN (?) ORDER BY position',
    [qs.map((q) => q.id)]);

  const questions = qs.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    points: q.points,
    limitSec: q.time_limit || quiz.time_per_question,
    correct: typeof q.correct_answer === 'string'
      ? JSON.parse(q.correct_answer) : q.correct_answer,
    options: opts.filter((o) => o.question_id === q.id)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  const code = makeCode();
  const [r] = await pool.query(
    'INSERT INTO sessions (quiz_id, code) VALUES (?, ?)', [quizId, code]);

  sessions.set(code, {
    id: r.insertId,
    code,
    quiz: {
      title: quiz.title,
      instructions: quiz.instructions,
      timePerQuestion: quiz.time_per_question,
      totalQuestions: questions.length,
      maxPoints: questions.reduce((sum, q) => sum + q.points, 0),
    },
    questions,
    index: -1,
    phase: 'lobby',
    startedAt: null,
    endsAt: null,
    timer: null,
    players: new Map(), // playerId -> { id, name, total, timeMs, last }
    answered: new Map(), // playerId -> { answer, correct, points, responseMs }
    lastResult: null,
  });

  return { sessionId: r.insertId, code };
}

/* ---------- payload builders ---------- */
function publicQuestion(s) {
  const q = s.questions[s.index];
  return {
    id: q.id,
    index: s.index,
    total: s.questions.length,
    text: q.text,
    type: q.type,
    points: q.points,
    options: q.options, // NO correct answer here
    endsAt: s.endsAt,
    serverNow: Date.now(),
  };
}

function resultFor(s, playerId) {
  const p = s.players.get(playerId);
  return { ...s.lastResult, you: p?.last ?? null, yourTotal: p?.total ?? 0 };
}

export function snapshot(code, playerId) {
  const s = get(code);
  const base = { phase: s.phase, quiz: s.quiz };
  if (s.phase === 'question') {
    return { ...base, question: publicQuestion(s), answered: s.answered.has(playerId) };
  }
  if (s.phase === 'result') return { ...base, result: resultFor(s, playerId) };
  return base;
}

/* ---------- players ---------- */
export async function joinPlayer(code, name, playerId) {
  const s = get(code);

  // reconnect: same phone comes back with its stored playerId
  if (playerId && s.players.has(playerId)) return s.players.get(playerId);

  if (s.phase !== 'lobby') throw new Error('Quiz already started');
  name = String(name || '').trim().slice(0, 60);
  if (!name) throw new Error('Name is required');
  const taken = [...s.players.values()].some(
    (p) => p.name.toLowerCase() === name.toLowerCase());
  if (taken) throw new Error('That name is already taken');

  const id = randomUUID();
  await pool.query(
    'INSERT INTO players (id, session_id, name) VALUES (?, ?, ?)', [id, s.id, name]);
  const p = { id, name, total: 0, timeMs: 0, last: null };
  s.players.set(id, p);
  return p;
}

export function emitLobby(code) {
  const s = get(code);
  io.to(`a:${s.code}`).emit('lobby:update', {
    count: s.players.size,
    players: [...s.players.values()].map((p) => p.name),
  });
}

/* ---------- admin controls ---------- */
export async function start(code) {
  const s = get(code);
  if (s.phase !== 'lobby') throw new Error('Already started');
  if (!s.players.size) throw new Error('No players have joined yet');
  await pool.query(
    "UPDATE sessions SET status='live', started_at=NOW() WHERE id=?", [s.id]);
  showQuestion(s, 0);
}

export async function next(code) {
  const s = get(code);
  if (s.phase !== 'result') throw new Error('Wait for the current question to end');
  if (s.index + 1 < s.questions.length) showQuestion(s, s.index + 1);
  else await finish(s);
}

export async function endNow(code) { // optional: admin ends a question early
  const s = get(code);
  if (s.phase === 'question') await endQuestion(s);
}

/* ---------- the state machine ---------- */
function showQuestion(s, i) {
  s.index = i;
  s.phase = 'question';
  s.answered = new Map();
  const limitMs = s.questions[i].limitSec * 1000;
  s.startedAt = Date.now();
  s.endsAt = s.startedAt + limitMs;

  io.to(`s:${s.code}`).emit('question:show', publicQuestion(s));
  io.to(`a:${s.code}`).emit('answers:count', { answered: 0, total: s.players.size });

  s.timer = setTimeout(() => endQuestion(s), limitMs); // server owns the clock
}

export async function submitAnswer(code, playerId, answer) {
  const s = get(code);
  const p = s.players.get(playerId);
  if (!p) throw new Error('Not in this session');
  if (s.phase !== 'question' || Date.now() > s.endsAt) throw new Error('Time is up');
  if (s.answered.has(playerId)) throw new Error('Already answered');

  const q = s.questions[s.index];
  const limitMs = q.limitSec * 1000;
  const responseMs = Math.min(Date.now() - s.startedAt, limitMs);
  const correct = isCorrect(q, answer);
  const points = calcPoints(q, correct, responseMs, limitMs);

  s.answered.set(playerId, { answer, correct, points, responseMs }); // lock first
  p.total += points;
  p.timeMs += responseMs;
  p.last = { answered: true, correct, points, responseMs };

  await pool.query(
    `INSERT IGNORE INTO answers
     (player_id, question_id, answer, answered, is_correct, points, response_ms)
     VALUES (?, ?, ?, 1, ?, ?, ?)`,
    [playerId, q.id, JSON.stringify(answer), correct ? 1 : 0, points, responseMs]);

  io.to(`a:${s.code}`).emit('answers:count',
    { answered: s.answered.size, total: s.players.size });
  return { locked: true };
}

async function endQuestion(s) {
  if (s.phase !== 'question') return;
  clearTimeout(s.timer);
  s.phase = 'result';

  const q = s.questions[s.index];
  const limitMs = q.limitSec * 1000;

  // players who didn't answer -> skipped row, full time charged
  const skipped = [];
  for (const p of s.players.values()) {
    if (!s.answered.has(p.id)) {
      p.timeMs += limitMs;
      p.last = { answered: false, correct: false, points: 0, responseMs: limitMs };
      skipped.push([p.id, q.id, null, 0, 0, 0, limitMs]);
    }
  }

  // bar chart data
  const counts = {};
  if (q.type === 'text') {
    counts.correct = [...s.answered.values()].filter((a) => a.correct).length;
    counts.incorrect = s.answered.size - counts.correct;
    counts.skipped = skipped.length;
  } else {
    q.options.forEach((o) => { counts[o.id] = 0; });
    for (const a of s.answered.values()) {
      [].concat(a.answer).map(Number).forEach((id) => {
        if (id in counts) counts[id] += 1;
      });
    }
  }

  s.lastResult = {
    questionId: q.id,
    index: s.index,
    type: q.type,
    options: q.options,
    counts,
    correctAnswer: q.correct, // revealed only now
    answeredCount: s.answered.size,
    totalPlayers: s.players.size,
    isLast: s.index === s.questions.length - 1,
  };

  for (const p of s.players.values()) {
    io.to(`p:${p.id}`).emit('question:result', resultFor(s, p.id));
  }
  io.to(`a:${s.code}`).emit('question:result', s.lastResult);

  if (skipped.length) {
    try {
      await pool.query(
        `INSERT IGNORE INTO answers
         (player_id, question_id, answer, answered, is_correct, points, response_ms)
         VALUES ?`, [skipped]);
    } catch (e) { console.error('skip insert failed', e); }
  }
}

async function finish(s) {
  s.phase = 'finished';
  const ranked = [...s.players.values()]
    .sort((a, b) => b.total - a.total || a.timeMs - b.timeMs);

  if (ranked.length) {
    await pool.query(
      'INSERT INTO leaderboard (session_id, player_id, total_points, total_time_ms, `rank`) VALUES ?',
      [ranked.map((p, i) => [s.id, p.id, p.total, p.timeMs, i + 1])]);
  }
  await pool.query(
    "UPDATE sessions SET status='finished', ended_at=NOW() WHERE id=?", [s.id]);

  io.to(`s:${s.code}`).emit('session:finished', {}); // players see only "thanks"
}