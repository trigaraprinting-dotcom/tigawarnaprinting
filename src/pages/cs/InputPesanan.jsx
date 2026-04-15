import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderActions } from '../../hooks/useOrders';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { ChevronLeft, Save } from 'lucide-react';

const EMPTY_ORDER = {
  customer_name: '',
  customer_phone: '',
  kategori_produk: '',
  product_name: '',
  harga_satuan: '',
  quantity: '',
  total_price: '',
  dp_amount: '',
  notes: '',
};

export const InputPesanan = () => {
  const navigate = useNavigate();
  const { addOrder, isUpdating } = useOrderActions();
  const [form, setForm] = useState(EMPTY_ORDER);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [addMsg, setAddMsg] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'kategori_produksi'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.is_default ? -1 : 1) - (b.is_default ? -1 : 1) || a.nama.localeCompare(b.nama));
      setCategories(data);
      setLoadingCats(false);
    });
    return unsub;
  }, []);

  const handleHargaOrQtyChange = (field, value) => {
    setForm(f => {
      const newForm = { ...f, [field]: value };
      const hargaNum = Number(newForm.harga_satuan) || 0;
      const qtyNum = Number(newForm.quantity) || 0;
      newForm.total_price = hargaNum * qtyNum || '';
      return newForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.product_name || !form.quantity || !form.kategori_produk) return;

    try {
      await addOrder({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        kategori_produk: form.kategori_produk,
        product_name: form.product_name,
        product_unit: 'pcs', // Defaulting to pcs, or text if needed
        quantity: Number(form.quantity),
        total_price: Number(form.total_price),
        dp_amount: form.dp_amount ? Number(form.dp_amount) : null,
        status: (Number(form.dp_amount) || 0) > 0 ? 'awaiting_dp' : 'pending',
        notes: form.notes,
        cs_email: 'cs@trigara.com',
      });
      setAddMsg('✓ Pesanan berhasil ditambahkan!');
      setTimeout(() => {
        navigate('/cs/dashboard');
      }, 1500);
    } catch (err) {
      setAddMsg('Error: ' + err.message);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto mb-10 pb-20 md:pb-0 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/cs/dashboard')}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#646A66] hover:bg-slate-50 hover:text-[#1A1D1B] shadow-sm transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Input Pesanan Baru</h2>
          <p className="text-[#646A66] font-medium mt-1">Isi formulir detail pesanan klien</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField label="Nama Klien *" value={form.customer_name} onChange={v => setForm(f => ({ ...f, customer_name: v }))} required />
            <FormField label="No. WhatsApp" type="tel" maxLength={13} value={form.customer_phone} onChange={v => setForm(f => ({ ...f, customer_phone: v.replace(/\D/g, '') }))} />
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-extrabold text-[#1A1D1B] uppercase tracking-widest mb-4">Detail Produk</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Kategori Produk *</label>
                <select
                  value={form.kategori_produk}
                  onChange={e => setForm(f => ({ ...f, kategori_produk: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {!loadingCats && categories.map(c => (
                    <option key={c.id} value={c.nama}>{c.nama}</option>
                  ))}
                </select>
              </div>
              <FormField label="Nama Produk *" placeholder="Misal: Spanduk Khusus Acara" value={form.product_name} onChange={v => setForm(f => ({ ...f, product_name: v }))} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <FormField label="Harga Satuan (Rp) *" type="number" value={form.harga_satuan} onChange={v => handleHargaOrQtyChange('harga_satuan', v)} required />
              <FormField label="Jumlah *" type="number" min="1" value={form.quantity} onChange={v => handleHargaOrQtyChange('quantity', v)} required />
              
              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Total Harga (Otomatis)</label>
                <div className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-transparent text-sm font-extrabold text-[#1A1D1B]">
                  {form.total_price ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(form.total_price) : 'Rp 0'}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-extrabold text-[#1A1D1B] uppercase tracking-widest mb-4">Pembayaran & Catatan</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <FormField label="Down Payment (DP) - Opsional" placeholder="Kosongkan jika tidak ada DP" type="number" value={form.dp_amount} onChange={v => setForm(f => ({ ...f, dp_amount: v }))} />
              
              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Catatan</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Instruksi khusus, deadline, dll..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] placeholder-slate-400 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {addMsg && (
            <div className={`text-sm font-bold px-4 py-3 rounded-xl text-center ${addMsg.startsWith('✓') ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-red-50 text-red-600'}`}>
              {addMsg}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50 text-[15px]"
            >
              <Save size={18} /> {isUpdating ? 'Menyimpan...' : 'Simpan Pesanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormField = ({ label, type = 'text', value, onChange, required, min, maxLength, placeholder }) => (
  <div>
    <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">{label}</label>
    <input
      type={type}
      value={value}
      min={min}
      maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white focus:ring-0 outline-none text-sm font-semibold text-[#1A1D1B] transition-all placeholder-slate-400"
    />
  </div>
);
