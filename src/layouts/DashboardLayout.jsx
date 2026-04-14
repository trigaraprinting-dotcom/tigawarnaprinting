import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-[#F0EFEE] font-sans flex text-[#1A1D1B]">
      {/* Container to give thick padding like the reference image */}
      <div className="flex w-full min-h-screen p-0 md:p-6 lg:p-8 gap-6 md:gap-8 lg:gap-10">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
          <div className="px-4 md:px-0 pt-6 md:pt-0">
            <Header />
          </div>
          
          <main className="flex-1 overflow-y-auto mt-8 md:mt-10 px-4 md:px-0 relative rounded-3xl">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
