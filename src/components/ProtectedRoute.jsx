import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loader } from './Loader';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <Loader />;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}
