import React, { useState } from 'react';
import { useOrdersSnapshot, useOrderActions } from '../../hooks/useOrders';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { Eye, PlusCircle, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAGE_SIZE = 10;

const PRODUCTS = [
  { name: 'Cetak Buku A5 Full Color', unit: 'eksemplar', basePrice: 25000 },
  { name: 'Banner Vinyl 4x2m', unit: 'pcs', basePrice: 180000 },
  { name: 'Kartu Nama Premium', unit: 'kotak', basePrice: 45000 },
  { name: 'Undangan Pernikahan', unit: 'lembar', basePrice: 3500 },
  { name: 'Nota Custom 3 Ply', unit: 'buku', basePrice: 35000 },
  { name: 'Cetak Foto 4R', unit: 'lembar', basePrice: 2500 },
  { name: 'Stiker Cutting Vinyl', unit: 'set', basePrice: 75000 },
  { name: 'Brosur A4 2 Sisi', unit: 'lembar', basePrice: 1500 },
  { name: 'Roll Up Banner 160x60', unit: 'pcs', basePrice: 350000 },
  { name: 'Mug Print Custom', unit: 'pcs', basePrice: 55000 },
  { name: 'Kaos Sablon DTF', unit: 'pcs', basePrice: 85000 },
  { name: 'Backdrop Foto 3x2m', unit: 'pcs', basePrice: 250000 },
];

const EMPTY_ORDER = {
  customer_name: '',
  customer_phone: '',
  product_name: '',
  product_unit: '',
  quantity: '',
  total_price: '',
  dp_amount: '',
  notes: '',
};

export const CSDashboard = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const { addOrder, isUpdating } = useOrderActions();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState(EMPTY_ORDER);
  const [addMsg, setAddMsg] = useState('');

  // Filtered + paginated
  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.product_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Auto-calculate total when product or quantity changes
  const handleProductChange = (productName) => {
    const product = PRODUCTS.find(p => p.name === productName);
    const qty = Number(form.quantity) || 0;
    const total = product ? product.basePrice * qty : 0;
    setForm(f => ({
      ...f,
      product_name: productName,
      product_unit: product?.unit || '',
      total_price: total || '',
    }));
  };

  const handleQtyChange = (qty) => {
    const product = PRODUCTS.find(p => p.name === form.product_name);
    const total = product ? product.basePrice * Number(qty) : 0;
    setForm(f => ({ ...f, quantity: qty, total_price: total || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.product_name || !form.quantity) return;

    try {
      await addOrder({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        product_name: form.product_name,
        product_unit: form.product_unit,
        quantity: Number(form.quantity),
        total_price: Number(form.total_price),
        dp_amount: form.dp_amount ? Number(form.dp_amount) : null,
        notes: form.notes,
        cs_email: 'cs@trigara.com',
      });
      setAddMsg('✓ Pesanan berhasil ditambahkan!');
      setForm(EMPTY_ORDER);
      setTimeout(() => {
        setAddMsg('');
        setShowAddModal(false);
      }, 1500);
    } catch (err) {
      setAddMsg('Error: ' + err.message);
    }
  };

  const statuses = ['', 'pending', 'validated', 'dp_confirmed', 'cetak', 'finishing', 'packing', 'done'];

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Customer Service</h2>
          <p className="text-[#646A66] font-medium mt-1">{filtered.length} pesanan aktif</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#607d6e] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#607d6e]/20 hover:bg-[#526b5e] transition-all self-start sm:self-auto"
        >
          <PlusCircle size={18} /> Tambah Pesanan
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: orders.length, color: 'text-[#1A1D1B]' },
          { label: 'Menunggu', count: orders.filter(o => o.status === 'pending').length, color: 'text-amber-600' },
          { label: 'Proses', count: orders.filter(o => ['validated', 'dp_confirmed', 'cetak', 'finishing', 'packing'].includes(o.status)).length, color: 'text-blue-600' },
          { label: 'Selesai', count: orders.filter(o => o.status === 'done').length, color: 'text-[#347B5A]' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
            <p className="text-xs font-bold text-[#646A66] uppercase tracking-wider">{s.label}</p>
            <p className={`text-3xl font-extrabold mt-2 ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari klien atau produk..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:ring-0 outline-none text-sm font-medium text-[#1A1D1B] placeholder-slate-400"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="pl-10 pr-8 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:ring-0 outline-none text-sm font-bold text-[#1A1D1B] appearance-none cursor-pointer w-full sm:w-auto"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s ? s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Semua Status'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-bold text-lg text-[#1A1D1B]">Belum ada pesanan</p>
            <p className="text-sm text-[#646A66] mt-1">Klik "Tambah Pesanan" untuk memulai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Klien', 'Produk', 'Total', 'Status', 'Masuk', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((order, idx) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-[#646A66] font-semibold">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1A1D1B]">{order.customer_name}</p>
                      <p className="text-xs text-[#646A66]">{order.customer_phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#1A1D1B] max-w-[180px] truncate">{order.product_name}</p>
                      <p className="text-xs text-[#646A66]">{order.quantity} {order.product_unit}</p>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-[#1A1D1B]">{formatRupiah(order.total_price)}</td>
                    <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                    <td className="px-6 py-4 text-[#646A66] font-medium text-xs">{formatDate(order.created_at)}</td>
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

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm font-semibold text-[#646A66]">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-[#1A1D1B] px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setForm(EMPTY_ORDER); setAddMsg(''); }} title="Tambah Pesanan Baru" size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nama Klien *" value={form.customer_name} onChange={v => setForm(f => ({ ...f, customer_name: v }))} required />
            <FormField label="No. WhatsApp" type="tel" value={form.customer_phone} onChange={v => setForm(f => ({ ...f, customer_phone: v }))} />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Produk *</label>
            <select
              value={form.product_name}
              onChange={e => handleProductChange(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B]"
            >
              <option value="">-- Pilih Produk --</option>
              {PRODUCTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label={`Jumlah${form.product_unit ? ` (${form.product_unit})` : ''} *`} type="number" min="1" value={form.quantity} onChange={handleQtyChange} required />
            <FormField label="Total Harga (Rp)" type="number" value={form.total_price} onChange={v => setForm(f => ({ ...f, total_price: v }))} />
            <FormField label="DP (Rp)" type="number" value={form.dp_amount} onChange={v => setForm(f => ({ ...f, dp_amount: v }))} />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Catatan</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Instruksi khusus, deadline, dll..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] placeholder-slate-400 resize-none"
            />
          </div>

          {addMsg && (
            <div className={`text-sm font-bold px-4 py-3 rounded-xl text-center ${addMsg.startsWith('✓') ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-red-50 text-red-600'}`}>
              {addMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50 text-[15px]"
          >
            {isUpdating ? 'Menyimpan...' : '+ Tambah Pesanan'}
          </button>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Detail Pesanan" size="md">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Klien', selectedOrder.customer_name],
                ['No. HP', selectedOrder.customer_phone || '-'],
                ['Produk', selectedOrder.product_name],
                ['Jumlah', `${selectedOrder.quantity} ${selectedOrder.product_unit}`],
                ['Total', formatRupiah(selectedOrder.total_price)],
                ['DP', selectedOrder.dp_amount ? formatRupiah(selectedOrder.dp_amount) : 'Belum ada'],
                ['Tanggal', formatDate(selectedOrder.created_at)],
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
                <p className="text-xs font-bold text-amber-700 mb-1 uppercase">Catatan</p>
                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const FormField = ({ label, type = 'text', value, onChange, required, min }) => (
  <div>
    <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">{label}</label>
    <input
      type={type}
      value={value}
      min={min}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white focus:ring-0 outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
    />
  </div>
);
