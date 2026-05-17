import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrderActions } from '../../hooks/useOrders';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { ChevronLeft, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EMPTY_ORDER = {
  customer_name: '',
  customer_phone: '',
  kategori_produk: '',
  product_name: '',
  product_jenis_ukuran: '',
  product_satuan: '',
  file_name: '',
  harga_satuan: '',
  quantity: '',
  panjang: '',
  lebar: '',
  ongkos_potong: '',
  needs_design: false,
  designer_email: '',
  design_price: '',
  total_price: '',
  dp_amount: '',
  notes: '',
};

export const EditPesanan = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { editOrder, isUpdating } = useOrderActions();
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_ORDER);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [addMsg, setAddMsg] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderSnap = await getDoc(doc(db, 'orders', id));
        if (orderSnap.exists()) {
          const data = orderSnap.data();
          setForm({
            ...EMPTY_ORDER,
            ...data,
            quantity: data.quantity || '',
            panjang: data.panjang || '',
            lebar: data.lebar || '',
            ongkos_potong: data.ongkos_potong || '',
            design_price: data.design_price || '',
            dp_amount: data.dp_amount || '',
            harga_satuan: data.product_sell_price || '',
          });
        } else {
          setAddMsg('Pesanan tidak ditemukan');
        }
      } catch (err) {
        console.error(err);
        setAddMsg('Gagal memuat pesanan');
      } finally {
        setLoadingOrder(false);
      }
    };
    if (id) fetchOrder();
  }, [id]);

  useEffect(() => {
    const qCat = query(collection(db, 'kategori_produksi'));
    const unsubCat = onSnapshot(qCat, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.is_default ? -1 : 1) - (b.is_default ? -1 : 1) || a.nama.localeCompare(b.nama));
      setCategories(data);
      setLoadingCats(false);
    });

    const qProd = query(collection(db, 'produk'));
    const unsubProd = onSnapshot(qProd, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);
      setProducts(data);
    });

    const qDes = query(collection(db, 'users'));
    const unsubDes = onSnapshot(qDes, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'desainer' && u.status !== 'inactive');
      setDesigners(data);
    });

    return () => {
      unsubCat();
      unsubProd();
      unsubDes();
    };
  }, []);

  const handleCategoryChange = (val) => {
    setForm(f => ({
      ...f,
      kategori_produk: val,
      product_name: '',
      harga_satuan: '',
      total_price: (f.needs_design ? (Number(f.design_price) || 0) : 0) || ''
    }));
  };

  /**
   * Formula baru:
   *   - Jika ada dimensi (panjang & lebar): luas × hargaDasar × qty
   *   - Jika tidak ada dimensi: hargaDasar × qty
   *   + ongkos_potong (opsional, hanya satuan Lembar)
   *   + design_price (jika butuh desain)
   */
  const calculateTotal = (newForm) => {
    const hargaDasarNum = Number(newForm.harga_satuan) || 0;
    const qtyNum = Number(newForm.quantity) || 0;
    const p = Number(newForm.panjang) || 0;
    const l = Number(newForm.lebar) || 0;
    const ongkosPotongNum = Number(newForm.ongkos_potong) || 0;
    const designPriceNum = newForm.needs_design ? (Number(newForm.design_price) || 0) : 0;

    let baseCost = 0;
    if (p > 0 && l > 0) {
      // Ada dimensi: luas × harga dasar × qty
      const luas = p * l;
      baseCost = luas * hargaDasarNum * qtyNum;
    } else {
      // Tidak ada dimensi (Pcs/Lembar/dll): harga dasar × qty
      baseCost = hargaDasarNum * qtyNum;
    }

    newForm.total_price = (baseCost + ongkosPotongNum + designPriceNum) || '';
    return newForm;
  };

  const handleProductChange = (val) => {
    const selectedProd = products.find(p => p.nama === val && p.kategori === form.kategori_produk);
    const harga = selectedProd ? selectedProd.harga_jual : '';
    const modal = selectedProd ? selectedProd.harga_asli : '';
    const jenis = selectedProd ? selectedProd.jenis_ukuran : '';
    const satuan = selectedProd ? selectedProd.satuan : '';

    setForm(f => calculateTotal({
      ...f,
      product_name: val,
      harga_satuan: harga,
      product_cost_per_unit: modal,
      product_jenis_ukuran: jenis,
      product_satuan: satuan,
      panjang: '',
      lebar: '',
      ongkos_potong: '',
    }));
  };

  const availableProducts = products.filter(p => p.kategori === form.kategori_produk);

  const needsDimensions = ['Meter (m)', 'Centimeter (cm)', 'Custom'].includes(form.product_jenis_ukuran);
  const dimUnit = form.product_jenis_ukuran === 'Centimeter (cm)' ? 'cm' : 'm';
  const isLembar = form.product_satuan === 'Lembar';

  // Derived values for display
  const p = Number(form.panjang) || 0;
  const l = Number(form.lebar) || 0;
  const luas = p > 0 && l > 0 ? p * l : 0;
  const keliling = p > 0 && l > 0 ? 2 * (p + l) : 0;

  const handleFieldChange = (field, value) => {
    setForm(f => calculateTotal({ ...f, [field]: value }));
  };

  const handleNeedsDesignChange = (checked) => {
    setForm(f => calculateTotal({ ...f, needs_design: checked, designer_email: '', design_price: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.product_name || !form.quantity || !form.kategori_produk) return;

    try {
      const selectedProd = products.find(p => p.nama === form.product_name && p.kategori === form.kategori_produk);
      const quantity = Number(form.quantity);

      const pVal = Number(form.panjang) || 0;
      const lVal = Number(form.lebar) || 0;
      const kelilingVal = pVal > 0 && lVal > 0 ? 2 * (pVal + lVal) : 0;
      const luasVal = pVal > 0 && lVal > 0 ? pVal * lVal : 0;

      const totalPrice = Number(form.total_price);
      const costPerUnit = Number(selectedProd?.harga_asli || form.product_cost_per_unit || 0);
      const profit = totalPrice - (costPerUnit * quantity);

      await editOrder(id, {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        kategori_produk: form.kategori_produk,
        product_name: form.product_name,
        product_id: selectedProd?.id || null,
        product_unit: selectedProd?.satuan || form.product_satuan || 'Pcs',
        product_cost_per_unit: costPerUnit,
        product_sell_price: Number(form.harga_satuan),
        quantity,
        panjang: form.panjang ? Number(form.panjang) : null,
        lebar: form.lebar ? Number(form.lebar) : null,
        luas: luasVal > 0 ? luasVal : null,
        keliling: kelilingVal > 0 ? kelilingVal : null,
        dimension_unit: needsDimensions
          ? (form.product_jenis_ukuran === 'Centimeter (cm)' ? 'cm' : 'm')
          : null,
        ongkos_potong: isLembar && form.ongkos_potong ? Number(form.ongkos_potong) : 0,
        needs_design: form.needs_design,
        designer_email: form.needs_design ? form.designer_email : null,
        design_price: form.needs_design ? Number(form.design_price || 0) : 0,
        total_price: totalPrice,
        profit: profit,
        dp_amount: form.dp_amount ? Number(form.dp_amount) : null,
        status: form.status === 'pending' || form.status === 'awaiting_dp' 
                ? ((Number(form.dp_amount) || 0) > 0 ? 'awaiting_dp' : 'pending')
                : form.status,
        notes: form.notes,
        cs_email: user?.email || 'Unknown',
      });
      setAddMsg('✓ Pesanan berhasil diperbarui!');
      setTimeout(() => {
        navigate('/cs/dashboard');
      }, 1500);
    } catch (err) {
      setAddMsg('Error: ' + err.message);
    }
  };

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto mb-10 pb-20 md:pb-0 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
          <ChevronLeft size={24} className="text-[#1A1D1B]" />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Edit Pesanan</h2>
          <p className="text-[#646A66] font-medium mt-1">Perbarui formulir detail pesanan klien</p>
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
                  onChange={e => handleCategoryChange(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {!loadingCats && categories.map(c => (
                    <option key={c.id} value={c.nama}>{c.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Nama Produk *</label>
                <select
                  value={form.product_name}
                  onChange={e => handleProductChange(e.target.value)}
                  required
                  disabled={!form.kategori_produk}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all disabled:opacity-50"
                >
                  <option value="">-- Pilih Produk --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.nama}>
                      {p.nama} {p.satuan && p.satuan !== '-' && p.satuan !== 'Pcs' ? `(${p.satuan})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dimensi: hanya tampil untuk produk berbasis ukuran */}
            {needsDimensions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <FormField label={`Panjang (${dimUnit})`} type="number" min="0" placeholder="Opsional" value={form.panjang} onChange={v => handleFieldChange('panjang', v)} />
                <FormField label={`Lebar (${dimUnit})`} type="number" min="0" placeholder="Opsional" value={form.lebar} onChange={v => handleFieldChange('lebar', v)} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <FormField label="Harga Dasar Barang (Rp) *" isPrice value={form.harga_satuan} onChange={v => handleFieldChange('harga_satuan', v)} required disabled />
              <FormField label="Jumlah Barang *" type="number" min="1" value={form.quantity} onChange={v => handleFieldChange('quantity', v)} required />
            </div>

            {/* Ongkos Potong: hanya tampil untuk satuan Lembar */}
            {isLembar && (
              <div className="mb-6">
                <FormField
                  label="Ongkos Potong (Rp) - Opsional"
                  isPrice
                  placeholder="Kosongkan jika tidak ada"
                  value={form.ongkos_potong}
                  onChange={v => handleFieldChange('ongkos_potong', v)}
                />
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  ✂️ Ditambahkan karena satuan produk adalah <span className="text-[#607d6e] font-bold">Lembar</span>
                </p>
              </div>
            )}

            <div className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={form.needs_design}
                  onChange={e => handleNeedsDesignChange(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-[#607d6e] focus:ring-[#607d6e]"
                />
                <span className="text-sm font-bold text-[#1A1D1B]">Pesanan Perlu Jasa Desain?</span>
              </label>

              {form.needs_design && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Pilih Desainer *</label>
                    <select
                      value={form.designer_email}
                      onChange={e => setForm(f => ({ ...f, designer_email: e.target.value }))}
                      required={form.needs_design}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-[#607d6e] focus:ring-0 outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
                    >
                      <option value="">-- Pilih Desainer --</option>
                      {designers.map(d => (
                        <option key={d.id} value={d.email}>{d.email}</option>
                      ))}
                    </select>
                  </div>
                  <FormField
                    label="Harga Jasa Desain (Rp)"
                    isPrice
                    placeholder="0"
                    value={form.design_price}
                    onChange={v => handleFieldChange('design_price', v)}
                    required={form.needs_design}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField label="Nama File Cetak (Opsional)" placeholder="Misal: banner_budi_FINAL.cdr" value={form.file_name} onChange={v => setForm(f => ({ ...f, file_name: v }))} />

              <div>
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Total Harga (Otomatis)</label>
                <div className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-transparent text-sm font-extrabold text-[#1A1D1B]">
                  {form.total_price ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(form.total_price) : 'Rp 0'}
                </div>

                {/* Rincian Perhitungan */}
                {form.total_price > 0 && (
                  <div className="mt-3 bg-white border border-slate-200 rounded-xl p-4 text-[12px] font-medium text-slate-600 space-y-2.5 shadow-sm">
                    <p className="font-extrabold text-[#1A1D1B] text-[11px] uppercase tracking-widest mb-1 border-b border-slate-100 pb-2">Rincian Perhitungan</p>

                    {/* Luas (jika ada dimensi) */}
                    {needsDimensions && luas > 0 && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Luas ({form.panjang} × {form.lebar} {dimUnit})</span>
                        <span className="font-bold text-slate-700">{luas} {dimUnit}²</span>
                      </div>
                    )}

                    {/* Keliling (info only, tidak pengaruh harga) */}
                    {needsDimensions && keliling > 0 && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="flex items-center gap-1">
                          Keliling (2 × ({form.panjang} + {form.lebar}))
                          <span className="text-[10px] bg-blue-50 text-blue-500 font-bold px-1.5 py-0.5 rounded-md ml-1">Info</span>
                        </span>
                        <span className="font-bold text-blue-600">{keliling} {dimUnit}</span>
                      </div>
                    )}

                    {/* Baris harga */}
                    <div className="flex justify-between items-center text-slate-500">
                      {needsDimensions && luas > 0 ? (
                        <>
                          <span>Harga (Luas × Harga Dasar × Jumlah)</span>
                          <span className="font-bold text-slate-700">
                            {luas} × Rp {(Number(form.harga_satuan) || 0).toLocaleString('id-ID')} × {form.quantity}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>Harga Dasar × Jumlah</span>
                          <span className="font-bold text-slate-700">
                            Rp {(Number(form.harga_satuan) || 0).toLocaleString('id-ID')} × {form.quantity}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Ongkos Potong */}
                    {isLembar && Number(form.ongkos_potong) > 0 && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Ongkos Potong ✂️</span>
                        <span className="font-bold text-slate-700">Rp {(Number(form.ongkos_potong) || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    {/* Biaya Desain */}
                    {form.needs_design && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Biaya Jasa Desain</span>
                        <span className="font-bold text-slate-700">Rp {(Number(form.design_price) || 0).toLocaleString('id-ID')}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-slate-100 text-[#1A1D1B] font-extrabold text-[13px]">
                      <span>Total Keseluruhan</span>
                      <span className="text-[#347B5A]">Rp {Number(form.total_price).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-extrabold text-[#1A1D1B] uppercase tracking-widest mb-4">Pembayaran & Catatan</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <FormField label="Down Payment (DP) - Opsional" placeholder="Kosongkan jika tidak ada DP" isPrice value={form.dp_amount} onChange={v => setForm(f => ({ ...f, dp_amount: v }))} />

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

const FormField = ({ label, type = 'text', value, onChange, required, min, maxLength, placeholder, isPrice, disabled }) => {
  const displayValue = isPrice && value ? Number(value).toLocaleString('id-ID') : value;

  return (
    <div>
      <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        {isPrice && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>}
        <input
          type={isPrice ? 'text' : type}
          step={type === 'number' && !isPrice ? "any" : undefined}
          value={displayValue}
          min={min}
          maxLength={maxLength}
          onChange={e => {
            if (isPrice) {
              const val = e.target.value.replace(/\D/g, '');
              onChange(val);
            } else {
              onChange(e.target.value);
            }
          }}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${isPrice ? 'pl-10 pr-4' : 'px-4'} py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#607d6e] focus:bg-white focus:ring-0 outline-none text-sm font-semibold text-[#1A1D1B] transition-all placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed`}
        />
      </div>
    </div>
  );
};
