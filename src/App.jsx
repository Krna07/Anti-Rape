import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import EmergencyBanner from './components/EmergencyBanner';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import AlertsPage from './pages/AlertsPage';
import AlertDetail from './pages/AlertDetail';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

const KYCAdminPanel = lazy(() => import('./pages/KYCAdminPanel'));

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center"><div className="spinner"/></div>;
  if (!user)   return <Navigate to="/auth" replace />;

  // Admin sees only the KYC panel
  if (user.role === 'admin') {
    return (
      <SocketProvider>
        <div className="layout">
          <Navbar />
          <div className="content">
            <Routes>
              <Route path="/admin/kyc" element={
                <Suspense fallback={<div className="center"><div className="spinner"/></div>}>
                  <KYCAdminPanel />
                </Suspense>
              } />
              <Route path="*" element={<Navigate to="/admin/kyc" replace />} />
            </Routes>
          </div>
        </div>
      </SocketProvider>
    );
  }

  return (
    <SocketProvider>
      <div className="layout">
        <EmergencyBanner />
        <Navbar />
        <div className="content">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/alerts"      element={<AlertsPage />} />
            <Route path="/alerts/:id"  element={<AlertDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile"     element={<Profile />} />
          </Routes>
        </div>
      </div>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background:'#1c2333', color:'#e6edf3', border:'1px solid #30363d' }
        }}/>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/*"    element={<Protected />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
