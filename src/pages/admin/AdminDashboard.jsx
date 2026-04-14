import React, { useMemo, useState } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { ORDER_STATUS } from '../../firebase/firestore';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { seedDummyData } from '../../utils/seedDummyData';
import { RefreshCw, BarChart2 } from 'lucide-react';

export const AdminDashboard = () => {
    const { orders, loading } = useOrdersSnapshot({});
    const [seeding, setSeeding] = useState(false);
    const [seedMsg, setSeedMsg] = useState('');

    const handleSeed = async () => {
        setSeeding(true);
        try {
            const count = await seedDummyData();
            setSeedMsg(`✓ ${count} pesanan dummy berhasil ditambahkan!`);
            setTimeout(() => setSeedMsg(''), 5000);
        } catch (e) {
            setSeedMsg('Gagal: ' + e.message);
        }
        setSeeding(false);
    };

    const stats = useMemo(() => {
        let totalOmzet = 0;
        let pendapatanBatal = 0;
        let sumAktivitas = 0;
        let clientSet = new Set();
        let chartDataMap = {};

        orders.forEach(o => {
            let jsDate = new Date();
            let dateStr = 'Unknown';
            if (o.created_at) {
                jsDate = typeof o.created_at.toDate === 'function' ? o.created_at.toDate() : new Date(o.created_at);
                dateStr = jsDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
            }
            
            clientSet.add(o.customer_name);
            
            if (o.status !== ORDER_STATUS.REJECTED) {
               totalOmzet += Number(o.total_price || 0);
               
               if (dateStr !== 'Unknown') {
                 if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { name: dateStr, omzet: 0, ms: jsDate.getTime() };
                 chartDataMap[dateStr].omzet += Number(o.total_price || 0);
               }
            } else {
               pendapatanBatal += Number(o.total_price || 0);
            }
            
            if ([ORDER_STATUS.CETAK, ORDER_STATUS.FINISHING].includes(o.status)) {
                sumAktivitas += 1;
            }
        });

        const formatRupiah = (val) => {
            if (val === 0) return 'Rp 0';
            if (val > 1000000) return `Rp ${(val/1000000).toFixed(1)}M`;
            return `Rp ${(val/1000).toFixed(0)}K`;
        };

        const sortedChartData = Object.values(chartDataMap).sort((a,b) => a.ms - b.ms);
        const balance = totalOmzet * 0.7; // Fake operational balance computation

        return {
            omzetRaw: totalOmzet,
            omzetLabel: formatRupiah(totalOmzet),
            batalLabel: formatRupiah(pendapatanBatal),
            balanceLabel: formatRupiah(balance),
            klienBaru: clientSet.size,
            aktivitas: sumAktivitas * 12, // Fake hours based on active orders
            chartData: sortedChartData.length > 0 ? sortedChartData : [{name: 'Empty', omzet: 0}]
        };
    }, [orders]);

    return (
        <div className="w-full flex flex-col gap-6 max-w-[1400px] mb-10 pb-20 md:pb-0">
            {/* Empty state banner */}
            {!loading && orders.length === 0 && (
                <div className="bg-[#EAF4EF] border border-[#607d6e]/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#607d6e]/10 flex items-center justify-center">
                        <BarChart2 size={28} className="text-[#607d6e]" />
                    <div className="flex-1 text-center sm:text-left">
                        <p className="font-extrabold text-[#1A1D1B] text-lg">Dashboard masih kosong</p>
                        <p className="text-[#646A66] text-sm mt-1">Klik tombol di samping untuk mengisi 30 data dummy pesanan agar dashboard ini terisi.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="flex items-center gap-2 bg-[#607d6e] text-white font-bold px-5 py-3 rounded-xl hover:bg-[#526b5e] transition-all shadow-lg shadow-[#607d6e]/20 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={seeding ? 'animate-spin' : ''} />
                            {seeding ? 'Menyuntik data...' : 'Seed 30 Data Dummy'}
                        </button>
                        {seedMsg && <p className="text-xs font-bold text-[#347B5A]">{seedMsg}</p>}
                    </div>
                </div>
            )}
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between hover:shadow-lg transition-shadow duration-300">
                    <p className="text-[#646A66] font-medium text-[15px]">Omzet Usaha</p>
                    <div className="flex justify-between items-end mt-6">
                        <h2 className="text-[32px] sm:text-4xl font-extrabold text-[#1A1D1B] tracking-tight">{stats.omzetLabel}</h2>
                        <div className="flex items-end gap-1.5 opacity-80 h-10 mb-1">
                            {[40, 60, 30, 80, 50, 45].map((h, i) => (
                                <div key={i} className="w-[5px] sm:w-[6px] bg-[#607d6e] rounded-t-sm" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:shadow-lg transition-shadow duration-300">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-[#F0EFEE] flex items-center justify-center text-[#607d6e]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <div className="flex-1 w-full overflow-hidden">
                        <p className="text-[#646A66] font-medium text-[14px]">Total Klien</p>
                        <h2 className="text-3xl font-extrabold text-[#1A1D1B] mt-1">{stats.klienBaru}</h2>
                        <div className="ml-auto w-full max-w-[80px] h-6 mt-1 absolute right-8 top-1/2 translate-y-2 opacity-50">
                           <svg viewBox="0 0 40 20" className="w-full h-full stroke-[#646A66]" fill="none" strokeWidth="2.5" strokeLinecap="round"><path d="M0,15 Q10,5 20,10 T40,2"/></svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-5 hover:shadow-lg transition-shadow duration-300">
                    <div className="w-14 h-14 shrink-0 rounded-full bg-[#FAF5ED] flex items-center justify-center text-[#C29656]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <p className="text-[#646A66] font-medium text-[14px]">Pendapatan Batal</p>
                        <h2 className="text-[26px] font-extrabold text-[#1A1D1B] mt-1">{stats.batalLabel}</h2>
                    </div>
                </div>

                <div className="bg-[#607d6e] p-6 rounded-[2rem] shadow-xl shadow-[#607d6e]/20 text-white flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                    <p className="font-semibold text-[15px] text-white/90 z-10 w-32 tracking-wide">Aktivitas Mesin</p>
                    <h2 className="text-4xl font-extrabold mt-6 z-10">{stats.aktivitas}<span className="text-xl font-medium opacity-80"> Jam</span></h2>
                    <svg className="absolute bottom-5 right-[-10px] w-40 h-20 stroke-white/20" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M0,15 Q20,35 40,15 T80,15 T120,25 T160,10"/></svg>
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative flex flex-col min-h-[360px]">
                    <div className="flex justify-between items-start mb-10 z-10 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <h3 className="text-[22px] font-extrabold text-[#1A1D1B]">Total Saldo</h3>
                            <span className="bg-[#EAF4EF] text-[#347B5A] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 self-start">
                               <span className="w-2 h-2 rounded-full bg-[#347B5A]"></span> On track
                            </span>
                        </div>
                        <select className="text-sm font-bold border-none bg-transparent text-[#646A66] outline-none cursor-pointer focus:ring-0">
                            <option>Monthly</option>
                            <option>Weekly</option>
                        </select>
                    </div>
                    
                    <div className="flex gap-16 z-10 relative">
                        <div>
                            <p className="text-[#646A66] text-sm font-semibold mb-2">Simpanan</p>
                            <div className="flex items-end gap-3 tracking-tight">
                                <h3 className="text-3xl font-extrabold text-[#1A1D1B]">43.50%</h3>
                                <span className="text-[#347B5A] font-bold text-sm bg-[#EAF4EF] px-2 py-0.5 rounded-md mb-1">+2.45%</span>
                            </div>
                        </div>
                        <div>
                             <p className="text-[#646A66] text-sm font-semibold mb-2">Kas Operasional</p>
                            <div className="flex items-end gap-3 tracking-tight">
                                <h3 className="text-3xl font-extrabold text-[#1A1D1B]">{stats.balanceLabel}</h3>
                                <span className="text-[#347B5A] font-bold text-sm bg-[#EAF4EF] px-2 py-0.5 rounded-md mb-1">Live</span>
                            </div>
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 top-[40%] rounded-b-[2rem] overflow-hidden -z-0">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={stats.chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                           <defs>
                             <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#607d6e" stopOpacity={0.2}/>
                               <stop offset="95%" stopColor="#607d6e" stopOpacity={0}/>
                             </linearGradient>
                           </defs>
                           <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                           <Area type="monotone" dataKey="omzet" stroke="#607d6e" strokeWidth={3} fillOpacity={1} fill="url(#colorOmzet)" />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center sm:items-start text-center sm:text-left h-full justify-between min-h-[360px]">
                    <div className="w-full">
                        <h3 className="text-[22px] font-extrabold text-[#1A1D1B] tracking-tight">Kinerja Pabrik</h3>
                        <p className="text-[15px] font-medium text-[#646A66] mt-1">Total Penyelesaian</p>
                        <h2 className="text-[40px] font-extrabold text-[#607d6e] mt-4 tracking-tight">6078.76</h2>
                        <p className="text-[14px] font-medium text-[#646A66] mt-2 leading-relaxed max-w-[200px] mx-auto sm:mx-0">Efisiensi produksi naik 34% ketimbang bulan lalu.</p>
                    </div>
                    
                    <div className="mt-8 flex justify-center w-full relative">
                        <div className="relative w-[200px] h-[100px] overflow-hidden">
                            <svg viewBox="0 0 100 50" className="w-full h-full drop-shadow-md">
                                <path className="text-[#F0EFEE]" strokeWidth="12" stroke="currentColor" fill="none" strokeLinecap="round" d="M10 40 A40 40 0 0 1 90 40" />
                                <path className="text-[#607d6e]" strokeWidth="12" strokeDasharray="100, 126" stroke="currentColor" fill="none" strokeLinecap="round" d="M10 40 A40 40 0 0 1 90 40" style={{ transformOrigin: '50px 40px', transform: 'rotate(0deg)' }} />
                            </svg>
                            <div className="absolute bottom-1 w-full text-center font-extrabold text-[#1A1D1B] text-3xl">80%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3 Placeholder */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row gap-6 relative overflow-hidden">
                    <div className="flex-1 z-10 w-full flex flex-col justify-center">
                        <h3 className="text-[22px] font-extrabold text-[#1A1D1B] mb-2 tracking-tight">Kelola Pembayaran</h3>
                        <p className="text-[14px] text-[#646A66] mb-8 font-medium leading-relaxed max-w-xs">
                           Anda dapat mengelola akun bank master atau memasukkan setoran dana operasional.
                        </p>
                        <button className="bg-[#607d6e] text-white px-7 py-3 rounded-full text-[15px] font-bold shadow-lg shadow-[#607d6e]/20 w-max">+ Bank Rekening</button>
                    </div>
                    {/* Decorative abstract box just for design filler */}
                    <div className="absolute -right-12 -bottom-6 w-64 h-64 bg-slate-100 rounded-full blur-3xl opacity-60"></div>
                </div>

                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hidden lg:block">
                     <h3 className="text-[20px] font-extrabold text-[#1A1D1B] mb-7">Recent Payments</h3>
                     {/* simplified filler */}
                     <div className="flex flex-col gap-5">
                         <div className="h-10 w-full rounded-lg bg-slate-50 animate-pulse"></div>
                         <div className="h-10 w-full rounded-lg bg-slate-50 animate-pulse"></div>
                     </div>
                </div>
                
                <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hidden lg:block">
                     <h3 className="text-[20px] font-extrabold text-[#1A1D1B] mb-7">Security Check</h3>
                </div>
            </div>
        </div>
    );
};
