import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from 'recharts';
import { FileDown, Printer, User, CheckCircle, TrendingUp, DollarSign, Package, Users, Activity, ListFilter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#607d6e', '#8dafa0', '#c5d9d3', '#1A1D1B', '#EAF4EF', '#347B5A', '#C29656', '#b285fa'];

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const LaporanPage = () => {
  const { orders, loading } = useOrdersSnapshot({});
  const tableRef = useRef();

  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('ikhtisar'); // ikhtisar, performa, transaksi

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const workerStats = useMemo(() => {
    const statsMap = {};
    logs.forEach(log => {
      const email = log.user_email || 'System';
      if (!statsMap[email]) {
        statsMap[email] = {
          email,
          role: log.user_role || 'Unknown',
          totalActivities: 0,
          createdOrders: 0,
          statusUpdates: 0,
          lastActive: log.created_at
        };
      }
      statsMap[email].totalActivities += 1;
      
      if (log.action === 'CREATE_ORDER') statsMap[email].createdOrders += 1;
      if (log.action === 'UPDATE_STATUS') statsMap[email].statusUpdates += 1;
    });

    return Object.values(statsMap).sort((a, b) => b.totalActivities - a.totalActivities);
  }, [logs]);

  const stats = useMemo(() => {
    // Monthly omzet
    const monthlyMap = {};
    const clientMap = {};
    const statusMap = {};
    let totalOmzet = 0;
    let totalPesanan = orders.length;
    let selesai = 0;
    let totalQuantity = 0;

    orders.forEach(o => {
      totalOmzet += Number(o.total_price || 0);
      totalQuantity += Number(o.quantity || 0);
      if (o.status === 'done') selesai++;

      // Monthly
      const ts = o.created_at;
      if (ts) {
        const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
        const key = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        if (!monthlyMap[key]) monthlyMap[key] = { name: key, omzet: 0, ms: d.getTime() };
        monthlyMap[key].omzet += Number(o.total_price || 0);
      }

      // Client
      const cn = o.customer_name || 'Unknown';
      clientMap[cn] = (clientMap[cn] || 0) + 1;

      // Status
      const st = o.status || 'unknown';
      statusMap[st] = (statusMap[st] || 0) + 1;
    });

    const monthlyData = Object.values(monthlyMap).sort((a, b) => a.ms - b.ms);
    const topClients = Object.entries(clientMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const averageOrderValue = totalPesanan > 0 ? (totalOmzet / totalPesanan) : 0;

    return { monthlyData, topClients, statusData, totalOmzet, totalPesanan, selesai, averageOrderValue, totalQuantity };
  }, [orders]);

  const commissionStats = useMemo(() => {
    const comMap = {};
    orders.forEach(o => {
      if (o.operator_email) {
        const email = o.operator_email;
        if (!comMap[email]) {
          comMap[email] = {
             email: email, 
             total_designs: 0, 
             total_qty: 0, 
             generated_design_fee: 0, 
             generated_print_fee: 0
          };
        }
        comMap[email].total_qty += Number(o.quantity || 0);
        comMap[email].generated_print_fee += (Number(o.total_price || 0) - (o.needs_design ? Number(o.design_price || 0) : 0));
      }
      
      if (o.needs_design && o.designer_email) {
        const dEmail = o.designer_email;
        if (!comMap[dEmail]) {
          comMap[dEmail] = {
             email: dEmail, 
             total_designs: 0, 
             total_qty: 0, 
             generated_design_fee: 0, 
             generated_print_fee: 0
          };
        }
        comMap[dEmail].total_designs += 1;
        comMap[dEmail].generated_design_fee += Number(o.design_price || 0);
      }
    });
    return Object.values(comMap).sort((a,b) => b.generated_print_fee - a.generated_print_fee);
  }, [orders]);

  const exportPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Laporan & Analitik Tiga Warna', 14, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 24);

    const commonStyles = {
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    };

    // 1. Ikhtisar Bisnis
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ikhtisar Bisnis', 14, 34);
    
    autoTable(pdf, {
      ...commonStyles,
      startY: 38,
      head: [['Total Omzet', 'Total Pesanan', 'Pesanan Selesai', 'Rata-Rata Transaksi']],
      body: [[
        formatRupiah(stats.totalOmzet),
        `${stats.totalPesanan} Transaksi`,
        `${stats.selesai} Selesai`,
        formatRupiah(stats.averageOrderValue)
      ]],
    });

    // 2. Performa Operator & Komisi
    let finalY = pdf.lastAutoTable.finalY || 38;
    pdf.text('Performa Operator & Komisi', 14, finalY + 10);
    
    const commBody = commissionStats.length === 0 
      ? [['Tidak ada data', '', '', '', '', '']] 
      : commissionStats.map(c => [
          c.email.split('@')[0],
          c.total_qty,
          c.total_designs,
          formatRupiah(c.generated_print_fee),
          formatRupiah(c.generated_design_fee),
          formatRupiah(c.generated_print_fee + c.generated_design_fee)
        ]);

    autoTable(pdf, {
      ...commonStyles,
      startY: finalY + 14,
      head: [['Operator', 'Vol Cetakan', 'Desain', 'Valuasi Cetak', 'Komisi Desain', 'Total Value']],
      body: commBody,
    });

    // 3. Direktori Transaksi
    finalY = pdf.lastAutoTable.finalY || finalY + 14;
    pdf.text('Direktori Transaksi', 14, finalY + 10);

    const ordersBody = orders.length === 0
      ? [['Belum ada transaksi', '', '', '', '', '']]
      : orders.map((o, i) => [
          i + 1,
          formatDate(o.created_at),
          o.customer_name || '-',
          o.product_name || '-',
          formatRupiah(o.total_price),
          (o.status || '-').replace(/_/g, ' ').toUpperCase()
        ]);

    autoTable(pdf, {
      ...commonStyles,
      startY: finalY + 14,
      head: [['No', 'Tanggal', 'Klien', 'Produk', 'Total Harga', 'Status']],
      body: ordersBody,
    });

    pdf.save(`Laporan_Tiga_Warna_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {/* SCREEN VIEW (Dashboard) */}
      <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6 print:hidden">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#EAF4EF] text-[#347B5A] rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={28} className="stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1A1D1B]">Laporan & Analitik</h2>
            <p className="text-[#646A66] font-medium mt-1">Sentral data intelijen bisnis dan performa tim Tiga Warna</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-[#646A66] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-100 transition-all"
          >
            <Printer size={16} /> <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-[#1A1D1B] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#333] transition-all shadow-lg"
          >
            <FileDown size={16} /> <span className="hidden sm:inline">Unduh PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 bg-white p-2 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] border border-slate-100">
        {[
          { id: 'ikhtisar', label: 'Ikhtisar Bisnis', icon: <Activity size={18} /> },
          { id: 'performa', label: 'Performa Tim', icon: <Users size={18} /> },
          { id: 'transaksi', label: 'Data Transaksi', icon: <ListFilter size={18} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2.5 font-bold text-sm px-6 py-3 rounded-xl transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-[#607d6e] text-white shadow-md shadow-[#607d6e]/20' 
                : 'text-[#646A66] hover:bg-slate-50'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: IKHTISAR BISNIS */}
      {activeTab === 'ikhtisar' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <DetailStatCard 
              icon={<DollarSign size={24} />} 
              label="Total Omzet Keseluruhan" 
              value={formatRupiah(stats.totalOmzet)} 
              sub="Akumulasi pendapatan" 
              color="text-[#347B5A]" 
              bg="bg-[#EAF4EF]" 
            />
            <DetailStatCard 
              icon={<Package size={24} />} 
              label="Total Pesanan" 
              value={stats.totalPesanan} 
              sub="Item terdaftar" 
              color="text-[#1A1D1B]" 
              bg="bg-slate-100" 
            />
            <DetailStatCard 
              icon={<CheckCircle size={24} />} 
              label="Tingkat Penyelesaian" 
              value={`${stats.totalPesanan > 0 ? Math.round(stats.selesai / stats.totalPesanan * 100) : 0}%`} 
              sub={`${stats.selesai} dari ${stats.totalPesanan} selesai`} 
              color="text-[#5b21b6]" 
              bg="bg-indigo-50" 
            />
            <DetailStatCard 
              icon={<TrendingUp size={24} />} 
              label="Rata-Rata Transaksi (AOV)" 
              value={formatRupiah(stats.averageOrderValue)} 
              sub="Omzet / Total Pesanan" 
              color="text-[#b45309]" 
              bg="bg-amber-50" 
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart: Omzet Monthly Trend */}
            <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-lg font-black text-[#1A1D1B]">Tren Pendapatan Bulanan</h3>
                  <p className="text-sm font-medium text-[#646A66]">Pertumbuhan omzet sepanjang waktu</p>
                </div>
                <div className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-bold text-slate-500 border border-slate-200">
                  Total {stats.monthlyData.length} Bulan
                </div>
              </div>

              {stats.monthlyData.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-slate-400 font-semibold bg-slate-50 rounded-2xl">Belum ada data pendapatan</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#607d6e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#607d6e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#646A66' }} dy={10} />
                    <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#646A66' }} dx={-10} />
                    <Tooltip 
                      formatter={v => [`${formatRupiah(v)}`, 'Omzet']} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 'bold' }} 
                      itemStyle={{ color: '#1A1D1B' }}
                    />
                    <Area type="monotone" dataKey="omzet" stroke="#607d6e" strokeWidth={4} fillOpacity={1} fill="url(#colorOmzet)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Donut Chart: Status Distribution */}
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#1A1D1B]">Distribusi Status </h3>
                <p className="text-sm font-medium text-[#646A66]">Proporsi perjalanan pesanan</p>
              </div>
              
              {stats.statusData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold bg-slate-50 rounded-2xl">Belum ada data</div>
              ) : (
                <div className="flex-1 flex flex-col justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none pb-8">
                    <span className="text-3xl font-black text-[#1A1D1B]">{stats.totalPesanan}</span>
                    <span className="text-[10px] font-bold text-[#646A66] uppercase tracking-wider">Total</span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie 
                        data={stats.statusData} 
                        cx="50%" cy="50%" 
                        innerRadius={65} outerRadius={90} 
                        paddingAngle={5} dataKey="value"
                        cornerRadius={6}
                      >
                        {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend 
                        formatter={v => <span className="text-xs font-bold text-[#1A1D1B] ml-1">{String(v).replace(/_/g, ' ').toUpperCase()}</span>} 
                        wrapperStyle={{ paddingTop: '20px' }} 
                      />
                      <Tooltip 
                        formatter={v => [`${v} pesanan`, 'Jumlah']} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1A1D1B]">Top Klien Setia</h3>
                <p className="text-sm font-medium text-[#646A66]">Pelanggan dengan intensitas order tertinggi</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.topClients.length === 0 ? (
                <div className="col-span-full py-10 text-center text-slate-400 font-semibold bg-slate-50 rounded-2xl">Belum ada data klien</div>
              ) : stats.topClients.map((client, i) => (
                <div key={client.name} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-[#607d6e] transition-colors group">
                  <div className="text-3xl font-black text-slate-200 group-hover:text-[#607d6e]/20 transition-colors mb-2">#{i + 1}</div>
                  <p className="font-bold text-[#1A1D1B] truncate" title={client.name}>{client.name}</p>
                  <p className="text-sm font-extrabold text-[#607d6e] mt-1">{client.count} Transaksi</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PERFORMA TIM */}
      {activeTab === 'performa' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Leaderboard Modalitas Aktifitas System */}
            <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-black text-[#1A1D1B]">Aktivitas Sistem</h3>
                <p className="text-sm font-medium text-[#646A66]">Frekuensi aksi dalam sistem</p>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 max-h-[500px] space-y-3 custom-scrollbar">
                {workerStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 font-semibold bg-slate-50 rounded-2xl min-h-[200px]">Belum ada data</div>
                ) : workerStats.map((stat, i) => (
                  <div key={stat.email} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-[#C29656]/20 text-[#C29656]' : i === 1 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${stat.email}`} alt="" className="w-full h-full object-cover bg-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[13px] text-[#1A1D1B] truncate">{stat.email.split('@')[0]}</p>
                      <p className="text-[10px] font-bold text-[#607d6e] uppercase tracking-wider">{stat.role.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-[#347B5A]">{stat.totalActivities}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Aksi</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabel Performa Operator & Gaji */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-[#1A1D1B]">Kinerja Pekerja Produksi</h3>
                  <p className="text-sm font-medium text-[#646A66] mt-1">Estimasi komisi dan kontribusi cetakan per-operator</p>
                </div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1.5">
                  <Activity size={14} /> Payroll Analysis
                </span>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white">
                      <th className="text-left px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Operator</th>
                      <th className="text-center px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Vol Cetakan</th>
                      <th className="text-center px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Desain</th>
                      <th className="text-right px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Valuasi Cetak</th>
                      <th className="text-right px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">Komisi Desain</th>
                      <th className="text-right px-6 py-4 text-[11px] font-extrabold text-[#1A1D1B] uppercase tracking-wider">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissionStats.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-12 text-slate-400 font-semibold bg-slate-50">Belum ada data pekerja produksi yang menangani order.</td>
                      </tr>
                    ) : commissionStats.map((c) => (
                      <tr key={c.email} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${c.email}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-[#1A1D1B]">{c.email.split('@')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-[13px] bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200">{c.total_qty}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-[13px] bg-[#EAF4EF] text-[#347B5A] px-3 py-1 rounded-lg border border-[#c5d9d3]">{c.total_designs}x</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-500">{formatRupiah(c.generated_print_fee)}</td>
                        <td className="px-6 py-4 text-right font-extrabold text-[#347B5A]">{formatRupiah(c.generated_design_fee)}</td>
                        <td className="px-6 py-4 text-right font-black text-indigo-900 bg-indigo-50/30">
                          {formatRupiah(c.generated_print_fee + c.generated_design_fee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: DATA TRANSAKSI */}
      {activeTab === 'transaksi' && (
        <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden animate-fade-in" ref={tableRef}>
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-[#1A1D1B]">Direktori Transaksi</h3>
              <p className="text-sm font-medium text-[#646A66] mt-1">Daftar lengkap seluruh pesanan yang terekam sistem</p>
            </div>
            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">
              Total: {orders.length} Data
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['#', 'Klien', 'Produk', 'Total', 'Status', 'Tanggal'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-[11px] font-extrabold text-[#646A66] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o, i) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-[#646A66] font-semibold text-xs">{i + 1}</td>
                    <td className="px-6 py-4 font-bold text-[#1A1D1B]">{o.customer_name}</td>
                    <td className="px-6 py-4 text-[#646A66] max-w-[200px] truncate">{o.product_name}</td>
                    <td className="px-6 py-4 font-black text-[#1A1D1B]">{formatRupiah(o.total_price)}</td>
                    <td className="px-6 py-4"><StatusBadge status={o.status} size="sm" /></td>
                    <td className="px-6 py-4 text-[#646A66] font-medium text-xs">{formatDate(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
               <div className="p-12 text-center text-slate-400 font-semibold bg-slate-50">Belum ada transaksi terekam.</div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* PRINT VIEW (Clean, Excel-like layout) */}
      <div className="hidden print:block w-full bg-white text-black p-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Laporan & Analitik Tiga Warna</h1>
          <p className="text-sm mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
        </div>
        
        <div className="mb-8">
          <h2 className="text-base font-bold mb-2 uppercase border-b border-black pb-1">Ikhtisar Bisnis</h2>
          <table className="w-full border-collapse border border-black text-sm mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-3 py-2 text-left font-bold">Total Omzet</th>
                <th className="border border-black px-3 py-2 text-left font-bold">Total Pesanan</th>
                <th className="border border-black px-3 py-2 text-left font-bold">Pesanan Selesai</th>
                <th className="border border-black px-3 py-2 text-left font-bold">Rata-Rata Transaksi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-2">{formatRupiah(stats.totalOmzet)}</td>
                <td className="border border-black px-3 py-2">{stats.totalPesanan} Transaksi</td>
                <td className="border border-black px-3 py-2">{stats.selesai} Selesai</td>
                <td className="border border-black px-3 py-2">{formatRupiah(stats.averageOrderValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-8">
          <h2 className="text-base font-bold mb-2 uppercase border-b border-black pb-1">Performa Operator & Komisi</h2>
          <table className="w-full border-collapse border border-black text-sm mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-3 py-2 text-left font-bold">Operator</th>
                <th className="border border-black px-3 py-2 text-center font-bold">Vol Cetakan</th>
                <th className="border border-black px-3 py-2 text-center font-bold">Desain</th>
                <th className="border border-black px-3 py-2 text-right font-bold">Valuasi Cetak</th>
                <th className="border border-black px-3 py-2 text-right font-bold">Komisi Desain</th>
                <th className="border border-black px-3 py-2 text-right font-bold">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {commissionStats.length === 0 ? (
                <tr>
                  <td colSpan="6" className="border border-black px-3 py-2 text-center">Tidak ada data</td>
                </tr>
              ) : commissionStats.map(c => (
                <tr key={c.email}>
                  <td className="border border-black px-3 py-2">{c.email.split('@')[0]}</td>
                  <td className="border border-black px-3 py-2 text-center">{c.total_qty}</td>
                  <td className="border border-black px-3 py-2 text-center">{c.total_designs}</td>
                  <td className="border border-black px-3 py-2 text-right">{formatRupiah(c.generated_print_fee)}</td>
                  <td className="border border-black px-3 py-2 text-right">{formatRupiah(c.generated_design_fee)}</td>
                  <td className="border border-black px-3 py-2 text-right font-bold">{formatRupiah(c.generated_print_fee + c.generated_design_fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-base font-bold mb-2 uppercase border-b border-black pb-1">Direktori Transaksi</h2>
          <table className="w-full border-collapse border border-black text-xs mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-2 py-2 text-left font-bold">No</th>
                <th className="border border-black px-2 py-2 text-left font-bold">Tanggal</th>
                <th className="border border-black px-2 py-2 text-left font-bold">Klien</th>
                <th className="border border-black px-2 py-2 text-left font-bold">Produk</th>
                <th className="border border-black px-2 py-2 text-right font-bold">Total Harga</th>
                <th className="border border-black px-2 py-2 text-center font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                 <tr><td colSpan="6" className="border border-black px-2 py-2 text-center">Belum ada transaksi</td></tr>
              ) : orders.map((o, i) => (
                <tr key={o.id}>
                  <td className="border border-black px-2 py-2">{i + 1}</td>
                  <td className="border border-black px-2 py-2">{formatDate(o.created_at)}</td>
                  <td className="border border-black px-2 py-2">{o.customer_name}</td>
                  <td className="border border-black px-2 py-2">{o.product_name}</td>
                  <td className="border border-black px-2 py-2 text-right">{formatRupiah(o.total_price)}</td>
                  <td className="border border-black px-2 py-2 text-center uppercase">{(o.status || '-').replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const DetailStatCard = ({ icon, label, value, sub, color, bg }) => (
  <div className="bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col gap-4 group hover:border-slate-200 transition-colors">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bg} ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-slate-500 font-bold text-[13px] mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
    <div className="pt-4 mt-auto border-t border-slate-100">
      <p className="text-[11px] font-extrabold uppercase text-slate-400">{sub}</p>
    </div>
  </div>
);
