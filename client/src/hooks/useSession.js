import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from '../socket';

const key = (code) => `quiz:player:${String(code).toUpperCase()}`;

export const loadPlayer = (code) => {
  try {
    return JSON.parse(localStorage.getItem(key(code)));
  } catch {
    return null;
  }
};

export const savePlayer = (code, data) => {
  try {
    localStorage.setItem(key(code), JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save player to localStorage', e);
  }
};

// Called by the Instructions page user gesture
export function joinGame(code, details) {
  return new Promise((resolve) => {
    const saved = loadPlayer(code);
    const payload = {
      code: String(code).toUpperCase(),
      name: details.name,
      participantId: details.participantId,
      contact: details.contact,
      playerId: saved?.playerId || details.playerId,
    };

    socket.emit('player:join', payload, (res) => {
      if (res?.ok) {
        savePlayer(code, {
          playerId: res.playerId,
          name: details.name,
          participantId: details.participantId,
          contact: details.contact,
        });
      }
      resolve(res);
    });
  });
}

// Converts server snapshot to client state with clock-skew offset
function fromSnapshot(snap) {
  if (!snap) return { phase: 'lobby' };

  if (snap.phase === 'countdown') {
    const offset = snap.countdown?.serverNow ? snap.countdown.serverNow - Date.now() : 0;
    return {
      phase: 'countdown',
      quiz: snap.quiz,
      playerCount: snap.playerCount || 0,
      countdown: { ...snap.countdown, offset },
    };
  }

  if (snap.phase === 'question') {
    const offset = snap.question?.serverNow ? snap.question.serverNow - Date.now() : 0;
    return {
      phase: 'question',
      quiz: snap.quiz,
      question: { ...snap.question, offset },
      answered: snap.answered,
      currentAnswer: snap.currentAnswer ?? null,
    };
  }

  if (snap.phase === 'result') {
    const offset = snap.result?.serverNow ? snap.result.serverNow - Date.now() : 0;
    return {
      phase: 'result',
      quiz: snap.quiz,
      result: { ...snap.result, offset },
    };
  }

  if (snap.phase === 'finished') {
    return {
      phase: 'finished',
      quiz: snap.quiz,
    };
  }

  return {
    phase: snap.phase || 'lobby',
    quiz: snap.quiz,
    playerCount: snap.playerCount || 0,
  };
}

export function useSession(code) {
  const [state, setState] = useState({ phase: 'connecting' });
  const [error, setError] = useState(null);
  const codeUpper = String(code || '').toUpperCase();
  const reconnectAttemptedRef = useRef(false);

  useEffect(() => {
    if (!codeUpper) return;

    const rejoin = () => {
      const saved = loadPlayer(codeUpper);
      if (!saved) {
        // No saved player identity in localStorage
        setState({ phase: 'nojoin' });
        return;
      }

      socket.emit(
        'player:join',
        {
          code: codeUpper,
          name: saved.name,
          participantId: saved.participantId,
          contact: saved.contact,
          playerId: saved.playerId,
        },
        (res) => {
          if (res?.ok) {
            savePlayer(codeUpper, {
              playerId: res.playerId,
              name: saved.name,
              participantId: saved.participantId,
              contact: saved.contact,
            });
            setState(fromSnapshot(res.state));
            setError(null);
          } else {
            setError(res?.error || 'Failed to connect');
          }
        }
      );
    };

    const onLobbyCount = ({ count }) => {
      setState((s) => ({ ...s, playerCount: count }));
    };

    const onCountdown = (data) => {
      const offset = data.serverNow - Date.now();
      setState((s) => ({
        phase: 'countdown',
        quiz: s.quiz,
        playerCount: s.playerCount,
        countdown: { ...data, offset },
      }));
    };

    const onQuestion = (q) => {
      const offset = q.serverNow - Date.now();
      setState((s) => ({
        phase: 'question',
        quiz: s.quiz,
        question: { ...q, offset },
        answered: false,
        currentAnswer: null,
      }));
    };

    const onResult = (r) => {
      const offset = (r.serverNow || Date.now()) - Date.now();
      setState((s) => ({
        phase: 'result',
        quiz: s.quiz,
        result: { ...r, offset },
      }));
    };

    const onFinished = () => {
      setState((s) => ({ phase: 'finished', quiz: s.quiz }));
    };

    socket.on('connect', rejoin);
    socket.on('lobby:count', onLobbyCount);
    socket.on('session:countdown', onCountdown);
    socket.on('question:show', onQuestion);
    socket.on('question:result', onResult);
    socket.on('session:finished', onFinished);

    if (socket.connected && !reconnectAttemptedRef.current) {
      reconnectAttemptedRef.current = true;
      rejoin();
    }

    return () => {
      socket.off('connect', rejoin);
      socket.off('lobby:count', onLobbyCount);
      socket.off('session:countdown', onCountdown);
      socket.off('question:show', onQuestion);
      socket.off('question:result', onResult);
      socket.off('session:finished', onFinished);
    };
  }, [codeUpper]);

  // Submit/change answer during question phase
  const answer = useCallback(
    (value) => {
      // Optimistically update currentAnswer in state immediately
      setState((s) => ({
        ...s,
        currentAnswer: value,
        answered:
          value !== null &&
          value !== undefined &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'string' && value.trim() === ''),
      }));

      socket.emit('player:answer', { answer: value }, (res) => {
        if (!res?.ok) {
          setError(res?.error);
        }
      });
    },
    []
  );

  return { state, error, answer, setState };
}
