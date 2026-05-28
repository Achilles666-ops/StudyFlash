import { signInWithGoogle } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export const Login = () => {
  const navigate = useNavigate();
  const { authError } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm text-center">
        <h1 className="text-4xl font-bold mb-2 tracking-tight text-gray-900">StudyFlash</h1>
        <p className="text-gray-500 mb-8 font-light">Your intelligent lecture assistant</p>
        
        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-left text-sm text-red-700 font-medium">
            <span className="block font-bold text-red-800 mb-1">Access Restrained</span>
            {authError}
          </div>
        )}

        <button 
          onClick={handleSignIn}
          className="w-full px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold shadow-sm transition flex items-center justify-center gap-2.5"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
