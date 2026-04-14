import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Search, Bell, MessageSquare } from 'lucide-react';

export const Header = () => {
  const { user, role } = useAuth();
  
  const formatRole = (role) => {
    if (!role) return 'Guest';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#1A1D1B] mb-2 tracking-tight">
          Hello, {user?.email?.split('@')[0] || formatRole(role)}!
        </h1>
        <p className="text-[#646A66] font-medium text-[15px]">
          Pantau pesanan dan aktivitas percetakan Trigara hari ini
        </p>
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
        {/* Search */}
        <div className="relative group flex-1 md:w-72 shadow-sm rounded-full bg-white transition-shadow hover:shadow-md">
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-6 pr-14 py-3.5 rounded-full bg-transparent border-none focus:ring-0 outline-none text-[15px] text-[#1A1D1B] font-medium placeholder-slate-400"
          />
          <div className="absolute right-1.5 top-1.5 w-10 h-10 bg-[#1A1D1B] rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-black transition-colors shadow-lg shadow-black/20">
            <Search size={18} strokeWidth={2.5} />
          </div>
        </div>

        {/* Action Buttons */}
        <button className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm relative text-[#1A1D1B] hover:bg-slate-50 hover:shadow-md transition-all">
          <MessageSquare size={22} strokeWidth={2} className="text-[#646A66]" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
        </button>
        <button className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center shadow-sm text-[#1A1D1B] hover:bg-slate-50 hover:shadow-md transition-all">
          <Bell size={22} strokeWidth={2} className="text-[#646A66]" />
        </button>
      </div>
    </div>
  );
};
