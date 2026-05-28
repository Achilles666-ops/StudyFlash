import { useEffect } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { motion } from 'framer-motion';

export const Login = () => {
  const navigate = useNavigate();
  const { user, loading, authError } = useAuth();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center">
        {/* Core Loading spinner with StudyFlash logo */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-[#0F7B6C] font-bold text-3xl mb-6 tracking-tight animate-pulse">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            StudyFlash
          </div>
          <div className="w-10 h-10 border-4 border-[#0F7B6C] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-[#6B7280]">Loading study experience...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFB] font-sans"
      id="login-page-container"
    >
      {/* Left panel: brand panel (teal background) */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-[#0c6357] to-[#0F7B6C] text-white flex flex-col justify-between p-8 md:p-16 relative overflow-hidden shrink-0">
        {/* Subtle background decorative shapes */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-24 right-12 w-96 h-96 bg-black/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Branding logo */}
        <div className="flex items-center gap-2 text-white font-black text-2xl md:text-3xl tracking-tight">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          StudyFlash
        </div>

        {/* Middle: Content */}
        <div className="my-12 md:my-auto max-w-lg space-y-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Turn your lecture notes into exam-ready flashcards instantly
          </h1>
          
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-xl shrink-0 bg-white/10 p-2.5 rounded-xl">📄</span>
              <div>
                <h3 className="font-bold text-base">Upload any PDF or note image</h3>
                <p className="text-white/80 text-sm mt-0.5 font-light">Drag and drop slides, textbooks, or handwritten reviews</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-xl shrink-0 bg-white/10 p-2.5 rounded-xl">🃏</span>
              <div>
                <h3 className="font-bold text-base">AI generates flashcards automatically</h3>
                <p className="text-white/80 text-sm mt-0.5 font-light">Transform massive syllabi into interactive questions & notes</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-xl shrink-0 bg-white/10 p-2.5 rounded-xl">📊</span>
              <div>
                <h3 className="font-bold text-base">Track your mastery before every exam</h3>
                <p className="text-white/80 text-sm mt-0.5 font-light">Test your comprehension score to spot studying gaps</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Subfooter on left */}
        <div className="text-sm text-white/60 font-light hidden md:block">
          © 2026 StudyFlash. All rights reserved.
        </div>
      </div>

      {/* Right panel: white login form panel */}
      <div className="w-full md:w-1/2 bg-white flex flex-col justify-between p-8 md:p-16">
        <div className="my-auto max-w-md w-full mx-auto space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
              Welcome to StudyFlash
            </h2>
            <p className="text-sm text-[#6B7280] font-medium mt-1">
              Sign in to start studying smarter
            </p>
          </div>

          <div className="w-full h-px bg-[#E5E7EB]" />

          {authError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 leading-relaxed">
              {authError}
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-[#F9FAFB] text-[#1A1A1A] rounded-2xl border border-[#E5E7EB] font-bold text-sm shadow-sm hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer"
          >
            {/* Proper Google brand logo vectors */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-[#6B7280] font-medium leading-normal">
            Works with any Google account — university email or personal Gmail
          </p>
        </div>

        {/* Bottom panel subtext */}
        <div className="text-center text-xs text-[#6B7280] max-w-sm mx-auto font-light leading-relaxed mt-4">
          By signing in, you agree to use this platform responsibly
        </div>
      </div>
    </motion.div>
  );
};
