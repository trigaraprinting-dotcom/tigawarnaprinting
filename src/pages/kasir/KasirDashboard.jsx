import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { CheckCircle2, CreditCard } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const KasirDashboard = () => {
  const { orders: ordersValidated, loading } = useOrdersSnapshot({ status: 'validated' });
  const { orders: ordersDone } = useOrdersSnapshot({ status: 'done' });
  const { changeStatus, isUpdating } = useOrderActions();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dpInput, setDpInput] = useState('');

  const handleConfirmDP = async () => {
    if (!selectedOrder) return;
    await changeStatus(selectedOrder.id, 'dp_confirmed', {
      dp_amount: Number(dpInput) || selectedOrder.dp_amount,
      dp_confirmed_at: new Date(),
    });
    setSelectedOrder(null);
    setDpInput('');
  };

  const totalPendapatanDone = ordersDone.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const totalDP = ordersValidated.reduce((sum, o) => sum + Number(o.dp_amount || 0), 0);

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Kasir</h2>
        <p className="text-[#646A66] font-medium mt-1">Kelola konfirmasi DP dan pembayaran pesanan</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-3">Menunggu Konfirmasi DP</p>
          <p className="text-3xl font-extrabold text-amber-600">{ordersValidated.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-3">Estimasi DP Masuk</p>
          <p className="text-2xl font-extrabold text-[#607d6e]">{formatRupiah(totalDP)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-3">Total Pendapatan (Selesai)</p>
          <p className="text-2xl font-extrabold text-[#1A1D1B]">{formatRupiah(totalPendapatanDone)}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-[#1A1D1B]">Pesanan Menunggu Konfirmasi DP</h3>
          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">{ordersValidated.length} pesanan</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : ordersValidated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48">
            <CreditCard size={40} className="text-slate-300 mb-3" />
            <p className="font-bold text-[#1A1D1B]">Tidak ada pesanan menunggu DP</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Klien', 'Produk', 'Total Tagihan', 'DP Seharusnya', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ordersValidated.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-[#646A66] font-semibold">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-[#1A1D1B]">{order.customer_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1A1D1B] max-w-[160px] truncate">{order.product_name}</p>
                      <p className="text-xs text-[#646A66]">{order.quantity} {order.product_unit}</p>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-[#1A1D1B]">{formatRupiah(order.total_price)}</td>
                    <td className="px-6 py-4 font-bold text-[#607d6e]">{formatRupiah(order.total_price * 0.5)}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => { setSelectedOrder(order); setDpInput(Math.round(order.total_price * 0.5)); }}
                        className="flex items-center gap-1.5 text-[#607d6e] font-bold text-xs bg-[#EAF4EF] px-3 py-2 rounded-xl hover:bg-[#d4eadf] transition-all"
                      >
                        <CheckCircle2 size={14} /> Konfirmasi DP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Konfirmasi DP Diterima" size="sm">
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Klien</p>
                <p className="font-bold text-sm text-[#1A1D1B]">{selectedOrder.customer_name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3.5">
                <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">Total Tagihan</p>
                <p className="font-bold text-sm text-[#1A1D1B]">{formatRupiah(selectedOrder.total_price)}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Jumlah DP Diterima (Rp)</label>
              <input
                type="number"
                value={dpInput}
                onChange={e => setDpInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-[#607d6e]/30 focus:border-[#607d6e] outline-none text-lg font-extrabold text-[#1A1D1B]"
              />
              <p className="text-xs text-[#646A66] mt-2 font-medium">Default: 50% dari total tagihan</p>
            </div>

            <button
              onClick={handleConfirmDP}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
            >
              <CheckCircle2 size={18} /> {isUpdating ? 'Menyimpan...' : 'Konfirmasi DP Diterima'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
