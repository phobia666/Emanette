import { io } from 'socket.io-client';

const code = process.argv[2];
const URL = 'http://localhost:4000';
const admin = io(URL);
const player = io(URL);

admin.onAny((e, d) => console.log('[ADMIN ]', e, JSON.stringify(d)));
player.onAny((e, d) => console.log('[PLAYER]', e, JSON.stringify(d)));

admin.emit('admin:join', { code, adminKey: 'change-me' }, () => {
  player.emit(
    'player:join',
    {
      code,
      name: 'Tester',
      participantId: 'TEST-001',
      contact: 'tester@example.com',
    },
    (res) => {
      console.log('player join res ->', res);
      admin.emit('admin:start', (r) => console.log('start ->', r));
    }
  );
});

// answer the first option 2s after each question appears
player.on('question:show', (q) => {
  setTimeout(() => {
    const ans = q.type === 'text' ? 'answer' : [q.options[0].id];
    player.emit('player:answer', { answer: ans }, (r) =>
      console.log('answer ack ->', r)
    );
  }, 2000);
});

// admin presses "Next" 3s after each result
admin.on('question:result', (r) => {
  if (!r.isLast) setTimeout(() => admin.emit('admin:next', (x) => console.log('next ->', x)), 3000);
  else setTimeout(() => admin.emit('admin:next', (x) => console.log('finish ->', x)), 3000);
});
