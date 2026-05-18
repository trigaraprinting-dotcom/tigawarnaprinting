import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, query, orderBy, onSnapshot, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import {
  TrendingDown, Plus, Trash2, Edit2, Calendar, FileText, DollarSign, Wallet, Eye, X, List, Building
} from 'lucide-react';
import clsx from 'clsx';

const formatRupiah = (val) => {
  if (!val || val === 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
};

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatInputDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const PengeluaranPage = () => {
  const { role } = useAuth();
  const [pengeluaran, setPengeluaran] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [viewItem, setViewItem] = useState(null);
  
  const [form, setForm] = useState({ 
    penerima: '', 
    catatan: '', 
    kategori: 'Umum',
    tanggal: formatInputDate(new Date()),
    items: [{ nama_barang: '', qty: 1, harga_satuan: '' }]
  });
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);

  const canManage = ['admin'].includes(role);

  useEffect(() => {
    const q = query(collection(db, 'pengeluaran'), orderBy('tanggal', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPengeluaran(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ 
      penerima: '', 
      catatan: '', 
      kategori: 'Umum',
      tanggal: formatInputDate(new Date()),
      items: [{ nama_barang: '', qty: 1, harga_satuan: '' }]
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    
    // Support backward compatibility
    let mappedItems = [];
    if (item.items && item.items.length > 0) {
      mappedItems = item.items.map(i => ({
        nama_barang: i.nama_barang || '',
        qty: i.qty || 1,
        harga_satuan: i.harga_satuan || 0
      }));
    } else {
      mappedItems = [{
        nama_barang: item.deskripsi || '',
        qty: 1,
        harga_satuan: item.jumlah || 0
      }];
    }

    setForm({ 
      penerima: item.penerima || '', 
      catatan: item.catatan || '', 
      kategori: item.kategori || 'Umum',
      tanggal: formatInputDate(item.tanggal),
      items: mappedItems
    });
    setShowModal(true);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...form.items];
    if (field === 'qty' || field === 'harga_satuan') {
        const val = value.replace(/\D/g, '');
        newItems[index][field] = val;
    } else {
        newItems[index][field] = value;
    }
    setForm(f => ({ ...f, items: newItems }));
  };

  const addItemRow = () => {
    setForm(f => ({ ...f, items: [...f.items, { nama_barang: '', qty: 1, harga_satuan: '' }] }));
  };

  const removeItemRow = (index) => {
    if (form.items.length <= 1) return;
    const newItems = [...form.items];
    newItems.splice(index, 1);
    setForm(f => ({ ...f, items: newItems }));
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      const q = Number(item.qty) || 0;
      const p = Number(item.harga_satuan) || 0;
      return sum + (q * p);
    }, 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.items.some(i => !i.nama_barang.trim() || !i.harga_satuan)) {
      alert("Pastikan semua barang memiliki nama dan harga satuan.");
      return;
    }
    
    setSaving(true);
    try {
      const tanggalDate = new Date(`${form.tanggal}T12:00:00`); 
      
      const cleanItems = form.items.map(i => ({
        nama_barang: i.nama_barang.trim(),
        qty: Number(i.qty) || 1,
        harga_satuan: Number(i.harga_satuan) || 0,
        subtotal: (Number(i.qty) || 1) * (Number(i.harga_satuan) || 0)
      }));

      const grandTotal = calculateTotal(form.items);

      const payload = {
        penerima: form.penerima,
        catatan: form.catatan,
        kategori: form.kategori,
        tanggal: tanggalDate,
        jumlah: grandTotal,
        items: cleanItems,
        updated_at: serverTimestamp()
      };

      // For backward compatibility, save first item as deskripsi if needed
      payload.deskripsi = cleanItems.map(i => i.nama_barang).join(', ');

      if (editItem) {
        await updateDoc(doc(db, 'pengeluaran', editItem.id), payload);
        setMsg('Data pengeluaran diperbarui!');
      } else {
        payload.created_at = serverTimestamp();
        await addDoc(collection(db, 'pengeluaran'), payload);
        setMsg('Pengeluaran ditambahkan!');
      }
      setShowModal(false);
    } catch (err) { setMsg('Error: ' + err.message); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const confirmDelete = (item) => {
    setDeleteItem(item);
  };

  const executeDelete = async () => {
    if (!deleteItem) return;
    try {
      await deleteDoc(doc(db, 'pengeluaran', deleteItem.id));
      setMsg(`Pengeluaran dihapus.`);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
    }
    setDeleteItem(null);
  };

  const totalPengeluaran = pengeluaran.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-2 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Pengeluaran Operasional</h2>
          <p className="text-[#646A66] font-medium mt-1">Catat dan pantau rincian pengeluaran per transaksi</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm font-semibold text-[#347B5A] bg-[#EAF4EF] px-3 py-2 rounded-xl">{msg}</span>}
          {canManage && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#e05a5a] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#e05a5a]/20 hover:bg-[#c94949] transition-all"
            >
              <Plus size={18} /> Tambah Pengeluaran
            </button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-[#e05a5a] to-[#c94949] rounded-[1.75rem] p-6 text-white relative overflow-hidden shadow-xl shadow-red-500/25 max-w-sm">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-white/80" />
            <p className="text-sm font-semibold text-white/80">Total Pengeluaran Manual</p>
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight">{formatRupiah(totalPengeluaran)}</h3>
          <p className="text-xs font-medium text-white/60 mt-2">
            Seluruh waktu pengeluaran tercatat
          </p>
        </div>
        <svg className="absolute bottom-0 right-0 w-48 h-32 stroke-white/10" fill="none" strokeWidth="4" strokeLinecap="round">
           <path d="M0,20 Q30,50 60,20 T120,20 T180,40" />
        </svg>
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-[#e05a5a] rounded-full animate-spin" />
          </div>
        ) : pengeluaran.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Wallet size={32} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-bold text-lg">Belum Ada Pengeluaran</p>
            <p className="text-slate-400 text-sm mt-1 text-center max-w-sm">
              Mulai catat pengeluaran operasional Anda dengan klik tombol Tambah Pengeluaran di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Tanggal</th>
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Kategori & Penerima</th>
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Rincian Barang</th>
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Total</th>
                  <th className="text-right px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pengeluaran.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4 align-top pt-5">
                      <div className="flex items-center gap-2 text-[#646A66] font-medium text-[13px]">
                        <Calendar size={14} className="text-[#94a3b8]" />
                        {formatDate(item.tanggal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 w-fit">
                          {item.kategori || 'Umum'}
                        </span>
                        {item.penerima && (
                          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1A1D1B]">
                             <Building size={12} className="text-slate-400"/> {item.penerima}
                          </div>
                        )}
                        {item.catatan && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-[200px]" title={item.catatan}>
                             "{item.catatan}"
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          {(item.items && item.items.length > 0) ? (
                            item.items.slice(0, 2).map((i, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[12px]">
                                 <span className="font-bold text-[#1A1D1B]">{i.qty}x</span>
                                 <span className="text-[#646A66] truncate max-w-[150px]" title={i.nama_barang}>{i.nama_barang}</span>
                              </div>
                            ))
                          ) : (
                             <div className="text-[12px] text-[#646A66] font-semibold max-w-[200px] truncate">{item.deskripsi}</div>
                          )}
                          {item.items && item.items.length > 2 && (
                             <div className="text-[10px] font-bold text-slate-400 mt-1">+{item.items.length - 2} barang lainnya</div>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-4 align-top pt-5 font-extrabold text-[#e05a5a] text-[14px]">
                      {formatRupiah(item.jumlah)}
                    </td>
                    <td className="px-6 py-4 text-right align-top pt-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setViewItem(item)}
                          className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(item)}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#646A66]"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => confirmDelete(item)}
                              className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'} size="md">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Tanggal *</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#e05a5a] outline-none text-sm font-semibold text-[#1A1D1B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Kategori</label>
              <select
                value={form.kategori}
                onChange={e => setForm(f => ({ ...f, kategori: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#e05a5a] outline-none text-sm font-semibold text-[#1A1D1B]"
              >
                <option value="Umum">Umum</option>
                <option value="Gaji Karyawan">Gaji Karyawan</option>
                <option value="Operasional (Listrik/Air)">Operasional (Listrik/Air)</option>
                <option value="Bahan Baku Tambahan">Bahan Baku Tambahan</option>
                <option value="Peralatan">Peralatan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Penerima / Toko / PIC</label>
              <input
                type="text"
                value={form.penerima}
                onChange={e => setForm(f => ({ ...f, penerima: e.target.value }))}
                placeholder="misal: Toko Sejahtera"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#e05a5a] outline-none text-sm font-semibold text-[#1A1D1B]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Catatan Tambahan</label>
              <input
                type="text"
                value={form.catatan}
                onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                placeholder="misal: Bon warna merah"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#e05a5a] outline-none text-sm font-semibold text-[#1A1D1B]"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
             <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider">Rincian Barang *</label>
                <button type="button" onClick={addItemRow} className="text-[11px] font-bold text-[#e05a5a] bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1">
                   <Plus size={12} /> Tambah Baris
                </button>
             </div>
             
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {form.items.map((item, idx) => (
                   <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 relative group">
                      <div className="flex-1">
                         <input
                           type="text"
                           value={item.nama_barang}
                           onChange={e => handleItemChange(idx, 'nama_barang', e.target.value)}
                           placeholder="Nama Barang / Keperluan"
                           required
                           className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none text-sm font-semibold text-[#1A1D1B] focus:border-[#e05a5a]"
                         />
                      </div>
                      <div className="w-full sm:w-20">
                         <input
                           type="text"
                           value={item.qty}
                           onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                           placeholder="Qty"
                           required
                           className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none text-sm font-semibold text-[#1A1D1B] focus:border-[#e05a5a] text-center"
                         />
                      </div>
                      <div className="w-full sm:w-36">
                         <input
                           type="text"
                           value={item.harga_satuan ? Number(item.harga_satuan).toLocaleString('id-ID') : ''}
                           onChange={e => handleItemChange(idx, 'harga_satuan', e.target.value)}
                           placeholder="Harga Satuan"
                           required
                           className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 outline-none text-sm font-bold text-[#e05a5a] focus:border-[#e05a5a]"
                         />
                      </div>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItemRow(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                           <X size={12} strokeWidth={3} />
                        </button>
                      )}
                   </div>
                ))}
             </div>
             
             <div className="flex items-center justify-between mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-[#646A66] uppercase tracking-wider">Total Pengeluaran</span>
                <span className="text-xl font-extrabold text-[#e05a5a]">{formatRupiah(calculateTotal(form.items))}</span>
             </div>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#e05a5a] hover:bg-[#c94949] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#e05a5a]/20 disabled:opacity-50 mt-2"
          >
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
          </button>
        </form>
      </Modal>
      
      {/* View Details Modal */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Detail Pengeluaran" size="md">
         {viewItem && (
            <div className="space-y-6">
               <div className="flex flex-wrap gap-4 bg-slate-50 p-4 rounded-xl">
                  <div className="flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                     <p className="text-[13px] font-bold text-[#1A1D1B]">{formatDate(viewItem.tanggal)}</p>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori</p>
                     <p className="text-[13px] font-bold text-[#1A1D1B]">{viewItem.kategori || 'Umum'}</p>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Penerima/PIC</p>
                     <p className="text-[13px] font-bold text-[#1A1D1B]">{viewItem.penerima || '-'}</p>
                  </div>
               </div>
               
               {viewItem.catatan && (
                  <div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Tambahan</p>
                     <p className="text-[13px] text-[#646A66] bg-slate-50 p-3 rounded-lg italic">"{viewItem.catatan}"</p>
                  </div>
               )}
               
               <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Rincian Barang / Keperluan</p>
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                     <table className="w-full text-left text-[12px]">
                        <thead className="bg-slate-50 text-slate-500">
                           <tr>
                              <th className="py-2.5 px-4 font-bold w-12 text-center">Qty</th>
                              <th className="py-2.5 px-4 font-bold">Nama Barang</th>
                              <th className="py-2.5 px-4 font-bold text-right">Harga</th>
                              <th className="py-2.5 px-4 font-bold text-right">Subtotal</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {viewItem.items && viewItem.items.length > 0 ? viewItem.items.map((i, idx) => (
                              <tr key={idx}>
                                 <td className="py-3 px-4 font-bold text-center text-[#1A1D1B]">{i.qty}</td>
                                 <td className="py-3 px-4 font-semibold text-[#646A66]">{i.nama_barang}</td>
                                 <td className="py-3 px-4 font-semibold text-[#646A66] text-right">{formatRupiah(i.harga_satuan)}</td>
                                 <td className="py-3 px-4 font-extrabold text-[#e05a5a] text-right">{formatRupiah((i.qty||1) * (i.harga_satuan||0))}</td>
                              </tr>
                           )) : (
                              <tr>
                                 <td className="py-3 px-4 font-bold text-center text-[#1A1D1B]">1</td>
                                 <td className="py-3 px-4 font-semibold text-[#646A66]">{viewItem.deskripsi}</td>
                                 <td className="py-3 px-4 font-semibold text-[#646A66] text-right">{formatRupiah(viewItem.jumlah)}</td>
                                 <td className="py-3 px-4 font-extrabold text-[#e05a5a] text-right">{formatRupiah(viewItem.jumlah)}</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
               
               <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[13px] font-bold text-[#1A1D1B] uppercase tracking-wider">Grand Total</span>
                  <span className="text-2xl font-black text-[#e05a5a]">{formatRupiah(viewItem.jumlah)}</span>
               </div>
               
               <div className="pt-2">
                  <button onClick={() => setViewItem(null)} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold rounded-xl transition-colors">Tutup Detail</button>
               </div>
            </div>
         )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Konfirmasi Hapus" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#646A66] font-medium leading-relaxed">
            Apakah Anda yakin ingin menghapus pengeluaran ini sebesar <span className="font-bold text-[#e05a5a]">{formatRupiah(deleteItem?.jumlah)}</span>? Data yang dihapus tidak dapat dikembalikan.
          </p>
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => setDeleteItem(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-[#1A1D1B] font-bold rounded-xl transition-colors text-sm">Batal</button>
            <button onClick={executeDelete} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors text-sm shadow-lg shadow-red-500/25">Hapus Pengeluaran</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
