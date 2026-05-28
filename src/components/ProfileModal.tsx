import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { 
  X, User, Mail, GraduationCap, Compass, Layers, 
  Sparkles, LogOut, Check, Edit3, Shield, Loader2, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, logout, isLoggingOut, logoutError } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state values when profile is updated or opened
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setUniversity(profile.university || '');
      setFieldOfStudy(profile.fieldOfStudy || '');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateProfile({
        name: name.trim(),
        university: university.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Failed to commit profile updates:", error);
      setErrorMessage(error?.message || "Cloud sync failure. Please review network parameters.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutAction = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch (err) {
      console.error("Graceful session logout error feedback:", err);
    }
  };

  const userInitials = (name || user?.displayName || user?.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" id="profile-modal-overlay">
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs transition-opacity" 
          onClick={() => { if (!isSaving && !isLoggingOut) onClose(); }}
        />

        {/* Modal content container */}
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle border border-gray-100 shadow-2xl relative"
            id="profile-modal-card"
          >
            {/* Top close button */}
            <button
              onClick={onClose}
              disabled={isSaving || isLoggingOut}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition duration-150 cursor-pointer disabled:opacity-50"
              title="Close Profile Panel"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logout Loading State Mask */}
            {isLoggingOut && (
              <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-brand-teal animate-spin mb-4" />
                <h3 className="text-lg font-bold text-gray-900">Terminating Session</h3>
                <p className="text-sm text-gray-400 font-light mt-1">Clearing local secure structures and redirects...</p>
              </div>
            )}

            {/* Form & Card Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={name || 'Authenticated user'} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-[#E5E7EB] shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-inner">
                    {userInitials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-brand-teal p-1 rounded-full border-2 border-white text-white">
                  <Shield className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Profile Overview</span>
                  {profile?.plan === 'pro' ? (
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-md flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 fill-current" /> PRO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md">
                      FREE PLAN
                    </span>
                  )}
                </h2>
                <p className="text-xs text-brand-teal font-semibold">StudyFlash Intelligent Assistant</p>
              </div>
            </div>

            {/* Main view vs Edit states */}
            {!isEditing ? (
              <div className="space-y-5">
                {/* Details Breakdown */}
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                  {/* Full Name */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</span>
                      <span className="text-sm font-semibold text-gray-800 block">{name || 'No custom name set'}</span>
                    </div>
                  </div>

                  {/* Email address */}
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</span>
                      <span className="text-sm font-mono text-gray-700 block">{user?.email || 'unassigned@studyflash.edu'}</span>
                    </div>
                  </div>

                  {/* University */}
                  <div className="flex items-start gap-3">
                    <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">University</span>
                      <span className="text-sm font-semibold text-gray-800 block">{university || 'Unspecified Academic Institute'}</span>
                    </div>
                  </div>

                  {/* Field of study */}
                  <div className="flex items-start gap-3">
                    <Compass className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Field of Study</span>
                      <span className="text-sm font-semibold text-gray-800 block">{fieldOfStudy || 'General Core Curriculums'}</span>
                    </div>
                  </div>

                  {/* Plan display detail */}
                  <div className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Plan</span>
                      <span className="text-xs font-semibold text-gray-700 block mt-0.5">
                        {profile?.plan === 'pro' ? 'Premium Academic Plan' : 'Free Lecture Search (Basic tier)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error handling block */}
                {logoutError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-2 text-xs">
                    <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{logoutError}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition duration-150 shadow-xs cursor-pointer text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profile Details</span>
                  </button>

                  <button
                    onClick={handleLogoutAction}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 font-semibold rounded-xl transition duration-150 cursor-pointer text-sm"
                    title="Sign Out of Session"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                {/* Form fields */}
                <div className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        required
                        placeholder="Enter full name..."
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, 45))}
                        maxLength={45}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* University */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">University</label>
                    <div className="relative">
                      <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Academic institute..."
                        value={university}
                        onChange={(e) => setUniversity(e.target.value.slice(0, 60))}
                        maxLength={60}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Field of Study */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field of Study</label>
                    <div className="relative">
                      <Compass className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Major or field..."
                        value={fieldOfStudy}
                        onChange={(e) => setFieldOfStudy(e.target.value.slice(0, 60))}
                        maxLength={60}
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex gap-1.5">
                    <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Edit Form Controls */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-teal hover:bg-teal-600 font-bold rounded-xl text-white transition duration-150 shadow-xs cursor-pointer text-sm disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Details...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Saved Successfully!</span>
                      </>
                    ) : (
                      <span>Save Profile Changes</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setIsEditing(false);
                      setErrorMessage(null);
                    }}
                    className="px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl transition duration-150 cursor-pointer text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
