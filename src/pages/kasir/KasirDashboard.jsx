import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  CreditCard, CheckCircle2, PackageCheck, Printer, Wallet, DollarSign, Receipt
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

export const KasirDashboard = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('pembayaran'); // "pembayaran" or "done"
  const [page, setPage] = useState(1);
  
  const [selectedOrderDP, setSelectedOrderDP] = useState(null);
  const [dpInput, setDpInput] = useState('');
  const [selectedOrderLunas, setSelectedOrderLunas] = useState(null);
  const [orderToPrint, setOrderToPrint] = useState(null);

  const [tipeBayar, setTipeBayar] = useState('TRF');
  const [uangDiterima, setUangDiterima] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const displayName = user?.email?.split('@')[0] || 'Kasir';

  // Order grouping
  const awaitingDp = orders.filter(o => o.status === 'awaiting_dp');
  const readyPelunasan = orders.filter(o => o.status === 'ready');
  const doneOrders = orders.filter(o => o.status === 'done');

  const totalDP = awaitingDp.reduce((s, o) => s + Number(o.dp_amount || o.total_price * 0.5 || 0), 0);
  const totalPelunasan = readyPelunasan.reduce((s, o) => s + (Number(o.total_price) - Number(o.dp_amount || 0)), 0);
  const totalPendapatan = doneOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);

  // Progress logic
  const totalTasks = awaitingDp.length + readyPelunasan.length + doneOrders.length;
  const progressPercent = Math.min(100, Math.max(0, Math.round((doneOrders.length / Math.max(1, totalTasks)) * 100)));

  // Queues
  const activeQueue = [...awaitingDp, ...readyPelunasan];
  const priorityOrders = readyPelunasan.slice(0, 4); // Siap lunas is priority
  const scrollQueue = activeQueue.slice(0, 6); // Campuran DP dan Pelunasan

  const recentPaidOrders = [...doneOrders].sort((a, b) => {
    const timeA = a.paid_at?.toDate ? a.paid_at.toDate().getTime() : new Date(a.paid_at || 0).getTime();
    const timeB = b.paid_at?.toDate ? b.paid_at.toDate().getTime() : new Date(b.paid_at || 0).getTime();
    return timeB - timeA;
  }).slice(0, 4);

  // Filtering for table
  const tableData = filterStatus === 'pembayaran' ? activeQueue : doneOrders;

  const filtered = tableData.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const statCards = [
    { label: 'Menunggu DP', count: awaitingDp.length, icon: CreditCard, text: 'text-amber-500', bg: 'bg-amber-50', sub: formatRupiah(totalDP) },
    { label: 'Siap Pelunasan', count: readyPelunasan.length, icon: Wallet, text: 'text-indigo-500', bg: 'bg-indigo-50', sub: formatRupiah(totalPelunasan) },
    { label: 'Pendapatan (Lunas)', count: doneOrders.length, icon: DollarSign, text: 'text-[#347B5A]', bg: 'bg-[#EAF4EF]', sub: formatRupiah(totalPendapatan) },
  ];

  const handleConfirmDP = async () => {
    if (!selectedOrderDP) return;
    const dpAmount = Number(dpInput) || Number(selectedOrderDP.dp_amount) || 0;
    const received = tipeBayar === 'CASH' ? (Number(uangDiterima) || 0) : dpAmount;
    const change = received - dpAmount;

    if (tipeBayar === 'CASH' && change < 0) {
      setErrorMsg('Uang pembayaran DP masih kurang!');
      return;
    }

    await changeStatus(selectedOrderDP.id, 'pending', {
      dp_amount: dpAmount,
      dp_confirmed_at: new Date(),
      dp_confirmed_by: user?.email || 'Unknown',
      dp_payment_type: tipeBayar,
      dp_amount_received: received,
      dp_change_amount: change,
    });

    handlePrint({
      ...selectedOrderDP,
      status: 'pending',
      dp_amount: dpAmount,
      dp_payment_type: tipeBayar,
      dp_amount_received: received,
      dp_change_amount: change,
    });

    setSelectedOrderDP(null);
    setDpInput('');
    setUangDiterima('');
    setTipeBayar('TRF');
    setErrorMsg('');
  };

  const handleConfirmSelesai = async () => {
    if (!selectedOrderLunas) return;
    const sisa = Number(selectedOrderLunas.total_price) - Number(selectedOrderLunas.dp_amount || 0);
    const received = tipeBayar === 'CASH' ? (Number(uangDiterima) || 0) : sisa;
    const change = received - sisa;

    if (tipeBayar === 'CASH' && change < 0) {
      setErrorMsg('Uang pembayaran kurang! Tidak bisa dilunaskan.');
      return;
    }

    await changeStatus(selectedOrderLunas.id, 'done', {
      paid_at: new Date(),
      final_payment_type: tipeBayar,
      final_amount_received: received,
      final_change_amount: change,
    });

    setSelectedOrderLunas(null);
    setUangDiterima('');
    setTipeBayar('TRF');
    setErrorMsg('');
  };

  const handlePrint = (order) => {
    setOrderToPrint(order);
    setTimeout(() => window.print(), 100);
  };

  return (
    <>
      <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 flex flex-col xl:flex-row gap-6 sm:gap-8 overflow-hidden print:hidden">

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ KIRI: Main Content Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="flex-1 min-w-0 flex flex-col gap-6 sm:gap-8 overflow-hidden">

          {/* Hero / Greeting */}
          <div className="relative overflow-hidden bg-[#C29656] rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-[#C29656]/25 flex items-center justify-between border border-[#ffffff10]">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute top-4 right-[280px] w-2 h-2 bg-white/20 rounded-full" />
            
            <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-white/90 font-bold text-[10px] tracking-widest uppercase mb-2 drop-shadow-sm">Workspace Kasir</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight drop-shadow-sm">
                  Kelola Pembayaran &<br />Keuangan Hari Ini
                </h2>
                <p className="text-white/80 font-bold text-sm mt-1 drop-shadow-sm">
                  {activeQueue.length} antrean pembayaran menunggu.
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-inner">
                 <Wallet size={32} className="text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Quick Stats (Pills) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statCards.map((s) => {
               const Icon = s.icon;
               return (
                 <div key={s.label} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-5 rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 hover:-translate-y-1 transition-transform group">
                   <div className={clsx(`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`, s.bg)}>
                      <Icon size={20} className={s.text} />
                   </div>
                   <div className="flex flex-col justify-center min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 truncate" title={s.label}>{s.label}</p>
                      <p className="text-xl font-extrabold text-[#1A1D1B] leading-none mb-1">{s.count} <span className="text-sm font-semibold text-slate-400">Pesanan</span></p>
                      <p className={clsx("text-xs font-bold w-max px-2 py-0.5 rounded-md", s.bg, s.text)}>{s.sub}</p>
                   </div>
                 </div>
               )
            })}
          </div>

          {/* Active Queue (Horizontal scroll) */}
          {scrollQueue.length > 0 && (
            <div>
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-extrabold text-[#1A1D1B]">Antrean Pembayaran</h3>
                  <div className="flex gap-2">
                     <button className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1A1D1B] transition-colors"><ChevronLeft size={16}/></button>
                     <button className="w-8 h-8 rounded-full bg-[#1A1D1B] text-white flex items-center justify-center hover:bg-black transition-colors shadow-md"><ChevronRight size={16}/></button>
                  </div>
               </div>
               
               <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 hide-scrollbar snap-x px-2 -mx-2 pt-2">
                 {scrollQueue.map(o => {
                   const isDP = o.status === 'awaiting_dp';
                   const sisa = Number(o.total_price) - Number(o.dp_amount || 0);

                   return (
                     <div key={o.id} className="min-w-[280px] max-w-[280px] bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 snap-start flex flex-col group hover:border-[#C29656]/40 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden" 
                          onClick={() => {
                            if (isDP) { setSelectedOrderDP(o); setDpInput(Math.round(o.dp_amount || o.total_price * 0.5)); }
                            else { setSelectedOrderLunas(o); }
                          }}>
                        <div className={clsx("absolute top-0 left-0 w-full h-[5px] transition-colors", isDP ? "bg-amber-400" : "bg-indigo-400")}></div>
                        
                        <div className="flex items-center justify-between mb-4 mt-0.5">
                           <span className="text-[10px] uppercase font-extrabold text-[#1A1D1B] bg-slate-100 px-2.5 py-1 rounded-md tracking-wider">
                             {isDP ? 'Uang Muka' : 'Pelunasan'}
                           </span>
                           <div className="scale-90 origin-right">
                             <StatusBadge status={o.status} />
                           </div>
                        </div>
                        
                        <h4 className="font-extrabold text-[#1A1D1B] text-[15px] leading-snug line-clamp-2 mb-1">{o.customer_name}</h4>
                        <p className="text-[11px] font-semibold text-slate-500 mb-4 truncate">{o.product_name}</p>
                        
                        <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between">
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{isDP ? 'ESTIMASI DP' : 'SISA TAGIHAN'}</p>
                              <p className={clsx("text-sm font-extrabold", isDP ? "text-amber-600" : "text-indigo-600")}>
                                {isDP ? formatRupiah(o.total_price * 0.5) : formatRupiah(sisa)}
                              </p>
                           </div>
                           <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors shadow-sm", isDP ? "bg-amber-600 group-hover:bg-amber-700" : "bg-indigo-600 group-hover:bg-indigo-700")}>
                              {isDP ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <PackageCheck size={14} />}
                           </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
            </div>
          )}

          {/* Filters & Table Area */}
          <div id="tableArea" className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 overflow-hidden flex flex-col flex-1">
            <div className="p-5 md:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-2 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => { setFilterStatus('pembayaran'); setPage(1); }}
                  className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex-1 sm:flex-none transition-all", filterStatus === 'pembayaran' ? "bg-white text-[#1A1D1B] shadow-sm border border-slate-200" : "text-slate-400 hover:text-[#1A1D1B]")}
                >
                  Antrean
                </button>
                <button
                  onClick={() => { setFilterStatus('done'); setPage(1); }}
                  className={clsx("px-4 py-2 rounded-lg text-sm font-bold flex-1 sm:flex-none transition-all", filterStatus === 'done' ? "bg-[#1A1D1B] text-white shadow-sm" : "text-slate-400 hover:text-[#1A1D1B]")}
                >
                  Riwayat Lunas
                </button>
              </div>

              <div className="relative w-full sm:w-[260px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pesanan atau klien..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-[#C29656] focus:ring-4 focus:ring-[#C29656]/10 outline-none text-[13px] font-semibold text-[#1A1D1B] placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 w-full relative">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-[#C29656] rounded-full animate-spin" />
                </div>
              ) : paginated.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-48">
                   <Receipt size={40} className="mb-3 text-slate-300 stroke-[1.5px]" />
                   <p className="font-bold text-[15px] text-[#1A1D1B]">Kosong</p>
                   <p className="text-[13px] text-slate-500 mt-1">Tidak ada data pesanan sesuai kriteria.</p>
                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Informasi Pesanan', 'Status / Jenis', 'Tagihan', 'Aksi'].map(h => (
                          <th key={h} className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginated.map((order) => {
                        const isDP = order.status === 'awaiting_dp';
                        const isLunas = order.status === 'ready';
                        const isDone = order.status === 'done';
                        const sisaTagihan = Number(order.total_price) - Number(order.dp_amount || 0);

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                               <p className="font-bold text-[#1A1D1B] text-[13px] leading-tight">{order.customer_name}</p>
                               <p className="text-[11px] font-semibold text-slate-400 truncate max-w-[200px] mt-0.5">{order.product_name}</p>
                               <p className="text-[10px] text-slate-400 mt-1">{order.quantity} {order.product_unit} • {formatDate(order.created_at)}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="scale-90 origin-left mb-1"><StatusBadge status={order.status} /></div>
                              {isDP && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wide">Uang Muka</span>}
                              {isLunas && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide">Pelunasan</span>}
                            </td>
                            <td className="px-6 py-4">
                              {isDP && (
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Total Harga</p>
                                  <p className="font-extrabold text-[#1A1D1B] text-[13px]">{formatRupiah(order.total_price)}</p>
                                </div>
                              )}
                              {(isLunas || isDone) && (
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Sisa Tagihan</p>
                                  <p className={`font-extrabold text-[13px] ${sisaTagihan > 0 ? 'text-red-600' : 'text-[#347B5A]'}`}>
                                    {sisaTagihan > 0 ? formatRupiah(sisaTagihan) : 'LUNAS (0)'}
                                  </p>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                {isDP && (
                                  <button onClick={() => { setSelectedOrderDP(order); setDpInput(Math.round(order.dp_amount || order.total_price * 0.5)); }}
                                    className="flex items-center gap-1.5 text-white font-bold text-[11px] bg-amber-600 px-3 py-2 rounded-xl hover:bg-amber-700 transition-all shadow-sm">
                                    <CheckCircle2 size={14} /> Konfirmasi
                                  </button>
                                )}
                                {isLunas && (
                                  <button onClick={() => setSelectedOrderLunas(order)}
                                    className="flex items-center gap-1.5 text-white font-bold text-[11px] bg-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
                                    <PackageCheck size={14} /> Lunaskan
                                  </button>
                                )}
                                <button onClick={() => handlePrint(order)}
                                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all border border-slate-200">
                                  <Printer size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ KANAN: Statistic & Sidebar Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <div className="w-full xl:w-[320px] 2xl:w-[340px] shrink-0 space-y-6 flex flex-col">
          
          {/* Profile + Circular Stat */}
          <div className="bg-white rounded-[2rem] p-7 flex flex-col items-center justify-center text-center shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 relative">
             <div className="absolute top-5 right-5 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-slate-600 cursor-pointer transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
             </div>
             
             <div className="w-full flex justify-between items-center mb-6 px-1">
               <h3 className="font-extrabold text-[16px] text-[#1A1D1B]">Statistic Kasir</h3>
             </div>
             
             <div className="relative w-32 h-32 mb-6">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" stroke="#F0EFEE" strokeWidth="8" fill="none" />
                  <circle cx="50" cy="50" r="46" stroke="#C29656" strokeWidth="8" fill="none" strokeDasharray={`${progressPercent * 2.89} 289`} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 m-auto w-[68px] h-[68px] rounded-full overflow-hidden bg-slate-100 p-1 border-[3px] border-white shadow-lg shadow-black/5">
                   <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}`} alt="Avatar" className="w-full h-full object-cover rounded-full bg-slate-100" />
                </div>
                <div className="absolute top-0 right-0 bg-[#C29656] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm z-10">
                   {progressPercent}%
                </div>
             </div>
             
             <h2 className="text-[17px] font-extrabold text-[#1A1D1B] mb-1">Halo, {displayName.charAt(0).toUpperCase() + displayName.slice(1)} </h2>
             <p className="text-[12px] text-slate-400 font-semibold leading-relaxed max-w-[200px]">
               Pastikan semua pembayaran sesuai dan tercatat rapi.
             </p>

             <div className="w-full mt-6 bg-[#EAF4EF] rounded-2xl p-5 border border-[#347B5A]/10 flex items-center justify-between shadow-sm">
                <div className="text-left">
                   <p className="text-[10px] font-extrabold text-[#347B5A] uppercase tracking-widest mb-1">Total Transaksi</p>
                   <p className="text-[13px] font-bold text-[#1A1D1B]">{doneOrders.length} Selesai</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#347B5A] shadow-sm">
                   <CheckCircle2 size={18} strokeWidth={2.5} />
                </div>
             </div>
          </div>

          {/* Priority List (Siap Pelunasan) */}
          <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 relative flex-1 flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-[#1A1D1B] text-[16px]">Prioritas Pelunasan</h3>
                <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                   <PackageCheck size={14} />
                </div>
             </div>
             
             <div className="space-y-4 flex-1">
                {priorityOrders.length === 0 ? (
                   <div className="flex flex-col flex-1 items-center justify-center text-center py-6 opacity-60">
                      <CheckCircle2 size={32} className="text-[#347B5A] mb-3 opacity-50" strokeWidth={1.5} />
                      <p className="text-[13px] font-bold text-slate-500">Belum ada barang siap diambil.</p>
                   </div>
                ) : priorityOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between group gap-2 py-1">
                       <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
                             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${o.customer_name}`} alt="Ava" className="w-full h-full object-cover" />
                             <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div></div>
                          </div>
                          <div className="flex flex-col min-w-0">
                             <h4 className="font-bold text-[13px] text-[#1A1D1B] truncate max-w-[120px]">{o.customer_name}</h4>
                             <p className="text-[10px] font-bold text-indigo-600 truncate tracking-wide">SIAP DIAMBIL</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedOrderLunas(o)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-100 text-indigo-600 bg-indigo-50 text-[10px] font-bold tracking-widest uppercase hover:bg-indigo-600 hover:text-white transition-all">
                          Cek
                       </button>
                    </div>
                ))}
             </div>
             
             {priorityOrders.length > 0 && (
                <button onClick={() => { setFilterStatus('pembayaran'); document.getElementById('tableArea')?.scrollIntoView({behavior:'smooth'}) }} className="w-full mt-6 bg-slate-50 hover:bg-slate-100 text-[#1A1D1B] font-bold text-[12px] py-3 rounded-xl transition-colors tracking-wide border border-slate-200">
                  Lihat Semua Antrean
                </button>
             )}
          </div>

          {/* Baru Saja Lunas */}
          <div className="bg-white rounded-[2rem] p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 relative flex-1 flex flex-col">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-extrabold text-[#1A1D1B] text-[16px]">Baru Saja Lunas</h3>
                <div className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-[#347B5A]">
                   <CheckCircle2 size={14} />
                </div>
             </div>
             
             <div className="space-y-4 flex-1">
                {recentPaidOrders.length === 0 ? (
                   <div className="flex flex-col flex-1 items-center justify-center text-center py-6 opacity-60">
                      <Receipt size={32} className="text-slate-300 mb-3" strokeWidth={1.5} />
                      <p className="text-[13px] font-bold text-slate-500">Belum ada transaksi selesai.</p>
                   </div>
                ) : recentPaidOrders.map(o => (
                    <div key={o.id} className="flex items-center justify-between group gap-2 py-1">
                       <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
                             <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${o.customer_name}`} alt="Ava" className="w-full h-full object-cover" />
                             <div className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-[#347B5A] rounded-full"></div></div>
                          </div>
                          <div className="flex flex-col min-w-0">
                             <h4 className="font-bold text-[13px] text-[#1A1D1B] truncate max-w-[120px]">{o.customer_name}</h4>
                             <p className="text-[10px] font-bold text-slate-400 truncate tracking-wide">{formatDate(o.paid_at || o.created_at)}</p>
                          </div>
                       </div>
                       <button onClick={() => handlePrint(o)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-500 bg-slate-50 text-[10px] font-bold tracking-widest uppercase hover:bg-slate-200 hover:text-[#1A1D1B] transition-all">
                          Cetak
                       </button>
                    </div>
                ))}
             </div>
             
             {recentPaidOrders.length > 0 && (
                <button onClick={() => { setFilterStatus('done'); document.getElementById('tableArea')?.scrollIntoView({behavior:'smooth'}) }} className="w-full mt-6 bg-slate-50 hover:bg-slate-100 text-[#1A1D1B] font-bold text-[12px] py-3 rounded-xl transition-colors tracking-wide border border-slate-200">
                  Lihat Riwayat Lunas
                </button>
             )}
          </div>

        </div> {/* End KANAN */}

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Modal: Konfirmasi DP Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <Modal open={!!selectedOrderDP} onClose={() => { setSelectedOrderDP(null); setUangDiterima(''); setTipeBayar('TRF'); }} title="Konfirmasi DP Diterima" size="sm">
          {selectedOrderDP && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <CreditCard size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-extrabold text-[#1A1D1B] mb-0.5">Konfirmasi Uang Muka</p>
                  <p className="text-[11px] text-amber-700 font-semibold leading-relaxed">
                    Setelah dikonfirmasi, pesanan otomatis dikirim ke <strong>Petugas Validasi</strong> untuk verifikasi file.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Klien</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{selectedOrderDP.customer_name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Total Harga</p>
                  <p className="font-extrabold text-sm text-[#1A1D1B]">{formatRupiah(selectedOrderDP.total_price)}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">
                  Jumlah DP Masuk (Rp)
                </label>
                <input
                  type="text"
                  value={dpInput ? Number(dpInput).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setDpInput(val);
                    setErrorMsg('');
                  }}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border-2 border-amber-200 focus:border-amber-500 focus:bg-white outline-none text-lg font-extrabold text-[#1A1D1B] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                   <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Tipe Bayar</label>
                   <select 
                      value={tipeBayar} onChange={(e) => { setTipeBayar(e.target.value); setErrorMsg(''); }}
                      className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#C29656] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all"
                   >
                     <option value="TRF">Transfer (TRF)</option>
                     <option value="CASH">Tunai (CASH)</option>
                     <option value="QRIS">QRIS</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Uang Diterima</label>
                   <input 
                      type="text" 
                      value={tipeBayar === 'CASH' ? (uangDiterima ? Number(uangDiterima).toLocaleString('id-ID') : '') : (Number(dpInput) || 0).toLocaleString('id-ID')}
                      onChange={e => { setUangDiterima(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                      disabled={tipeBayar !== 'CASH'}
                      className={clsx("w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#C29656] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all", tipeBayar !== 'CASH' && "opacity-60 cursor-not-allowed")}
                      placeholder="Nominal..."
                   />
                </div>
              </div>

              {tipeBayar === 'CASH' && uangDiterima !== '' && (
                (() => {
                   const change = (Number(uangDiterima) || 0) - (Number(dpInput) || 0);
                   const isKurang = change < 0;
                   return (
                     <div className={clsx("rounded-xl p-3.5 flex justify-between items-center", isKurang ? "bg-red-50 text-red-600" : "bg-slate-100")}>
                        <span className={clsx("text-xs font-bold uppercase tracking-wider", isKurang ? "text-red-500" : "text-[#646A66]")}>
                          {isKurang ? 'Kurang' : 'Kembalian'}
                        </span>
                        <span className={clsx("font-extrabold text-sm", isKurang ? "text-red-600" : "text-[#1A1D1B]")}>
                           {isKurang ? `- ${formatRupiah(Math.abs(change))}` : formatRupiah(change)}
                        </span>
                     </div>
                   );
                })()
              )}

              {errorMsg && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[13px] font-bold border border-red-100 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
                  {errorMsg}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => { setSelectedOrderDP(null); setUangDiterima(''); setTipeBayar('TRF'); setErrorMsg(''); }} className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold rounded-xl text-sm transition-all">Batal</button>
                <button
                  onClick={handleConfirmDP}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {isUpdating ? 'Memproses...' : 'Terima DP & Lanjutkan'}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Ã¢â€â‚¬Ã¢â€â‚¬ Modal: Pelunasan Akhir Ã¢â€â‚¬Ã¢â€â‚¬ */}
        <Modal open={!!selectedOrderLunas} onClose={() => { setSelectedOrderLunas(null); setUangDiterima(''); setTipeBayar('TRF'); }} title="Konfirmasi Pelunasan & Penyerahan" size="sm">
          {selectedOrderLunas && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center shadow-inner">
                <p className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-widest mb-2">
                  Sisa Tagihan Dilunaskan
                </p>
                <p className="text-4xl font-black text-indigo-700 tracking-tight">
                  {formatRupiah(Number(selectedOrderLunas.total_price) - Number(selectedOrderLunas.dp_amount || 0))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Klien</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{selectedOrderLunas.customer_name}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Terbayar Awal (DP)</p>
                  <p className="font-extrabold text-sm text-[#1A1D1B]">{formatRupiah(selectedOrderLunas.dp_amount || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                   <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Tipe Bayar</label>
                   <select 
                      value={tipeBayar} onChange={(e) => { setTipeBayar(e.target.value); setErrorMsg(''); }}
                      className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#C29656] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all"
                   >
                     <option value="TRF">Transfer (TRF)</option>
                     <option value="CASH">Tunai (CASH)</option>
                     <option value="QRIS">QRIS</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Uang Diterima</label>
                   <input 
                      type="text" 
                      value={tipeBayar === 'CASH' ? (uangDiterima ? Number(uangDiterima).toLocaleString('id-ID') : '') : (Number(selectedOrderLunas.total_price) - Number(selectedOrderLunas.dp_amount || 0)).toLocaleString('id-ID')}
                      onChange={e => { setUangDiterima(e.target.value.replace(/\D/g, '')); setErrorMsg(''); }}
                      disabled={tipeBayar !== 'CASH'}
                      className={clsx("w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#C29656] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all", tipeBayar !== 'CASH' && "opacity-60 cursor-not-allowed")}
                      placeholder="Nominal..."
                   />
                </div>
              </div>

              {tipeBayar === 'CASH' && uangDiterima !== '' && (
                (() => {
                   const change = (Number(uangDiterima) || 0) - (Number(selectedOrderLunas.total_price) - Number(selectedOrderLunas.dp_amount || 0));
                   const isKurang = change < 0;
                   return (
                     <div className={clsx("rounded-xl p-3.5 flex justify-between items-center", isKurang ? "bg-red-50 text-red-600" : "bg-slate-100")}>
                        <span className={clsx("text-xs font-bold uppercase tracking-wider", isKurang ? "text-red-500" : "text-[#646A66]")}>
                          {isKurang ? 'Kurang' : 'Kembalian'}
                        </span>
                        <span className={clsx("font-extrabold text-sm", isKurang ? "text-red-600" : "text-[#1A1D1B]")}>
                           {isKurang ? `- ${formatRupiah(Math.abs(change))}` : formatRupiah(change)}
                        </span>
                     </div>
                   );
                })()
              )}

              {errorMsg && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[13px] font-bold border border-red-100 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">!</div>
                  {errorMsg}
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => { setSelectedOrderLunas(null); setUangDiterima(''); setTipeBayar('TRF'); setErrorMsg(''); }} className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold rounded-xl text-sm transition-all">Batal</button>
                <button
                  onClick={handleConfirmSelesai}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50"
                >
                  <PackageCheck size={16} />
                  {isUpdating ? 'Memproses...' : 'Tandai Lunas'}
                </button>
              </div>
            </div>
          )}
        </Modal>

      </div>

      {/* ── Invoice Print View (Thermal Receipt 80mm) ── */}
      {orderToPrint && (
        <div className="screen-hidden-print-only">
          <div style={{fontFamily:'"Courier New",Courier,monospace',fontSize:'10pt',color:'#000',background:'#fff',width:'72mm',margin:'0 auto',padding:'3mm 2mm',lineHeight:'1.4'}}>

            {/* HEADER */}
            <div style={{textAlign:'center',marginBottom:'8px'}}>
              <div style={{fontWeight:'900',fontSize:'13pt',letterSpacing:'2px'}}>TIGA WARNA ADV</div>
              <div style={{fontSize:'8pt',lineHeight:'1.3',marginTop:'2px'}}>
                Jl. Sultan Agung No. 52, Cokoleo,<br/>Kepanjen, Kab. Malang Jawa Timur
              </div>
            </div>

            <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

            {/* METADATA */}
            <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
              {[
                ['Tanggal', (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}); })()],
                ['Jam',     (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); })()],
                ['Customer',(orderToPrint.customer_name||'').toUpperCase()],
                ['Telp',    orderToPrint.customer_phone||'-'],
                ['Invoice', (() => { const d = orderToPrint.created_at?.toDate ? orderToPrint.created_at.toDate() : new Date(orderToPrint.created_at); return ('INV'+d.toLocaleDateString('id-ID',{year:'2-digit',month:'2-digit',day:'2-digit'}).replace(/\//g,'')+(orderToPrint.id?.slice(0,6)||'')).toUpperCase(); })()],
                ['Kasir',   displayName.toUpperCase()],
              ].map(([label,val])=>(
                <div key={label} style={{display:'grid',gridTemplateColumns:'65px 1fr',marginBottom:'1px'}}>
                  <span>{label}</span><span>: {val}</span>
                </div>
              ))}
            </div>

            <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

            {/* ITEMS */}
            <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
              <div style={{marginBottom:'4px'}}>
                <div style={{textTransform:'uppercase'}}>1. {orderToPrint.product_name}</div>
                <div style={{display:'flex',justifyContent:'space-between',paddingLeft:'12px',marginTop:'1px'}}>
                  <span>{formatRupiah(Math.round((orderToPrint.total_price-(orderToPrint.design_price||0))/Math.max(1,orderToPrint.quantity)))} x{orderToPrint.quantity}</span>
                  <span>{formatRupiah(orderToPrint.total_price-(orderToPrint.design_price||0))}</span>
                </div>
              </div>
              {orderToPrint.needs_design && orderToPrint.design_price > 0 && (
                <div style={{marginBottom:'4px'}}>
                  <div>2. JASA DESAIN</div>
                  <div style={{display:'flex',justifyContent:'space-between',paddingLeft:'12px',marginTop:'1px'}}>
                    <span>{formatRupiah(orderToPrint.design_price)} x1</span>
                    <span>{formatRupiah(orderToPrint.design_price)}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{borderBottom:'1px dashed #000',marginBottom:'6px'}}/>

            {/* PAYMENT */}
            <div style={{fontSize:'8.5pt',marginBottom:'6px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><span>: {formatRupiah(orderToPrint.total_price)}</span></div>
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:'700'}}><span>Total</span><span>: {formatRupiah(orderToPrint.total_price)}</span></div>
              {orderToPrint.status === 'done' ? (
                orderToPrint.dp_amount > 0 ? (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>DP Masuk Awal</span><span>: {formatRupiah(orderToPrint.dp_amount||0)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Sisa Pelunasan</span><span>: {formatRupiah(orderToPrint.total_price-(orderToPrint.dp_amount||0))}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima (Lunas)</span><span>: {formatRupiah(orderToPrint.final_amount_received||0)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.final_change_amount||0))}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.final_payment_type||'TRF').toUpperCase()}</span></div>
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima (Lunas)</span><span>: {formatRupiah(orderToPrint.final_amount_received||0)}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.final_change_amount||0))}</span></div>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.final_payment_type||'TRF').toUpperCase()}</span></div>
                  </>
                )
              ) : (
                <>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>DP Masuk</span><span>: {formatRupiah(orderToPrint.dp_amount||0)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>Terima</span><span>: {formatRupiah(orderToPrint.dp_amount_received||0)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>Kembali</span><span>: {formatRupiah(Math.max(0,orderToPrint.dp_change_amount||0))}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>Sisa Tagihan</span><span>: {formatRupiah(orderToPrint.total_price-(orderToPrint.dp_amount||0))}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:'2px'}}><span>Tipe Bayar</span><span>: {(orderToPrint.dp_payment_type||'-').toUpperCase()}</span></div>
                </>
              )}
            </div>

            <div style={{borderBottom:'1px dashed #000',marginBottom:'8px'}}/>

            {/* FOOTER */}
            <div style={{textAlign:'center',fontSize:'8pt',position:'relative'}}>
              <div style={{fontWeight:'700',textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>Terima Kasih</div>
              <div style={{lineHeight:'1.5',marginBottom:'12px'}}>
                periksa kembali pesanan anda.<br/>
                kesalahan print karena kelalaian customer<br/>
                tidak dapat dikembalikan.<br/>
                invoice hilang dikenakan biaya cetak<br/>
                ulang struk Rp. 2.000 saat pengambilan.
              </div>

              <div style={{fontSize:'6pt',color:'#666',marginTop:'8px',borderTop:'1px solid #ddd',paddingTop:'4px'}}>
                © {new Date().getFullYear()} Tiga Warna Print Management<br/>
                Software Version v1.0.0
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
