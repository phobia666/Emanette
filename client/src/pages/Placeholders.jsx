import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PolyDecoration from '../components/PolyDecoration';

export function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-[20px] p-8 max-w-lg w-full text-center shadow-xl border border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-[#E2F3ED] text-[#0B7C68] flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            Q
          </div>
          <h1 className="text-3xl font-light text-[#0E201A] mb-3">
            Welcome to <span className="font-bold wavy-underline">LiveQuiz</span>
          </h1>
          <p className="text-[#3F534D] text-base mb-6">
            Join a live quiz by scanning the QR code or entering the quiz link from your event host.
          </p>
          <div className="p-4 bg-[#F8FAF9] rounded-xl border border-slate-200/60 text-sm text-[#3F534D]">
            Have a quiz code? Visit <code className="text-[#0B7C68] font-bold">/join/&lt;code&gt;</code> on your phone.
          </div>
        </div>
      </main>
      <PolyDecoration />
    </div>
  );
}

export function About() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-[20px] p-8 max-w-lg w-full text-center shadow-xl border border-slate-100">
          <h1 className="text-3xl font-light text-[#0E201A] mb-4">
            About <span className="font-bold wavy-underline">LiveQuiz</span>
          </h1>
          <p className="text-[#3F534D] text-base leading-relaxed mb-6">
            LiveQuiz is a real-time, synchronized quiz platform built for classrooms, company all-hands, and live competitions.
          </p>
          <Link
            to="/"
            className="inline-block bg-[#0B7C68] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#096655] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <PolyDecoration />
    </div>
  );
}

export function Contact() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-[20px] p-8 max-w-lg w-full text-center shadow-xl border border-slate-100">
          <h1 className="text-3xl font-light text-[#0E201A] mb-4">
            Contact <span className="font-bold wavy-underline">Us</span>
          </h1>
          <p className="text-[#3F534D] text-base mb-6">
            Questions or support? Email us at <a href="mailto:support@livequiz.app" className="text-[#0B7C68] font-semibold underline">support@livequiz.app</a>.
          </p>
          <Link
            to="/"
            className="inline-block bg-[#0B7C68] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#096655] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <PolyDecoration />
    </div>
  );
}

export function Login() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white rounded-[20px] p-8 max-w-sm w-full text-center shadow-xl border border-slate-100">
          <h1 className="text-3xl font-light text-[#0E201A] mb-4">
            Host <span className="font-bold wavy-underline">Login</span>
          </h1>
          <p className="text-[#3F534D] text-sm mb-6">
            Host portal access is managed via the admin dashboard.
          </p>
          <Link
            to="/"
            className="inline-block bg-[#0B7C68] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#096655] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <PolyDecoration />
    </div>
  );
}

