import React, { useMemo, useRef } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { ORDER_STATUS } from '../../firebase/firestore';
import { StatusBadge } from '../../components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { FileDown, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#607d6e', '#8dafa0', '#c5d9d3', '#1A1D1B', '#F0EFEE', '#347B5A', '#C29656', '#b285fa'];

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

  const stats = useMemo(() => {
    // Monthly omzet
    const monthlyMap = {};
    const clientMap = {};
    const statusMap = {};
    let totalOmzet = 0;
    let totalPesanan = orders.length;
    let selesai = 0;

    orders.forEach(o => {
      totalOmzet += Number(o.total_price || 0);
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

    return { monthlyData, topClients, statusData, totalOmzet, totalPesanan, selesai };
  }, [orders]);

  const exportPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('Laporan Trigara Print Management', 14, 18);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 26);

    // Summary row
    pdf.setFillColor(240, 239, 238);
    pdf.roundedRect(14, 32, 80, 20, 4, 4, 'F');
    pdf.roundedRect(100, 32, 80, 20, 4, 4, 'F');
    pdf.roundedRect(186, 32, 80, 20, 4, 4, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text('TOTAL OMZET', 18, 39);
    pdf.text('TOTAL PESANAN', 104, 39);
    pdf.text('PESANAN SELESAI', 190, 39);

    pdf.setFontSize(13);
    pdf.text(formatRupiah(stats.totalOmzet), 18, 47);
    pdf.text(`${stats.totalPesanan} Pesanan`, 104, 47);
    pdf.text(`${stats.selesai} Selesai`, 190, 47);

    // Orders table
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Daftar Pesanan', 14, 62);

    autoTable(pdf, {
      startY: 66,
      head: [['No', 'Klien', 'Produk', 'Qty', 'Total Harga', 'Status', 'Tanggal']],
      body: orders.map((o, i) => [
        i + 1,
        o.customer_name || '-',
        o.product_name || '-',
        `${o.quantity || 0} ${o.product_unit || ''}`,
        formatRupiah(o.total_price),
        (o.status || '-').replace(/_/g, ' '),
        formatDate(o.created_at),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [96, 125, 110], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
    });

    pdf.save(`Laporan_Trigara_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mb-10 pb-20 md:pb-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1A1D1B]">Laporan & Analitik</h2>
          <p className="text-[#646A66] font-medium mt-1">Ringkasan performa usaha Trigara</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-[#646A66] text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 bg-[#607d6e] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-[#526b5e] transition-all shadow-lg shadow-[#607d6e]/20"
          >
            <FileDown size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard label="Total Omzet" value={formatRupiah(stats.totalOmzet)} sub="Semua pesanan masuk" color="text-[#607d6e]" />
        <SummaryCard label="Total Pesanan" value={stats.totalPesanan} sub="Semua status" />
        <SummaryCard label="Pesanan Selesai" value={stats.selesai} sub={`${stats.totalPesanan > 0 ? Math.round(stats.selesai / stats.totalPesanan * 100) : 0}% completion rate`} color="text-[#347B5A]" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Omzet Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-lg font-extrabold text-[#1A1D1B] mb-6">Omzet per Bulan</h3>
          {stats.monthlyData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 font-semibold">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#646A66' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: '#646A66' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={v => [formatRupiah(v), 'Omzet']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="omzet" fill="#607d6e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Pie */}
        <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-lg font-extrabold text-[#1A1D1B] mb-6">Distribusi Status</h3>
          {stats.statusData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-slate-400 font-semibold">Belum ada data</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend formatter={v => v.replace(/_/g, ' ')} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                <Tooltip formatter={v => [`${v} pesanan`, '']} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Clients */}
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
        <h3 className="text-lg font-extrabold text-[#1A1D1B] mb-6">Top 5 Klien Terbanyak</h3>
        <div className="space-y-4">
          {stats.topClients.length === 0 ? (
            <p className="text-[#646A66] font-semibold text-center py-8">Belum ada data klien</p>
          ) : stats.topClients.map((client, i) => (
            <div key={client.name} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-xs shrink-0 ${i === 0 ? 'bg-[#607d6e]' : 'bg-slate-300'}`}>{i + 1}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm text-[#1A1D1B]">{client.name}</p>
                  <p className="text-xs font-extrabold text-[#607d6e]">{client.count} pesanan</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-[#607d6e] h-2 rounded-full transition-all duration-700"
                    style={{ width: `${(client.count / (stats.topClients[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Orders Table for reference */}
      <div className="bg-white rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] overflow-hidden" ref={tableRef}>
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-extrabold text-[#1A1D1B]">Riwayat Semua Pesanan</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['#', 'Klien', 'Produk', 'Total', 'Status', 'Tanggal'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-bold text-[#646A66] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.map((o, i) => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-3 text-[#646A66] font-semibold">{i + 1}</td>
                  <td className="px-6 py-3 font-bold text-[#1A1D1B]">{o.customer_name}</td>
                  <td className="px-6 py-3 text-[#646A66] max-w-[160px] truncate">{o.product_name}</td>
                  <td className="px-6 py-3 font-extrabold text-[#1A1D1B]">{formatRupiah(o.total_price)}</td>
                  <td className="px-6 py-3"><StatusBadge status={o.status} size="sm" /></td>
                  <td className="px-6 py-3 text-[#646A66]">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, sub, color }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-lg transition-shadow">
    <p className="text-[#646A66] font-semibold text-sm mb-3">{label}</p>
    <p className={`text-3xl font-extrabold tracking-tight ${color || 'text-[#1A1D1B]'}`}>{value}</p>
    <p className="text-xs font-medium text-[#646A66] mt-2">{sub}</p>
  </div>
);
