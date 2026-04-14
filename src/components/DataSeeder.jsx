import React, { useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ORDER_STATUS } from '../firebase/firestore';

export const DataSeeder = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const seedData = async () => {
    setLoading(true);
    setMsg("");
    try {
      const batch = writeBatch(db);
      
      const customerNames = ["PT. Maju Jaya", "Budi Santoso", "CV. Indah Print", "Dina Mega", "Andika Corp", "Sekolah Harapan", "Universitas Bangsa"];
      
      for(let i=0; i<20; i++) {
         const newDocRef = doc(collection(db, 'orders'));
         const statusKeys = Object.values(ORDER_STATUS);
         const randomStatus = statusKeys[Math.floor(Math.random() * statusKeys.length)];
         
         const daysAgo = Math.floor(Math.random() * 30);
         const date = new Date();
         date.setDate(date.getDate() - daysAgo);

         batch.set(newDocRef, {
             customer_name: customerNames[Math.floor(Math.random() * customerNames.length)],
             product: "Cetak Dokumen A4",
             quantity: Math.floor(Math.random() * 500) + 10,
             total_price: Math.floor(Math.random() * 5000000) + 100000,
             status: randomStatus,
             created_at: date,
             updated_at: date
         });
      }

      await batch.commit();
      setMsg("20 Fake Orders Seeded!");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-8 left-8 z-40 p-5 bg-[#EAF4EF]/90 backdrop-blur-md text-[#347B5A] rounded-2xl border border-[#347B5A]/20 shadow-[0_10px_40px_rgba(52,123,90,0.2)] w-72 transition-all hover:shadow-[0_15px_50px_rgba(52,123,90,0.3)]">
        <div className="flex items-center gap-2.5 mb-3">
           <div className="bg-[#347B5A] text-white p-1.5 rounded-lg shadow-inner">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
           </div>
           <h4 className="font-extrabold text-[15px] tracking-tight">Database Tools</h4>
        </div>
        <p className="text-[12px] font-medium mb-5 leading-relaxed opacity-90">Suntik data dummy pesanan agar grafik di dashboard Anda jadi terisi dan bervariasi.</p>
        <button 
           onClick={seedData} 
           disabled={loading}
           className="w-full bg-[#347B5A] hover:bg-[#286047] active:scale-95 disabled:opacity-50 text-white text-[13px] font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#347B5A]/30"
        >
            {loading ? "Menyuntik Data..." : "Seed 20 Pesanan Dummy"}
        </button>
        {msg && <p className="text-[12px] mt-3 font-bold text-center bg-white/50 py-1.5 rounded-lg">{msg}</p>}
    </div>
  );
};
