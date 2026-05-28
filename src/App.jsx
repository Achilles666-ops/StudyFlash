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

  // Show the exact spinner design requested in FIX 2
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: '#F8FAFB'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #E6F4F1',
          borderTop: '4px solid #0F7B6C',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}/>
        <p style={{ color: '#6B7280', fontFamily: 'sans-serif' }}>Loading StudyFlash...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // If user is NOT logged in → strictly show Login, absolutely bypassing any routes and redirects
  if (!user) {
    return <Login />;
  }

  // If authenticated but no Firestore user profile document exists, block with friendly Onboarding modal
  const showOnboarding = !profile;

  return (
    <>
      <Routes>
        {/* Render Dashboard at root / and /dashboard routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Secure Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <Layout>
              <Dashboard />
            </Layout>
          } 
        />

        {/* Secure Library Route */}
        <Route 
          path="/library" 
          element={
            <Layout>
              <Library />
            </Layout>
          } 
        />

        {/* Secure Upload Route */}
        <Route 
          path="/upload" 
          element={
            <Layout>
              <Upload />
            </Layout>
          } 
        />

        {/* Secure Profile Settings Route */}
        <Route 
          path="/profile" 
          element={
            <Layout>
              <Profile />
            </Layout>
          } 
        />

        {/* Secure Studymode Routes */}
        <Route 
          path="/study/:documentId/:tab" 
          element={
            <Layout>
              <Study />
            </Layout>
          } 
        />
        <Route 
          path="/study/:documentId" 
          element={
            <Layout>
              <Study />
            </Layout>
          } 
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
