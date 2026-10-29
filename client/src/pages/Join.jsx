import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { joinGame } from '../hooks/useSession';

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await joinGame(code, name);
    setBusy(false);
    if (res.ok) navigate(`/play/${code}`);
    else setError(res.error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-800">Join quiz</h1>
        <p className="text-sm text-slate-500">Code: <b>{code}</b></p>
        <input
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={busy} className="w-full bg-indigo-600 text-white rounded-lg py-2 font-semibold disabled:opacity-50">
          {busy ? 'Joining...' : 'Join'}
        </button>
      </form>
    </div>
  );
}