import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Activity, Clock } from 'lucide-react';

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export const AktivitasPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to the last 200 activity logs
    const q = query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(200));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B] flex items-center gap-2">
            <Activity className="text-[#607d6e]" size={28} />
            Pantauan Aktivitas Pekerja
          </h2>
          <p className="text-[#646A66] font-medium mt-1">Live updates aktivitas staf</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <Clock size={48} className="text-slate-200 mb-4" />
              <p className="text-lg font-bold text-[#1A1D1B]">Belum Ada Aktivitas</p>
              <p className="text-sm text-[#646A66] mt-1">Sistem sedang memantau operasi pekerja baru...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Waktu</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Nama Akun</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Aktivitas</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map(log => {
                    const accountName = log.user_email ? log.user_email.split('@')[0] : 'System';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 text-[#646A66] font-medium whitespace-nowrap">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${accountName}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#1A1D1B] text-[15px] capitalize">{accountName}</p>
                              <span className="text-[10px] font-extrabold text-[#607d6e] uppercase tracking-wider bg-[#EAF4EF] px-2 py-0.5 rounded-md inline-block mt-0.5">
                                {(log.user_role || 'SYSTEM').replace(/_/g, ' ')}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold px-3 py-1.5 rounded-xl text-xs ${log.action === 'CREATE_ORDER' ? 'bg-blue-50 text-blue-600' : 'bg-[#EAF4EF] text-[#347B5A]'}`}>
                            {log.action === 'CREATE_ORDER' ? 'Buat Pesanan' : 'Update Status'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-[#1A1D1B] font-medium leading-relaxed max-w-lg">
                            {log.details || '-'}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
