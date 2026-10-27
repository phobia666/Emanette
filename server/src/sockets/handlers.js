import * as engine from '../services/sessionEngine.js';

// wraps a handler so errors go back through the ack callback
const handle = (fn) => async (...args) => {
  const ack = typeof args.at(-1) === 'function' ? args.pop() : null;
  try {
    ack?.({ ok: true, ...(await fn(...args)) });
  } catch (e) {
    ack?.({ ok: false, error: e.message });
  }
};

export function registerSockets(io) {
  engine.init(io);

  io.on('connection', (socket) => {
    socket.on('player:join', handle(async ({ code, name, playerId }) => {
      code = String(code).toUpperCase();
      const p = await engine.joinPlayer(code, name, playerId);
      socket.data = { code, playerId: p.id, role: 'player' };
      socket.join(`s:${code}`);
      socket.join(`p:${p.id}`);
      engine.emitLobby(code);
      return { playerId: p.id, state: engine.snapshot(code, p.id) };
    }));

    socket.on('admin:join', handle(async ({ code, adminKey }) => {
      if (adminKey !== process.env.ADMIN_KEY) throw new Error('Wrong admin key');
      code = String(code).toUpperCase();
      socket.data = { code, role: 'admin' };
      socket.join(`s:${code}`);
      socket.join(`a:${code}`);
      engine.emitLobby(code);
      return { state: engine.snapshot(code, null) };
    }));

    socket.on('player:answer', handle(async ({ answer }) => {
      const { code, playerId, role } = socket.data || {};
      if (role !== 'player') throw new Error('Join first');
      return engine.submitAnswer(code, playerId, answer);
    }));

    const adminOnly = (fn) => handle(async () => {
      if (socket.data?.role !== 'admin') throw new Error('Admins only');
      await fn(socket.data.code);
    });
    socket.on('admin:start', adminOnly(engine.start));
    socket.on('admin:next', adminOnly(engine.next));
    socket.on('admin:endQuestion', adminOnly(engine.endNow));
  });
}