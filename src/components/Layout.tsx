import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-app-bg text-[#1A1A1A] font-sans">
      <nav className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8">
        <div className="flex items-center gap-2 text-brand-teal font-bold text-xl">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          StudyFlash
        </div>
        <div className="flex gap-8 text-sm font-medium text-[#6B7280]">
          <Link to="/dashboard" className="hover:text-brand-teal">Dashboard</Link>
          <Link to="/library" className="hover:text-brand-teal">My Library</Link>
          <Link to="/upload" className="hover:text-brand-teal">Upload</Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span>{user?.displayName || user?.email || 'User'}</span>
          <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-semibold text-xs">
            {user?.displayName ? user.displayName.split(' ').map(n=>n[0]).join('') : 'U'}
          </div>
        </div>
      </nav>
      <main className="p-8">
        {children}
      </main>
    </div>
  );
};
