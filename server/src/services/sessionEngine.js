import { randomBytes, randomUUID } from 'crypto';
import { pool } from '../db.js';
import { isCorrect, calcPoints } from './scoring.js';

let io;
const sessions = new Map(); // code -> live session (in memory)

export const init = (socketServer) => {
  io = socketServer;
};

const makeCode = () => randomBytes(3).toString('hex').toUpperCase();

function get(code) {
  const s = sessions.get(String(code).toUpperCase());
  if (!s) throw new Error('Session not found');
  return s;
}

export function getPlayerCount(code) {
  return get(code).players.size;
}

/* ---------- create ---------- */
export async function createSession(quizId) {
  const [[quiz]] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [quizId]);
  if (!quiz) throw new Error('Quiz not found');

  const [qs] = await pool.query(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY position',
    [quizId]
  );
  if (!qs.length) throw new Error('Quiz has no questions');

  const [opts] = await pool.query(
    'SELECT * FROM options WHERE question_id IN (?) ORDER BY position',
    [qs.map((q) => q.id)]
  );

  const questions = qs.map((q) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    points: q.points,
    limitSec: q.time_limit || quiz.time_per_question,
    correct:
      typeof q.correct_answer === 'string'
        ? JSON.parse(q.correct_answer)
        : q.correct_answer,
    options: opts
      .filter((o) => o.question_id === q.id)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  const code = makeCode();
  const [r] = await pool.query(
    'INSERT INTO sessions (quiz_id, code) VALUES (?, ?)',
    [quizId, code]
  );

  const autoAdvanceSeconds = Number(process.env.AUTO_ADVANCE_SECONDS || 0);

  sessions.set(code, {
    id: r.insertId,
    code,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      timePerQuestion: quiz.time_per_question,
      totalQuestions: questions.length,
      maxPoints: questions.reduce((sum, q) => sum + q.points, 0),
    },
    questions,
    index: -1,
    phase: 'lobby',
    startsAt: null,
    startedAt: null,
    endsAt: null,
    nextAt: null,
    autoAdvanceSeconds,
    timer: null,
    autoTimer: null,
    players: new Map(), // playerId -> { id, name, participantId, contact, total, timeMs, last }
    currentAnswers: new Map(), // playerId -> { answer, changedAt }
    lastResult: null,
  });

  return { sessionId: r.insertId, code };
}

/* ---------- session info (public) ---------- */
export async function getSessionInfo(code) {
  code = String(code).toUpperCase();
  const s = sessions.get(code);
  const defaultAutoAdvance = Number(process.env.AUTO_ADVANCE_SECONDS || 0);

  if (s) {
    const pointsList = s.questions.map((q) => q.points);
    const allSame = pointsList.every((p) => p === pointsList[0]);
    const marksPerCorrect = allSame ? (pointsList[0] ?? null) : null;
    return {
      code: s.code,
      status: s.phase,
      title: s.quiz.title,
      totalQuestions: s.quiz.totalQuestions,
      timePerQuestion: s.quiz.timePerQuestion,
      marksPerCorrect,
      autoAdvanceSeconds: s.autoAdvanceSeconds ?? defaultAutoAdvance,
    };
  }

  // Check database if not currently active in memory
  const [[session]] = await pool.query('SELECT * FROM sessions WHERE code = ?', [code]);
  if (!session) return null;

  const [[quiz]] = await pool.query('SELECT * FROM quizzes WHERE id = ?', [session.quiz_id]);
  if (!quiz) return null;

  const [questions] = await pool.query(
    'SELECT points FROM questions WHERE quiz_id = ?',
    [session.quiz_id]
  );
  const pointsList = questions.map((q) => q.points);
  const allSame = pointsList.length > 0 && pointsList.every((p) => p === pointsList[0]);
  const marksPerCorrect = allSame ? (pointsList[0] ?? null) : null;

  return {
    code: session.code,
    status: session.status,
    title: quiz.title,
    totalQuestions: questions.length,
    timePerQuestion: quiz.time_per_question,
    marksPerCorrect,
    autoAdvanceSeconds: defaultAutoAdvance,
  };
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
  return {
    ...s.lastResult,
    you: p?.last ?? null, // has { answered, correct, points, responseMs, answer }
    nextAt: s.nextAt || null,
  };
}

export function snapshot(code, playerId) {
  const s = get(code);
  const base = {
    phase: s.phase,
    quiz: s.quiz,
    playerCount: s.players.size,
  };

  if (s.phase === 'countdown') {
    return {
      ...base,
      countdown: {
        startsAt: s.startsAt,
        serverNow: Date.now(),
      },
    };
  }

  if (s.phase === 'question') {
    const current = s.currentAnswers?.get(playerId);
    return {
      ...base,
      question: publicQuestion(s),
      answered: !!current,
      currentAnswer: current ? current.answer : null,
    };
  }

  if (s.phase === 'result') {
    return {
      ...base,
      result: resultFor(s, playerId),
    };
  }

  return base; // lobby / finished
}

/* ---------- players ---------- */
export async function joinPlayer(code, detailsOrName, maybePlayerId) {
  const s = get(code);

  let name = '';
  let participantId = '';
  let contact = '';
  let playerId = null;

  if (typeof detailsOrName === 'object' && detailsOrName !== null) {
    name = detailsOrName.name;
    participantId = detailsOrName.participantId;
    contact = detailsOrName.contact;
    playerId = detailsOrName.playerId;
  } else {
    name = detailsOrName;
    playerId = maybePlayerId;
  }

  const trimmedPid = String(participantId || '').trim();

  // B2: If participant ID already exists in this session, treat as rejoin and return same player in ANY phase
  if (trimmedPid) {
    const existing = [...s.players.values()].find(
      (p) => p.participantId && p.participantId.toLowerCase() === trimmedPid.toLowerCase()
    );
    if (existing) return existing;
  }

  // Also support rejoin by existing playerId if in session
  if (playerId && s.players.has(playerId)) {
    return s.players.get(playerId);
  }

  // Otherwise a new player is allowed only in the lobby phase (countdown counts as started)
  if (s.phase !== 'lobby') throw new Error('Quiz already started');

  const trimmedName = String(name || '').trim().slice(0, 60);
  if (!trimmedName) throw new Error('Name is required');
  if (!trimmedPid) throw new Error('Participant ID is required');
  const trimmedContact = String(contact || '').trim().slice(0, 120);
  if (!trimmedContact) throw new Error('Contact is required');

  const id = randomUUID();
  await pool.query(
    'INSERT INTO players (id, session_id, name, participant_id, contact) VALUES (?, ?, ?, ?, ?)',
    [id, s.id, trimmedName, trimmedPid, trimmedContact]
  );

  const p = {
    id,
    name: trimmedName,
    participantId: trimmedPid,
    contact: trimmedContact,
    total: 0,
    timeMs: 0,
    last: null,
  };
  s.players.set(id, p);
  return p;
}

export function emitLobby(code) {
  const s = get(code);
  io.to(`a:${s.code}`).emit('lobby:update', {
    count: s.players.size,
    players: [...s.players.values()].map((p) => p.name),
  });
  // B7: Broadcast lobby:count {count} to everyone in the session
  io.to(`s:${s.code}`).emit('lobby:count', {
    count: s.players.size,
  });
}

/* ---------- admin controls ---------- */
export async function start(code) {
  const s = get(code);
  if (s.phase !== 'lobby') throw new Error('Already started');
  if (!s.players.size) throw new Error('No players have joined yet');

  await pool.query(
    "UPDATE sessions SET status='live', started_at=NOW() WHERE id=?",
    [s.id]
  );

  // B7. Countdown phase: admin:start sets phase "countdown" for COUNTDOWN_SECONDS (default 5)
  s.phase = 'countdown';
  const countdownSec = Number(process.env.COUNTDOWN_SECONDS || 5);
  const durationMs = countdownSec * 1000;
  const now = Date.now();
  s.startsAt = now + durationMs;

  io.to(`s:${s.code}`).emit('session:countdown', {
    startsAt: s.startsAt,
    serverNow: now,
  });

  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    showQuestion(s, 0);
  }, durationMs);
}

export async function next(code) {
  const s = get(code);
  if (s.phase !== 'result') throw new Error('Wait for the current question to end');

  clearTimeout(s.autoTimer);
  s.autoTimer = null;
  s.nextAt = null;

  if (s.index + 1 < s.questions.length) {
    showQuestion(s, s.index + 1);
  } else {
    await finish(s);
  }
}

export async function endNow(code) {
  const s = get(code);
  if (s.phase === 'question') await endQuestion(s);
}

/* ---------- the state machine ---------- */
function showQuestion(s, i) {
  clearTimeout(s.timer);
  clearTimeout(s.autoTimer);
  s.autoTimer = null;
  s.nextAt = null;

  s.index = i;
  s.phase = 'question';
  s.currentAnswers = new Map(); // playerId -> { answer, changedAt }
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

  // B5. Changeable answers: empty array or empty string clears it
  const isEmpty =
    answer === null ||
    answer === undefined ||
    (Array.isArray(answer) && answer.length === 0) ||
    (typeof answer === 'string' && answer.trim() === '');

  if (isEmpty) {
    s.currentAnswers.delete(playerId);
  } else {
    s.currentAnswers.set(playerId, { answer, changedAt: Date.now() });
  }

  // answers:count counts non-empty selections
  io.to(`a:${s.code}`).emit('answers:count', {
    answered: s.currentAnswers.size,
    total: s.players.size,
  });

  return { recorded: true };
}

async function endQuestion(s) {
  if (s.phase !== 'question') return;
  clearTimeout(s.timer);
  s.phase = 'result';

  const q = s.questions[s.index];
  const limitMs = q.limitSec * 1000;

  // B5: score everyone once, update totals, and bulk-write one answers row per player
  const answersRows = [];
  const finalAnsweredMap = new Map();

  for (const p of s.players.values()) {
    const entry = s.currentAnswers?.get(p.id);
    if (!entry) {
      // blank means answered = 0, points = 0, response_ms = full limit
      p.timeMs += limitMs;
      p.last = { answered: false, correct: false, points: 0, responseMs: limitMs, answer: null };
      answersRows.push([p.id, q.id, null, 0, 0, 0, limitMs]);
    } else {
      // answered means response_ms = time from question start to the last change
      const responseMs = Math.min(Math.max(0, entry.changedAt - s.startedAt), limitMs);
      const correct = isCorrect(q, entry.answer);
      const points = calcPoints(q, correct);

      p.total += points;
      p.timeMs += responseMs;
      p.last = { answered: true, correct, points, responseMs, answer: entry.answer };
      finalAnsweredMap.set(p.id, { answer: entry.answer, correct, points, responseMs });
      answersRows.push([
        p.id,
        q.id,
        JSON.stringify(entry.answer),
        1,
        correct ? 1 : 0,
        points,
        responseMs,
      ]);
    }
  }

  // bar chart data
  const counts = {};
  if (q.type === 'text') {
    counts.correct = [...finalAnsweredMap.values()].filter((a) => a.correct).length;
    counts.incorrect = finalAnsweredMap.size - counts.correct;
    counts.skipped = s.players.size - finalAnsweredMap.size;
  } else {
    q.options.forEach((o) => {
      counts[o.id] = 0;
    });
    for (const a of finalAnsweredMap.values()) {
      [].concat(a.answer)
        .map(Number)
        .forEach((id) => {
          if (id in counts) counts[id] += 1;
        });
    }
  }

  const autoAdvanceSeconds = s.autoAdvanceSeconds ?? Number(process.env.AUTO_ADVANCE_SECONDS || 0);
  if (autoAdvanceSeconds > 0) {
    s.nextAt = Date.now() + autoAdvanceSeconds * 1000;
  } else {
    s.nextAt = null;
  }

  s.lastResult = {
    questionId: q.id,
    index: s.index,
    total: s.questions.length,
    text: q.text,
    type: q.type,
    options: q.options,
    counts,
    correctAnswer: q.correct, // revealed only now
    answeredCount: finalAnsweredMap.size,
    totalPlayers: s.players.size,
    isLast: s.index === s.questions.length - 1,
    autoAdvanceSeconds,
    nextAt: s.nextAt,
    serverNow: Date.now(),
  };

  for (const p of s.players.values()) {
    io.to(`p:${p.id}`).emit('question:result', resultFor(s, p.id));
  }
  io.to(`a:${s.code}`).emit('question:result', s.lastResult);

  if (answersRows.length) {
    try {
      await pool.query(
        `INSERT INTO answers
         (player_id, question_id, answer, answered, is_correct, points, response_ms)
         VALUES ?
         ON DUPLICATE KEY UPDATE
           answer = VALUES(answer),
           answered = VALUES(answered),
           is_correct = VALUES(is_correct),
           points = VALUES(points),
           response_ms = VALUES(response_ms)`,
        [answersRows]
      );
    } catch (e) {
      console.error('Bulk answers insert failed', e);
    }
  }

  // B8. Auto advance if configured
  if (autoAdvanceSeconds > 0) {
    clearTimeout(s.autoTimer);
    s.autoTimer = setTimeout(async () => {
      try {
        await next(s.code);
      } catch (e) {
        console.error('Auto-advance failed', e);
      }
    }, autoAdvanceSeconds * 1000);
  }
}

async function finish(s) {
  s.phase = 'finished';
  clearTimeout(s.timer);
  clearTimeout(s.autoTimer);
  s.autoTimer = null;
  s.nextAt = null;

  const ranked = [...s.players.values()].sort(
    (a, b) => b.total - a.total || a.timeMs - b.timeMs
  );

  if (ranked.length) {
    await pool.query(
      'INSERT INTO leaderboard (session_id, player_id, total_points, total_time_ms, `rank`) VALUES ?',
      [ranked.map((p, i) => [s.id, p.id, p.total, p.timeMs, i + 1])]
    );
  }
  await pool.query(
    "UPDATE sessions SET status='finished', ended_at=NOW() WHERE id=?",
    [s.id]
  );

  io.to(`s:${s.code}`).emit('session:finished', {}); // players see only "thanks"
}
