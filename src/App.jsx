import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { DashboardLayout } from './layouts/DashboardLayout';

// Admin pages
import { AdminDashboard }  from './pages/admin/AdminDashboard';
import { PesananPage }     from './pages/admin/PesananPage';
import { UsersPage }       from './pages/admin/UsersPage';
import { KategoriPage }    from './pages/admin/KategoriPage';
import { LaporanPage }     from './pages/admin/LaporanPage';
import { PengaturanPage }  from './pages/admin/PengaturanPage';

// Role-specific pages
import { CSDashboard }        from './pages/cs/CSDashboard';
import { ValidasiDashboard }  from './pages/validasi/ValidasiDashboard';
import { KasirDashboard }     from './pages/kasir/KasirDashboard';
import { ProduksiDashboard }  from './pages/produksi/ProduksiDashboard';

// Role-based redirect at root
const RoleRedirect = () => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === 'admin')            return <Navigate to="/admin/dashboard"    replace />;
  if (role === 'customer_service') return <Navigate to="/cs/dashboard"       replace />;
  if (role === 'petugas_validasi') return <Navigate to="/validasi/dashboard" replace />;
  if (role === 'kasir')            return <Navigate to="/kasir/dashboard"    replace />;
  if (role === 'petugas_produksi') return <Navigate to="/produksi/dashboard" replace />;
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm">
        <h3 className="font-extrabold text-lg text-[#1A1D1B] mb-2">Role belum ditetapkan</h3>
        <p className="text-[#646A66] text-sm">Silakan hubungi Admin untuk mendapatkan akses.</p>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<RoleRedirect />} />

              {/* ── Admin ── */}
              <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="dashboard"  element={<AdminDashboard />} />
                <Route path="pesanan"    element={<PesananPage />} />
                <Route path="users"      element={<UsersPage />} />
                <Route path="kategori"   element={<KategoriPage />} />
                <Route path="laporan"    element={<LaporanPage />} />
                <Route path="pengaturan" element={<PengaturanPage />} />
              </Route>

              {/* ── Customer Service ── */}
              <Route path="cs" element={<ProtectedRoute allowedRoles={['customer_service']} />}>
                <Route path="dashboard" element={<CSDashboard />} />
                <Route path="pesanan"   element={<PesananPage />} />
              </Route>

              {/* ── Validasi ── */}
              <Route path="validasi" element={<ProtectedRoute allowedRoles={['petugas_validasi', 'admin']} />}>
                <Route path="dashboard" element={<ValidasiDashboard />} />
              </Route>

              {/* ── Kasir ── */}
              <Route path="kasir" element={<ProtectedRoute allowedRoles={['kasir', 'admin']} />}>
                <Route path="dashboard" element={<KasirDashboard />} />
              </Route>

              {/* ── Produksi ── */}
              <Route path="produksi" element={<ProtectedRoute allowedRoles={['petugas_produksi', 'admin']} />}>
                <Route path="dashboard" element={<ProduksiDashboard />} />
                <Route path="kategori"  element={<KategoriPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
