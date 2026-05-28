import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Library } from './components/Library';
import { Upload } from './components/Upload';
import { Study } from './components/Study';
import { Profile } from './components/Profile';
import { OnboardingModal } from './components/OnboardingModal';

function AppContent() {
  const { user, profile, loading } = useAuth();

  // Show a gorgeous, centered StudyFlash logo & loader spin while determining authentication state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 text-[#0F7B6C] font-bold text-3xl mb-6 tracking-tight select-none">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
            StudyFlash
          </div>
          <div className="w-10 h-10 border-4 border-[#0F7B6C] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold text-[#6B7280]">Verifying secure credentials...</p>
        </div>
      </div>
    );
  }

  // If authenticated but no Firestore user profile document exists, block with friendly Onboarding modal
  const showOnboarding = !!user && !profile;

  return (
    <>
      <Routes>
        {/* Public Login Route */}
        <Route path="/" element={<Login />} />
        
        {/* Secure Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Secure Library Route */}
        <Route 
          path="/library" 
          element={
            <ProtectedRoute>
              <Layout>
                <Library />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Secure Upload Route */}
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <Layout>
                <Upload />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Secure Profile Settings Route */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Secure Studymode Routes */}
        <Route 
          path="/study/:documentId/:tab" 
          element={
            <ProtectedRoute>
              <Layout>
                <Study />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/study/:documentId" 
          element={
            <ProtectedRoute>
              <Layout>
                <Study />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Onboarding Overlay if user exists but has not completed profile metadata setup */}
      <OnboardingModal isOpen={showOnboarding} />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
