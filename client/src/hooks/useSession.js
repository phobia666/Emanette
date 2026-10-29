import { useEffect, useState, useCallback } from 'react';
import { socket } from '../socket';

const key = (code) => `quiz:player:${code.toUpperCase()}`;
export const loadPlayer = (code) => {
  try { return JSON.parse(localStorage.getItem(key(code))); } catch { return null; }
};

// called by the Join page
export function joinGame(code, name) {
  return new Promise((resolve) => {
    socket.emit('player:join', { code, name, playerId: loadPlayer(code)?.playerId }, (res) => {
      if (res.ok) {
        localStorage.setItem(key(code), JSON.stringify({ playerId: res.playerId, name }));
      }
      resolve(res);
    });
  });
}

// turns a server snapshot into our state, with a clock-skew offset for the timer
function fromSnapshot(snap) {
  if (snap.phase === 'question') {
    const offset = snap.question.serverNow - Date.now();
    return { phase: 'question', quiz: snap.quiz, question: { ...snap.question, offset }, answered: snap.answered };
  }
  if (snap.phase === 'result') return { phase: 'result', quiz: snap.quiz, result: snap.result };
  return { phase: snap.phase, quiz: snap.quiz }; // lobby / finished
}

export function useSession(code) {
  const [state, setState] = useState({ phase: 'connecting' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const rejoin = () => {
      const saved = loadPlayer(code);
      if (!saved) return setState({ phase: 'nojoin' });
      socket.emit('player:join',
        { code, name: saved.name, playerId: saved.playerId },
        (res) => (res.ok ? setState(fromSnapshot(res.state)) : setError(res.error)));
    };

    const onQuestion = (q) => {
      const offset = q.serverNow - Date.now();
      setState((s) => ({ phase: 'question', quiz: s.quiz, question: { ...q, offset }, answered: false }));
    };
    const onResult = (r) => setState((s) => ({ phase: 'result', quiz: s.quiz, result: r }));
    const onFinished = () => setState((s) => ({ phase: 'finished', quiz: s.quiz }));

    socket.on('connect', rejoin);       // also runs again after a reconnect
    socket.on('question:show', onQuestion);
    socket.on('question:result', onResult);
    socket.on('session:finished', onFinished);
    if (socket.connected) rejoin();

    return () => {
      socket.off('connect', rejoin);
      socket.off('question:show', onQuestion);
      socket.off('question:result', onResult);
      socket.off('session:finished', onFinished);
    };
  }, [code]);

  const answer = useCallback((value) => {
    socket.emit('player:answer', { answer: value }, (res) => {
      if (res.ok) setState((s) => ({ ...s, answered: true }));
      else setError(res.error);
    });
  }, []);

  return { state, error, answer };
}