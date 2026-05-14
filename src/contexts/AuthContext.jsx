import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [assignedStage, setAssignedStage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userRef);
          let data = {};
          if (userDoc.exists()) {
            data = userDoc.data();
          }

          if (data.role) {
            setRole(data.role);
            setAssignedStage(data.assigned_stage || null);
          } else {
            // Auto-provision demo accounts based on email prefix if role is missing
            const email = firebaseUser.email || '';
            let newRole = null;
            let newStage = null;

            if (email.startsWith('admin@')) newRole = 'admin';
            else if (email.startsWith('cs@')) newRole = 'customer_service';
            else if (email.startsWith('validasi@')) newRole = 'petugas_validasi';
            else if (email.startsWith('kasir@')) newRole = 'kasir';
            else if (email.startsWith('desainer@')) newRole = 'desainer';
            else if (email.startsWith('produksi@')) {
              newRole = 'petugas_produksi';
              newStage = 'cetak';
            }

            if (!userDoc.exists()) {
              const newDoc = { 
                email, 
                role: newRole || '', 
                created_at: new Date(),
                name: firebaseUser.displayName || 'Pengguna Baru'
              };
              if (newStage) newDoc.assigned_stage = newStage;

              await setDoc(userRef, newDoc);
              setRole(newRole || null);
              setAssignedStage(newStage || null);
              console.log(`Created new user record for ${email}`);
            } else if (newRole && !data.role) {
              await setDoc(userRef, { role: newRole, assigned_stage: newStage }, { merge: true });
              setRole(newRole);
              setAssignedStage(newStage);
              console.log(`Auto-provisioned ${email} as ${newRole}`);
            } else {
              setRole(null);
              setAssignedStage(null);
            }
          }
        } catch (error) {
          console.error("Error fetching/setting user role:", error);
          alert("Gagal memproses data akun ke sistem database. Silakan laporkan ini ke Admin.\nError: " + error.message);
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setAssignedStage(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = { user, role, assignedStage, loading };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F0EFEE', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{
          width: '48px', height: '48px', border: '4px solid #e2e8f0',
          borderTop: '4px solid #607d6e', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: 'sans-serif', color: '#646A66', fontWeight: '600', fontSize: '14px' }}>Memuat sesi...</p>
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
