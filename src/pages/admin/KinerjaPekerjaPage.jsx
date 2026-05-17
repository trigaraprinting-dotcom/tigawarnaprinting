import React, { useEffect, useMemo, useState } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { db } from '../../firebase/firebaseConfig';
import { collection, limit, onSnapshot, orderBy, query, doc, updateDoc } from 'firebase/firestore';
import { Users, Activity, Clock, CheckCircle2, PackageCheck, Paintbrush, Layers, Trash2, ChevronLeft, ChevronRight, Scissors, Ruler } from 'lucide-react';

const formatDateTime = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatArea = (area) => {
  if (!area) return '0';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(area);
};

const formatRupiah = (val) => {
  if (!val) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const ACTION_LABEL = {
  CREATE_ORDER: 'Buat Pesanan',
  UPDATE_STATUS: 'Update Status',
};

export const KinerjaPekerjaPage = () => {
  const { orders, loading: ordersLoading } = useOrdersSnapshot({});

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('produksi'); // produksi | desainer | cutting
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [actionFilter, setActionFilter] = useState('all');
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    setLogPage(1);
  }, [selectedEmail, actionFilter, activeTab]);

  const handleHideLog = async (logId) => {
    if (!window.confirm('Sembunyikan log ini dari tampilan? Kinerja pekerja tidak akan terpengaruh.')) return;
    try {
      await updateDoc(doc(db, 'activity_logs', logId), { isHidden: true });
    } catch (err) {
      console.error(err);
      alert('Gagal menyembunyikan log');
    }
  };

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(500));
    const unsubLogs = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLogsLoading(false);
    });
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setUsersLoading(false);
    });

    return () => {
      unsubLogs();
      unsubUsers();
    };
  }, []);

  const productionLogs = useMemo(() => {
    return logs.filter(
      (l) => l.user_role === 'petugas_produksi' && l.user_email && l.user_email !== 'System'
    );
  }, [logs]);

  // Calculate Stats
  const { prodWorkers, desWorkers } = useMemo(() => {
    const pMap = {};
    const dMap = {};

    // Produksi: hanya order yg punya dimensi (panjang & lebar) dan sudah done
    for (const o of orders) {
      if (o.status !== 'done') continue;

      const p = Number(o.panjang || 0);
      const l = Number(o.lebar || 0);

      // Hanya proses jika ada dimensi
      if (p > 0 && l > 0) {
        const pEmail = o.operator_email || o.cetak_by || o.finishing_by || o.packing_by;
        if (pEmail) {
          if (!pMap[pEmail]) {
            pMap[pEmail] = { email: pEmail, role: 'petugas_produksi', total_area: 0, items: {} };
          }
          const qty = Number(o.quantity || 1);
          let pM = p, lM = l;
          if (o.dimension_unit === 'cm' || (o.dimension_unit !== 'm' && (p > 30 || l > 30))) {
            pM = p / 100;
            lM = l / 100;
          }
          const area = pM * lM * qty;
          pMap[pEmail].total_area += area;

          const prodName = o.product_name || 'Produk Lainnya';
          const unit = o.dimension_unit || (p > 30 || l > 30 ? 'cm' : 'm');
          const dimStr = `${p}×${l} ${unit}`;
          const itemKey = `${prodName}_${dimStr}`;
          if (!pMap[pEmail].items[itemKey]) {
            pMap[pEmail].items[itemKey] = { name: prodName, dimension: dimStr, qty: 0, area: 0 };
          }
          pMap[pEmail].items[itemKey].qty += qty;
          pMap[pEmail].items[itemKey].area += area;
        }
      }

      // Keliling (finishing) — digabung ke prodWorkers
      if (o.finishing_by && p > 0 && l > 0) {
        const fEmail = o.finishing_by;
        if (!pMap[fEmail]) pMap[fEmail] = { email: fEmail, role: 'petugas_produksi', total_area: 0, total_keliling: 0, items: {}, finishingItems: [] };
        if (pMap[fEmail].total_keliling === undefined) { pMap[fEmail].total_keliling = 0; pMap[fEmail].finishingItems = []; }
        const qty = Number(o.quantity) || 1;
        let kPerItem = 0;
        if (o.keliling > 0) {
          kPerItem = o.dimension_unit === 'cm' ? o.keliling / 100 : o.keliling;
        } else {
          let pM = p, lM = l;
          if (o.dimension_unit === 'cm' || (o.dimension_unit !== 'm' && (p > 30 || l > 30))) { pM = p / 100; lM = l / 100; }
          kPerItem = 2 * (pM + lM);
        }
        pMap[fEmail].total_keliling += kPerItem * qty;
        pMap[fEmail].finishingItems.push({ product_name: o.product_name, keliling: kPerItem, qty });
      }

      // Desainer
      if (o.needs_design && o.designer_email) {
        const dEmail = o.designer_email;
        if (!dMap[dEmail]) dMap[dEmail] = { email: dEmail, role: 'desainer', total_orders: 0, total_fee: 0, items: [] };
        dMap[dEmail].total_orders += 1;
        const fee = Number(o.design_price || 0);
        dMap[dEmail].total_fee += fee;
        dMap[dEmail].items.push({
           product_name: o.product_name || 'Desain',
           customer_name: o.customer_name,
           fee: fee
        });
      }
    }

    const prodArray = Object.values(pMap).sort((a, b) => b.total_area - a.total_area);
    const desArray = Object.values(dMap).sort((a, b) => b.total_fee - a.total_fee);

    return { prodWorkers: prodArray, desWorkers: desArray };
  }, [orders, productionLogs]);

  // Cutting workers (Lembar only)
  const cuttingWorkers = useMemo(() => {
    const cMap = {};
    for (const o of orders) {
      if (o.status !== 'done') continue;
      if (o.product_unit === 'Lembar' && o.cetak_by) {
        const cEmail = o.cetak_by;
        if (!cMap[cEmail]) cMap[cEmail] = { email: cEmail, total_lembar: 0, total_fee: 0, items: [] };
        const qty = Number(o.quantity) || 1;
        const fee = Number(o.ongkos_potong) || 0;
        cMap[cEmail].total_lembar += qty;
        cMap[cEmail].total_fee += fee;
        cMap[cEmail].items.push({ product_name: o.product_name, customer_name: o.customer_name, qty, ongkos_potong: fee });
      }
    }
    return Object.values(cMap).sort((a, b) => b.total_fee - a.total_fee);
  }, [orders]);

  const allWorkers = useMemo(() => {
    const map = {};
    users.forEach(u => {
      if (u.role !== 'admin' && u.status !== 'inactive') {
        map[u.email] = { email: u.email, role: u.role, touched: 0, logs: 0 };
      }
    });

    const touchedOrdersByEmail = {};
    const addTouch = (email, id) => {
       if (email && email !== 'cs@trigara.com' && email !== 'System' && map[email]) {
          if (!touchedOrdersByEmail[email]) touchedOrdersByEmail[email] = new Set();
          touchedOrdersByEmail[email].add(id);
       }
    };

    orders.forEach(o => {
      addTouch(o.cs_email, o.id);
      addTouch(o.validated_by, o.id);
      addTouch(o.operator_email, o.id);
      addTouch(o.packing_by, o.id);
      addTouch(o.finishing_by, o.id);
      addTouch(o.cetak_by, o.id);
      addTouch(o.designer_email, o.id);
      addTouch(o.dp_confirmed_by, o.id);
    });

    logs.forEach(l => {
      if (l.user_email && map[l.user_email]) {
        map[l.user_email].logs += 1;
        if ((l.action === 'CREATE_ORDER' && map[l.user_email].role === 'customer_service') ||
            (l.action === 'UPDATE_STATUS' && map[l.user_email].role === 'kasir')) {
          map[l.user_email].touched += 1;
        }
      }
    });

    Object.keys(map).forEach(email => {
       const fromOrders = touchedOrdersByEmail[email] ? touchedOrdersByEmail[email].size : 0;
       map[email].touched = Math.max(fromOrders, map[email].touched);
    });

    return Object.values(map).sort((a, b) => b.touched - a.touched || b.logs - a.logs);
  }, [users, logs, orders]);

  // Set default selection when tab changes or data loads
  useEffect(() => {
    if (activeTab === 'produksi') {
      if (prodWorkers.length > 0 && (!selectedEmail || !prodWorkers.some(w => w.email === selectedEmail))) {
        setSelectedEmail(prodWorkers[0].email);
      } else if (prodWorkers.length === 0) setSelectedEmail(null);
    } else if (activeTab === 'desainer') {
      if (desWorkers.length > 0 && (!selectedEmail || !desWorkers.some(w => w.email === selectedEmail))) {
        setSelectedEmail(desWorkers[0].email);
      } else if (desWorkers.length === 0) setSelectedEmail(null);
    } else if (activeTab === 'cutting') {
      if (cuttingWorkers.length > 0 && (!selectedEmail || !cuttingWorkers.some(w => w.email === selectedEmail))) {
        setSelectedEmail(cuttingWorkers[0].email);
      } else if (cuttingWorkers.length === 0) setSelectedEmail(null);
    }
  }, [activeTab, prodWorkers, desWorkers, cuttingWorkers, selectedEmail]);

  const selectedWorker = useMemo(() => {
    if (!selectedEmail) return null;
    if (activeTab === 'produksi') return prodWorkers.find(w => w.email === selectedEmail);
    if (activeTab === 'desainer') return desWorkers.find(w => w.email === selectedEmail);
    return cuttingWorkers.find(w => w.email === selectedEmail) || null;
  }, [activeTab, prodWorkers, desWorkers, cuttingWorkers, selectedEmail]);

  const selectedWorkerLogs = useMemo(() => {
    if (!selectedEmail || activeTab === 'desainer') return [];
    const base = productionLogs.filter((l) => l.user_email === selectedEmail && !l.isHidden);
    if (actionFilter === 'all') return base;
    return base.filter((l) => l.action === actionFilter);
  }, [productionLogs, selectedEmail, actionFilter, activeTab]);

  const paginatedLogs = useMemo(() => {
    return selectedWorkerLogs.slice((logPage - 1) * 5, logPage * 5);
  }, [selectedWorkerLogs, logPage]);

  const totalLogPages = Math.max(1, Math.ceil(selectedWorkerLogs.length / 5));

  const isLoading = ordersLoading || logsLoading;

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B] flex items-center gap-2">
            <Users className="text-[#607d6e]" size={26} />
            Kinerja Pekerja
          </h2>
          <p className="text-[#646A66] font-medium mt-1">
            Pantau kinerja dan hitung gaji berdasarkan pesanan yang berhasil (Selesai).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column: Leaderboards */}
          <div className="xl:col-span-1 space-y-4">
            <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5">
              
              {/* Tab Selector */}
              <div className="flex gap-1 p-1 bg-slate-50 rounded-2xl mb-5 border border-slate-100">
                <button
                  onClick={() => { setActiveTab('produksi'); setSelectedEmail(null); }}
                  className={['flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all', activeTab === 'produksi' ? 'bg-white text-[#1A1D1B] shadow-sm' : 'text-slate-400 hover:text-slate-600'].join(' ')}
                >
                  <PackageCheck size={14} className={activeTab === 'produksi' ? 'text-[#607d6e]' : ''}/>
                  Produksi
                </button>
                <button
                  onClick={() => { setActiveTab('desainer'); setSelectedEmail(null); }}
                  className={['flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all', activeTab === 'desainer' ? 'bg-white text-[#1A1D1B] shadow-sm' : 'text-slate-400 hover:text-slate-600'].join(' ')}
                >
                  <Paintbrush size={14} className={activeTab === 'desainer' ? 'text-[#C29656]' : ''}/>
                  Desainer
                </button>
                <button
                  onClick={() => { setActiveTab('cutting'); setSelectedEmail(null); }}
                  className={['flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-extrabold transition-all', activeTab === 'cutting' ? 'bg-white text-[#1A1D1B] shadow-sm' : 'text-slate-400 hover:text-slate-600'].join(' ')}
                >
                  <Scissors size={14} className={activeTab === 'cutting' ? 'text-purple-500' : ''}/>
                  Cutting
                </button>
              </div>

              {/* List */}
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 hide-scrollbar">
                {activeTab === 'produksi' && (
                  prodWorkers.length === 0 ? (
                    <p className="text-[#646A66] font-semibold text-center py-8">Belum ada data produksi.</p>
                  ) : (
                    prodWorkers.map((w, idx) => {
                      const isActive = w.email === selectedEmail;
                      return (
                        <button
                          key={w.email}
                          type="button"
                          onClick={() => setSelectedEmail(w.email)}
                          className={['w-full text-left rounded-2xl p-4 border transition-all', isActive ? 'bg-[#EAF4EF] border-[#347B5A]/30' : 'bg-white border-slate-100 hover:bg-slate-50'].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">#{idx + 1}</span>
                                <p className="font-extrabold text-[14px] text-[#1A1D1B] truncate">{w.email.split('@')[0]}</p>
                              </div>
                              <p className="text-[10px] font-bold text-[#607d6e] uppercase tracking-wider mt-1.5 flex items-center gap-1">
                                <Layers size={12}/> {w.total_area > 0 ? `${formatArea(w.total_area)} m²` : `${w.total_qty} Qty`}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )
                )}

                {activeTab === 'desainer' && (
                  desWorkers.length === 0 ? (
                    <p className="text-[#646A66] font-semibold text-center py-8">Belum ada data desainer.</p>
                  ) : (
                    desWorkers.map((w, idx) => {
                      const isActive = w.email === selectedEmail;
                      return (
                        <button
                          key={w.email}
                          type="button"
                          onClick={() => setSelectedEmail(w.email)}
                          className={['w-full text-left rounded-2xl p-4 border transition-all', isActive ? 'bg-[#FAF5ED] border-[#C29656]/30' : 'bg-white border-slate-100 hover:bg-slate-50'].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">#{idx + 1}</span>
                                <p className="font-extrabold text-[14px] text-[#1A1D1B] truncate">{w.email.split('@')[0]}</p>
                              </div>
                              <p className="text-[10px] font-bold text-[#C29656] uppercase tracking-wider mt-1.5">
                                {w.total_orders} Pesanan Selesai • {formatRupiah(w.total_fee)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )
                )}
              </div>

                {/* CUTTING TAB LIST */}
                {activeTab === 'cutting' && (
                  <div className="space-y-3">
                    {cuttingWorkers.length === 0 ? (
                      <p className="text-[#646A66] font-semibold text-center py-8">Belum ada data cutting (Lembar).</p>
                    ) : (
                      cuttingWorkers.map((w, idx) => {
                        const isActive = w.email === selectedEmail;
                        return (
                          <button key={w.email} type="button" onClick={() => setSelectedEmail(w.email)}
                            className={['w-full text-left rounded-2xl p-4 border transition-all', isActive ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:bg-slate-50'].join(' ')}>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">#{idx+1}</span>
                              <div className="min-w-0">
                                <p className="font-extrabold text-[13px] text-[#1A1D1B] truncate">{w.email.split('@')[0]}</p>
                                <p className="text-[10px] font-bold text-orange-500 mt-0.5">{w.total_lembar} Lembar • {formatRupiah(w.total_fee)}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="xl:col-span-2 space-y-4">
            {activeTab === 'produksi' ? (
              // DETAIL PRODUKSI
              <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#1A1D1B] flex items-center gap-2">
                      <Activity size={20} className="text-[#607d6e]" />
                      Detail Kinerja: {selectedWorker ? selectedWorker.email.split('@')[0] : 'Pilih Pekerja'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Rincian dari barang yang berhasil dikerjakan (status: Selesai).
                    </p>
                  </div>
                </div>

                {selectedWorker ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-[#EAF4EF] rounded-xl p-5 border border-[#c5d9d3]">
                        <p className="text-[10px] font-bold text-[#347B5A] uppercase tracking-widest mb-1">Total Luas (Cetak)</p>
                        <p className="text-2xl font-extrabold text-[#1A1D1B]">{formatArea(selectedWorker.total_area)} <span className="text-sm font-bold text-slate-400">m²</span></p>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">Total Keliling (Finishing)</p>
                        <p className="text-2xl font-extrabold text-[#1A1D1B]">{formatArea(selectedWorker.total_keliling || 0)} <span className="text-sm font-bold text-slate-400">m</span></p>
                      </div>
                    </div>

                    <h4 className="text-sm font-extrabold text-[#1A1D1B] mb-3 flex items-center gap-2"><Layers size={15} className="text-[#607d6e]"/> Rincian Cetak (Luas)</h4>
                    <div className="bg-slate-50 rounded-2xl p-1 overflow-hidden border border-slate-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left px-4 py-3 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Nama Barang</th>
                            <th className="text-left px-4 py-3 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Ukuran</th>
                            <th className="text-right px-4 py-3 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Total Area (m²)</th>
                            <th className="text-right px-4 py-3 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Jumlah Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.values(selectedWorker.items || {}).map((data, idx) => (
                            <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-[#1A1D1B]">{data.name}</td>
                              <td className="px-4 py-3 font-semibold text-slate-500">{data.dimension}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#347B5A]">{data.area > 0 ? formatArea(data.area) : '-'}</td>
                              <td className="px-4 py-3 text-right font-semibold text-[#646A66]">{data.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {(selectedWorker.finishingItems?.length > 0) && (
                      <div className="mt-5">
                        <h4 className="text-sm font-extrabold text-[#1A1D1B] mb-3 flex items-center gap-2"><Ruler size={15} className="text-purple-500"/> Rincian Finishing (Keliling)</h4>
                        <div className="bg-slate-50 rounded-2xl p-1 overflow-hidden border border-slate-100">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-slate-200">
                              <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Produk</th>
                              <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Keliling/item (m)</th>
                              <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Qty</th>
                              <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Total (m)</th>
                            </tr></thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedWorker.finishingItems.map((it, i) => (
                                <tr key={i} className="bg-white hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-bold text-[#1A1D1B]">{it.product_name}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-500">{formatArea(it.keliling)}</td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-500">{it.qty}</td>
                                  <td className="px-4 py-3 text-right font-bold text-purple-600">{formatArea(it.keliling * it.qty)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-[#646A66] font-semibold py-12 bg-slate-50 rounded-2xl border border-slate-100">
                    Pilih pekerja di kolom kiri untuk melihat detail.
                  </div>
                )}
              </div>
            ) : activeTab === 'cutting' ? (
              // DETAIL CUTTING
              <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5">
                <h3 className="text-lg font-extrabold text-[#1A1D1B] flex items-center gap-2 mb-6">
                  <Scissors size={20} className="text-orange-500" />
                  Cutting: {selectedWorker ? selectedWorker.email.split('@')[0] : 'Pilih Pekerja'}
                </h3>
                {selectedWorker ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1">Total Ongkos Potong</p>
                        <p className="text-2xl font-extrabold text-[#1A1D1B]">{formatRupiah(selectedWorker.total_fee)}</p>
                        <p className="text-[11px] font-semibold text-orange-500/80 mt-1">{selectedWorker.total_lembar} lembar</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Jenis Produk</p>
                        <p className="text-2xl font-extrabold text-[#1A1D1B]">{selectedWorker.items?.length || 0}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Klien</th>
                          <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Produk</th>
                          <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Qty (Lembar)</th>
                          <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Fee Potong</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedWorker.items || []).map((it, i) => (
                            <tr key={i} className="bg-white hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-semibold text-[#646A66]">{it.customer_name || '-'}</td>
                              <td className="px-4 py-3 font-bold text-[#1A1D1B]">{it.product_name}</td>
                              <td className="px-4 py-3 text-right font-bold text-orange-600">{it.qty}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#1A1D1B]">{formatRupiah(it.ongkos_potong)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[#646A66] font-semibold py-12 bg-slate-50 rounded-2xl border border-slate-100">Pilih pekerja di kolom kiri.</div>
                )}
              </div>
            ) : (
              // DETAIL DESAINER
              <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#1A1D1B] flex items-center gap-2">
                      <Paintbrush size={20} className="text-[#C29656]" />
                      Detail Kinerja: {selectedWorker ? selectedWorker.email.split('@')[0] : 'Pilih Desainer'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Frekuensi pesanan yang berhasil didesain dan telah selesai (status: Selesai).
                    </p>
                  </div>
                </div>

                {selectedWorker ? (
                  <>
                    <div className="bg-[#FAF5ED] rounded-2xl p-6 border border-[#C29656]/20 flex items-center justify-between mb-6">
                       <div>
                         <p className="text-[11px] font-bold text-[#C29656] uppercase tracking-widest mb-1">Total Jasa Desain</p>
                         <p className="text-3xl font-extrabold text-[#1A1D1B]">{formatRupiah(selectedWorker.total_fee)}</p>
                         <p className="text-[12px] font-semibold text-slate-500 mt-1">Dari {selectedWorker.total_orders} pesanan</p>
                       </div>
                       <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#C29656]/20">
                         <CheckCircle2 size={32} className="text-[#C29656]"/>
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-200">
                          <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Klien</th>
                          <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Produk</th>
                          <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Fee Desain</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedWorker.items || []).map((it, i) => (
                            <tr key={i} className="bg-white hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-semibold text-[#646A66]">{it.customer_name || '-'}</td>
                              <td className="px-4 py-3 font-bold text-[#1A1D1B]">{it.product_name}</td>
                              <td className="px-4 py-3 text-right font-bold text-[#C29656]">{formatRupiah(it.fee)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-[#646A66] font-semibold py-12 bg-slate-50 rounded-2xl border border-slate-100">
                    Pilih desainer di kolom kiri untuk melihat detail.
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* SEMUA PERAN OVERVIEW SECTION */}
      {!isLoading && allWorkers.length > 0 && (
        <div className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-[#1A1D1B] flex items-center gap-2">
              <Users className="text-blue-500" size={24} />
              Pantauan Semua Peran
            </h2>
            <p className="text-[#646A66] font-medium text-sm mt-1">
              Ringkasan pesanan yang ditangani (diperbarui dari riwayat aktivitas & pesanan).
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allWorkers.map((w, idx) => (
              <div key={w.email} className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col hover:-translate-y-1 transition-transform">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden relative">
                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${w.email}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md">
                    {w.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-[#1A1D1B] truncate" title={w.email}>{w.email.split('@')[0]}</h4>
                <div className="mt-4 grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Pesanan</p>
                    <p className="text-lg font-extrabold text-[#1A1D1B]">{w.touched}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Log Aksi</p>
                    <p className="text-lg font-extrabold text-[#1A1D1B]">{w.logs}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Aktivitas (Hanya untuk Produksi) ditaruh di bawah Semua Peran */}
      {!isLoading && activeTab === 'produksi' && (
        <div className="mt-8 bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#607d6e]" />
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Aktivitas Terakhir (Log): {selectedWorker ? selectedWorker.email.split('@')[0] : ''}</h3>
            </div>
            {selectedWorker && (
              <div className="flex gap-2 flex-wrap justify-end">
                {[
                  { key: 'all', label: 'Semua' },
                  { key: 'CREATE_ORDER', label: 'Buat' },
                  { key: 'UPDATE_STATUS', label: 'Update' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setActionFilter(opt.key)}
                    className={['px-3 py-1.5 rounded-xl border text-[10px] font-extrabold transition-all', actionFilter === opt.key ? 'bg-[#1A1D1B] border-[#1A1D1B] text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'].join(' ')}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!selectedWorker ? (
             <p className="text-[#646A66] font-semibold text-center py-6">Pilih pekerja di daftar atas untuk melihat log aktivitas.</p>
          ) : selectedWorkerLogs.length === 0 ? (
            <p className="text-[#646A66] font-semibold text-center py-6">
              Belum ada log aktivitas untuk filter ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Waktu</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Aksi</th>
                    <th className="text-left px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Keterangan</th>
                    <th className="text-right px-4 py-3 text-[10px] font-extrabold text-[#646A66] uppercase tracking-wider">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-[#646A66] font-medium whitespace-nowrap text-xs">
                        {formatDateTime(l.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={['inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold', l.action === 'CREATE_ORDER' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-[#EAF4EF] text-[#347B5A] border border-[#c5d9d3]'].join(' ')}
                        >
                          {ACTION_LABEL[l.action] || l.action || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#1A1D1B] font-medium leading-relaxed max-w-[400px] text-xs">
                          {l.details || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleHideLog(l.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Sembunyikan log">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {selectedWorkerLogs.length > 5 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/50 mt-4 rounded-xl">
              <span className="text-xs font-bold text-[#646A66]">
                Halaman {logPage} dari {totalLogPages}
              </span>
              <div className="flex gap-1.5">
                <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#1A1D1B] disabled:opacity-50 transition-colors"><ChevronLeft size={16}/></button>
                <button disabled={logPage === totalLogPages} onClick={() => setLogPage(p => p + 1)} className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-[#1A1D1B] disabled:opacity-50 transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
