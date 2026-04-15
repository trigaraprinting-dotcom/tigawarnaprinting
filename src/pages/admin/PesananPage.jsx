import React, { useState, useMemo } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { ORDER_STATUS } from '../../firebase/firestore';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, RefreshCw, Inbox } from 'lucide-react';
import { seedDummyData } from '../../utils/seedDummyData';

const STATUS_FLOW = {
  pending:      { next: 'validated',    label: 'Validasi Pesanan' },
  validated:    { next: 'dp_confirmed', label: 'Konfirmasi DP' },
  dp_confirmed: { next: 'cetak',        label: 'Mulai Cetak' },
  cetak:        { next: 'finishing',    label: 'Ke Finishing' },
  finishing:    { next: 'packing',      label: 'Ke Packing' },
  packing:      { next: 'done',         label: 'Selesai' },
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

export const PesananPage = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const { changeStatus, isUpdating } = useOrderActions();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !search ||
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filterStatus || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedDummyData();
      setSeedMsg(`${count} pesanan dummy ditambahkan!`);
      setTimeout(() => setSeedMsg(''), 4000);
    } catch (e) { setSeedMsg('Gagal: ' + e.message); }
    setSeeding(false);
  };

  const handleNextStatus = async (order) => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    await changeStatus(order.id, flow.next);
    setSelectedOrder(prev => prev ? { ...prev, status: flow.next } : null);
  };

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Daftar Pesanan</h2>
          <p className="text-[#646A66] font-medium mt-1">{filtered.length} pesanan ditemukan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-4 sm:p-5 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama klien atau produk..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:ring-0 outline-none text-sm font-medium text-[#1A1D1B] placeholder-slate-400 transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:ring-0 outline-none text-sm font-bold text-[#1A1D1B] transition-all appearance-none cursor-pointer w-full sm:w-auto"
          >
            <option value="">Semua Status</option>
            {Object.entries(ORDER_STATUS).map(([k, v]) => (
              <option key={k} value={v}>{v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="font-bold text-lg text-[#1A1D1B]">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">#</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Klien</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Produk</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Tanggal</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4 text-[#646A66] font-semibold">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1A1D1B]">{order.customer_name}</p>
                      <p className="text-xs text-[#646A66] mt-0.5">{order.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1A1D1B] max-w-[180px] truncate">{order.product_name}</p>
                      <p className="text-xs text-[#646A66] mt-0.5">{order.quantity} {order.product_unit}</p>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-[#1A1D1B]">{formatRupiah(order.total_price)}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-4 text-[#646A66] font-medium">{formatDate(order.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1.5 text-[#607d6e] font-bold text-xs bg-[#EAF4EF] px-3 py-2 rounded-xl hover:bg-[#d4eadf] transition-all"
                      >
                        <Eye size={14} /> Detail
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
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Detail Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Klien" value={selectedOrder.customer_name} />
              <InfoRow label="No. HP" value={selectedOrder.customer_phone || '-'} />
              <InfoRow label="Produk" value={selectedOrder.product_name} />
              <InfoRow label="Qty" value={`${selectedOrder.quantity} ${selectedOrder.product_unit}`} />
              <InfoRow label="Total Harga" value={formatRupiah(selectedOrder.total_price)} highlight />
              <InfoRow label="DP" value={selectedOrder.dp_amount ? formatRupiah(selectedOrder.dp_amount) : 'Belum ada'} />
              <InfoRow label="Tanggal Masuk" value={formatDate(selectedOrder.created_at)} />
              <InfoRow label="Status" value={<StatusBadge status={selectedOrder.status} />} />
            </div>

            {selectedOrder.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wider">Catatan</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}

            {STATUS_FLOW[selectedOrder.status] && (
              <button
                onClick={() => handleNextStatus(selectedOrder)}
                disabled={isUpdating}
                className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
              >
                {isUpdating ? 'Memperbarui...' : `✓ ${STATUS_FLOW[selectedOrder.status].label}`}
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const InfoRow = ({ label, value, highlight }) => (
  <div className="bg-slate-50 rounded-xl p-3.5">
    <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider mb-1">{label}</p>
    <p className={`font-bold text-sm ${highlight ? 'text-[#607d6e] text-base' : 'text-[#1A1D1B]'}`}>{value}</p>
  </div>
);
