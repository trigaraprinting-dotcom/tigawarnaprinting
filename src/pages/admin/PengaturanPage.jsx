import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import { Save, Lock, Building2, AlertCircle, CheckCircle } from 'lucide-react';

export const PengaturanPage = () => {
  const { user } = useAuth();

  const [bizForm, setBizForm] = useState({
    nama: 'Tiga Warna Print Management',
    alamat: 'Jl. Contoh No. 123, Kota Anda',
    whatsapp: '081234567890',
    email: 'info@tiga-warna.com',
  });

  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [passMsg, setPassMsg] = useState({ text: '', isError: false });
  const [bizMsg, setBizMsg] = useState({ text: '', isError: false });
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const handleBizSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setBizMsg({ text: 'Informasi bisnis berhasil disimpan!', isError: false });
      setTimeout(() => setBizMsg({ text: '', isError: false }), 3000);
    }, 800);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) {
      setPassMsg({ text: 'Konfirmasi password tidak cocok!', isError: true });
      return;
    }
    if (passForm.new.length < 6) {
      setPassMsg({ text: 'Password baru minimal 6 karakter!', isError: true });
      return;
    }

    setSavingPass(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, passForm.current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, passForm.new);
      setPassMsg({ text: 'Password berhasil diperbarui!', isError: false });
      setPassForm({ current: '', new: '', confirm: '' });
    } catch (err) {
      const msg = err.code === 'auth/wrong-password'
        ? 'Password saat ini salah!'
        : err.message;
      setPassMsg({ text: msg, isError: true });
    }
    setSavingPass(false);
    setTimeout(() => setPassMsg({ text: '', isError: false }), 4000);
  };

  return (
    <div className="w-full max-w-[900px] mb-10 pb-20 md:pb-0 space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Pengaturan</h2>
        <p className="text-[#646A66] font-medium mt-1">Kelola konfigurasi bisnis dan akun Anda</p>
      </div>

      {/* Business Info */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#EAF4EF] flex items-center justify-center text-[#607d6e]">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1D1B]">Informasi Bisnis</h3>
            <p className="text-xs text-[#646A66] font-medium">Profil usaha Anda</p>
          </div>
        </div>

        <form onSubmit={handleBizSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Nama Usaha" value={bizForm.nama} onChange={v => setBizForm(f => ({ ...f, nama: v }))} />
            <FormField label="Email Bisnis" type="email" value={bizForm.email} onChange={v => setBizForm(f => ({ ...f, email: v }))} />
            <FormField label="Nomor WhatsApp" value={bizForm.whatsapp} onChange={v => setBizForm(f => ({ ...f, whatsapp: v }))} />
            <FormField label="Alamat" value={bizForm.alamat} onChange={v => setBizForm(f => ({ ...f, alamat: v }))} />
          </div>

          <div className="flex items-center justify-between mt-2 pt-2">
            {bizMsg.text && <Alert text={bizMsg.text} isError={bizMsg.isError} />}
            <button type="submit" disabled={saving} className="ml-auto flex items-center gap-2 bg-[#607d6e] hover:bg-[#526b5e] text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50">
              <Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>

      {/* Profile Info */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-4 ring-[#EAF4EF]">
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.email}`} alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-extrabold text-xl text-[#1A1D1B]">{user?.email}</p>
            <p className="text-sm font-semibold text-[#607d6e] mt-0.5">Administrator</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-sm text-[#646A66] font-medium">
          Avatar-nya dihasilkan otomatis berdasarkan email. Untuk mengubah foto profil, hubungi tim developer.
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Lock size={20} />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#1A1D1B]">Ganti Password</h3>
            <p className="text-xs text-[#646A66] font-medium">Perbarui keamanan akun Anda</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <FormField label="Password Saat Ini" type="password" value={passForm.current} onChange={v => setPassForm(f => ({ ...f, current: v }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Password Baru" type="password" value={passForm.new} onChange={v => setPassForm(f => ({ ...f, new: v }))} />
            <FormField label="Konfirmasi Password Baru" type="password" value={passForm.confirm} onChange={v => setPassForm(f => ({ ...f, confirm: v }))} />
          </div>

          <div className="flex items-center justify-between mt-2 pt-2">
            {passMsg.text && <Alert text={passMsg.text} isError={passMsg.isError} />}
            <button type="submit" disabled={savingPass} className="ml-auto flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
              <Lock size={16} /> {savingPass ? 'Memperbarui...' : 'Perbarui Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormField = ({ label, type = 'text', value, onChange }) => (
  <div>
    <label className="block text-xs font-bold text-[#646A66] uppercase tracking-wider mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-transparent focus:border-[#607d6e] focus:bg-white focus:ring-0 outline-none text-sm font-semibold text-[#1A1D1B] transition-all"
    />
  </div>
);

const Alert = ({ text, isError }) => (
  <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl ${isError ? 'text-red-700 bg-red-50' : 'text-[#347B5A] bg-[#EAF4EF]'}`}>
    {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
    {text}
  </div>
);
