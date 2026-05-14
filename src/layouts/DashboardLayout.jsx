import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F0EFEE] font-sans flex text-[#1A1D1B]">
      {/* Container to give thick padding like the reference image */}
      <div className="dashboard-layout-wrapper flex w-full min-h-screen p-0 md:p-6 lg:p-8 gap-6 md:gap-8 lg:gap-10 print:p-0 print:gap-0">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 print:pb-0">
          <div className="dashboard-header-area px-4 md:px-0 pt-6 md:pt-0 print:hidden">
            <Header />
          </div>
          
          <main className="dashboard-main-area flex-1 mt-6 md:mt-8 px-4 md:px-0 pb-4 print:m-0 print:p-0">
            <Outlet />
          </main>

          {/* Copyright — visible on all screen sizes for all roles */}
          <div className="dashboard-footer-area flex flex-col items-center justify-center gap-1 px-4 md:px-0 pt-5 pb-6 md:pb-2 mt-4 border-t border-slate-200/60 print:hidden">
            <p className="text-[11px] font-semibold text-slate-400 tracking-wide">
              © {new Date().getFullYear()} <span className="font-bold text-[#607d6e]">Tiga Warna</span> Print Management System. All rights reserved.
            </p>
            <p className="text-[10px] font-medium text-slate-400 tracking-wide">Software Version v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};
