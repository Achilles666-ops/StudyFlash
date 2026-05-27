import { signInWithGoogle } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-8">Welcome to StudyFlash</h1>
      <button 
        onClick={handleSignIn}
        className="px-6 py-3 bg-white border border-[#E5E7EB] rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition"
      >
        Sign in with Google
      </button>
    </div>
  );
};
