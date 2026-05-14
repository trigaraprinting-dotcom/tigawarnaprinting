import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, ListOrdered, Users, FileText, Settings, 
  ClipboardCheck, Receipt, Printer, LogOut,
  ChevronRight, ChevronLeft, Tags, Activity, PlusCircle, Box,
  Sun, Moon
} from 'lucide-react';
import clsx from 'clsx';
import { logout } from '../firebase/auth';

export const Sidebar = () => {
  const { role, user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const menuItems = {
    admin: [
      { path: '/admin/dashboard',   icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/admin/pesanan',      icon: ListOrdered,     label: 'Pesanan'     },
      { path: '/admin/produk',       icon: Box,             label: 'Produk'      },
      { path: '/admin/users',        icon: Users,           label: 'User'   },
      { path: '/admin/kategori',     icon: Tags,            label: 'Kategori'    },
      { path: '/admin/laporan',      icon: FileText,        label: 'Laporan'     },
      { path: '/admin/kinerja-pekerja', icon: Activity,      label: 'Kinerja' },
    ],
    customer_service: [
      { path: '/cs/dashboard',       icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/cs/pesanan/tambah',  icon: PlusCircle,      label: 'Input Order' },
      { path: '/cs/pesanan',         icon: ListOrdered,     label: 'Pesanan'     },
    ],
    petugas_validasi: [
      { path: '/validasi/dashboard', icon: ClipboardCheck,  label: 'Validasi'    },
      { path: '/validasi/klien',     icon: Users,           label: 'Daftar Klien' },
    ],
    kasir: [
      { path: '/kasir/dashboard',    icon: Receipt,         label: 'Dashboard'   },
      { path: '/kasir/pesanan',      icon: ListOrdered,     label: 'Pesanan'     },
    ],
    petugas_produksi: [
      { path: '/produksi/dashboard', icon: LayoutDashboard, label: 'Dashboard'   },
      { path: '/produksi/proses',    icon: Printer,         label: 'Produksi'    },
      { path: '/produksi/kategori',  icon: Tags,            label: 'Kategori'    },
    ],
    desainer: [
      { path: '/desainer/dashboard', icon: LayoutDashboard, label: 'Dashboard'   },
    ],
  };

  const currentMenu = menuItems[role] || menuItems.admin;
  const displayName = user?.email?.split('@')[0] || 'User';

  const adminDashboardItem = menuItems.admin.find(i => i.path === '/admin/dashboard');
  const adminPesananItem = menuItems.admin.find(i => i.path === '/admin/pesanan');

  const adminMasterItems = [
    menuItems.admin.find(i => i.path === '/admin/produk'),
    menuItems.admin.find(i => i.path === '/admin/kategori'),
    menuItems.admin.find(i => i.path === '/admin/users'),
  ].filter(Boolean);

  const adminLaporanItems = [
    menuItems.admin.find(i => i.path === '/admin/laporan'),
    menuItems.admin.find(i => i.path === '/admin/kinerja-pekerja'),
  ].filter(Boolean);

  const [openAdminGroups, setOpenAdminGroups] = useState(() => new Set());

  useEffect(() => {
    if (role !== 'admin') return;

    const masterActive = adminMasterItems.some(item => pathname.startsWith(item.path));
    const laporanActive = adminLaporanItems.some(item => pathname.startsWith(item.path));

    const next = new Set();
    if (masterActive) next.add('master');
    if (laporanActive) next.add('laporan');
    setOpenAdminGroups(next);
  }, [role, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAdminGroup = (key) => {
    setOpenAdminGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end
        title={!expanded ? item.label : undefined}
        className={({ isActive }) => clsx(
          'flex items-center transition-all duration-300 outline-none group shrink-0',
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
  };

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
            <img src="/logo.png" alt="Tiga Warna Logo" className="w-8 h-8 object-contain" />
          </div>
          {expanded && (
            <span className="font-extrabold text-[#1A1D1B] text-xl tracking-tight whitespace-nowrap animate-in fade-in duration-300">
              Tiga Warna
            </span>
          )}
        </div>

        {/* Menu items */}
        <div className={clsx('flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-2 pb-3', expanded && 'w-full')}>
          {role !== 'admin' ? (
            currentMenu.map(renderNavItem)
          ) : expanded ? (
            <>
              {adminDashboardItem && renderNavItem(adminDashboardItem)}
              {adminPesananItem && renderNavItem(adminPesananItem)}

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAdminGroup('master')}
                  className={clsx(
                    'flex items-center gap-3.5 h-[50px] px-4 w-full rounded-2xl outline-none transition-all border shrink-0',
                    openAdminGroups.has('master')
                      ? 'bg-slate-50 hover:bg-slate-100 text-[#1A1D1B] border-slate-100'
                      : 'text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50 border-transparent'
                  )}
                >
                  <Tags size={20} strokeWidth={2.5} className="shrink-0" />
                  <span className="font-bold text-[13px] whitespace-nowrap animate-in fade-in duration-300">
                    Master Data 
                  </span>
                  <ChevronRight
                    size={16}
                    strokeWidth={2.5}
                    className={clsx(
                      'ml-auto transition-transform',
                      openAdminGroups.has('master') ? 'rotate-90 text-[#1A1D1B]' : 'rotate-0'
                    )}
                  />
                </button>
                {openAdminGroups.has('master') && (
                  <div className="flex flex-col gap-2.5 pl-7">
                    {adminMasterItems.map(renderNavItem)}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAdminGroup('laporan')}
                  className={clsx(
                    'flex items-center gap-3.5 h-[50px] px-4 w-full rounded-2xl outline-none transition-all border shrink-0',
                    openAdminGroups.has('laporan')
                      ? 'bg-slate-50 hover:bg-slate-100 text-[#1A1D1B] border-slate-100'
                      : 'text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50 border-transparent'
                  )}
                >
                  <FileText size={20} strokeWidth={2.5} className="shrink-0" />
                  <span className="font-bold text-[13px] whitespace-nowrap animate-in fade-in duration-300">
                    Laporan 
                  </span>
                  <ChevronRight
                    size={16}
                    strokeWidth={2.5}
                    className={clsx(
                      'ml-auto transition-transform',
                      openAdminGroups.has('laporan') ? 'rotate-90 text-[#1A1D1B]' : 'rotate-0'
                    )}
                  />
                </button>
                {openAdminGroups.has('laporan') && (
                  <div className="flex flex-col gap-2.5 pl-7">
                    {adminLaporanItems.map(renderNavItem)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {adminDashboardItem && renderNavItem(adminDashboardItem)}
              {adminPesananItem && renderNavItem(adminPesananItem)}

              {(() => {
                const isMasterActive = adminMasterItems.some(i => pathname.startsWith(i.path));
                const first = adminMasterItems[0];
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(true);
                      if (!isMasterActive && first) navigate(first.path);
                      if (!openAdminGroups.has('master')) toggleAdminGroup('master');
                    }}
                    className={clsx(
                      'relative flex items-center justify-center w-[52px] h-[52px] mx-auto rounded-[1.2rem] transition-all shrink-0',
                      isMasterActive
                        ? 'bg-slate-100 text-[#1A1D1B]'
                        : 'text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50'
                    )}
                    title="Master Data (dropdown)"
                  >
                    <Tags size={20} strokeWidth={2.5} />
                    <span
                      className={clsx(
                        'absolute -bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center',
                        isMasterActive ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-slate-50 text-slate-500',
                      )}
                    >
                      <ChevronRight size={14} strokeWidth={2.5} className="rotate-90" />
                    </span>
                  </button>
                );
              })()}

              {(() => {
                const isLaporanActive = adminLaporanItems.some(i => pathname.startsWith(i.path));
                const first = adminLaporanItems[0];
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(true);
                      if (!isLaporanActive && first) navigate(first.path);
                      if (!openAdminGroups.has('laporan')) toggleAdminGroup('laporan');
                    }}
                    className={clsx(
                      'relative flex items-center justify-center w-[52px] h-[52px] mx-auto rounded-[1.2rem] transition-all shrink-0',
                      isLaporanActive
                        ? 'bg-slate-100 text-[#1A1D1B]'
                        : 'text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50'
                    )}
                    title="Laporan (dropdown)"
                  >
                    <FileText size={20} strokeWidth={2.5} />
                    <span
                      className={clsx(
                        'absolute -bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center',
                        isLaporanActive ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-slate-50 text-slate-500',
                      )}
                    >
                      <ChevronRight size={14} strokeWidth={2.5} className="rotate-90" />
                    </span>
                  </button>
                );
              })()}
            </>
          )}
        </div>

        {/* Bottom: logout + avatar */}
        <div className={clsx('mt-auto flex flex-col', expanded ? 'w-full gap-2' : 'items-center gap-4')}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={!expanded ? (isDarkMode ? 'Tema Terang' : 'Tema Gelap') : undefined}
            className={clsx(
              'flex items-center transition-all text-slate-400 hover:text-[#1A1D1B] hover:bg-slate-50 group',
              expanded
                ? 'justify-start px-4 h-[50px] w-full gap-3.5 rounded-2xl'
                : 'justify-center w-[52px] h-[52px] rounded-[1.2rem] hover:scale-105'
            )}
          >
            {isDarkMode ? (
              <Sun size={20} strokeWidth={2.5} className="shrink-0" />
            ) : (
              <Moon size={20} strokeWidth={2.5} className="shrink-0" />
            )}
            {expanded && (
              <span className="font-bold text-[13px] whitespace-nowrap">
                {isDarkMode ? 'Tema Terang' : 'Tema Gelap'}
              </span>
            )}
          </button>

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
              end
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
