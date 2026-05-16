import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, query, orderBy, onSnapshot, deleteDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import {
  TrendingDown, Plus, Trash2, Edit2, Calendar, FileText, DollarSign, Wallet
} from 'lucide-react';

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
  
  const [form, setForm] = useState({ 
    deskripsi: '', 
    jumlah: '', 
    kategori: 'Umum',
    tanggal: formatInputDate(new Date())
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
      deskripsi: '', 
      jumlah: '', 
      kategori: 'Umum',
      tanggal: formatInputDate(new Date()) 
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ 
      deskripsi: item.deskripsi || '', 
      jumlah: item.jumlah || '', 
      kategori: item.kategori || 'Umum',
      tanggal: formatInputDate(item.tanggal)
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.deskripsi.trim() || !form.jumlah) return;
    setSaving(true);
    try {
      const jumlahNum = Number(form.jumlah.toString().replace(/\D/g, ''));
      const tanggalDate = new Date(`${form.tanggal}T12:00:00`); // mid-day to avoid timezone shifting

      if (editItem) {
        await updateDoc(doc(db, 'pengeluaran', editItem.id), {
          deskripsi: form.deskripsi,
          jumlah: jumlahNum,
          kategori: form.kategori,
          tanggal: tanggalDate,
          updated_at: serverTimestamp()
        });
        setMsg('Data pengeluaran diperbarui!');
      } else {
        await addDoc(collection(db, 'pengeluaran'), {
          deskripsi: form.deskripsi,
          jumlah: jumlahNum,
          kategori: form.kategori,
          tanggal: tanggalDate,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
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
          <p className="text-[#646A66] font-medium mt-1">Catat dan pantau pengeluaran manual (Gaji, Listrik, dsb)</p>
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
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Deskripsi</th>
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Jumlah</th>
                  {canManage && <th className="text-right px-6 py-4 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {pengeluaran.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[#646A66] font-medium text-[13px]">
                        <Calendar size={14} className="text-[#94a3b8]" />
                        {formatDate(item.tanggal)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[#1A1D1B] font-bold text-[14px]">
                        {item.deskripsi}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                        {item.kategori || 'Umum'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-[#e05a5a] text-[14px]">
                      {formatRupiah(item.jumlah)}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
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
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Deskripsi *</label>
            <input
              type="text"
              value={form.deskripsi}
              onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
              required
              placeholder="misal: Bayar Listrik Bulan Ini"
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
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Jumlah (Rp) *</label>
            <input
              type="text"
              value={form.jumlah ? Number(form.jumlah).toLocaleString('id-ID') : ''}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                setForm(f => ({ ...f, jumlah: val }));
              }}
              required
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#e05a5a] outline-none text-sm font-bold text-[#e05a5a]"
            />
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#e05a5a] hover:bg-[#c94949] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#e05a5a]/20 disabled:opacity-50 mt-2"
          >
            {saving ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteItem} onClose={() => setDeleteItem(null)} title="Konfirmasi Hapus" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[#646A66] font-medium leading-relaxed">
            Apakah Anda yakin ingin menghapus pengeluaran <span className="font-bold text-[#1A1D1B]">"{deleteItem?.deskripsi}"</span>? Data yang dihapus tidak dapat dikembalikan.
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
