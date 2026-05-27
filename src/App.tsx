/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Upload } from './components/Upload';
import { Library } from './components/Library';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/library" element={<Library />} />
              <Route path="/login" element={<div>Login</div>} />
            </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
