import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, ListOrdered, Users, FileText, Settings, 
  ClipboardCheck, Receipt, Printer, LogOut, Hexagon,
  ChevronRight, ChevronLeft, Tags
} from 'lucide-react';
import clsx from 'clsx';
import { logout } from '../firebase/auth';

export const Sidebar = () => {
  const { role, user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const menuItems = {
    admin: [
      { path: '/admin/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/admin/pesanan',      icon: ListOrdered,     label: 'Pesanan'     },
      { path: '/admin/users',        icon: Users,           label: 'Manajemen'   },
      { path: '/admin/kategori',     icon: Tags,            label: 'Kategori'    },
      { path: '/admin/laporan',      icon: FileText,        label: 'Laporan'     },
      { path: '/admin/pengaturan',   icon: Settings,        label: 'Pengaturan'  },
    ],
    customer_service: [
      { path: '/cs/dashboard',       icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/cs/pesanan',         icon: ListOrdered,     label: 'Pesanan'     },
    ],
    petugas_validasi: [
      { path: '/validasi/dashboard', icon: ClipboardCheck,  label: 'Validasi'    },
    ],
    kasir: [
      { path: '/kasir/dashboard',    icon: Receipt,         label: 'Kasir'       },
    ],
    petugas_produksi: [
      { path: '/produksi/dashboard', icon: Printer,         label: 'Dashboard'   },
      { path: '/produksi/kategori',  icon: Tags,            label: 'Kategori'    },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.admin;
  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <div 
        className={clsx(
          'hidden md:flex flex-col bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-8 sticky top-6 lg:top-8 z-20',
          'transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-[2.5rem]',
          'h-[calc(100vh-48px)] lg:h-[calc(100vh-64px)]',
          expanded ? 'w-[220px] px-5' : 'w-[88px] items-center'
        )}
      >
        {/* Toggle button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="absolute -right-3 top-10 w-7 h-7 bg-white shadow-md border border-slate-100 rounded-full flex items-center justify-center text-[#607d6e] hover:scale-110 hover:bg-[#EAF4EF] transition-all z-30"
        >
          {expanded ? <ChevronLeft size={14} strokeWidth={3} /> : <ChevronRight size={14} strokeWidth={3} />}
        </button>

        {/* Logo */}
        <div className={clsx(
          'mb-10 flex items-center gap-3 transition-all',
          expanded ? 'justify-start px-2 w-full' : 'justify-center'
        )}>
          <div className="hover:scale-110 transition-transform cursor-pointer shrink-0">
            <Hexagon strokeWidth={2.5} size={34} className="fill-[#607d6e] text-white" />
          </div>
          {expanded && (
            <span className="font-extrabold text-[#1A1D1B] text-xl tracking-tight whitespace-nowrap animate-in fade-in duration-300">
              Trigara
            </span>
          )}
        </div>

        {/* Menu items */}
        <div className={clsx('flex-1 flex flex-col gap-2.5', expanded && 'w-full')}>
          {currentMenu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={!expanded ? item.label : undefined}
                className={({ isActive }) => clsx(
                  'flex items-center transition-all duration-300 outline-none group',
                  expanded
                    ? 'justify-start px-4 h-[50px] w-full gap-3.5 rounded-2xl'
                    : 'justify-center w-[52px] h-[52px] mx-auto rounded-[1.2rem]',
                  isActive
                    ? 'bg-[#1A1D1B] text-white shadow-[0_8px_20px_rgba(0,0,0,0.15)] scale-105'
                    : 'text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50 hover:scale-105'
                )}
              >
                <Icon size={20} strokeWidth={2.5} className="shrink-0" />
                {expanded && (
                  <span className="font-bold text-[13px] whitespace-nowrap animate-in fade-in duration-300">
                    {item.label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom: logout + avatar */}
        <div className={clsx('mt-auto flex flex-col', expanded ? 'w-full gap-2' : 'items-center gap-4')}>
          <button
            onClick={logout}
            title={!expanded ? 'Logout' : undefined}
            className={clsx(
              'flex items-center transition-all text-slate-400 hover:text-red-500 hover:bg-red-50 group',
              expanded
                ? 'justify-start px-4 h-[50px] w-full gap-3.5 rounded-2xl'
                : 'justify-center w-[52px] h-[52px] rounded-[1.2rem]'
            )}
          >
            <LogOut size={20} strokeWidth={2.5} className="group-hover:-translate-x-1 transition-transform shrink-0" />
            {expanded && <span className="font-bold text-[13px] text-red-400 whitespace-nowrap">Logout</span>}
          </button>

          <div className={clsx(
            'flex items-center gap-3 cursor-pointer transition-all',
            expanded ? 'w-full p-3 rounded-2xl bg-slate-50/70 hover:bg-slate-100' : 'justify-center hover:scale-110'
          )}>
            <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden ring-2 ring-slate-100 shadow-sm">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${displayName}`} alt="avatar" className="w-full h-full object-cover bg-amber-100" />
            </div>
            {expanded && (
              <div className="flex flex-col overflow-hidden">
                <p className="text-[12px] font-extrabold text-[#1A1D1B] truncate capitalize">{displayName}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{role?.replace(/_/g,' ') || 'User'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ──────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 h-[72px] bg-white/95 backdrop-blur-md border-t border-slate-100 flex md:hidden items-center justify-around z-50 px-2 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.06)]">
        {currentMenu.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                'flex-1 h-full flex flex-col items-center justify-center transition-all',
                isActive ? 'text-[#1A1D1B]' : 'text-slate-400'
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isActive && 'bg-[#1A1D1B] text-white shadow-lg shadow-black/20 -translate-y-2'
                  )}>
                    <Icon size={isActive ? 18 : 22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  {!isActive && (
                    <span className="text-[9px] font-semibold mt-0.5 truncate max-w-full px-1">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
        <button onClick={logout} className="flex-1 h-full flex flex-col items-center justify-center text-red-400">
          <LogOut size={22} strokeWidth={2} />
          <span className="text-[9px] font-semibold mt-0.5">Keluar</span>
        </button>
      </div>
    </>
  );
};
