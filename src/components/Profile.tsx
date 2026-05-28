import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { Document } from '../types';
import { 
  User, Mail, Calendar, Award, BookOpen, Sparkles, 
  Clock, LogOut, Settings, Volume2, VolumeX, Flame, 
  Check, Edit3, Shield, Info, Activity, GraduationCap, Compass, Loader2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { user, profile, updateProfile, logout, isLoggingOut, logoutError } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Editing profile states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUniversity, setEditUniversity] = useState('');
  const [editField, setEditField] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // States for user interactive controls / custom local study pref
  const [dailyGoal, setDailyGoal] = useState(() => {
    const saved = localStorage.getItem(`study_goal_${user?.uid}`);
    return saved ? parseInt(saved, 10) : 10;
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(`sound_effects_${user?.uid}`);
    return saved !== 'false';
  });

  const [autoRevealSummary, setAutoRevealSummary] = useState(() => {
    const saved = localStorage.getItem(`auto_reveal_${user?.uid}`);
    return saved === 'true';
  });

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load Firestore profile inputs on screen load or profile updates
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '');
      setEditUniversity(profile.university || '');
      setEditField(profile.fieldOfStudy || '');
    }
  }, [profile]);

  // Fetch documents count to show stats
  useEffect(() => {
    if (!user) return;
    setIsLoadingStats(true);
    const q = query(collection(db, 'documents'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
      setDocuments(docs);
      setIsLoadingStats(false);
    }, (error) => {
      console.error("Error loading stats:", error);
      setIsLoadingStats(false);
    });
    return unsubscribe;
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <Info className="w-12 h-12 text-gray-400 mb-4 animate-pulse" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Please Sign In First</h2>
        <p className="text-gray-500 mb-6">Activate your account to see your personal study dashboard.</p>
        <button 
          onClick={() => navigate('/login')} 
          className="px-6 py-2.5 bg-brand-teal text-white font-semibold rounded-xl hover:bg-teal-600 transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Calculate statistics
  const totalUploads = documents.length;
  const pdfCount = documents.filter(d => d.type === 'pdf').length;
  const imageCount = documents.filter(d => d.type === 'image').length;
  const totalCardsGen = documents.reduce((sum, doc) => sum + (doc.flashcardCount || 0), 0);
  const readyDocs = documents.filter(d => d.status === 'ready').length;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name: editName.trim(),
        university: editUniversity.trim(),
        fieldOfStudy: editField.trim(),
      });
      setIsEditing(false);
      triggerSaveMessage("Profile updated successfully!");
    } catch (err) {
      console.error("Failed to updates profile from screen: ", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoalChange = (val: number) => {
    const bounded = Math.max(1, Math.min(100, val));
    setDailyGoal(bounded);
    localStorage.setItem(`study_goal_${user.uid}`, bounded.toString());
    triggerSaveMessage(`Daily goal set to ${bounded} cards!`);
  };

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem(`sound_effects_${user.uid}`, nextVal ? 'true' : 'false');
    triggerSaveMessage(nextVal ? "Sound effects enabled!" : "Sound effects muted!");
  };

  const toggleAutoReveal = () => {
    const nextVal = !autoRevealSummary;
    setAutoRevealSummary(nextVal);
    localStorage.setItem(`auto_reveal_${user.uid}`, nextVal ? 'true' : 'false');
    triggerSaveMessage(nextVal ? "Auto-reveal summary active!" : "Auto-reveal muted!");
  };

  const triggerSaveMessage = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => {
      setSaveStatus(null);
    }, 2500);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const joinDate = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  const userInitials = (profile?.name || user.displayName || user.email || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Absolute Loading overlay during profile updates / logout operations */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-brand-teal animate-spin mb-4" />
          <p className="text-white text-sm font-semibold">Tearing down authenticated secure pipeline...</p>
        </div>
      )}

      {/* Save Success Toast Indicator */}
      {saveStatus && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 border border-teal-500/30 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <Check className="w-4 h-4 text-brand-teal" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Header Profile Section */}
      <div className="bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 h-2 bg-brand-teal w-full" />
        
        {/* Profile Avatar Frame */}
        <div className="relative group">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={profile?.name || user.displayName || 'User'} 
              className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E5E7EB] shadow-md group-hover:scale-[1.03] transition duration-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center font-bold text-3xl shadow-md tracking-wider group-hover:scale-[1.03] transition duration-200">
              {userInitials}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white" title="Verified Account">
            <Shield className="w-3.5 h-3.5 fill-current" />
          </span>
        </div>

        {/* Basic Information */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="space-y-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 justify-center md:justify-start">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {profile?.name || user.displayName || 'Scholar'}
              </h1>
              {profile?.plan === 'pro' && (
                <span className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-600 border border-yellow-200 self-center">
                  PRO MEMBER
                </span>
              )}
            </div>
            
            <p className="text-gray-500 flex items-center justify-center md:justify-start gap-1.5 text-sm font-light">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{user.email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-y-2 gap-x-6 justify-center md:justify-start text-xs font-semibold text-gray-400">
            <div className="flex items-center gap-1.5" title="Creation date">
              <Calendar className="w-3.5 h-3.5" />
              <span>Joined: {joinDate}</span>
            </div>
          </div>

          {/* Quick Academic Details list */}
          <div className="pt-2 flex flex-col gap-2 border-t border-gray-100/80 mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 justify-center md:justify-start">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <span className="font-semibold">{profile?.university || 'No university configured'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 justify-center md:justify-start">
              <Compass className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{profile?.fieldOfStudy || 'No field of study configured'}</span>
            </div>
          </div>
        </div>

        {/* Global Control Button */}
        <div className="self-center flex flex-col gap-2.5 w-full md:w-auto">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="px-5 py-2.5 bg-gray-950 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile Credentials</span>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(!showLogoutConfirm)}
            className="px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Account</span>
          </button>
        </div>
      </div>

      {/* Profile Editing form view card */}
      {isEditing && (
        <form onSubmit={handleEditSubmit} className="bg-white rounded-3xl p-6 border border-teal-500/20 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight uppercase border-b border-gray-100 pb-2">Modify Scholar Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
              <input
                type="text"
                required
                maxLength={45}
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, 45))}
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">University</label>
              <input
                type="text"
                maxLength={60}
                value={editUniversity}
                onChange={(e) => setEditUniversity(e.target.value.slice(0, 60))}
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Field of Study</label>
              <input
                type="text"
                maxLength={60}
                value={editField}
                onChange={(e) => setEditField(e.target.value.slice(0, 60))}
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:outline-brand-teal rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-800"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-brand-teal hover:bg-teal-600 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Save Firestore Changes</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-xs transition duration-150 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Popup Panel */}
      {showLogoutConfirm && (
        <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-red-900 text-sm">Are you absolutely sure you want to sign out?</h4>
              <p className="text-red-600 text-xs">You will need to sign in again to access your processed books and cards.</p>
            </div>
          </div>
          <div className="flex gap-2.5 w-full md:w-auto">
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition cursor-pointer flex-1 md:flex-initial text-center"
            >
              Sign Out
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2 bg-white text-gray-500 rounded-lg border border-gray-200 font-semibold text-xs hover:bg-gray-50 transition cursor-pointer flex-1 md:flex-initial text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Statistics Block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 leading-tight">
              {isLoadingStats ? '...' : totalUploads}
            </div>
            <div className="text-xs text-gray-500 font-medium tracking-tight uppercase">Lectures Uploaded</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 leading-tight">
              {isLoadingStats ? '...' : totalCardsGen}
            </div>
            <div className="text-xs text-gray-500 font-medium tracking-tight uppercase">Flashcards Generated</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 leading-tight">
              {dailyGoal}
            </div>
            <div className="text-xs text-gray-500 font-medium tracking-tight uppercase">Daily Card Goal</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900 leading-tight">
              {isLoadingStats ? '...' : readyDocs}
            </div>
            <div className="text-xs text-gray-500 font-medium tracking-tight uppercase">Processed Ready</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Account Details & Stats Breakdown Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs md:col-span-12 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-teal" />
            <span>Study statistics & Breakdown</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400">PDF Document count</span>
              <span className="text-xl font-bold text-gray-700 mt-2">{pdfCount} PDFs</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-gray-400">Image Material count</span>
              <span className="text-xl font-bold text-gray-700 mt-2">{imageCount} Images</span>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between col-span-1">
              <span className="text-xs font-semibold text-gray-400">Subscription Plan Tier</span>
              <span className="text-xl font-bold text-gray-700 mt-2 capitalize">{profile?.plan || 'Free'} Plan</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                <span>Lecture Conversion Efficiency</span>
                <span className="text-brand-teal">{totalUploads > 0 ? Math.round((readyDocs / totalUploads) * 100) : 100}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-teal h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalUploads > 0 ? (readyDocs / totalUploads) * 100 : 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-1.5">
                <span>Average Flashcards Per Lecture</span>
                <span className="text-indigo-600">{totalUploads > 0 ? Math.round(totalCardsGen / totalUploads) : 0} cards</span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, totalUploads > 0 ? ((totalCardsGen / totalUploads) / 20) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* User ID Section - hidden nicely */}
          <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-2">
            <span>Provider: Google Accounts API</span>
            <span className="font-mono bg-gray-50 px-2.5 py-1 rounded max-w-[240px] truncate" title={user.uid}>
              ID: {user.uid}
            </span>
          </div>
        </div>

        {/* Account & Study Preferences Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs md:col-span-12 space-y-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span>Study Preferences</span>
          </h3>

          <div className="space-y-5">
            {/* Daily study goal slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-600">Daily Study Target</span>
                <span className="text-xs font-bold text-brand-teal bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{dailyGoal} Cards</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={dailyGoal}
                onChange={(e) => handleGoalChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-teal"
              />
              <span className="block text-[10px] text-gray-400">Target goal of cards to master per continuous study session.</span>
            </div>

            <hr className="border-gray-100" />

            {/* Custom Study preferences */}
            <div className="space-y-4">
              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${soundEnabled ? 'bg-teal-50 text-brand-teal' : 'bg-gray-100 text-gray-400'}`}>
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-700 block">Sound Effects</span>
                    <span className="text-[10px] text-gray-400 block -mt-0.5">Flip sound on flashcard study</span>
                  </div>
                </div>
                <button
                  onClick={toggleSound}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${soundEnabled ? 'bg-brand-teal' : 'bg-gray-200'}`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Autoplay / Reveal preferences */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${autoRevealSummary ? 'bg-teal-50 text-brand-teal' : 'bg-gray-100 text-gray-400'}`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-700 block">Auto-expand Key Notes</span>
                    <span className="text-[10px] text-gray-400 block -mt-0.5">Toggle full expanded terms on study</span>
                  </div>
                </div>
                <button
                  onClick={toggleAutoReveal}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${autoRevealSummary ? 'bg-brand-teal' : 'bg-gray-200'}`}
                >
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${autoRevealSummary ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
