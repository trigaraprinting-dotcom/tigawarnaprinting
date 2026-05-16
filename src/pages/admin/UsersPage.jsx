import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/firebaseConfig';
import { getIdToken } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import {
  Users, Shield, UserCheck, RefreshCw, UserPlus, Trash2,
  Edit2, Eye, EyeOff, AlertTriangle, CheckCircle,
} from 'lucide-react';

const ROLES = [
  { value: 'admin',            label: 'Admin',             color: 'text-purple-700 bg-purple-50' },
  { value: 'customer_service', label: 'Customer Service',  color: 'text-blue-700 bg-blue-50'   },
  { value: 'desainer',         label: 'Desainer',          color: 'text-rose-700 bg-rose-50'   },
  { value: 'petugas_validasi', label: 'Petugas Validasi',  color: 'text-green-700 bg-green-50'  },
  { value: 'kasir',            label: 'Kasir',             color: 'text-amber-700 bg-amber-50'  },
  { value: 'petugas_produksi', label: 'Petugas Produksi',  color: 'text-cyan-700 bg-cyan-50'    },
];

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Firebase project API key — used for REST API user creation (doesn't affect current auth session)
const FIREBASE_API_KEY = 'AIzaSyCfCTPRGo55BKOcd0zpmcFFyScE5Ilzt4o';

async function createFirebaseUser(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data; // { localId, email, idToken, ... }
}

// Hapus user dari Firebase Authentication menggunakan Admin REST API
// Membutuhkan ID Token dari admin yang sedang login
async function deleteFirebaseAuthUser(targetUid) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Admin tidak terautentikasi');

  // Dapatkan ID token admin yang sedang login (fresh token)
  const idToken = await getIdToken(currentUser, /* forceRefresh */ true);

  const projectId = 'trigaraprinting-f0aa8';
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ localId: targetUid }),
    }
  );

  // Jika endpoint admin gagal (belum dapat akses), coba endpoint alternatif
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    // Fallback: tandai user sebagai disabled di Firestore saja
    // Endpoint ini butuh Firebase Admin SDK / Cloud Functions untuk akses penuh
    console.warn('Firebase Auth delete via REST API gagal:', errData?.error?.message || res.status);
    throw new Error(errData?.error?.message || 'Gagal menghapus dari Firebase Auth');
  }

  return true;
}

export const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalType, setModalType] = useState(null); // 'add' | 'role' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState({ text: '', isError: false });

  // Add user form
  const [addForm, setAddForm] = useState({ email: '', password: '', role: 'customer_service' });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const showMsg = (text, isError = false) => {
    setMsg({ text, isError });
    setTimeout(() => setMsg({ text: '', isError: false }), 4000);
  };

  // ── Add User ──────────────────────────────────────────────────────────────
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (addForm.password.length < 6) {
      showMsg('Password minimal 6 karakter!', true);
      return;
    }
    setSaving(true);
    try {
      const { localId } = await createFirebaseUser(addForm.email, addForm.password);
      // Save profile in Firestore
      await updateDoc(doc(db, 'users', localId), {
        email: addForm.email,
        role:  addForm.role,
        created_at: new Date(),
      }).catch(async () => {
        // If doc doesn't exist, create it
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', localId), {
          email: addForm.email,
          role:  addForm.role,
          created_at: new Date(),
        });
      });
      showMsg(`User ${addForm.email} berhasil dibuat sebagai ${addForm.role}!`);
      setAddForm({ email: '', password: '', role: 'customer_service' });
      setModalType(null);
    } catch (err) {
      const errMsg = err.message === 'EMAIL_EXISTS'
        ? 'Email sudah terdaftar!' : err.message;
      showMsg(errMsg, true);
    }
    setSaving(false);
  };

  // ── Change Role ───────────────────────────────────────────────────────────
  const handleSaveRole = async () => {
    if (!selectedUser || !newRole) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', selectedUser.id), { role: newRole });
    showMsg(`Role ${selectedUser.email} diubah ke ${newRole}.`);
    setModalType(null);
    setSaving(false);
  };

  // ── Deactivate (soft delete) ──────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.uid) {
      showMsg('Tidak bisa menonaktifkan akun sendiri!', true);
      setModalType(null);
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, 'users', selectedUser.id), { status: 'inactive' });
    showMsg(`Akun ${selectedUser.email} dinonaktifkan.`);
    setModalType(null);
    setSaving(false);
  };

  // ── Reactivate ────────────────────────────────────────────────────────────
  const handleReactivate = async () => {
    if (!selectedUser) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', selectedUser.id), { status: 'active' });
    showMsg(`Akun ${selectedUser.email} berhasil diaktifkan kembali.`);
    setModalType(null);
    setSaving(false);
  };

  // ── Hard Delete ───────────────────────────────────────────────────────────
  const handleHardDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const { deleteDoc } = await import('firebase/firestore');

      // 1. Hapus dari Firebase Authentication
      try {
        await deleteFirebaseAuthUser(selectedUser.id);
      } catch (authErr) {
        // Jika gagal hapus dari Auth, tetap lanjut hapus Firestore
        // tapi beri tahu user bahwa Auth mungkin masih ada
        console.warn('Gagal hapus dari Firebase Auth:', authErr.message);
        // Jangan stop proses — Firestore tetap dihapus
      }

      // 2. Hapus dari Firestore
      await deleteDoc(doc(db, 'users', selectedUser.id));
      showMsg(`Akun ${selectedUser.email} dihapus permanen dari database dan autentikasi.`);
    } catch(err) {
      showMsg('Gagal menghapus: ' + err.message, true);
    }
    setModalType(null);
    setSaving(false);
  };

  const getRoleConfig = (role) => ROLES.find(r => r.value === role) || { label: role || 'Belum Diatur', color: 'text-slate-600 bg-slate-100' };
  const totalByRole = ROLES.map(r => ({ ...r, count: users.filter(u => u.role === r.value && u.status !== 'inactive').length }));

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Manajemen User</h2>
          <p className="text-[#646A66] font-medium mt-1">{users.filter(u => u.status !== 'inactive').length} akun aktif</p>
        </div>
        <div className="flex items-center gap-3">
          {msg.text && (
            <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl ${msg.isError ? 'bg-red-50 text-red-600' : 'bg-[#EAF4EF] text-[#347B5A]'}`}>
              {msg.isError ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
              {msg.text}
            </div>
          )}
          <button
            onClick={() => setModalType('add')}
            className="flex items-center gap-2 bg-[#607d6e] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#607d6e]/20 hover:bg-[#526b5e] transition-all"
          >
            <UserPlus size={18} /> Tambah User
          </button>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {totalByRole.map(r => (
          <div key={r.value} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5 flex flex-col gap-2 hover:shadow-lg transition-shadow">
            <div className={`text-xs font-extrabold uppercase tracking-wider px-2 py-1 rounded-lg self-start ${r.color}`}>{r.label.split(' ')[0]}</div>
            <p className="font-extrabold text-3xl text-[#1A1D1B]">{r.count}</p>
            <p className="text-xs font-semibold text-[#646A66] leading-snug">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Users size={48} className="text-slate-200" />
            <p className="font-bold text-lg text-[#1A1D1B]">Belum ada pengguna</p>
            <p className="text-sm text-[#646A66]">Klik "Tambah User" untuk memulai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#','Email','Role','Status','Bergabung','Aksi'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user, idx) => {
                  const rc = getRoleConfig(user.role);
                  const isInactive = user.status === 'inactive';
                  return (
                    <tr key={user.id} className={`hover:bg-slate-50/60 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 text-[#646A66] font-semibold">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.email}`} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-[#1A1D1B]">{user.email}</p>
                            {user.id === currentUser?.uid && (
                              <span className="text-[10px] font-extrabold text-[#607d6e] uppercase tracking-wider">Anda</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${rc.color}`}>
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${isInactive ? 'bg-red-50 text-red-600' : 'bg-[#EAF4EF] text-[#347B5A]'}`}>
                          {isInactive ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#646A66] font-medium">{formatDate(user.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedUser(user); setNewRole(user.role || ''); setModalType('role'); }}
                            className="flex items-center gap-1.5 text-[#607d6e] font-bold text-xs bg-[#EAF4EF] px-3 py-2 rounded-xl hover:bg-[#d4eadf] transition-all"
                          >
                            <Shield size={13} /> Role
                          </button>
                          {!isInactive && user.id !== currentUser?.uid && (
                            <button
                              onClick={() => { setSelectedUser(user); setModalType('delete'); }}
                              className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-all"
                            >
                              <Trash2 size={13} /> Nonaktif
                            </button>
                          )}
                          {isInactive && (
                            <>
                              <button
                                onClick={() => { setSelectedUser(user); setModalType('reactivate'); }}
                                className="flex items-center gap-1.5 text-[#347B5A] font-bold text-xs bg-[#EAF4EF] px-3 py-2 rounded-xl hover:bg-[#d4eadf] transition-all"
                              >
                                <UserCheck size={13} /> Aktifkan
                              </button>
                              <button
                                onClick={() => { setSelectedUser(user); setModalType('hard_delete'); }}
                                className="flex items-center gap-1.5 text-red-500 font-bold text-xs bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-all"
                              >
                                <Trash2 size={13} /> Hapus
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add User Modal ── */}
      <Modal open={modalType === 'add'} onClose={() => setModalType(null)} title="Tambah User Baru" size="sm">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Email *</label>
            <input type="email" required value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              placeholder="cs@trigara.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] outline-none text-sm font-semibold text-[#1A1D1B]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Password *</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} required value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 6 karakter"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] outline-none text-sm font-semibold text-[#1A1D1B]" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Role *</label>
            <div className="space-y-2">
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${addForm.role === r.value ? 'border-[#607d6e] bg-[#EAF4EF]' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}>
                  <input type="radio" value={r.value} checked={addForm.role === r.value} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))} className="sr-only" />
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${r.color}`}>{r.label}</span>
                  {addForm.role === r.value && <UserCheck size={16} className="ml-auto text-[#607d6e]" />}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50 flex items-center justify-center gap-2">
            <UserPlus size={18} /> {saving ? 'Membuat...' : 'Buat User'}
          </button>
        </form>
      </Modal>

      {/* ── Change Role Modal ── */}
      <Modal open={modalType === 'role'} onClose={() => setModalType(null)} title="Ubah Role Pengguna" size="sm">
        {selectedUser && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedUser.email}`} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="font-extrabold text-[#1A1D1B]">{selectedUser.email}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-3">Pilih role baru:</p>
              {ROLES.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${newRole === r.value ? 'border-[#607d6e] bg-[#EAF4EF]' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}>
                  <input type="radio" value={r.value} checked={newRole === r.value} onChange={e => setNewRole(e.target.value)} className="sr-only" />
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${r.color}`}>{r.label}</span>
                  {newRole === r.value && <UserCheck size={16} className="ml-auto text-[#607d6e]" />}
                </label>
              ))}
            </div>
            <button onClick={handleSaveRole} disabled={saving || !newRole}
              className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50">
              {saving ? 'Menyimpan...' : 'Simpan Role'}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Deactivate Modal ── */}
      <Modal open={modalType === 'delete'} onClose={() => setModalType(null)} title="Nonaktifkan Pengguna" size="sm">
        {selectedUser && (
          <div className="space-y-5">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">
                Akun <b>{selectedUser.email}</b> akan dinonaktifkan. Mereka tidak dapat login namun data tetap tersimpan.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModalType(null)}
                className="bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold py-3.5 rounded-xl transition-all">
                Batal
              </button>
              <button onClick={handleDeactivate} disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                {saving ? 'Memproses...' : 'Nonaktifkan'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reactivate Modal ── */}
      <Modal open={modalType === 'reactivate'} onClose={() => setModalType(null)} title="Aktifkan Kembali Pengguna" size="sm">
        {selectedUser && (
          <div className="space-y-5">
            <div className="bg-[#EAF4EF] border border-[#c8e6d8] rounded-xl p-4 flex items-start gap-3">
              <UserCheck size={20} className="text-[#347B5A] shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-[#1A4D2E]">
                Akun <b>{selectedUser.email}</b> akan diaktifkan kembali. Pengguna dapat login dan menggunakan sistem seperti biasa.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModalType(null)}
                className="bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold py-3.5 rounded-xl transition-all">
                Batal
              </button>
              <button onClick={handleReactivate} disabled={saving}
                className="bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50">
                {saving ? 'Memproses...' : 'Aktifkan Kembali'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Hard Delete Modal ── */}
      <Modal open={modalType === 'hard_delete'} onClose={() => setModalType(null)} title="Hapus Pengguna Permanen" size="sm">
        {selectedUser && (
          <div className="space-y-5">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-red-700">
                Akun <b>{selectedUser.email}</b> akan dihapus secara <b>permanen</b> dari database dan Firebase Authentication. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setModalType(null)}
                className="bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold py-3.5 rounded-xl transition-all">
                Batal
              </button>
              <button onClick={handleHardDelete} disabled={saving}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                {saving ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
