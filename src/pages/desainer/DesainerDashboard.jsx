import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import {
  Eye, Search, ChevronLeft, ChevronRight,
  LayoutDashboard, CheckCircle2, Clock, Palette
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

export const DesainerDashboard = () => {
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const displayName = user?.email?.split('@')[0] || 'Desainer';

  // Load only orders with status 'designing' from Firestore
  const { orders: allDesigning, loading } = useOrdersSnapshot({ status: 'designing' });

  // Then filter client-side by the assigned designer email
  const designerOrders = allDesigning.filter(o => o.designer_email === user?.email);

  const filtered = designerOrders.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFinishDesign = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'cetak', {
      operator_id: user?.uid || 'unknown_id',
      operator_email: user?.email || 'unknown_email'
    });
    setSelectedOrder(null);
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 flex flex-col xl:flex-row gap-6 sm:gap-8 overflow-hidden">

      {/* ── KIRI: Main Content ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 sm:gap-8 overflow-hidden">

        {/* Hero / Greeting */}
        <div className="relative overflow-hidden bg-[#e11d48] rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-[#e11d48]/25 flex items-center justify-between border border-[#ffffff10]">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="text-white/80 font-bold text-[10px] tracking-widest uppercase mb-2">Workspace Desainer</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2 leading-tight">
                Selesaikan<br />Desain Anda
              </h2>
              <p className="text-white/60 font-semibold text-sm mt-1">
                {designerOrders.length} antrean desain menunggu
              </p>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-md">
              <Palette size={28} />
            </div>
          </div>
        </div>

        {/* Filters & Table */}
        <div id="tableArea" className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-50 overflow-hidden flex flex-col flex-1">
          <div className="p-5 md:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-extrabold text-[#1A1D1B] text-lg w-full sm:w-auto">Daftar Antrean Desain</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[260px]">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari klien atau produk..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-[#e11d48] focus:ring-4 focus:ring-[#e11d48]/10 outline-none text-[13px] font-semibold text-[#1A1D1B] placeholder-slate-400 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-[#e11d48] rounded-full animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48">
                <div className="text-4xl mb-3 opacity-50">🎨</div>
                <p className="font-bold text-[15px] text-[#1A1D1B]">Tidak ada pekerjaan desain</p>
                <p className="text-[13px] text-slate-500 mt-1">Antrean kosong saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Informasi Klien', 'Produk & Biaya Desain', 'Aksi'].map(h => (
                        <th key={h} className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0">
                              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer_name}`} alt="av" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-[#1A1D1B] text-[13px] leading-tight">{order.customer_name}</p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate max-w-[150px]">{formatDate(order.created_at)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-[#1A1D1B] text-[13px] max-w-[200px] truncate">{order.product_name}</p>
                          <p className="text-[11px] font-semibold text-[#e11d48] mt-0.5">{order.quantity} {order.product_unit} • Biaya Desain: {formatRupiah(order.design_price || 0)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-[#e11d48] hover:text-[#e11d48] hover:bg-rose-50 transition-all"
                          >
                            <ChevronRight size={16} />
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
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
                  <div className="w-8 h-8 rounded-lg bg-[#1A1D1B] text-white text-[12px] font-bold flex items-center justify-center">{page}</div>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-100 disabled:opacity-30"><ChevronRight size={14} /></button>
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
            <h3 className="font-extrabold text-[16px] text-[#1A1D1B]">Desainer Profile</h3>
          </div>

          <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 m-auto w-24 h-24 rounded-full overflow-hidden bg-rose-50 p-1 border-[3px] border-[#e11d48] shadow-lg shadow-[#e11d48]/20">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}`} alt="Avatar" className="w-full h-full object-cover rounded-full bg-slate-100" />
            </div>
          </div>

          <h2 className="text-[17px] font-extrabold text-[#1A1D1B] mb-1">
            Halo, {displayName.charAt(0).toUpperCase() + displayName.slice(1)}
          </h2>
          <p className="text-[12px] text-slate-400 font-semibold leading-relaxed max-w-[200px]">
            Selesaikan desain Anda dan teruskan ke petugas produksi.
          </p>
        </div>

      </div> {/* End KANAN */}

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Detail Pesanan Desain" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['No. HP', selectedOrder.customer_phone || '-'],
                ['Produk', selectedOrder.product_name],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Nama File', selectedOrder.file_name || '-'],
                ['Biaya Desain', formatRupiah(selectedOrder.design_price || 0)],
                ['Tanggal', formatDate(selectedOrder.created_at)],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{val}</p>
                </div>
              ))}
            </div>
            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase">Catatan</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setSelectedOrder(null)} className="px-5 py-2.5 bg-slate-100 text-[#1A1D1B] font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">Tutup</button>
              <button 
                onClick={handleFinishDesign}
                disabled={isUpdating}
                className="px-6 py-2.5 flex items-center gap-2 bg-[#e11d48] text-white font-bold rounded-xl text-sm hover:bg-[#be123c] transition-colors shadow-lg disabled:opacity-50"
              >
                {isUpdating ? 'Memproses...' : <><CheckCircle2 size={16} /> Selesai Desain</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
