import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AuthContext = createContext(undefined);

function getAutoRole(email = '') {
  if (email.startsWith('admin@'))    return { role: 'admin',            stage: null };
  if (email.startsWith('cs@'))       return { role: 'customer_service',  stage: null };
  if (email.startsWith('validasi@')) return { role: 'petugas_validasi',  stage: null };
  if (email.startsWith('kasir@'))    return { role: 'kasir',             stage: null };
  if (email.startsWith('desainer@')) return { role: 'desainer',          stage: null };
  if (email.startsWith('produksi@')) return { role: 'petugas_produksi',  stage: 'cetak' };
  return { role: null, stage: null };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]                   = useState(null);
  const [role, setRole]                   = useState(null);
  const [assignedStage, setAssignedStage] = useState(null);
  const [userStatus, setUserStatus]       = useState(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    let unsubDoc = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous doc listener
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setAssignedStage(null);
        setUserStatus(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      const userRef = doc(db, 'users', firebaseUser.uid);
      let firstSnap = true;

      unsubDoc = onSnapshot(userRef, async (snap) => {
        const isFirst = firstSnap;
        firstSnap = false;

        // ── Doc tidak ada ──────────────────────────────────────────────
        if (!snap.exists()) {
          if (isFirst) {
            // Auto-provision user baru (misal Google login pertama kali)
            const { role: autoRole, stage } = getAutoRole(firebaseUser.email || '');
            const newDoc = {
              email: firebaseUser.email || '',
              role: autoRole || '',
              status: 'active',
              created_at: new Date(),
              name: firebaseUser.displayName || 'Pengguna Baru',
              ...(stage ? { assigned_stage: stage } : {}),
            };
            try {
              await setDoc(userRef, newDoc);
              // onSnapshot will fire again with the new doc
            } catch (e) {
              console.error('Gagal membuat data user:', e);
              setLoading(false);
            }
          } else {
            // ⚠️ Doc dihapus admin saat user sedang login
            localStorage.setItem('trigara_account_status', JSON.stringify({
              reason: 'deleted',
              email: firebaseUser.email,
              lockedUntil: Date.now() + 5 * 60 * 60 * 1000, // 5 jam
            }));
            await signOut(auth);
          }
          return;
        }

        const data = snap.data();

        // ── Akun dinonaktifkan ─────────────────────────────────────────
        if (data.status === 'inactive') {
          localStorage.setItem('trigara_account_status', JSON.stringify({
            reason: 'inactive',
            email: firebaseUser.email,
          }));
          await signOut(auth);
          return;
        }

        // ── Data normal ────────────────────────────────────────────────
        let resolvedRole  = data.role || null;
        let resolvedStage = data.assigned_stage || null;

        if (!resolvedRole) {
          const { role: autoRole, stage } = getAutoRole(firebaseUser.email || '');
          if (autoRole) {
            resolvedRole  = autoRole;
            resolvedStage = stage;
            setDoc(userRef, { role: autoRole, ...(stage ? { assigned_stage: stage } : {}) }, { merge: true });
          }
        }

        setRole(resolvedRole);
        setAssignedStage(resolvedStage);
        setUserStatus(data.status || 'active');
        setLoading(false);

      }, (err) => {
        console.error('User doc listener error:', err);
        setLoading(false);
      });
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  const value = { user, role, assignedStage, userStatus, loading };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F0EFEE', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', border: '4px solid #e2e8f0',
          borderTop: '4px solid #607d6e', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'sans-serif', color: '#646A66', fontWeight: '600', fontSize: '14px' }}>
          Memuat sesi...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
