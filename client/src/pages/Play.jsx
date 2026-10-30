import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSession, loadPlayer } from '../hooks/useSession';
import { useFullscreen } from '../hooks/useFullscreen';
import { useCountdown } from '../hooks/useCountdown';
import Navbar from '../components/Navbar';
import PolyDecoration from '../components/PolyDecoration';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function Play() {
  const { code } = useParams();
  const navigate = useNavigate();
  const codeUpper = String(code || '').toUpperCase();
  const fullscreen = useFullscreen();

  const { state, error, answer } = useSession(codeUpper);

  // Local optimistic answer state
  const [localAnswer, setLocalAnswer] = useState(null);
  const [textInput, setTextInput] = useState('');
  const textDebounceRef = useRef(null);

  // Sync server currentAnswer when question arrives or reconnects
  useEffect(() => {
    if (state.phase === 'question') {
      if (state.currentAnswer !== undefined) {
        setLocalAnswer(state.currentAnswer);
        if (state.question?.type === 'text') {
          setTextInput(state.currentAnswer || '');
        }
      } else {
        setLocalAnswer(null);
        setTextInput('');
      }
    }
  }, [state.phase, state.question?.id, state.currentAnswer]);

  // Fullscreen mid-quiz and safety protections
  const isQuizActive = state.phase === 'question' || state.phase === 'result';

  useEffect(() => {
    if (!isQuizActive) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isQuizActive]);

  // Exit fullscreen on finished phase
  useEffect(() => {
    if (state.phase === 'finished') {
      fullscreen.exit();
    }
  }, [state.phase, fullscreen]);

  // Handle option select / toggle
  const handleSelectOption = (optionId, type) => {
    if (state.phase !== 'question') return;
    const isLocked = timerCountdown.isEnded;
    if (isLocked) return;

    if (type === 'multiple') {
      const currentList = Array.isArray(localAnswer) ? [...localAnswer] : [];
      const numId = Number(optionId);
      const exists = currentList.includes(numId);
      const updated = exists
        ? currentList.filter((id) => id !== numId)
        : [...currentList, numId];

      setLocalAnswer(updated);
      answer(updated);
    } else {
      // single or truefalse
      const numId = Number(optionId);
      const updated = [numId];
      setLocalAnswer(updated);
      answer(updated);
    }
  };

  // Handle text question type change with debounce
  const handleTextChange = (e) => {
    const val = e.target.value;
    setTextInput(val);
    setLocalAnswer(val);

    if (textDebounceRef.current) clearTimeout(textDebounceRef.current);
    textDebounceRef.current = setTimeout(() => {
      answer(val);
    }, 300);
  };

  // Timers
  // 1. Question phase countdown timer
  const timerCountdown = useCountdown(
    state.phase === 'question' ? state.question?.endsAt : null,
    state.phase === 'question' ? state.question?.offset : 0,
    state.question?.limitSec || state.quiz?.timePerQuestion || 10
  );

  // 2. Countdown phase timer (startsAt)
  const countdownTimer = useCountdown(
    state.phase === 'countdown' ? state.countdown?.startsAt : null,
    state.phase === 'countdown' ? state.countdown?.offset : 0,
    5
  );

  // 3. Result phase auto-advance timer (nextAt)
  const autoAdvanceTimer = useCountdown(
    state.phase === 'result' && state.result?.nextAt ? state.result.nextAt : null,
    state.phase === 'result' ? state.result?.offset : 0,
    state.result?.autoAdvanceSeconds || 0
  );

  // If user hasn't joined yet
  if (state.phase === 'nojoin') {
    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="bg-white rounded-[20px] p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-[#0E201A] mb-3">Join Required</h2>
            <p className="text-sm text-[#3F534D] mb-6">
              You need to enter your details before entering this quiz.
            </p>
            <Link
              to={`/join/${codeUpper}`}
              className="inline-block bg-[#0B7C68] hover:bg-[#096655] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Go to Join Page
            </Link>
          </div>
        </main>
        <PolyDecoration />
      </div>
    );
  }

  // Connecting state
  if (state.phase === 'connecting') {
    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#0B7C68] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#3F534D] font-medium">Connecting to session...</p>
          </div>
        </main>
        <PolyDecoration />
      </div>
    );
  }

  // ----------------------------------------------------
  // Screen 3: Lobby and Countdown Phase
  // ----------------------------------------------------
  if (state.phase === 'lobby' || state.phase === 'countdown') {
    const isCountdown = state.phase === 'countdown';
    const lobbyCount = state.playerCount ?? 1;

    // SVG arc calculation for countdown
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const progress = isCountdown ? countdownTimer.progressRatio : 1;
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden select-none">
        <Navbar />

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16 flex flex-col items-center justify-center relative z-10 text-center">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-[#0E201A] mb-12 tracking-tight">
            {isCountdown ? (
              <>
                Your <span className="font-bold wavy-underline">Quiz</span> Will Start in
              </>
            ) : (
              'Waiting for the host to start'
            )}
          </h1>

          {/* Big Circular Ring */}
          <div className="relative w-56 h-56 sm:w-68 sm:h-68 flex items-center justify-center my-4">
            {/* Outer subtle shadow disc */}
            <div className="absolute inset-0 rounded-full bg-white shadow-[0_15px_40px_rgba(0,0,0,0.06)]" />

            <svg
              className="w-full h-full -rotate-90 transform relative z-10"
              viewBox="0 0 200 200"
            >
              {/* Background ring track */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="12"
                fill="none"
              />
              {/* Dynamic Mint Ring */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className={`transition-all duration-300 ease-linear ${
                  isCountdown ? 'stroke-[#26BA9A]' : 'stroke-[#26BA9A] animate-soft-pulse'
                }`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={isCountdown ? strokeDashoffset : 0}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Inner White Disc with Big Number or Pulse */}
            <div className="absolute w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-white shadow-inner flex items-center justify-center z-20">
              {isCountdown ? (
                <span className="text-6xl sm:text-7xl font-bold text-[#0F9579] tracking-tighter">
                  {Math.max(0, countdownTimer.secondsDisplay)}
                </span>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#E2F3ED] flex items-center justify-center animate-soft-pulse">
                  <div className="w-6 h-6 rounded-full bg-[#26BA9A]" />
                </div>
              )}
            </div>
          </div>

          {/* Players in Lobby Count */}
          <div className="mt-10 space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#0F9579] tracking-tight">
              {lobbyCount.toLocaleString()} {lobbyCount > 1 ? '+' : ''}
            </div>
            <p className="text-xs sm:text-sm font-bold text-[#3F534D] tracking-widest uppercase">
              PLAYERS IN THE LOBBY
            </p>
          </div>

          {error && (
            <p className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}
        </main>

        <PolyDecoration />
      </div>
    );
  }

  // ----------------------------------------------------
  // Screen 4: Question Phase (Nav hidden, full screen)
  // ----------------------------------------------------
  if (state.phase === 'question') {
    const q = state.question;
    const isLocked = timerCountdown.isEnded;
    const currentIndex = q?.index ?? 0;
    const totalCount = q?.total ?? 1;

    // Small circular timer calculation
    const timerRadius = 24;
    const timerCircumference = 2 * Math.PI * timerRadius;
    const timerProgress = timerCountdown.progressRatio;
    const timerStrokeDashoffset = timerCircumference * (1 - timerProgress);

    // Question type label
    const typeLabel =
      q?.type === 'multiple'
        ? 'Multiple choice'
        : q?.type === 'truefalse'
        ? 'True / False'
        : q?.type === 'text'
        ? 'Text'
        : 'Single choice';

    return (
      <div
        className="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* Floating return to fullscreen pill if user left fullscreen */}
        {!fullscreen.isFullscreen && (
          <button
            type="button"
            onClick={fullscreen.enter}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0B7C68] hover:bg-[#096655] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>Tap to return to full screen</span>
          </button>
        )}

        {/* Top Header: Progress and Timer */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 relative z-10 pt-2">
          {/* Top-left: Question badge & progress bar segments */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-[#26BA9A]" />
              <span className="text-sm sm:text-base text-[#0E201A] font-medium">
                Question <strong className="font-extrabold text-[#0E201A]">{currentIndex + 1}</strong> of {totalCount}
              </span>
            </div>

            {/* Row of {total} progress segments */}
            <div className="flex items-center gap-1.5 w-48 sm:w-64">
              {Array.from({ length: totalCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentIndex ? 'bg-[#0B7C68]' : 'bg-[#C9DAD4]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Top-right: Circular Timer */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={timerRadius}
                className="stroke-slate-200/70"
                strokeWidth="4.5"
                fill="none"
              />
              <circle
                cx="30"
                cy="30"
                r={timerRadius}
                className={`transition-all duration-100 ease-linear ${
                  timerCountdown.isWarning ? 'stroke-[#EF4444]' : 'stroke-[#26BA9A]'
                }`}
                strokeWidth="4.5"
                strokeDasharray={timerCircumference}
                strokeDashoffset={timerStrokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span
              className={`absolute font-bold text-lg sm:text-xl ${
                timerCountdown.isWarning ? 'text-[#EF4444]' : 'text-[#0F9579]'
              }`}
            >
              {Math.max(0, timerCountdown.secondsDisplay)}
            </span>
          </div>
        </div>

        {/* Main Question Card & Options */}
        <div className="max-w-4xl w-full mx-auto my-auto py-6 relative z-10 space-y-6">
          <div className="bg-white rounded-[20px] shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-slate-100/80 p-6 sm:p-10">
            {/* Tags: Type & Marks */}
            <div className="flex items-center gap-2.5 mb-4">
              <span className="bg-[#E3F3ED] text-[#0B7C68] text-xs font-semibold px-3 py-1 rounded-full">
                {typeLabel}
              </span>
              <span className="bg-[#EEF4F2] text-[#3F534D] text-xs font-semibold px-3 py-1 rounded-full">
                {q?.points ?? 10} marks
              </span>
            </div>

            {/* Question Text */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0E201A] leading-snug mb-8">
              {q?.text}
            </h2>

            {/* Options or Text Input */}
            {q?.type === 'text' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  disabled={isLocked}
                  value={textInput}
                  onChange={handleTextChange}
                  placeholder="Type your answer here..."
                  className="w-full min-h-[56px] border-2 border-[#7B968F] focus:border-[#26BA9A] focus:ring-2 focus:ring-[#26BA9A]/20 rounded-xl px-5 py-3.5 text-base sm:text-lg text-[#0E201A] outline-none disabled:opacity-50 transition-all select-text"
                  style={{ WebkitTouchCallout: 'default' }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {q?.options?.map((opt, idx) => {
                  const letter = LETTERS[idx] || `${idx + 1}`;
                  const isSelected = Array.isArray(localAnswer)
                    ? localAnswer.includes(Number(opt.id))
                    : false;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleSelectOption(opt.id, q.type)}
                      className={`min-h-[56px] py-3.5 px-4 rounded-xl text-left flex items-center justify-between border transition-all cursor-pointer disabled:cursor-not-allowed ${
                        isSelected
                          ? 'bg-[#E2F3ED] border-[#32907E] border-2 shadow-sm'
                          : 'bg-white border-[#7B968F] hover:border-[#32907E]/70 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        {/* Letter Chip */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#0B7C68] text-white'
                              : 'bg-[#EEF4F2] text-[#3F534D]'
                          }`}
                        >
                          {letter}
                        </div>
                        {/* Option Label */}
                        <span className="text-sm sm:text-base font-medium text-[#0E201A] truncate">
                          {opt.label}
                        </span>
                      </div>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#0B7C68] flex items-center justify-center text-white shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Helper Text */}
          <div className="text-center">
            <p className="text-xs sm:text-sm text-[#3F534D]">
              {isLocked
                ? "Time's up! Waiting for results..."
                : 'You can change your choice until the timer ends. Leaving it blank is fine.'}
            </p>
          </div>
        </div>

        {/* Empty bottom space to balance layout */}
        <div className="h-4" />
        <PolyDecoration />
      </div>
    );
  }

  // ----------------------------------------------------
  // Screen 5: Answer / Result Phase (Nav hidden, full screen)
  // ----------------------------------------------------
  if (state.phase === 'result') {
    const res = state.result;
    const you = res?.you;
    const options = res?.options || [];
    const counts = res?.counts || {};
    const totalAnswers = res?.answeredCount ?? 0;
    const isLast = res?.isLast;
    const autoAdvanceSec = res?.autoAdvanceSeconds ?? 0;

    // Helper: format chosen / correct labels
    const formatOptionList = (idOrArray) => {
      if (idOrArray == null) return '';
      if (typeof idOrArray === 'string') return idOrArray;
      const list = [].concat(idOrArray).map(Number);
      return list
        .map((id) => {
          const idx = options.findIndex((o) => o.id === id);
          const letter = idx >= 0 ? LETTERS[idx] : '';
          const opt = options.find((o) => o.id === id);
          return letter && opt ? `${letter}, ${opt.label}` : opt?.label || id;
        })
        .join('; ');
    };

    const youPickedText = formatOptionList(you?.answer);
    const correctText = formatOptionList(res?.correctAnswer);
    const responseSec = you?.responseMs ? (you.responseMs / 1000).toFixed(1) : '0.0';

    // Banner variant: Correct, Wrong, or No Answer
    const isAnswered = you?.answered === true && you?.answer != null && !(Array.isArray(you?.answer) && you?.answer.length === 0);
    const isCorrect = you?.correct === true;

    return (
      <div
        className="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none"
        style={{ WebkitTouchCallout: 'none' }}
      >
        {/* Floating return to fullscreen pill if user left fullscreen */}
        {!fullscreen.isFullscreen && (
          <button
            type="button"
            onClick={fullscreen.enter}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0B7C68] hover:bg-[#096655] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>Tap to return to full screen</span>
          </button>
        )}

        {/* Top Header */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 relative z-10 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-[#26BA9A]" />
            <span className="text-sm sm:text-base text-[#0E201A] font-medium">
              Question <strong className="font-extrabold text-[#0E201A]">{(res?.index ?? 0) + 1}</strong> of {res?.total ?? 1} · Answer
            </span>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 text-[#3F534D] text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
            {totalAnswers.toLocaleString()} {totalAnswers === 1 ? 'answer' : 'answers'}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-4xl w-full mx-auto my-auto py-4 relative z-10 space-y-4">
          {/* Banner */}
          {isCorrect ? (
            <div className="bg-[#0B7C68] text-white rounded-[20px] p-5 sm:p-6 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">
                  Correct! +{you?.points ?? 10} marks
                </h3>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  You picked {youPickedText}, in {responseSec} seconds.
                </p>
              </div>
            </div>
          ) : isAnswered ? (
            <div className="bg-[#BE123C] text-white rounded-[20px] p-5 sm:p-6 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">
                  Not quite. 0 marks
                </h3>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  You picked {youPickedText}. Correct answer: {correctText}.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#475569] text-white rounded-[20px] p-5 sm:p-6 shadow-md flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold">
                  Time's up. No answer
                </h3>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  Correct answer: {correctText}.
                </p>
              </div>
            </div>
          )}

          {/* Question card + Bar Chart */}
          <div className="bg-white rounded-[20px] shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-slate-100/80 p-6 sm:p-8 space-y-6">
            <h2 className="text-lg sm:text-xl font-bold text-[#0E201A]">
              {res?.text}
            </h2>

            {/* Vertical Bar Chart */}
            <div className="pt-8 pb-4">
              {res?.type === 'text' ? (
                // Text Question Chart: 3 Bars (Correct, Wrong, No answer)
                <div className="flex items-end justify-center gap-8 sm:gap-16 h-56 border-b-2 border-slate-200 px-4">
                  {['correct', 'incorrect', 'skipped'].map((k) => {
                    const count = counts[k] || 0;
                    const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;
                    const isCorr = k === 'correct';
                    const label = k === 'correct' ? 'Correct' : k === 'incorrect' ? 'Wrong' : 'No answer';

                    return (
                      <div key={k} className="flex-1 max-w-[100px] flex flex-col items-center justify-end h-full group">
                        <span className="text-xs font-bold text-[#0E201A] mb-2">{pct}%</span>
                        <div
                          style={{ height: `${Math.max(6, (pct / 100) * 160)}px` }}
                          className={`w-full rounded-t-xl transition-all duration-700 ease-out ${
                            isCorr ? 'bg-[#0B7C68]' : 'bg-[#CFE0DA]'
                          }`}
                        />
                        <div className="pt-3 text-center">
                          <span className="text-xs font-semibold text-[#0E201A] block">{label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Option Types: Bar per option
                <div className="flex items-end justify-between gap-2 sm:gap-6 h-56 border-b-2 border-slate-200 px-2 sm:px-4">
                  {options.map((opt, idx) => {
                    const letter = LETTERS[idx] || `${idx + 1}`;
                    const count = counts[opt.id] || 0;
                    // Percentage of answers received
                    const pct = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0;

                    // Is this option correct?
                    const isRightOption = [].concat(res?.correctAnswer).map(Number).includes(Number(opt.id));
                    // Did the player choose this option?
                    const isPlayerPick = [].concat(you?.answer).map(Number).includes(Number(opt.id));

                    return (
                      <div
                        key={opt.id}
                        className="flex-1 flex flex-col items-center justify-end h-full"
                      >
                        {/* Percentage label above bar */}
                        <span className="text-xs sm:text-sm font-bold text-[#0E201A] mb-2">
                          {pct}%
                        </span>

                        {/* Bar */}
                        <div
                          style={{ height: `${Math.max(6, (pct / 100) * 150)}px` }}
                          className={`w-full max-w-[70px] rounded-t-xl transition-all duration-700 ease-out ${
                            isRightOption ? 'bg-[#0B7C68]' : 'bg-[#CFE0DA]'
                          }`}
                        />

                        {/* Under-bar labels & chips */}
                        <div className="pt-3 flex flex-col items-center text-center">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs mb-1 ${
                              isRightOption
                                ? 'bg-[#0B7C68] text-white'
                                : 'bg-[#EEF4F2] text-[#3F534D]'
                            }`}
                          >
                            {letter}
                          </div>
                          <span className="text-xs font-medium text-[#0E201A] max-w-[90px] truncate hidden sm:block">
                            {opt.label}
                          </span>

                          {/* Correct answer pill */}
                          {isRightOption && (
                            <span className="bg-[#E3F3ED] text-[#0B7C68] text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap">
                              Correct answer
                            </span>
                          )}

                          {/* Your pick pill */}
                          {isPlayerPick && (
                            <span className="border border-[#32907E] text-[#0B7C68] text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 whitespace-nowrap">
                              Your pick
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card: Next question or Finished info */}
          <div className="bg-white rounded-[20px] p-4 sm:p-5 shadow-sm border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-[#3F534D]">
              <span>
                {isLast
                  ? 'That was the last question.'
                  : autoAdvanceSec > 0
                  ? 'Next question starting...'
                  : 'Waiting for the host...'}
              </span>
              {autoAdvanceSec > 0 && !isLast && (
                <span className="font-bold text-[#0B7C68]">
                  {Math.max(0, autoAdvanceTimer.secondsDisplay)}s
                </span>
              )}
            </div>

            {/* Progress bar */}
            {!isLast && (
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                {autoAdvanceSec > 0 ? (
                  <div
                    style={{ width: `${(1 - autoAdvanceTimer.progressRatio) * 100}%` }}
                    className="h-full bg-[#0B7C68] transition-all duration-100 ease-linear rounded-full"
                  />
                ) : (
                  <div className="h-full bg-[#26BA9A] w-1/3 rounded-full animate-pulse" />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="h-4" />
        <PolyDecoration />
      </div>
    );
  }

  // ----------------------------------------------------
  // Screen 6: Exit Page (Phase finished)
  // ----------------------------------------------------
  if (state.phase === 'finished') {
    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden select-none">
        <Navbar />

        <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-8 py-12 sm:py-20 flex items-center justify-center relative z-10">
          <div className="bg-white rounded-[20px] p-8 sm:p-12 w-full text-center shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-slate-100/80 space-y-6">
            {/* Mint Success Icon */}
            <div className="w-16 h-16 rounded-full bg-[#E2F3ED] text-[#0B7C68] flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-light text-[#0E201A] tracking-tight">
              Thanks for <span className="font-bold wavy-underline">playing</span>
            </h1>

            {/* Explanatory text */}
            <div className="space-y-2 text-[#3F534D] text-base leading-relaxed">
              <p className="font-medium text-[#0E201A]">
                Your answers have been recorded.
              </p>
              <p className="text-sm">
                The leaderboard will be published in a few days.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                to="/"
                className="inline-block bg-[#0B7C68] hover:bg-[#096655] text-white px-8 py-3 rounded-xl font-semibold text-sm transition-colors shadow-sm"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </main>

        <PolyDecoration />
      </div>
    );
  }

  // Fallback
  return null;
}
