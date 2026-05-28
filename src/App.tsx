/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Upload } from './components/Upload';
import { Library } from './components/Library';
import { Login } from './components/Login';
import { Study } from './components/Study';
import { Profile } from './components/Profile';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/study/:documentId" element={<ProtectedRoute><Study /></ProtectedRoute>} />
              <Route path="/study/:documentId/flashcards" element={<ProtectedRoute><Study /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
            </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
