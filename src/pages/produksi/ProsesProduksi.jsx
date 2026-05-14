import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Printer, Package, PackageCheck, CheckCircle2,
  ChevronRight, ArrowRight, Clock, PlusCircle
} from 'lucide-react';

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PRODUCTION_STATUSES = ['cetak', 'finishing', 'packing'];

// ── Alur status: cetak → finishing → packing → ready (kasir handles next) ───
const STATUS_NEXT = {
  cetak:     { next: 'finishing', label: 'Selesai Cetak → Finishing' },
  finishing: { next: 'packing',   label: 'Selesai Finishing → Packing' },
  packing:   { next: 'ready',     label: 'Selesai Packing → Siap Diambil' },
};

const COLUMN_CONFIG = {
  cetak: {
    label: 'Proses Cetak',
    icon: Printer,
    accent: 'text-cyan-600',
    bar: 'bg-cyan-400',
    headerBg: 'bg-cyan-50',
    headerBorder: 'border-cyan-100',
    badgeBg: 'bg-cyan-100 text-cyan-700',
    cardHover: 'hover:border-cyan-200',
    btnColor: 'bg-cyan-500 hover:bg-cyan-600 shadow-cyan-200',
    emptyColor: 'text-cyan-300',
    topBorder: 'bg-gradient-to-r from-cyan-400 to-cyan-300',
  },
  finishing: {
    label: 'Finishing',
    icon: Package,
    accent: 'text-indigo-600',
    bar: 'bg-indigo-400',
    headerBg: 'bg-indigo-50',
    headerBorder: 'border-indigo-100',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    cardHover: 'hover:border-indigo-200',
    btnColor: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200',
    emptyColor: 'text-indigo-300',
    topBorder: 'bg-gradient-to-r from-indigo-400 to-violet-300',
  },
  packing: {
    label: 'Packing',
    icon: PackageCheck,
    accent: 'text-orange-600',
    bar: 'bg-orange-400',
    headerBg: 'bg-orange-50',
    headerBorder: 'border-orange-100',
    badgeBg: 'bg-orange-100 text-orange-700',
    cardHover: 'hover:border-orange-200',
    btnColor: 'bg-[#3d6b5a] hover:bg-[#346050] shadow-[#3d6b5a]/30',
    emptyColor: 'text-orange-300',
    topBorder: 'bg-gradient-to-r from-orange-400 to-amber-300',
  },
};

export const ProsesProduksi = () => {
  const { orders: allProductionOrders, loading } = useOrdersSnapshot({
    status: PRODUCTION_STATUSES,
  });
  const { changeStatus, isUpdating } = useOrderActions();
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [successId, setSuccessId] = useState(null);

  const grouped = {
    cetak:     allProductionOrders.filter(o => o.status === 'cetak'),
    finishing: allProductionOrders.filter(o => o.status === 'finishing'),
    packing:   allProductionOrders.filter(o => o.status === 'packing'),
  };

  const handleAdvance = async (overrideNext) => {
    if (!selectedOrder) return;
    const nextStatus = overrideNext || STATUS_NEXT[selectedOrder.status].next;
    const updateData = {
      operator_id: user?.uid || 'unknown_id',
      operator_email: user?.email || 'unknown_email',
    };
    if (selectedOrder.status === 'cetak') {
      updateData.cetak_by = user?.email || 'Unknown';
      updateData.cetak_at = new Date();
    }
    if (selectedOrder.status === 'finishing') {
      updateData.finishing_by = user?.email || 'Unknown';
      updateData.finishing_at = new Date();
    }
    if (selectedOrder.status === 'packing') {
      updateData.packing_by = user?.email || 'Unknown';
      updateData.packing_at = new Date();
    }

    setSuccessId(selectedOrder.id);
    await changeStatus(selectedOrder.id, nextStatus, updateData);
    setSelectedOrder(null);
    setTimeout(() => setSuccessId(null), 1500);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#3d6b5a] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Proses Produksi</h2>
          <p className="text-[#646A66] font-semibold mt-1 text-sm">
            {allProductionOrders.length} pesanan dalam antrian produksi
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(grouped).map(([status, items]) => {
            const cfg = COLUMN_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <div key={status} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-100 shadow-sm">
                <Icon size={14} className={cfg.accent} strokeWidth={2.5} />
                <span className="text-[12px] font-bold text-[#1A1D1B]">{items.length}</span>
                <span className="text-[11px] font-semibold text-slate-400">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alur badge */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {['Cetak', 'Finishing', 'Packing', 'Siap Diambil (Kasir)', 'Selesai'].map((step, i, arr) => (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap border ${
              i === arr.length - 1
                ? 'bg-[#EAF4EF] text-[#347B5A] border-[#347B5A]/20'
                : i === arr.length - 2
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-slate-500 border-slate-200'
            }`}>
              {i === arr.length - 1 && <CheckCircle2 size={11} />}
              {step}
            </div>
            {i < arr.length - 1 && <ArrowRight size={14} className="text-slate-300 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Kanban Board — 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([status, items]) => {
          const cfg = COLUMN_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div key={status} className="flex flex-col bg-white rounded-[2rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] overflow-hidden border border-slate-50">

              {/* Column Header */}
              <div className={`p-5 border-b ${cfg.headerBg} ${cfg.headerBorder}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.headerBg}`}>
                      <Icon size={18} className={cfg.accent} strokeWidth={2.5} />
                    </div>
                    <h3 className={`font-extrabold text-[14px] ${cfg.accent}`}>{cfg.label}</h3>
                  </div>
                  <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${cfg.badgeBg}`}>
                    {items.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cfg.topBorder} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, (items.length / Math.max(1, allProductionOrders.length)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[480px] hide-scrollbar">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <Icon size={32} className={`${cfg.emptyColor} mb-3`} strokeWidth={1.5} />
                    <p className="text-[13px] font-bold text-slate-400">Tidak ada pekerjaan</p>
                    <p className="text-[11px] font-semibold text-slate-300 mt-1">Kolom ini kosong</p>
                  </div>
                ) : items.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`relative bg-white rounded-2xl p-4 cursor-pointer border border-slate-100 ${cfg.cardHover} hover:shadow-lg hover:-translate-y-0.5 transition-all group ${successId === order.id ? 'opacity-50 scale-95' : ''}`}
                  >
                    {/* Top accent bar */}
                    <div className={`absolute top-0 left-4 right-4 h-[3px] ${cfg.bar} rounded-b-full opacity-60 group-hover:opacity-100 transition-opacity`} />

                    <div className="flex items-start justify-between gap-2 mb-3 mt-1">
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#1A1D1B] text-[13px] leading-tight truncate">{order.customer_name}</p>
                        <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">{order.product_name}</p>
                      </div>
                      <ChevronRight size={15} className="text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors mt-0.5" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={11} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold">{formatDate(order.created_at)}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${cfg.badgeBg}`}>
                        {order.quantity} {order.product_unit}
                      </span>
                    </div>

                    {order.notes && (
                      <div className="mt-3 bg-amber-50 text-amber-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg leading-relaxed line-clamp-2">
                        📝 {order.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Column Footer */}
              {items.length > 0 && (
                <div className={`px-4 py-3 border-t ${cfg.headerBorder} ${cfg.headerBg}`}>
                  <p className="text-[10px] font-bold text-slate-400 text-center">
                    {status === 'packing' ? 'Selesai packing → dikirim ke Kasir' : 'Klik order untuk update status'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Update Progress Pesanan" size="md">
        {selectedOrder && (() => {
          const cfg = COLUMN_CONFIG[selectedOrder.status];
          const Icon = cfg?.icon || Printer;
          const isPacking = selectedOrder.status === 'packing';

          return (
            <div className="space-y-5">
              {/* Order Info */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl ${cfg?.headerBg} border ${cfg?.headerBorder}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white">
                  <Icon size={18} className={cfg?.accent} strokeWidth={2.5} />
                </div>
                <div>
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest ${cfg?.accent}`}>
                    {cfg?.label}
                  </p>
                  <p className="text-[14px] font-extrabold text-[#1A1D1B]">{selectedOrder.customer_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Produk', selectedOrder.product_name],
                  ['Nama File', selectedOrder.file_name || '-'],
                  ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                  ['Tgl Masuk', formatDate(selectedOrder.created_at)],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold text-[#646A66] uppercase tracking-widest mb-1">{label}</p>
                    <p className="font-extrabold text-[13px] text-[#1A1D1B]">{val}</p>
                  </div>
                ))}
              </div>



              {selectedOrder.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 mb-1">CATATAN</p>
                  <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Alert khusus untuk packing → siap diambil (ke kasir) */}
              {isPacking && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-extrabold text-[#1A1D1B] mb-0.5">Selesai Packing</p>
                    <p className="text-[11px] font-semibold text-amber-700">
                      Order akan berpindah ke status <strong>Siap Diambil</strong> dan masuk antrian Kasir untuk pelunasan akhir.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress flow indicator */}
              {STATUS_NEXT[selectedOrder.status] && (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="flex items-center justify-center gap-3">
                    <div className={`px-4 py-2 rounded-xl ${cfg?.badgeBg} text-[12px] font-extrabold`}>
                      {cfg?.label}
                    </div>
                    <ArrowRight size={18} className="text-slate-300" />
                    <div className={`px-4 py-2 rounded-xl text-[12px] font-extrabold ${
                      isPacking ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isPacking ? 'Siap Diambil (→ Kasir)' : (COLUMN_CONFIG[STATUS_NEXT[selectedOrder.status].next]?.label || STATUS_NEXT[selectedOrder.status].next)}
                    </div>
                  </div>
                  {selectedOrder.status === 'cetak' && (
                    <p className="text-[11px] font-semibold text-slate-400">Atau langsung ke Packing (lewati finishing).</p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-5 py-3 bg-slate-100 text-[#1A1D1B] font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors w-full sm:w-auto"
                >
                  Batal
                </button>
                
                {selectedOrder.status === 'cetak' ? (
                  <div className="flex flex-1 gap-2">
                    <button
                      onClick={() => handleAdvance('packing')}
                      disabled={isUpdating}
                      className="flex-1 text-white text-xs sm:text-sm font-semibold py-3 rounded-xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                    >
                      {isUpdating ? '...' : (
                        <>
                          <PackageCheck size={16} />
                          Langsung Packing
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAdvance('finishing')}
                      disabled={isUpdating}
                      className={`flex-1 text-white text-xs sm:text-sm font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 ${cfg?.btnColor}`}
                    >
                      {isUpdating ? '...' : (
                        <>
                          <CheckCircle2 size={16} />
                          Lanjut Finishing
                        </>
                      )}
                    </button>
                  </div>
                ) : STATUS_NEXT[selectedOrder.status] && (
                  <button
                    onClick={() => handleAdvance()}
                    disabled={isUpdating}
                    className={`flex-1 text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${cfg?.btnColor}`}
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memperbarui...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        {STATUS_NEXT[selectedOrder.status].label}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
