import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-30 w-full px-4 sm:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#26BA9A] flex items-center justify-center text-white font-bold text-base shadow-sm transition-transform group-hover:scale-105">
            Q
          </div>
          <span className="text-xl font-bold text-[#0E201A] tracking-tight">
            LiveQuiz
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-[#3F534D]">
          <Link to="/" className="hover:text-[#0B7C68] transition-colors">
            Home
          </Link>
          <Link to="/about" className="hover:text-[#0B7C68] transition-colors">
            About us
          </Link>
          <Link to="/contact" className="hover:text-[#0B7C68] transition-colors">
            Contact us
          </Link>
        </nav>

        {/* Desktop Login Button */}
        <div className="hidden sm:block">
          <Link
            to="/login"
            className="inline-flex items-center justify-center bg-[#0B7C68] hover:bg-[#096655] text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Login
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="sm:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#3F534D] hover:text-[#0E201A] hover:bg-slate-200/50 focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/60 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-[#3F534D] hover:bg-[#E2F3ED] hover:text-[#0B7C68] rounded-xl transition-colors"
          >
            Home
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-[#3F534D] hover:bg-[#E2F3ED] hover:text-[#0B7C68] rounded-xl transition-colors"
          >
            About us
          </Link>
          <Link
            to="/contact"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-[#3F534D] hover:bg-[#E2F3ED] hover:text-[#0B7C68] rounded-xl transition-colors"
          >
            Contact us
          </Link>
          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center bg-[#0B7C68] text-white py-2.5 rounded-xl font-semibold text-sm"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

