import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Eye, Search, Filter, ChevronLeft, ChevronRight,
  ClipboardCheck, CheckCircle2, XCircle, LayoutDashboard, AlertCircle, FileSearch
} from 'lucide-react';
import clsx from 'clsx';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

export const ValidasiDashboard = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const displayName = user?.email?.split('@')[0] || 'Validasi';

  // Order groupings
  const pendingValidation = orders.filter(o => o.status === 'pending');
  const rejectedOrders = orders.filter(o => o.status === 'rejected');
  const validOrders = orders.filter(o => !['pending', 'awaiting_dp', 'rejected'].includes(o.status));
  const awaitingDp = orders.filter(o => o.status === 'awaiting_dp');

  // Stats
  const totalTasks = pendingValidation.length + rejectedOrders.length + validOrders.length;
  const progressPercent = Math.min(100, Math.max(0,
    Math.round((validOrders.length / Math.max(1, totalTasks)) * 100)
  ));

  // Priority orders for sidebar
  const priorityOrders = pendingValidation.slice(0, 4);

  // Active validation queue for horizontal scroll
  const validationQueue = pendingValidation.slice(0, 6);

  // Table filtering
  const tableData = orders.filter(o => ['pending', 'rejected', 'cetak', 'dp_confirmed', 'validated'].includes(o.status));
  
  const filtered = tableData.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'semua' ? true : o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = [
    { label: 'Menunggu Validasi', count: pendingValidation.length, icon: FileSearch, text: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Ditolak (Perlu Revisi)', count: rejectedOrders.length, icon: XCircle, text: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Tervalidasi / Proses C.', count: validOrders.length, icon: CheckCircle2, text: 'text-[#347B5A]', bg: 'bg-[#EAF4EF]' },
    { label: 'Belum DP (Draf)', count: awaitingDp.length, icon: AlertCircle, text: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  const handleValidate = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'cetak');
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'rejected', { rejection_note: rejectionNote });
    setSelectedOrder(null);
    setRejectionNote('');
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 flex flex-col xl:flex-row gap-6 sm:gap-8 overflow-hidden">

      {/* ── KIRI: Main Content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 sm:gap-8 overflow-hidden">

        {/* Hero / Greeting */}
        <div className="relative overflow-hidden bg-[#5a6b82] rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-[#5a6b82]/25 flex items-center justify-between border border-[#ffffff10]">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-4 right-[280px] w-2 h-2 bg-white/20 rounded-full" />
          
          <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-white/80 font-bold text-[10px] tracking-widest uppercase mb-2">Workspace Validasi</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight">
                Validasi Pesanan<br />Dengan Teliti & Cepat
              </h2>
              <p className="text-white/60 font-semibold text-sm mt-1">
                {pendingValidation.length} pesanan menunggu approval Anda.
              </p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
               <ClipboardCheck size={32} className="text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Quick Stats (Pills) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s) => {
             const Icon = s.icon;
             return (
               <div key={s.label} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-4 sm:px-5 sm:py-3.5 rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 hover:-translate-y-1 transition-transform group">
                 <div className={clsx(`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`, s.bg)}>
                    <Icon size={18} className={s.text} />
                 </div>
                 <div className="flex flex-col justify-center min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 hidden sm:block truncate pr-1" title={s.label}>{s.label}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 sm:hidden truncate">{s.label}</p>
                    <p className="text-xl font-extrabold text-[#1A1D1B] leading-none">{s.count}</p>
                 </div>
               </div>
             )
          })}
        </div>

        {/* Active Queue (Horizontal scroll) */}
        {validationQueue.length > 0 && (
          <div>
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-extrabold text-[#1A1D1B]">Antrean Validasi Teratas</h3>
                <div className="flex gap-2">
                   <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1A1D1B] transition-colors"><ChevronLeft size={16}/></button>
                   <button className="w-8 h-8 rounded-full bg-[#5a6b82] text-white flex items-center justify-center hover:bg-[#4a5a70] transition-colors shadow-md shadow-[#5a6b82]/20"><ChevronRight size={16}/></button>
                </div>
             </div>
             
             <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x px-2 -mx-2 pt-2">
               {validationQueue.map(o => (
                 <div key={o.id} className="min-w-[280px] max-w-[280px] bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 snap-start flex flex-col group hover:border-amber-400/40 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden" onClick={() => setSelectedOrder(o)}>
                    <div className="absolute top-0 left-0 w-full h-[5px] transition-colors bg-amber-400/60 group-hover:bg-amber-400"></div>
                    
                    <div className="flex items-center justify-between mb-4 mt-0.5">
                       <span className="text-[10px] uppercase font-extrabold text-[#1A1D1B] bg-slate-100 px-2.5 py-1 rounded-md tracking-wider">
                         {o.quantity} {o.product_unit}
                       </span>
                       <div className="scale-90 origin-right">
                         <StatusBadge status={o.status} />
                       </div>
                    </div>
                    
                    <h4 className="font-extrabold text-[#1A1D1B] text-[15px] leading-snug line-clamp-2 mb-1">{o.product_name}</h4>
                    <p className="text-[11px] font-semibold text-slate-400 mb-5">{formatDate(o.created_at)}</p>
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                       <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 ring-[3px] ring-white shadow-sm flex items-center justify-center">
                             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${o.customer_name}`} alt="av" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[12px] font-bold text-[#1A1D1B] truncate pr-2">{o.customer_name}</p>
                          </div>
                       </div>
                       <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors border border-amber-100 group-hover:border-amber-600">
                          <ClipboardCheck size={14} strokeWidth={2.5} />
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Filters & Table Area */}
        <div id="tableArea" className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 overflow-hidden flex flex-col flex-1">
          <div className="p-5 md:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-extrabold text-[#1A1D1B] text-lg w-full sm:w-auto">Riwayat Validasi</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[220px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pesanan..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-[#5a6b82] focus:ring-4 focus:ring-[#5a6b82]/10 outline-none text-[13px] font-semibold text-[#1A1D1B] placeholder-slate-400 transition-all"
                />
              </div>
              <div className="relative w-full sm:w-[160px]">
                <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                  className="pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-[#5a6b82] focus:ring-4 focus:ring-[#5a6b82]/10 outline-none text-[13px] font-bold text-[#1A1D1B] appearance-none cursor-pointer w-full transition-all"
                >
                  <option value="semua">Semua Status</option>
                  <option value="pending">Menunggu Validasi</option>
                  <option value="rejected">Ditolak</option>
                  <option value="cetak">Sudah Divalidasi</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-[#5a6b82] rounded-full animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-48">
                 <ClipboardCheck size={40} className="mb-3 text-slate-300 stroke-[1.5px]" />
                 <p className="font-bold text-[15px] text-[#1A1D1B]">Kosong</p>
                 <p className="text-[13px] text-slate-500 mt-1">Tidak ada data pesanan sesuai kriteria.</p>
               </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Informasi Klien', 'Detail Pesanan', 'Status', 'Total Masuk', 'Aksi'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer_name}`} alt="av" className="w-full h-full object-cover" /></div>
                            <div>
                               <p className="font-bold text-[#1A1D1B] text-[13px] leading-tight">{order.customer_name}</p>
                               <p className="text-[11px] font-semibold text-slate-400 truncate max-w-[150px]">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#1A1D1B] text-[13px] max-w-[200px] truncate">{order.product_name}</p>
                          <p className="text-[11px] font-semibold text-[#5a6b82] mt-0.5">{order.quantity} {order.product_unit}</p>
                        </td>
                        <td className="px-6 py-4"><div className="scale-90 origin-left"><StatusBadge status={order.status} /></div></td>
                        <td className="px-6 py-4 font-extrabold text-[#1A1D1B] text-[13px]">{formatRupiah(order.total_price)}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className={`flex items-center gap-1.5 font-bold text-xs px-3 py-2 rounded-xl transition-all ${
                               order.status === 'pending' ? 'bg-[#EAF4EF] text-[#347B5A] hover:bg-[#d5ecd8]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <Eye size={14} /> Tinjau
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
                <p className="text-[12px] font-bold text-slate-400">
                  Menampilkan <span className="text-[#1A1D1B]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> dari {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
                  <div className="w-8 h-8 rounded-lg bg-[#1A1D1B] text-white text-[12px] font-bold flex items-center justify-center">{page}</div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14}/></button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div> {/* End KIRI */}

      {/* ── KANAN: Statistic & Sidebar ── */}
      <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-6 flex flex-col">
        
        {/* Profile + Circular Stat */}
        <div className="bg-white rounded-[2rem] p-7 flex flex-col items-center justify-center text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 relative">
           <div className="absolute top-5 right-5 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-600 cursor-pointer transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
           </div>
           
           <div className="w-full flex justify-between items-center mb-6 px-1">
             <h3 className="font-extrabold text-[16px] text-[#1A1D1B]">Statistic Validasi</h3>
           </div>
           
           <div className="relative w-32 h-32 mb-6">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" stroke="#F0EFEE" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="46" stroke="#5a6b82" strokeWidth="8" fill="none" strokeDasharray={`${progressPercent * 2.89} 289`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 m-auto w-[68px] h-[68px] rounded-full overflow-hidden bg-slate-100 p-1 border-[3px] border-white shadow-lg shadow-black/5">
                 <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}`} alt="Avatar" className="w-full h-full object-cover rounded-full bg-slate-100" />
              </div>
              <div className="absolute top-0 right-0 bg-[#5a6b82] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm z-10">
                 {progressPercent}%
              </div>
           </div>
           
           <h2 className="text-[17px] font-extrabold text-[#1A1D1B] mb-1">Halo, {displayName.charAt(0).toUpperCase() + displayName.slice(1)} </h2>
           <p className="text-[12px] text-slate-400 font-semibold leading-relaxed max-w-[200px]">
             Pastikan file & spek pesanan sesuai agar produksi lancar.
           </p>

           <div className="w-full mt-6 bg-[#EAF4EF] rounded-2xl p-5 border border-[#347B5A]/10 flex items-center justify-between shadow-sm">
              <div className="text-left">
                 <p className="text-[10px] font-extrabold text-[#347B5A] uppercase tracking-widest mb-1">Tervalidasi Hari Ini</p>
                 <p className="text-[13px] font-bold text-[#1A1D1B]">{validOrders.length} Pesanan Selesai</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#347B5A] shadow-sm">
                 <CheckCircle2 size={18} strokeWidth={2.5} />
              </div>
           </div>
        </div>

        {/* Priority List */}
        <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 relative flex-1 flex flex-col">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-extrabold text-[#1A1D1B] text-[16px]">Prioritas Validasi</h3>
              <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                 <ClipboardCheck size={14} />
              </div>
           </div>
           
           <div className="space-y-4 flex-1">
              {priorityOrders.length === 0 ? (
                 <div className="flex flex-col flex-1 items-center justify-center text-center py-6 opacity-60">
                    <CheckCircle2 size={32} className="text-[#347B5A] mb-3 opacity-50" strokeWidth={1.5} />
                    <p className="text-[13px] font-bold text-slate-500">Antrean validasi kosong!</p>
                 </div>
              ) : priorityOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between group gap-2 py-1">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
                           <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${o.customer_name}`} alt="Ava" className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-amber-400 rounded-full"></div></div>
                        </div>
                        <div className="flex flex-col min-w-0">
                           <h4 className="font-bold text-[13px] text-[#1A1D1B] truncate max-w-[120px]">{o.customer_name}</h4>
                           <p className="text-[10px] font-bold text-slate-400 truncate tracking-wide">{o.status === 'pending' ? 'TUNGGU ACC' : ''}</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedOrder(o)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-100 text-[#5a6b82] text-[10px] font-bold tracking-widest uppercase hover:bg-[#ecf0f5] hover:border-[#ecf0f5] transition-all">
                        Cek
                     </button>
                  </div>
              ))}
           </div>
           
           {priorityOrders.length > 0 && (
              <button onClick={() => { setFilterStatus('pending'); document.getElementById('tableArea')?.scrollIntoView({behavior:'smooth'}) }} className="w-full mt-6 bg-slate-50 hover:bg-slate-100 text-[#5a6b82] font-bold text-[12px] py-3 rounded-xl transition-colors tracking-wide">
                Lihat Semua Antrean
              </button>
           )}
        </div>

      </div> {/* End KANAN */}

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Tinjau & Validasi Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['No. HP', selectedOrder.customer_phone || '-'],
                ['Produk', selectedOrder.product_name],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Total Biaya', formatRupiah(selectedOrder.total_price)],
                ['DP Kasir', selectedOrder.dp_amount ? formatRupiah(selectedOrder.dp_amount) : '0'],
                ['Tanggal Masuk', formatDate(selectedOrder.created_at)],
                ['Status', <StatusBadge status={selectedOrder.status} />],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{val}</p>
                </div>
              ))}
            </div>
            
            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase">Catatan Tambahan</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}

            {selectedOrder.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Alasan Penolakan (jika ditolak / butuh revisi)</label>
                <textarea
                  value={rejectionNote}
                  onChange={e => setRejectionNote(e.target.value)}
                  rows={2}
                  placeholder="Isi catatan revisi jika Anda menolak pesanan ini..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-red-400 focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] placeholder-slate-400 resize-none transition-all"
                />
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-3">
               <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 bg-slate-100 text-[#1A1D1B] font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">Tutup</button>
               
               {selectedOrder.status === 'pending' && (
                 <>
                   <button
                     onClick={handleReject}
                     disabled={isUpdating}
                     className="px-5 py-2.5 flex items-center gap-2 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                   >
                     <XCircle size={16}/> Tolak (Revisi)
                   </button>
                   <button
                     onClick={handleValidate}
                     disabled={isUpdating}
                     className="px-6 py-2.5 flex items-center gap-2 bg-[#1A1D1B] text-white font-bold rounded-xl text-sm hover:bg-black transition-colors shadow-lg disabled:opacity-50"
                   >
                     <CheckCircle2 size={16}/> ACC / Lanjut Cetak
                   </button>
                 </>
               )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
