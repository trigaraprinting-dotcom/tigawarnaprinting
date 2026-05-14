import React, { useEffect, useState } from 'react';
import {
  collection, doc, setDoc, updateDoc, query, onSnapshot, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { Plus, Edit2, Trash2, Package, Tag, Box, Search } from 'lucide-react';

export const ProdukPage = () => {
  const { role } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    nama: '',
    kategori: '',
    satuan: '',
    harga_asli: '',
    harga_jual: '',
    harga_jual: '',
    jenis_ukuran: '',
    satuan: ''
  });

  const canManage = ['admin'].includes(role);

  // Fetch Kategori & Produk
  useEffect(() => {
    // Fetch categories
    const qCat = query(collection(db, 'kategori_produksi'));
    const unsubCat = onSnapshot(qCat, snap => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => !c.deleted);
      cats.sort((a, b) => a.nama.localeCompare(b.nama));
      setCategories(cats);
    });

    // Fetch products
    const qProd = query(collection(db, 'produk'));
    const unsubProd = onSnapshot(qProd, snap => {
      const prods = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);
      prods.sort((a, b) => b.created_at?.toMillis() - a.created_at?.toMillis() || 0);
      setProducts(prods);
      setLoading(false);
    });

    return () => {
      unsubCat();
      unsubProd();
    };
  }, []);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ nama: '', kategori: '', satuan: '', harga_asli: '', harga_jual: '', jenis_ukuran: '' });
    setShowModal(true);
  };

  const openEdit = (prod) => {
    setEditProduct(prod);
    setForm({
      nama: prod.nama || '',
      kategori: prod.kategori || '',
      satuan: prod.satuan || '',
      harga_asli: prod.harga_asli || '',
      harga_jual: prod.harga_jual || '',
      harga_jual: prod.harga_jual || '',
      jenis_ukuran: prod.jenis_ukuran || '',
      satuan: prod.satuan || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama || !form.kategori || !form.harga_asli || !form.harga_jual) return;
    setSaving(true);
    
    try {
      const h_asli = Number(form.harga_asli);
      const h_jual = Number(form.harga_jual);
      const profit = h_jual - h_asli;

      const dataToSave = {
        nama: form.nama,
        kategori: form.kategori,
        satuan: form.satuan || 'Pcs',
        harga_asli: h_asli,
        harga_jual: h_jual,
        jenis_ukuran: form.jenis_ukuran || '',
        profit: profit,
        updated_at: new Date()
      };

      if (editProduct) {
        await updateDoc(doc(db, 'produk', editProduct.id), dataToSave);
        setMsg('Data barang diperbarui!');
      } else {
        const newRef = doc(collection(db, 'produk'));
        await setDoc(newRef, {
          ...dataToSave,
          created_at: new Date(),
          deleted: false
        });
        setMsg('Barang berhasil ditambahkan!');
      }
      setShowModal(false);
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (prod) => {
    if (!window.confirm(`Hapus barang "${prod.nama}"?`)) return;
    try {
      await updateDoc(doc(db, 'produk', prod.id), { deleted: true });
      setMsg(`Barang "${prod.nama}" dihapus.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.kategori?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-2 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Data Barang / Produk</h2>
          <p className="text-[#646A66] font-medium mt-1">Kelola harga asli, harga jual, dan profit</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {msg && <span className="text-sm font-semibold text-[#347B5A] bg-[#EAF4EF] px-3 py-2 rounded-xl whitespace-nowrap">{msg}</span>}
          
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari barang..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 focus:border-[#607d6e] outline-none text-sm transition-all"
            />
          </div>

          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#607d6e] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#607d6e]/20 hover:bg-[#526b5e] transition-all shrink-0"
            >
              <Plus size={18} /> Tambah Barang
            </button>
          )}
        </div>
      </div>

      {/* Grid or Table List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <Box className="mx-auto h-16 w-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Belum ada barang</h3>
          <p className="text-slate-500 mt-2">Tambahkan barang untuk memantau profit penjualan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100/80">
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Nama Barang</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider text-right">Harga Asli (Modal)</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider text-right">Harga Jual</th>
                  <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider text-right">Profit</th>
                  {canManage && <th className="px-6 py-4 text-xs font-extrabold text-[#646A66] uppercase tracking-wider text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-[#1A1D1B]">
                        {p.nama} {p.jenis_ukuran && p.jenis_ukuran !== '-' ? (
                          <span className="text-slate-400 font-semibold ml-1">
                            ({p.jenis_ukuran})
                          </span>
                        ) : ''}
                        {p.satuan && p.satuan !== '-' ? (
                          <span className="text-slate-400 font-semibold ml-1">
                            / {p.satuan}
                          </span>
                        ) : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#607d6e] bg-[#EAF4EF] px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        <Tag size={12} /> {p.kategori}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-500">
                      Rp {p.harga_asli?.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#1A1D1B]">
                      Rp {p.harga_jual?.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-extrabold ${p.profit > 0 ? 'text-[#347B5A]' : 'text-red-500'}`}>
                        + Rp {p.profit?.toLocaleString('id-ID')}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#646A66] transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(p)} className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Edit Data Barang' : 'Tambah Barang Baru'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Nama Barang / Produk *</label>
              <input
                type="text"
                value={form.nama}
                onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                required
                placeholder="misal: Spanduk Vinyl"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Kategori *</label>
              <select
                value={form.kategori}
                onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.nama}>{c.nama}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Jenis Ukuran *</label>
              <select
                value={form.jenis_ukuran}
                onChange={e => {
                  const val = e.target.value;
                  let newSatuan = form.satuan;
                  if (val === 'Meter (m)') newSatuan = 'm2';
                  else if (val === 'Centimeter (cm)') newSatuan = 'cm2';
                  else if (val === 'Satuan / Pcs') newSatuan = 'Pcs';
                  else if (val === 'Box') newSatuan = 'Box';
                  else if (val === 'Lembar') newSatuan = 'Lembar';
                  else if (val === 'Rim') newSatuan = 'Rim';
                  
                  setForm(f => ({ ...f, jenis_ukuran: val, satuan: newSatuan }));
                }}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
              >
                <option value="">-- Pilih Jenis --</option>
                <option value="Meter (m)">Meter (m)</option>
                <option value="Centimeter (cm)">Centimeter (cm)</option>
                <option value="Satuan / Pcs">Satuan / Pcs</option>
                <option value="Box">Box</option>
                <option value="Lembar">Lembar</option>
                <option value="Rim">Rim</option>
                <option value="Custom">Custom / Lainnya</option>
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Satuan Jual *</label>
              <input
                type="text"
                value={form.satuan}
                onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                required
                placeholder="misal: m2, Pcs, Box"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Harga Asli (Modal) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={form.harga_asli ? Number(form.harga_asli).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, harga_asli: val }));
                  }}
                  required
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Harga Jual *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={form.harga_jual ? Number(form.harga_jual).toLocaleString('id-ID') : ''}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(f => ({ ...f, harga_jual: val }));
                  }}
                  required
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white outline-none text-sm font-bold text-[#1A1D1B] transition-all"
                />
              </div>
            </div>
            
            <div className="sm:col-span-2 pt-2">
              <div className="bg-[#EAF4EF] rounded-xl p-4 flex items-center justify-between border border-[#347B5A]/20">
                <span className="text-sm font-bold text-[#1A1D1B]">Estimasi Profit / Satuan</span>
                <span className="text-lg font-extrabold text-[#347B5A]">
                  Rp {(Number(form.harga_jual || 0) - Number(form.harga_asli || 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : editProduct ? 'Simpan Perubahan' : 'Tambah Barang'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
