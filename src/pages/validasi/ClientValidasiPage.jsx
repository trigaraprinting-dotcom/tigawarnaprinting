import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { Search, ChevronLeft, ChevronRight, Eye, CheckCircle2, XCircle } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 15;

export const ClientValidasiPage = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Hanya ambil yang pending (perlu divalidasi)
  const pendingValidation = orders.filter(o => o.status === 'pending');

  const filtered = pendingValidation.filter(o => {
    return !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleValidate = async () => {
    if (!selectedOrder) return;
    
    const needsDesignVal = selectedOrder.needs_design;
    const nextStatus = needsDesignVal ? 'designing' : 'cetak';

    await changeStatus(selectedOrder.id, nextStatus, {
      validated_by: user?.email || 'Unknown',
      validated_at: new Date(),
    });
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'rejected', { rejection_note: rejectionNote });
    setSelectedOrder(null);
    setRejectionNote('');
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Daftar Klien (Validasi)</h2>
          <p className="text-[#646A66] font-medium mt-1">{filtered.length} pesanan klien menunggu divalidasi</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari klien atau produk..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-[#5a6b82] outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#5a6b82] rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <CheckCircle2 size={48} className="opacity-20" />
            <p className="font-bold text-lg text-[#1A1D1B]">Tidak ada antrean</p>
            <p className="text-sm">Semua pesanan klien sudah divalidasi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100/80">
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Informasi Klien</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Produk</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Tanggal Masuk</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
                          <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${order.customer_name}`} alt="av" className="w-full h-full object-cover" />
                        </div>
                        <div>
                           <p className="font-extrabold text-[#1A1D1B] text-sm">{order.customer_name}</p>
                           <p className="text-xs font-medium text-slate-500 mt-0.5">{order.customer_phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1A1D1B] text-sm max-w-[200px] truncate">{order.product_name}</p>
                      <p className="text-xs font-semibold text-[#5a6b82] mt-0.5">{order.quantity} {order.product_unit}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#646A66]">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4"><div className="scale-90 origin-left"><StatusBadge status={order.status} /></div></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 font-bold text-xs px-4 py-2 rounded-xl bg-[#EAF4EF] text-[#347B5A] hover:bg-[#d5ecd8] transition-all"
                      >
                        <Eye size={14} /> Validasi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm font-semibold text-[#646A66]">
              Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#646A66] hover:bg-slate-200 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-[#1A1D1B] px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#646A66] hover:bg-slate-200 disabled:opacity-40 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Tinjau & Validasi Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['No. HP', selectedOrder.customer_phone || '-'],
                ['Produk', selectedOrder.product_name],
                ['Nama File', selectedOrder.file_name || '-'],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Jasa Desain', selectedOrder.needs_design ? `Ya (${formatRupiah(selectedOrder.design_price || 0)}) - ${selectedOrder.designer_email}` : 'Tidak'],
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
            
            {/* Routing Decision Banner */}
            {selectedOrder.status === 'pending' && (
              <div className={`rounded-xl px-4 py-3 border flex items-center gap-3 ${
                selectedOrder.needs_design
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-cyan-50 border-cyan-200'
              }`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  selectedOrder.needs_design ? 'bg-rose-500' : 'bg-cyan-500'
                }`} />
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-0.5">Routing Otomatis</p>
                  <p className={`text-[13px] font-extrabold ${
                    selectedOrder.needs_design ? 'text-rose-700' : 'text-cyan-700'
                  }`}>
                    {selectedOrder.needs_design
                      ? `→ Akan masuk ke antrean Desainer (${selectedOrder.designer_email || 'belum ditentukan'})`
                      : '→ Akan langsung masuk ke antrean Cetak'}
                  </p>
                </div>
              </div>
            )}

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
