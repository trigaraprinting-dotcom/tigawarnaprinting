import React, { useMemo } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ValidasiDashboard = () => {
  const { orders, loading } = useOrdersSnapshot({ status: 'pending' });
  const { changeStatus, isUpdating } = useOrderActions();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const handleValidate = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'validated');
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
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Validasi Pesanan</h2>
        <p className="text-[#646A66] font-medium mt-1">{orders.length} pesanan menunggu validasi</p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-5xl mb-4">✅</div>
            <p className="font-bold text-lg text-[#1A1D1B]">Semua pesanan sudah divalidasi!</p>
            <p className="text-sm text-[#646A66] mt-1">Tidak ada pesanan yang menunggu persetujuan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Klien', 'Produk', 'Total', 'Masuk', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-[#646A66] font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-[#1A1D1B]">{order.customer_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1A1D1B]">{order.product_name}</p>
                      <p className="text-xs text-[#646A66]">{order.quantity} {order.product_unit}</p>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-[#1A1D1B]">{formatRupiah(order.total_price)}</td>
                    <td className="px-6 py-4 text-[#646A66]">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1.5 text-[#607d6e] font-bold text-xs bg-[#EAF4EF] px-3 py-2 rounded-xl hover:bg-[#d4eadf] transition-all"
                      >
                        Tinjau
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Tinjau Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['No. HP', selectedOrder.customer_phone || '-'],
                ['Produk', selectedOrder.product_name],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Total Harga', formatRupiah(selectedOrder.total_price)],
                ['Tanggal Masuk', formatDate(selectedOrder.created_at)],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{val}</p>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase">Catatan CS</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Alasan Penolakan (jika ditolak)</label>
              <textarea
                value={rejectionNote}
                onChange={e => setRejectionNote(e.target.value)}
                rows={2}
                placeholder="Isi jika akan menolak pesanan ini..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-red-400 outline-none text-sm font-semibold text-[#1A1D1B] placeholder-slate-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
              >
                <XCircle size={18} /> Tolak
              </button>
              <button
                onClick={handleValidate}
                disabled={isUpdating}
                className="flex items-center justify-center gap-2 bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
              >
                <CheckCircle2 size={18} /> Validasi
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
