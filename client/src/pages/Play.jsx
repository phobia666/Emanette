import { useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

export default function Play() {
  const { code } = useParams();
  const { state, error, answer } = useSession(code);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <p className="text-sm opacity-60">Session {code}</p>
      <h1 className="text-2xl font-bold">Phase: {state.phase}</h1>
      {error && <p className="text-red-400">{error}</p>}

      {state.phase === 'question' && (
        <div className="mt-4 space-y-2">
          <p className="font-semibold">{state.question.text}</p>
          {state.question.options.map((o) => (
            <button
              key={o.id}
              disabled={state.answered}
              onClick={() => answer([o.id])}
              className="block w-full bg-indigo-500 rounded-lg p-3 text-left disabled:opacity-40"
            >
              {o.label}
            </button>
          ))}
          {state.answered && <p>Answer locked in</p>}
        </div>
      )}

      <pre className="mt-6 text-xs whitespace-pre-wrap opacity-70">
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}