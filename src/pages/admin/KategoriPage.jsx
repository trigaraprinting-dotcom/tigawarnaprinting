import React, { useEffect, useState } from 'react';
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteField, query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import {
  Package, Home, Zap, Layers, BookOpen, Sun, Box, Printer,
  Plus, Edit2, Trash2, ShieldOff, Tag, RefreshCw, Lock,
} from 'lucide-react';
import { seedDefaultCategories } from '../../utils/seedDummyData';

const ICON_MAP = { Package, Home, Zap, Layers, BookOpen, Sun, Box, Printer, Tag };

const COLOR_OPTIONS = [
  '#607d6e','#5b7fa6','#8b5cf6','#c2773a','#347B5A','#d4a017','#e05a5a','#1A1D1B','#6366f1','#ec4899',
];

export const KategoriPage = () => {
  const { role }   = useAuth();
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCat, setEditCat]   = useState(null);
  const [form, setForm]         = useState({ nama: '', slug: '', color: '#607d6e' });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  const canManage = ['admin', 'petugas_produksi'].includes(role);

  useEffect(() => {
    seedDefaultCategories().catch(console.error);
    const q = query(collection(db, 'kategori_produksi'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.is_default ? -1 : 1) - (b.is_default ? -1 : 1) || a.nama.localeCompare(b.nama));
      setCats(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openAdd = () => {
    setEditCat(null);
    setForm({ nama: '', slug: '', color: '#607d6e' });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditCat(cat);
    setForm({ nama: cat.nama, slug: cat.slug, color: cat.color || '#607d6e' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setSaving(true);
    try {
      const slug = form.slug || form.nama.toLowerCase().replace(/\s+/g, '_');
      if (editCat) {
        await updateDoc(doc(db, 'kategori_produksi', editCat.id), {
          nama: form.nama, slug, color: form.color,
        });
        setMsg('Kategori diperbarui!');
      } else {
        await setDoc(doc(db, 'kategori_produksi', slug), {
          nama: form.nama, slug, color: form.color, icon: 'Tag',
          is_default: false, created_at: new Date(),
        });
        setMsg('Kategori ditambahkan!');
      }
      setShowModal(false);
    } catch (err) { setMsg('Error: ' + err.message); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDelete = async (cat) => {
    if (cat.is_default) return;
    if (!window.confirm(`Hapus kategori "${cat.nama}"?`)) return;
    await updateDoc(doc(db, 'kategori_produksi', cat.id), { deleted: true });
    setMsg(`Kategori "${cat.nama}" dihapus.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const visibleCats = cats.filter(c => !c.deleted);

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-2 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Kategori Produksi</h2>
          <p className="text-[#646A66] font-medium mt-1">{visibleCats.length} kategori tersedia</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm font-semibold text-[#347B5A] bg-[#EAF4EF] px-3 py-2 rounded-xl">{msg}</span>}
          {canManage ? (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#607d6e] text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-[#607d6e]/20 hover:bg-[#526b5e] transition-all"
            >
              <Plus size={18} /> Tambah Kategori
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-100 text-slate-500 font-bold px-4 py-3 rounded-xl text-sm">
              <Lock size={15} /> Hanya Admin & Produksi
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleCats.map(cat => {
            const IconComp = ICON_MAP[cat.icon] || Tag;
            const isDefault = cat.is_default;
            return (
              <div
                key={cat.id}
                style={{ borderLeftColor: cat.color || '#607d6e' }}
                className={`relative group rounded-2xl p-6 flex flex-col items-start gap-4 border-l-4 transition-all hover:shadow-lg cursor-default ${isDefault ? 'bg-white' : 'bg-white border border-slate-100'}`}
              >
                <div
                  style={{ background: (cat.color || '#607d6e') + '20' }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                >
                  <IconComp size={22} style={{ color: cat.color || '#607d6e' }} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-extrabold text-lg text-[#1A1D1B] tracking-tight">{cat.nama}</p>
                  <p className="text-xs font-bold text-[#646A66] mt-0.5 uppercase tracking-wide">{cat.slug}</p>
                  {isDefault && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-extrabold text-[#607d6e] bg-[#EAF4EF] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Default
                    </span>
                  )}
                </div>

                {canManage && (
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(cat)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#646A66]"
                    >
                      <Edit2 size={13} />
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => handleDelete(cat)}
                        className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editCat ? 'Edit Kategori' : 'Tambah Kategori Baru'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Nama Kategori *</label>
            <input
              type="text"
              value={form.nama}
              onChange={e => setForm(f => ({
                ...f, nama: e.target.value,
                slug: e.target.value.toLowerCase().replace(/\s+/g, '_'),
              }))}
              required
              placeholder="misal: Spanduk"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] outline-none text-sm font-semibold text-[#1A1D1B]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">Slug (ID)</label>
            <input
              type="text"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
              placeholder="auto-generate dari nama"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] outline-none text-sm font-mono text-[#646A66]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-3">Warna</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  style={{ background: c }}
                  className={`w-8 h-8 rounded-xl transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-[#607d6e]' : 'hover:scale-110'}`}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : editCat ? 'Simpan Perubahan' : 'Tambah Kategori'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
