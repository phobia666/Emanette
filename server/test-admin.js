import { io } from 'socket.io-client';
import readline from 'readline';

const code = process.argv[2];
const admin = io('http://localhost:4000');
let phase = 'lobby';

admin.on('lobby:update', (d) => console.log('players:', d.players.join(', ')));
admin.on('session:countdown', (d) => { phase = 'countdown'; console.log('COUNTDOWN startsAt:', d.startsAt); });
admin.on('answers:count', (d) => console.log(`answered ${d.answered}/${d.total}`));
admin.on('question:show', (q) => { phase = 'question'; console.log(`\nQ${q.index + 1}: ${q.text}`); });
admin.on('question:result', (r) => {
  phase = 'result';
  console.log('RESULT counts:', r.counts, '\n-> press Enter for next');
});
admin.on('session:finished', () => { console.log('Quiz finished'); process.exit(0); });

admin.emit('admin:join', { code, adminKey: 'change-me' }, (r) =>
  console.log(r.ok ? 'Admin ready -> press Enter to START' : 'Error: ' + r.error));

readline
  .createInterface({ input: process.stdin, terminal: false })
  .on('line', () => {
    const ev = phase === 'lobby' ? 'admin:start' : 'admin:next';
    admin.emit(ev, (r) => { if (!r.ok) console.log('!', r.error); });
  });
