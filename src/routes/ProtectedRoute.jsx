import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'customer_service') return <Navigate to="/cs/dashboard" replace />;
    if (role === 'petugas_validasi') return <Navigate to="/validasi/dashboard" replace />;
    if (role === 'kasir') return <Navigate to="/kasir/dashboard" replace />;
    if (role === 'petugas_produksi') return <Navigate to="/produksi/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
