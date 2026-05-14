import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { DashboardLayout } from './layouts/DashboardLayout';

// Admin pages
import { AdminDashboard }  from './pages/admin/AdminDashboard';
import { PesananPage }     from './pages/admin/PesananPage';
import { ProdukPage }      from './pages/admin/ProdukPage';
import { UsersPage }       from './pages/admin/UsersPage';
import { KategoriPage }    from './pages/admin/KategoriPage';
import { LaporanPage }     from './pages/admin/LaporanPage';
import { PengaturanPage }  from './pages/admin/PengaturanPage';
import { KinerjaPekerjaPage } from './pages/admin/KinerjaPekerjaPage';

// Role-specific pages
import { CSDashboard }        from './pages/cs/CSDashboard';
import { InputPesanan }       from './pages/cs/InputPesanan';
import { ValidasiDashboard }  from './pages/validasi/ValidasiDashboard';
import { ClientValidasiPage } from './pages/validasi/ClientValidasiPage';
import { DesainerDashboard }  from './pages/desainer/DesainerDashboard';
import { KasirDashboard }     from './pages/kasir/KasirDashboard';
import { ProduksiDashboard }  from './pages/produksi/ProduksiDashboard';
import { ProsesProduksi }     from './pages/produksi/ProsesProduksi';

// Role-based redirect at root
const RoleRedirect = () => {
  const { role, loading } = useAuth();
  if (loading) return null;
  if (role === 'admin')            return <Navigate to="/admin/dashboard"    replace />;
  if (role === 'customer_service') return <Navigate to="/cs/dashboard"       replace />;
  if (role === 'petugas_validasi') return <Navigate to="/validasi/dashboard" replace />;
  if (role === 'kasir')            return <Navigate to="/kasir/dashboard"    replace />;
  if (role === 'petugas_produksi') return <Navigate to="/produksi/dashboard" replace />;
  if (role === 'desainer')         return <Navigate to="/desainer/dashboard" replace />;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#EFEFEF] p-4 font-sans">
      <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] text-center max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#A06CF6] to-[#6018E6]"></div>
        <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
             <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="font-extrabold text-2xl text-slate-800 mb-3 tracking-tight">Role Belum Ditetapkan</h3>
        <p className="text-slate-500 text-[15px] leading-relaxed mb-8">
          Akun Anda telah terdaftar, namun peran (Role) Anda di dalam sistem belum diatur. Silakan hubungi <strong>Admin</strong> untuk mendapatkan akses.
        </p>
        <button 
          onClick={async () => {
             const { logout } = await import('./firebase/auth');
             await logout();
          }}
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 px-6 rounded-xl transition-colors"
        >
          Keluar ke Halaman Login
        </button>
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
            <Route index element={<RoleRedirect />} />
            
            <Route element={<DashboardLayout />}>

              {/* ── Admin ── */}
              <Route path="admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="dashboard"  element={<AdminDashboard />} />
                <Route path="pesanan"    element={<PesananPage />} />
                <Route path="produk"     element={<ProdukPage />} />
                <Route path="users"      element={<UsersPage />} />
                <Route path="kategori"   element={<KategoriPage />} />
                <Route path="laporan"    element={<LaporanPage />} />
                <Route path="kinerja-pekerja" element={<KinerjaPekerjaPage />} />
                <Route path="pengaturan" element={<PengaturanPage />} />
              </Route>

              {/* ── Customer Service ── */}
              <Route path="cs" element={<ProtectedRoute allowedRoles={['customer_service']} />}>
                <Route path="dashboard" element={<CSDashboard />} />
                <Route path="pesanan/tambah" element={<InputPesanan />} />
                <Route path="pesanan"   element={<PesananPage />} />
              </Route>

              {/* ── Validasi ── */}
              <Route path="validasi" element={<ProtectedRoute allowedRoles={['petugas_validasi', 'admin']} />}>
                <Route path="dashboard" element={<ValidasiDashboard />} />
                <Route path="klien"     element={<ClientValidasiPage />} />
              </Route>

              {/* ── Kasir ── */}
              <Route path="kasir" element={<ProtectedRoute allowedRoles={['kasir', 'admin']} />}>
                <Route path="dashboard" element={<KasirDashboard />} />
                <Route path="pesanan"   element={<PesananPage />} />
              </Route>

              {/* ── Produksi ── */}
              <Route path="produksi" element={<ProtectedRoute allowedRoles={['petugas_produksi', 'admin']} />}>
                <Route path="dashboard" element={<ProduksiDashboard />} />
                <Route path="proses"    element={<ProsesProduksi />} />
                <Route path="kategori"  element={<KategoriPage />} />
              </Route>

              {/* ── Desainer ── */}
              <Route path="desainer" element={<ProtectedRoute allowedRoles={['desainer', 'admin']} />}>
                <Route path="dashboard" element={<DesainerDashboard />} />
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
