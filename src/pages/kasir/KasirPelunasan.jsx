import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { CheckCircle2, PackageCheck } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

export const KasirPelunasan = () => {
  const { orders, loading } = useOrdersSnapshot();
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Focus primarily on 'ready' status for pelunasan
  const ordersReady = orders.filter(o => o.status === 'ready');

  const handleConfirmSelesai = async (orderId) => {
    await changeStatus(orderId, 'done', {
      paid_at: new Date(),
      paid_by: user?.email || 'Unknown',
    });
    setSelectedOrder(null);
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Pelunasan & Penyerahan</h2>
        <p className="text-[#646A66] font-medium mt-1">Pesanan yang telah selesai dipacking dan siap lunasi</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] mb-6 border-l-4 border-[#607d6e]">
        <div className="flex items-center gap-4">
          <div className="bg-[#EAF4EF] p-4 rounded-full text-[#607d6e]">
            <PackageCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Pesanan Siap Diambil</p>
            <p className="text-3xl font-extrabold text-[#1A1D1B]">{ordersReady.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-[#1A1D1B]">Daftar Pesanan Siap</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : ordersReady.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <PackageCheck size={40} className="text-slate-300 mb-3" />
            <p className="font-bold text-[#1A1D1B]">Tidak ada pesanan yang siap tahap pelunasan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Klien', 'Produk', 'Total Tagihan', 'Sisa Tagihan', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ordersReady.map((order, idx) => {
                  const sisaTagihan = order.total_price - (order.dp_amount || 0);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-[#646A66] font-semibold">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-[#1A1D1B]">{order.customer_name}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1A1D1B] max-w-[160px] truncate">{order.product_name}</p>
                        <p className="text-xs text-[#646A66]">{order.quantity} {order.product_unit}</p>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-[#1A1D1B]">{formatRupiah(order.total_price)}</td>
                      <td className="px-6 py-4 font-extrabold text-red-600">
                        {sisaTagihan > 0 ? formatRupiah(sisaTagihan) : 'LUNAS (Sisa 0)'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-1.5 text-indigo-700 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100 transition-all whitespace-nowrap"
                        >
                          <CheckCircle2 size={14} /> Proses Pelunasan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Konfirmasi Pelunasan" size="sm">
        {selectedOrder && (
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Total Sisa Tagihan</p>
              <p className="text-3xl font-black text-red-600">
                {formatRupiah(selectedOrder.total_price - (selectedOrder.dp_amount || 0))}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Klien</p>
                <p className="font-bold text-sm text-[#1A1D1B]">{selectedOrder.customer_name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Sudah Dibayar (DP)</p>
                <p className="font-bold text-sm text-[#1A1D1B]">{formatRupiah(selectedOrder.dp_amount || 0)}</p>
              </div>
            </div>

            <button
              onClick={() => handleConfirmSelesai(selectedOrder.id)}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 bg-[#1A1D1B] hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-black/20 disabled:opacity-50"
            >
              <CheckCircle2 size={18} /> {isUpdating ? 'Memproses...' : 'Tandai Lunas & Selesai'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
