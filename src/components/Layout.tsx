import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { LogOut, ChevronDown, User, LayoutDashboard, BookOpen, Upload, Shield, Sparkles, Loader2 } from 'lucide-react';
import { ProfileModal } from './ProfileModal';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      setIsDropdownOpen(false);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      console.log("[StudyFlash] Clicked outside registered — closing dropdown navigation.");
      setIsDropdownOpen(false);
    };
    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  return (
    <div dir="ltr" className="min-h-screen bg-app-bg text-[#1A1A1A] font-sans">
      {/* Top Logout Loader Page overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center">
            <Loader2 className="w-10 h-10 text-brand-teal animate-spin mb-4" />
            <h3 className="text-lg font-extrabold text-gray-900">Logging Out Securely</h3>
            <p className="text-xs text-gray-400 mt-2 font-light">Please wait while StudyFlash terminates your active browser session.</p>
          </div>
        </div>
      )}

      <nav className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-2 text-brand-teal font-bold text-xl hover:opacity-90 transition">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          StudyFlash
        </Link>
        
        {user ? (
          <div className="flex gap-8 text-sm font-medium text-[#6B7280]">
            <Link to="/dashboard" className="hover:text-brand-teal transition-colors">Dashboard</Link>
            <Link to="/library" className="hover:text-brand-teal transition-colors">My Library</Link>
            <Link to="/upload" className="hover:text-brand-teal transition-colors">Upload</Link>
            <Link to="/profile" className="hover:text-brand-teal transition-colors">Profile</Link>
          </div>
        ) : (
          <div className="text-sm font-medium text-gray-400 select-none">
            Intelligent Lecture Assistant
          </div>
        )}

        {user ? (
          <div className="flex items-center gap-4 text-sm relative" ref={dropdownRef}>
            {/* Clickable Profile Pill Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log("[StudyFlash] Profile pill button clicked. current state:", isDropdownOpen, "toggling to:", !isDropdownOpen);
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 p-1.5 pr-3 rounded-full border border-gray-300 transition-all duration-150 cursor-pointer shadow-sm active:scale-[0.96] select-none z-10"
              title="Open profile menu"
            >
              {/* Ensure standard LTR ordering of sub-elements directly */}
              <div className="flex items-center gap-2 focus:outline-none select-none">
                <div className="w-8 h-8 rounded-full bg-brand-teal text-white flex items-center justify-center font-bold text-xs shadow-inner overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    (profile?.name || user.displayName || user.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <span className="font-semibold text-gray-700 max-w-[130px] truncate">
                  {profile?.name || user.displayName || user.email?.split('@')[0]}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu Overlay */}
            {isDropdownOpen && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("[StudyFlash] Dropdown item click stopped propagation safely.");
                }}
                className="absolute right-0 top-12 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl py-3 divide-y divide-gray-100 animate-in fade-in duration-150"
              >
                {/* User Info Header Section */}
                <div className="px-4 py-3 pb-4">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img 
                        src={user.photoURL} 
                        alt="User profile" 
                        className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {(profile?.name || user.displayName || user.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 truncate">
                        {profile?.name || user.displayName || 'Authorized Scholar'}
                      </p>
                      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                        <Shield className="w-3 h-3 text-brand-teal fill-current" />
                        <span>{profile?.plan === 'pro' ? 'Premium Academic Plan' : 'Active Account'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Options Section */}
                <div className="py-2.5 px-2 space-y-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-600 hover:text-brand-teal hover:bg-gray-50 font-semibold text-xs transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Study Dashboard</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-600 hover:text-brand-teal hover:bg-gray-50 font-semibold text-xs transition-colors text-left cursor-pointer"
                  >
                    <User className="w-4 h-4 text-gray-400 mr-1 inline-block" />
                    <span>My Profile & Settings</span>
                  </button>

                  <Link
                    to="/library"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-600 hover:text-brand-teal hover:bg-gray-50 font-semibold text-xs transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>My Library Books</span>
                  </Link>

                  <Link
                    to="/upload"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-600 hover:text-brand-teal hover:bg-gray-50 font-semibold text-xs transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Documents</span>
                  </Link>
                </div>

                {/* Sign Out / Log Out Button Section */}
                <div className="px-2 pt-2 pb-0.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700 font-bold text-xs transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs font-semibold text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 select-none">
            Secure Area
          </div>
        )}
      </nav>
      <main className="p-8">
        {children}
      </main>

      {/* Render the core User Profile Modal globally managed by top navigation clicks */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};
