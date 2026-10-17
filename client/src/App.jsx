import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DatasetProfile from './pages/DatasetProfile';
import ReportBuilder from './pages/ReportBuilder';
import SharedReport from './pages/SharedReport';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function Layout() {
  const location = useLocation();
  const isSharedPage = location.pathname.startsWith('/shared/');

  return (
    <div className={isSharedPage ? "shared-shell" : location.pathname === "/login" ? "auth-shell" : "app-shell"}>
      {!isSharedPage && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dataset/:id"
          element={
            <PrivateRoute>
              <DatasetProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/report/:id"
          element={
            <PrivateRoute>
              <ReportBuilder />
            </PrivateRoute>
          }
        />
        <Route path="/shared/:token" element={<SharedReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  );
}
