import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PolyDecoration from '../components/PolyDecoration';
import { useFullscreen } from '../hooks/useFullscreen';
import { joinGame } from '../hooks/useSession';

export default function Instructions() {
  const { code } = useParams();
  const navigate = useNavigate();
  const codeUpper = String(code || '').toUpperCase();
  const fullscreen = useFullscreen();

  const [quizInfo, setQuizInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

  useEffect(() => {
    // Check if player details exist in sessionStorage or localStorage
    const stored = sessionStorage.getItem(`quiz:join:${codeUpper}`);
    if (!stored) {
      // Re-route to join if no player details entered yet
      navigate(`/join/${codeUpper}`);
      return;
    }

    let ignore = false;
    fetch(`${SERVER_URL}/api/sessions/${codeUpper}/info`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setQuizInfo(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [codeUpper, navigate, SERVER_URL]);

  const handleJoinQuiz = async () => {
    if (!agreed || joining) return;
    setJoining(true);
    setJoinError('');

    const stored = sessionStorage.getItem(`quiz:join:${codeUpper}`);
    if (!stored) {
      navigate(`/join/${codeUpper}`);
      return;
    }

    const details = JSON.parse(stored);

    // USER GESTURE: Request fullscreen & wake lock inside click handler
    await fullscreen.enter();

    try {
      const res = await joinGame(codeUpper, details);
      if (res?.ok) {
        navigate(`/play/${codeUpper}`);
      } else {
        setJoinError(res?.error || 'Failed to join the quiz.');
        setJoining(false);
      }
    } catch (err) {
      setJoinError(err.message || 'Connection error. Please try again.');
      setJoining(false);
    }
  };

  const totalQuestions = quizInfo?.totalQuestions ?? 10;
  const timePerQuestion = quizInfo?.timePerQuestion ?? 10;
  const marksPerCorrect = quizInfo?.marksPerCorrect ?? 10;
  const autoAdvance = quizInfo?.autoAdvanceSeconds ?? 0;

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 relative z-10 space-y-8">
        {/* Title & Subtitle */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0E201A] tracking-tight">
            <span className="font-bold wavy-underline">Quiz</span> Instructions
          </h1>
          <p className="text-sm sm:text-base text-[#3F534D]">
            Read this before you start. The quiz begins for everyone at the same time.
          </p>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Questions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#0F9579] mb-1">
              {loading ? '-' : totalQuestions}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#3F534D]">
              Questions in total
            </div>
          </div>

          {/* Time per question */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#0F9579] mb-1">
              {loading ? '-' : `${timePerQuestion}s`}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#3F534D]">
              Per question
            </div>
          </div>

          {/* Marks per correct */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#0F9579] mb-1">
              {loading ? '-' : `+${marksPerCorrect}`}
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#3F534D]">
              Marks per correct answer
            </div>
          </div>

          {/* Wrong or skipped */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="text-3xl sm:text-4xl font-bold text-[#0F9579] mb-1">
              0
            </div>
            <div className="text-xs sm:text-sm font-medium text-[#3F534D]">
              For wrong or skipped
            </div>
          </div>
        </div>

        {/* 2 Main Cards: How it works & Marking and results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How it works */}
          <div className="bg-white rounded-[20px] p-6 sm:p-7 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-[#0E201A]">
              How it works
            </h2>
            <ol className="space-y-3 text-sm text-[#3F534D] leading-relaxed list-none">
              <li className="flex items-start gap-3">
                <span className="font-semibold text-[#0B7C68] min-w-4">1</span>
                <span>Questions appear one at a time, for everyone together.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-[#0B7C68] min-w-4">2</span>
                <span>You get {timePerQuestion} seconds per question. Tap an option, or leave it.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-[#0B7C68] min-w-4">3</span>
                <span>When time is up, answers lock and a chart shows how everyone answered, with the correct option.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-[#0B7C68] min-w-4">4</span>
                <span>
                  {autoAdvance > 0
                    ? 'The next question starts on its own. No buttons to press.'
                    : 'The host moves to the next question. There is nothing for you to press.'}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold text-[#0B7C68] min-w-4">5</span>
                <span>After the last question you reach the exit page.</span>
              </li>
            </ol>
          </div>

          {/* Marking and results */}
          <div className="bg-white rounded-[20px] p-6 sm:p-7 shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-lg font-bold text-[#0E201A]">
              Marking and results
            </h2>
            <ul className="space-y-3 text-sm text-[#3F534D] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B7C68] mt-2 shrink-0" />
                <span>{marksPerCorrect} marks for each correct answer. No negative marking.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B7C68] mt-2 shrink-0" />
                <span>Multi-select questions: choose every correct option for full marks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B7C68] mt-2 shrink-0" />
                <span>Ties are broken by total answering time. Faster wins.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B7C68] mt-2 shrink-0" />
                <span>Scores are not shown during the quiz. The leaderboard is published a few days later.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0B7C68] mt-2 shrink-0" />
                <span>Do not refresh or leave the page. If you drop, rejoin with the same ID.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Error message */}
        {joinError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl p-4 text-center">
            {joinError}
          </div>
        )}

        {/* Bottom Bar */}
        <div className="bg-white rounded-[20px] p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded text-[#0B7C68] focus:ring-[#26BA9A] border-slate-300 accent-[#0B7C68] cursor-pointer"
            />
            <span className="text-sm font-medium text-[#0E201A]">
              I have read the instructions and I'm ready.
            </span>
          </label>

          <button
            type="button"
            disabled={!agreed || joining}
            onClick={handleJoinQuiz}
            className="w-full sm:w-auto min-h-[56px] px-8 bg-[#0B7C68] hover:bg-[#096655] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-base transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Entering quiz...</span>
              </>
            ) : (
              'Join the quiz'
            )}
          </button>
        </div>
      </main>

      <PolyDecoration />
    </div>
  );
}

