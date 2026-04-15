import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, MessageSquare, Calendar } from 'lucide-react';

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 text-[#1A1D1B]">
        <span className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none">
          {time.getHours().toString().padStart(2, '0')}:{time.getMinutes().toString().padStart(2, '0')}
          <span className="text-lg font-bold text-slate-400 ml-1.5">
            :{time.getSeconds().toString().padStart(2, '0')}
          </span>
        </span>
        <span className="text-sm font-bold text-slate-400 mt-1.5 hidden sm:block">WIB</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 text-slate-500">
        <Calendar size={13} className="text-[#607d6e]" />
        <span className="text-[12px] font-bold uppercase tracking-wider">
          {days[time.getDay()]}, {time.getDate()} {months[time.getMonth()]} {time.getFullYear()}
        </span>
      </div>
    </div>
  );
};

export const Header = () => {
  const { user, role } = useAuth();

  const roleLabel = {
    admin: 'Admin',
    customer_service: 'Customer Service',
    kasir: 'Kasir',
    petugas_validasi: 'Petugas Validasi',
    petugas_produksi: 'Petugas Produksi',
  }[role] || 'Staff';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 py-2">
      {/* Live Clock — replaces "Hello, user" on all pages */}
      <LiveClock />

      <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto ml-auto">
        {/* Role + user badge */}
        <div className="hidden sm:flex flex-col items-end mr-1">
          <span className="text-[13px] font-extrabold text-[#1A1D1B] capitalize leading-tight">
            {user?.email?.split('@')[0] || 'Staff'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
            {roleLabel}
          </span>
        </div>

        {/* Action Buttons */}
        <button className="w-11 h-11 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm relative text-[#1A1D1B] hover:bg-slate-50 hover:shadow-md transition-all">
          <MessageSquare size={20} strokeWidth={2} className="text-[#646A66]" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        <button className="w-11 h-11 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm text-[#1A1D1B] hover:bg-slate-50 hover:shadow-md transition-all">
          <Bell size={20} strokeWidth={2} className="text-[#646A66]" />
        </button>
      </div>
    </div>
  );
};
