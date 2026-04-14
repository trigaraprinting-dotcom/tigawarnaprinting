import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

export const SeedRoleSetup = () => {
    const { user, role } = useAuth();
    const [status, setStatus] = useState('');

    const seedAsAdmin = async () => {
        if (!user) return setStatus("Not logged in");
        setStatus("Seeding...");
        try {
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'admin',
                created_at: serverTimestamp(),
            });
            setStatus("Success! Please reload the page to apply the newly created admin role.");
        } catch (err) {
            setStatus("Error: " + err.message);
        }
    };

    if (!user || role) return null; // Only show if user has NO role at all

    return (
        <div className="fixed bottom-8 right-8 z-50 p-6 bg-amber-50/90 backdrop-blur-md text-amber-900 rounded-2xl border border-amber-200 shadow-xl max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2 text-amber-800">Development Mode Seeding</h3>
            <p className="text-sm mb-4 text-amber-700/80">
                You are logged in but your account does not have any assigned role in the Firestore 'users' collection. 
                Click below to bootstrap your account as the first Admin.
            </p>
            <button 
                onClick={seedAsAdmin}
                className="w-full bg-amber-500 hover:bg-amber-600 focus:ring-4 focus:ring-amber-500/20 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
                Set My Account as Admin
            </button>
            {status && <p className="mt-3 text-xs font-semibold text-center">{status}</p>}
        </div>
    );
};
