import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User, GraduationCap, Compass, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingModalProps {
  isOpen: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen }) => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('Computer Science');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set initial name from user object
  useEffect(() => {
    if (user?.displayName) {
      setName(user.displayName);
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, {
        name: name.trim(),
        email: user.email || '',
        university: university.trim(),
        fieldOfStudy: fieldOfStudy,
        plan: 'free',
        uploadCount: 0,
        createdAt: serverTimestamp(),
      });
      // Force custom update in state if updateProfile is defined
      if (updateProfile) {
        await updateProfile({
          name: name.trim(),
          university: university.trim(),
          fieldOfStudy: fieldOfStudy,
        });
      }
    } catch (err: any) {
      console.error('Onboarding save error:', err);
      setError(err?.message || 'Failed to save onboarding profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const fieldsOfStudy = [
    'Science',
    'Engineering',
    'Medicine',
    'Business',
    'Law',
    'Arts',
    'Computer Science',
    'Other'
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md bg-white rounded-3xl p-8 border border-gray-100 shadow-2xl relative text-left"
          id="onboarding-modal-card"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Let's set up your profile 👋
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Just two quick things before you start
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter full name..."
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 45))}
                  maxLength={45}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-teal focus:border-brand-teal focus:outline-none rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition"
                />
              </div>
            </div>

            {/* University Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">University / Institution</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="University / School..."
                  value={university}
                  onChange={(e) => setUniversity(e.target.value.slice(0, 60))}
                  maxLength={60}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-teal focus:border-brand-teal focus:outline-none rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition"
                />
              </div>
            </div>

            {/* Field of Study Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Field of Study</label>
              <div className="relative">
                <Compass className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                <select
                  required
                  value={fieldOfStudy}
                  onChange={(e) => setFieldOfStudy(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-teal focus:border-brand-teal focus:outline-none rounded-xl pl-9 pr-4 py-3.5 text-sm font-semibold text-gray-800 transition appearance-none"
                >
                  {fieldsOfStudy.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-teal hover:bg-teal-700 active:scale-[0.98] font-bold rounded-xl text-white transition duration-150 shadow-md cursor-pointer text-sm disabled:opacity-50 mt-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Setting up Profile...</span>
                </>
              ) : (
                <span>Get Started</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
