import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PolyDecoration from '../components/PolyDecoration';

export default function Join() {
  const { code } = useParams();
  const navigate = useNavigate();
  const codeUpper = String(code || '').toUpperCase();

  const [quizInfo, setQuizInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [contact, setContact] = useState('');
  const [formError, setFormError] = useState('');

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setFetchError(false);

    fetch(`${SERVER_URL}/api/sessions/${codeUpper}/info`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          if (data.status === 'finished') {
            setFetchError(true);
          } else {
            setQuizInfo(data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setFetchError(true);
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [codeUpper, SERVER_URL]);

  const validateContact = (val) => {
    const trimmed = val.trim();
    // Email regex check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(trimmed)) return true;
    // Phone regex check: allow optional +, spaces, dashes, parentheses, minimum 7 digits
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) return true;
    return false;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    const trimmedPid = participantId.trim();
    const trimmedContact = contact.trim();

    if (!trimmedName) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!trimmedPid) {
      setFormError('Please enter your Participant ID.');
      return;
    }
    if (!trimmedContact) {
      setFormError('Please enter your phone number or email.');
      return;
    }
    if (!validateContact(trimmedContact)) {
      setFormError('Please enter a valid email address or phone number (at least 7 digits).');
      return;
    }

    // Save details to sessionStorage (does NOT connect socket yet)
    sessionStorage.setItem(
      `quiz:join:${codeUpper}`,
      JSON.stringify({
        name: trimmedName,
        participantId: trimmedPid,
        contact: trimmedContact,
      })
    );

    navigate(`/instructions/${codeUpper}`);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#0B7C68] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#3F534D] font-medium">Loading quiz details...</p>
          </div>
        </main>
        <PolyDecoration />
      </div>
    );
  }

  if (fetchError || !quizInfo) {
    return (
      <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="bg-white rounded-[20px] p-8 max-w-md w-full text-center shadow-xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-2xl font-bold text-[#0E201A] mb-2">Quiz Not Found</h2>
            <p className="text-[#3F534D] text-base mb-6">
              This quiz link isn't valid or has ended. Please check the link or ask the organizer for a fresh invite.
            </p>
            <Link
              to="/"
              className="inline-block bg-[#0B7C68] hover:bg-[#096655] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <PolyDecoration />
      </div>
    );
  }

  const { title = 'Quiz', totalQuestions = 10, timePerQuestion = 10 } = quizInfo;

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-16 flex items-center relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Scanned from QR chip */}
            <div className="inline-flex items-center gap-2 bg-[#E3F3ED] text-[#0B7C68] px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide">
              <span>Scanned from QR · {title}</span>
            </div>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-[#0E201A] tracking-tight leading-tight">
              Ready to play the <span className="font-bold wavy-underline">Quiz?</span>
            </h1>

            {/* Paragraph */}
            <p className="text-base sm:text-lg text-[#3F534D] max-w-xl leading-relaxed">
              Enter your details to join. Every question is timed and shown to everyone together, so keep your phone ready.
            </p>

            {/* Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm text-[#3F534D] text-xs sm:text-sm font-medium px-4 py-2 rounded-full">
                {totalQuestions} questions
              </span>
              <span className="bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm text-[#3F534D] text-xs sm:text-sm font-medium px-4 py-2 rounded-full">
                {timePerQuestion} sec each
              </span>
              <span className="bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm text-[#3F534D] text-xs sm:text-sm font-medium px-4 py-2 rounded-full">
                Live with everyone
              </span>
            </div>
          </div>

          {/* Right Card */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white rounded-[20px] shadow-[0_15px_35px_rgba(0,0,0,0.06)] border border-slate-100/80 p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-[#0E201A] mb-6">
                Join the quiz
              </h2>

              <form onSubmit={handleContinue} className="space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-[#0E201A] mb-1.5 uppercase tracking-wider">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    maxLength={60}
                    className="w-full border border-[#7B968F] focus:border-[#26BA9A] focus:ring-2 focus:ring-[#26BA9A]/20 rounded-xl px-4 py-3 text-sm text-[#0E201A] placeholder:text-slate-400 outline-none transition-all"
                    required
                  />
                </div>

                {/* Participant ID */}
                <div>
                  <label className="block text-xs font-semibold text-[#0E201A] mb-1.5 uppercase tracking-wider">
                    Participant ID
                  </label>
                  <input
                    type="text"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    placeholder="Roll no. or employee ID"
                    maxLength={60}
                    className="w-full border border-[#7B968F] focus:border-[#26BA9A] focus:ring-2 focus:ring-[#26BA9A]/20 rounded-xl px-4 py-3 text-sm text-[#0E201A] placeholder:text-slate-400 outline-none transition-all"
                    required
                  />
                </div>

                {/* Phone or email */}
                <div>
                  <label className="block text-xs font-semibold text-[#0E201A] mb-1.5 uppercase tracking-wider">
                    Phone or email
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="So we can reach you with results"
                    maxLength={120}
                    className="w-full border border-[#7B968F] focus:border-[#26BA9A] focus:ring-2 focus:ring-[#26BA9A]/20 rounded-xl px-4 py-3 text-sm text-[#0E201A] placeholder:text-slate-400 outline-none transition-all"
                    required
                  />
                </div>

                {formError && (
                  <p className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                    {formError}
                  </p>
                )}

                {/* Continue button */}
                <button
                  type="submit"
                  className="w-full min-h-[56px] bg-[#0B7C68] hover:bg-[#096655] text-white font-semibold rounded-xl py-3.5 transition-colors shadow-sm text-base mt-2 flex items-center justify-center cursor-pointer"
                >
                  Continue
                </button>

                {/* Footnote */}
                <p className="text-xs text-center text-[#7B968F] pt-2">
                  One attempt per participant ID.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <PolyDecoration />
    </div>
  );
}
