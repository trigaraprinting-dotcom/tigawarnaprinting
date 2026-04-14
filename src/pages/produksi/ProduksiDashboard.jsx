import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Printer, ChevronRight } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PRODUCTION_STATUSES = ['cetak', 'finishing', 'packing'];

const STATUS_NEXT = {
  cetak:     { next: 'finishing', label: 'Selesai Cetak → Finishing' },
  finishing: { next: 'packing',   label: 'Selesai Finishing → Packing' },
  packing:   { next: 'done',      label: 'Selesai Packing → Done ✓' },
};

export const ProduksiDashboard = () => {
  const { orders: allProductionOrders, loading } = useOrdersSnapshot({
    status: PRODUCTION_STATUSES,
  });
  const { changeStatus, isUpdating } = useOrderActions();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const grouped = {
    cetak:     allProductionOrders.filter(o => o.status === 'cetak'),
    finishing: allProductionOrders.filter(o => o.status === 'finishing'),
    packing:   allProductionOrders.filter(o => o.status === 'packing'),
  };

  const handleAdvance = async () => {
    if (!selectedOrder) return;
    const { next } = STATUS_NEXT[selectedOrder.status];
    await changeStatus(selectedOrder.id, next);
    setSelectedOrder(null);
  };

  const STATUS_LABELS = {
    cetak: { label: 'Proses Cetak', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    finishing: { label: 'Finishing', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    packing: { label: 'Packing', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Produksi</h2>
        <p className="text-[#646A66] font-medium mt-1">{allProductionOrders.length} pesanan sedang dalam proses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(grouped).map(([status, items]) => (
          <div key={status} className={`p-5 rounded-2xl border ${STATUS_LABELS[status].color}`}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2">{STATUS_LABELS[status].label}</p>
            <p className="text-4xl font-extrabold">{items.length}</p>
          </div>
        ))}
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([status, items]) => (
          <div key={status} className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className={`p-4 border-b flex items-center justify-between ${STATUS_LABELS[status].color.replace('border-', 'border-b-')}`}>
              <h3 className="font-extrabold text-[15px]">{STATUS_LABELS[status].label}</h3>
              <span className="text-xs font-bold bg-white/70 px-2.5 py-1 rounded-full">{items.length}</span>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Printer size={32} className="mx-auto opacity-30 mb-3" />
                  <p className="text-sm font-semibold">Tidak ada pekerjaan</p>
                </div>
              ) : items.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-slate-50 rounded-xl p-4 cursor-pointer hover:bg-slate-100 hover:shadow-sm transition-all border border-transparent hover:border-slate-200 group"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="font-extrabold text-[#1A1D1B] text-sm leading-tight">{order.customer_name}</p>
                    <ChevronRight size={16} className="text-slate-400 shrink-0 group-hover:text-[#607d6e] transition-colors mt-0.5" />
                  </div>
                  <p className="text-xs text-[#646A66] font-semibold truncate mb-2">{order.product_name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#646A66]">{order.quantity} {order.product_unit}</span>
                    <span className="text-xs font-bold text-[#1A1D1B]">{formatDate(order.created_at)}</span>
                  </div>
                  {order.notes && (
                    <div className="mt-2.5 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg leading-relaxed truncate">
                      📝 {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Update Progress Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['Produk', selectedOrder.product_name],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Status Sekarang', <StatusBadge status={selectedOrder.status} />],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-bold text-sm text-[#1A1D1B]">{val}</p>
                </div>
              ))}
            </div>
            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1">CATATAN</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}
            {STATUS_NEXT[selectedOrder.status] && (
              <button
                onClick={handleAdvance}
                disabled={isUpdating}
                className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} />
                {isUpdating ? 'Memperbarui...' : STATUS_NEXT[selectedOrder.status].label}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
