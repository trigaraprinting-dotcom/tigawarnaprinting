import React, { useMemo, useState, useEffect } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { ORDER_STATUS } from '../../firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import { seedDummyData } from '../../utils/seedDummyData';
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, PackageCheck,
  RefreshCw, ArrowUpRight, Activity, ChevronRight, BarChart2,
  Trophy, Medal, Crown, Tag, Sun, Moon, Sunrise,
  DollarSign, CheckCircle, UserCheck, Layers,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────
const formatRupiah = (val) => {
  if (!val || val === 0) return 'Rp 0';
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}jt`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val}`;
};

const formatRupiahFull = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTimeAgo = (ts) => {
  if (!ts) return '-';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return `${diff}d lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hr lalu`;
};

const STATUS_LABEL = {
  awaiting_dp: 'Menunggu DP', pending: 'Menunggu', validated: 'Tervalidasi',
  rejected: 'Ditolak', dp_confirmed: 'DP Dikonfirmasi', cetak: 'Cetak',
  finishing: 'Finishing', packing: 'Packing', ready: 'Siap', done: 'Selesai',
};

const STATUS_COLOR = {
  done: 'bg-[#EAF4EF] text-[#347B5A]',
  pending: 'bg-amber-50 text-amber-700',
  awaiting_dp: 'bg-blue-50 text-blue-600',
  dp_confirmed: 'bg-purple-50 text-purple-600',
  validated: 'bg-indigo-50 text-indigo-600',
  rejected: 'bg-red-50 text-red-600',
  cetak: 'bg-sky-50 text-sky-600',
  finishing: 'bg-orange-50 text-orange-600',
  packing: 'bg-teal-50 text-teal-600',
  ready: 'bg-[#EAF4EF] text-[#607d6e]',
};

const CATEGORY_COLORS = [
  '#607d6e', '#347B5A', '#C29656', '#8dafa0',
  '#5b7fa6', '#8b5cf6', '#c2773a', '#e05a5a',
];

// ─── Custom Tooltip ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-3 min-w-[150px]">
        <p className="text-xs font-bold text-[#646A66] mb-1">{label}</p>
        <p className="text-sm font-extrabold text-[#1A1D1B]">
          {formatRupiahFull(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// ─── Rank icon helper ────────────────────────────────────────────
const RankIcon = ({ rank }) => {
  if (rank === 0) return <Crown size={16} className="text-[#C29656]" />;
  if (rank === 1) return <Medal size={16} className="text-slate-400" />;
  if (rank === 2) return <Medal size={16} className="text-amber-700" />;
  return <span className="text-[11px] font-black text-slate-400">#{rank + 1}</span>;
};

// ─── Main Component ──────────────────────────────────────────────
export const AdminDashboard = () => {
  const { user } = useAuth();
  const { orders, loading } = useOrdersSnapshot({});
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('Bulan Ini');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedDummyData();
      setSeedMsg(`${count} pesanan dummy berhasil!`);
      setTimeout(() => setSeedMsg(''), 5000);
    } catch (e) {
      setSeedMsg('Gagal: ' + e.message);
    }
    setSeeding(false);
  };

  // ── Worker Leaderboard from logs ─────────────────────────────
  const leaderboard = useMemo(() => {
    const statsMap = {};
    logs.forEach(log => {
      const email = log.user_email || 'System';
      if (!statsMap[email]) {
        statsMap[email] = {
          email,
          role: log.user_role || 'Unknown',
          total: 0,
          created: 0,
          updated: 0,
          lastActive: log.created_at,
        };
      }
      statsMap[email].total += 1;
      if (log.action === 'CREATE_ORDER') statsMap[email].created += 1;
      if (log.action === 'UPDATE_STATUS') statsMap[email].updated += 1;
    });
    return Object.values(statsMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [logs]);

  // ── Category breakdown ───────────────────────────────────────
  const categoryStats = useMemo(() => {
    const catMap = {};
    orders.forEach(o => {
      const cat = o.category || 'umum';
      if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, omzet: 0 };
      catMap[cat].count += 1;
      catMap[cat].omzet += Number(o.total_price || 0);
    });
    return Object.values(catMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [orders]);

  // ── Main stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalOmzet = 0, prevOmzet = 0, pendapatanBatal = 0;
    let clientSet = new Set(), prevClientSet = new Set();
    let activeCount = 0, selesaiCount = 0;
    let chartDataMap = {};

    const now = new Date();
    let minDateMs = 0, prevMinDateMs = 0, prevMaxDateMs = 0;

    if (filterPeriod === 'Hari Ini') {
      minDateMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      prevMaxDateMs = minDateMs;
      prevMinDateMs = minDateMs - 86400000;
    } else if (filterPeriod === 'Bulan Ini') {
      minDateMs = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      prevMaxDateMs = minDateMs;
      prevMinDateMs = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    } else if (filterPeriod === '30 Hari Terakhir') {
      minDateMs = now.getTime() - 30 * 86400000;
      prevMaxDateMs = minDateMs;
      prevMinDateMs = minDateMs - 30 * 86400000;
    }

    orders.forEach(o => {
      let jsDate = new Date();
      if (o.created_at) {
        jsDate = typeof o.created_at.toMillis === 'function'
          ? new Date(o.created_at.toMillis())
          : new Date(o.created_at);
      }
      const ms = jsDate.getTime();

      if (prevMinDateMs > 0 && ms >= prevMinDateMs && ms < prevMaxDateMs) {
        if (o.status !== ORDER_STATUS.REJECTED) {
          prevOmzet += Number(o.total_price || 0);
          prevClientSet.add(o.customer_name);
        }
      }

      if (minDateMs > 0 && ms < minDateMs) return;
      clientSet.add(o.customer_name);
      if (o.status === ORDER_STATUS.DONE || o.status === 'done') selesaiCount++;
      if (['cetak', 'finishing', 'packing', ORDER_STATUS.CETAK, ORDER_STATUS.FINISHING, ORDER_STATUS.PACKING].includes(o.status)) {
        activeCount++;
      }

      if (o.status !== ORDER_STATUS.REJECTED && o.status !== 'rejected') {
        totalOmzet += Number(o.total_price || 0);
        let dateStr = filterPeriod === 'Hari Ini'
          ? `${jsDate.getHours().toString().padStart(2, '0')}:00`
          : jsDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { name: dateStr, omzet: 0, ms };
        chartDataMap[dateStr].omzet += Number(o.total_price || 0);
      } else {
        pendapatanBatal += Number(o.total_price || 0);
      }
    });

    const growth = prevOmzet > 0 ? ((totalOmzet - prevOmzet) / prevOmzet * 100) : null;
    const sortedChart = Object.values(chartDataMap).sort((a, b) => a.ms - b.ms);

    // Status breakdown
    const statusCounts = {};
    orders.forEach(o => {
      const s = o.status || 'pending';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    return {
      totalOmzet, omzetLabel: formatRupiah(totalOmzet), growth,
      batalLabel: formatRupiah(pendapatanBatal),
      klienCount: clientSet.size, activeProduction: activeCount,
      selesaiCount, totalPesanan: orders.length,
      chartData: sortedChart.length > 0 ? sortedChart : [{ name: 'Belum Ada', omzet: 0 }],
      recentOrders: [...orders].slice(0, 8),
      statusCounts,
    };
  }, [orders, filterPeriod]);

  const userName = user?.email?.split('@')[0] || 'Admin';
  const hour = new Date().getHours();
  const GreetIcon = hour < 6 ? Moon : hour < 12 ? Sunrise : hour < 17 ? Sun : Moon;
  const greeting = hour < 6 ? 'Selamat Malam' : hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-[#607d6e] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] pb-20 md:pb-0">

      {/* ── Greeting ─────────────────────────────────────── */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <GreetIcon size={22} className="text-[#607d6e]" />
            <h1 className="text-2xl font-extrabold text-[#1A1D1B] tracking-tight">
              {greeting}, <span className="text-[#607d6e] capitalize">{userName}</span>
            </h1>
          </div>
          <p className="text-sm font-medium text-[#646A66] mt-0.5 ml-8">
            Berikut ringkasan operasional Trigara hari ini.
          </p>
        </div>
      </div>

      {/* ── Main 2-Column Layout ──────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6">

        {/* ══ LEFT COLUMN ══════════════════════════════════ */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Omzet"
              value={stats.omzetLabel}
              sub={stats.growth !== null
                ? `${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}% periode lalu`
                : 'Semua periode'}
              icon={<DollarSign size={18} />}
              positive={stats.growth === null || stats.growth >= 0}
              accentColor="bg-[#607d6e]"
              bar={[40, 65, 45, 80, 55, 70, 90]}
            />
            <StatCard
              label="Total Pesanan"
              value={stats.totalPesanan}
              sub={`${stats.selesaiCount} selesai`}
              icon={<ShoppingBag size={18} />}
              positive={true}
              accentColor="bg-[#347B5A]"
              bar={[30, 50, 40, 60, 35, 55, 70]}
            />
            <StatCard
              label="Total Klien"
              value={stats.klienCount}
              sub="Klien unik"
              icon={<Users size={18} />}
              positive={true}
              accentColor="bg-[#C29656]"
              bar={[20, 35, 25, 45, 30, 50, 40]}
            />
            <StatCard
              label="Produksi Aktif"
              value={stats.activeProduction}
              sub="Cetak + Finishing + Packing"
              icon={<Activity size={18} />}
              positive={true}
              accentColor="bg-[#8dafa0]"
              bar={[50, 30, 60, 40, 70, 45, 55]}
            />
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#607d6e]/10 flex items-center justify-center">
                  <BarChart2 size={18} className="text-[#607d6e]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1D1B]">Grafik Pendapatan</h3>
                  <p className="text-xs font-medium text-[#646A66]">Naik-turun omzet berdasarkan waktu</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {stats.growth !== null && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${stats.growth >= 0 ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-red-50 text-red-600'}`}>
                    {stats.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                  </span>
                )}
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="text-sm font-bold border border-slate-200 bg-slate-50 text-[#646A66] outline-none cursor-pointer rounded-xl px-3 py-2 focus:ring-2 focus:ring-[#607d6e]/20"
                >
                  <option value="Hari Ini">Hari Ini</option>
                  <option value="Bulan Ini">Bulan Ini</option>
                  <option value="30 Hari Terakhir">30 Hari Terakhir</option>
                  <option value="Semua Waktu">Semua Waktu</option>
                </select>
              </div>
            </div>

            <div className="flex items-end gap-3 mb-6">
              <span className="text-4xl font-extrabold text-[#1A1D1B] tracking-tight">{stats.omzetLabel}</span>
              <span className="text-sm font-semibold text-[#646A66] mb-1.5">{filterPeriod}</span>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOmzet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#607d6e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#607d6e" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : `${(v / 1_000).toFixed(0)}rb`}
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="omzet" stroke="#607d6e" strokeWidth={2.5}
                  fill="url(#gradOmzet)" dot={false} activeDot={{ r: 5, fill: '#607d6e', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 2-col: Category Chart + Leaderboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Category Breakdown */}
            <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#C29656]/10 flex items-center justify-center">
                  <Tag size={18} className="text-[#C29656]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1D1B]">Kategori Terbanyak</h3>
                  <p className="text-xs font-medium text-[#646A66]">Distribusi pesanan per kategori</p>
                </div>
              </div>

              {categoryStats.length === 0 ? (
                <p className="text-sm text-[#646A66] font-medium text-center py-8">Belum ada data</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {categoryStats.map((cat, i) => {
                    const maxCount = categoryStats[0]?.count || 1;
                    const pct = Math.round(cat.count / maxCount * 100);
                    return (
                      <div key={cat.name} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}20` }}
                        >
                          <Layers size={12} style={{ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[12px] font-bold text-[#1A1D1B] capitalize">{cat.name}</span>
                            <span className="text-[11px] font-extrabold text-[#646A66]">{cat.count} pcs</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Worker Leaderboard */}
            <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#C29656]/10 flex items-center justify-center">
                    <Trophy size={18} className="text-[#C29656]" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[#1A1D1B]">Leaderboard Kinerja</h3>
                    <p className="text-xs font-medium text-[#646A66]">Pekerja paling aktif</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#347B5A] bg-[#EAF4EF] px-2.5 py-1 rounded-full uppercase tracking-wide">
                  Live
                </span>
              </div>

              {leaderboard.length === 0 ? (
                <p className="text-sm text-[#646A66] font-medium text-center py-8">Belum ada aktivitas</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {leaderboard.map((worker, i) => (
                    <div
                      key={worker.email}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${i === 0 ? 'bg-[#FAF5ED] border border-[#C29656]/20' : 'bg-slate-50/60 hover:bg-slate-50'}`}
                    >
                      {/* Rank */}
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        <RankIcon rank={i} />
                      </div>

                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-white shadow-sm">
                        <img
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(worker.email)}`}
                          alt=""
                          className="w-full h-full object-cover bg-slate-50"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-extrabold text-[#1A1D1B] truncate leading-tight">
                          {worker.email.split('@')[0]}
                        </p>
                        <p className="text-[10px] font-bold text-[#607d6e] uppercase tracking-wider">
                          {worker.role.replace(/_/g, ' ')}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-1.5 shrink-0">
                        <div className="bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm text-center min-w-[34px]">
                          <ShoppingBag size={9} className="text-[#646A66] mx-auto mb-0.5" />
                          <span className="text-[11px] font-black text-[#1A1D1B] leading-none">{worker.created}</span>
                        </div>
                        <div className="bg-[#EAF4EF] px-2 py-1 rounded-lg border border-[#c5d9d3] shadow-sm text-center min-w-[34px]">
                          <CheckCircle size={9} className="text-[#347B5A] mx-auto mb-0.5" />
                          <span className="text-[11px] font-black text-[#347B5A] leading-none">{worker.updated}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#607d6e]/10 flex items-center justify-center">
                  <ShoppingBag size={16} className="text-[#607d6e]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1D1B]">Pesanan Terbaru</h3>
                  <p className="text-xs font-medium text-[#646A66] mt-0.5">{stats.totalPesanan} total pesanan</p>
                </div>
              </div>
              <a href="/admin/pesanan" className="flex items-center gap-1 text-xs font-bold text-[#607d6e] hover:text-[#526b5e] transition-colors">
                Lihat Semua <ChevronRight size={14} />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    {['Klien', 'Produk', 'Total', 'Status', 'Tanggal'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[#646A66] font-semibold">Belum ada pesanan</td>
                    </tr>
                  ) : stats.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50/80 hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-slate-100">
                            <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(o.customer_name || 'U')}&backgroundColor=607d6e&fontFamily=Helvetica&fontSize=40&fontWeight=700&textColor=ffffff`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-bold text-[#1A1D1B] group-hover:text-[#607d6e] transition-colors text-[13px]">
                            {o.customer_name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#646A66] max-w-[160px] truncate font-medium text-[13px]">{o.product_name || '-'}</td>
                      <td className="px-5 py-3.5 font-extrabold text-[#1A1D1B] text-[13px]">{formatRupiah(o.total_price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_COLOR[o.status] || 'bg-slate-100 text-slate-600'}`}>
                          {STATUS_LABEL[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#94a3b8] font-medium text-[12px]">{formatDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ══ RIGHT SIDEBAR ══════════════════════════════ */}
        <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-5">

          {/* Quick Stats 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            <QuickStatCard icon={<DollarSign size={16} />} label="Omzet" value={stats.omzetLabel} barColor="#607d6e" progress={75} />
            <QuickStatCard icon={<ShoppingBag size={16} />} label="Pesanan" value={stats.totalPesanan} barColor="#C29656" progress={60} />
            <QuickStatCard icon={<Users size={16} />} label="Klien" value={stats.klienCount} barColor="#347B5A" progress={50} />
            <QuickStatCard icon={<CheckCircle size={16} />} label="Selesai" value={stats.selesaiCount}
              barColor="#8dafa0"
              progress={stats.totalPesanan > 0 ? Math.round(stats.selesaiCount / stats.totalPesanan * 100) : 0}
            />
          </div>

          {/* Status Produksi */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Status Produksi</h3>
              <PackageCheck size={16} className="text-[#607d6e]" />
            </div>
            <ProductionStatusBreakdown statusCounts={stats.statusCounts} total={stats.totalPesanan} />
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Log Aktivitas</h3>
              <a href="/admin/aktivitas" className="flex items-center gap-1 text-xs font-bold text-[#607d6e] hover:text-[#526b5e] transition-colors">
                Semua <ChevronRight size={13} />
              </a>
            </div>
            <div className="flex flex-col gap-4">
              {logs.length === 0 ? (
                <p className="text-sm font-medium text-[#646A66] text-center py-6">Belum ada aktivitas</p>
              ) : logs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-slate-100 shadow-sm">
                    <img
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(log.user_email || 'system')}`}
                      alt=""
                      className="w-full h-full object-cover bg-slate-50"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[12px] font-bold text-[#1A1D1B] truncate">
                        {log.user_email?.split('@')[0] || 'System'}
                      </p>
                      <span className="text-[10px] font-medium text-[#94a3b8] shrink-0">
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-[#646A66] mt-0.5 line-clamp-1">
                      {log.details || log.action?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pendapatan Batal card */}
          <div className="bg-gradient-to-br from-[#607d6e] to-[#3d5c50] rounded-[1.75rem] p-5 text-white relative overflow-hidden shadow-xl shadow-[#607d6e]/25">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-white/70" />
                <p className="text-[12px] font-semibold text-white/80">Pendapatan Batal</p>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">{stats.batalLabel}</h3>
              <p className="text-[11px] font-medium text-white/60 mt-2">
                Dari pesanan yang ditolak / dibatalkan
              </p>
            </div>
            <svg className="absolute bottom-4 right-2 w-44 h-20 stroke-white/10" fill="none" strokeWidth="3" strokeLinecap="round">
              <path d="M0,15 Q20,35 40,15 T80,15 T120,25 T176,8" />
            </svg>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
          </div>

          {/* Top Category mini */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Top Kategori</h3>
              <UserCheck size={16} className="text-[#C29656]" />
            </div>
            <div className="flex flex-col gap-2.5">
              {categoryStats.slice(0, 4).map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-[12px] font-bold text-[#1A1D1B] capitalize">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#646A66]">{cat.count}x</span>
                    <span className="text-[10px] font-semibold text-[#94a3b8]">{formatRupiah(cat.omzet)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Sub Components ──────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, positive, accentColor, bar }) => (
  <div className="bg-white rounded-[1.5rem] p-5 shadow-[0_4px_24px_rgb(0,0,0,0.05)] hover:shadow-md transition-shadow flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-bold text-[#646A66] uppercase tracking-wider">{label}</p>
      <div className={`w-8 h-8 rounded-xl ${accentColor} flex items-center justify-center text-white`}>
        {icon}
      </div>
    </div>
    <div>
      <p className="text-2xl font-extrabold text-[#1A1D1B] tracking-tight leading-none">{value}</p>
      <div className="flex items-center gap-1 mt-1.5">
        {positive
          ? <ArrowUpRight size={11} className="text-[#347B5A]" />
          : <TrendingDown size={11} className="text-red-500" />}
        <p className={`text-[11px] font-semibold ${positive ? 'text-[#347B5A]' : 'text-red-500'}`}>{sub}</p>
      </div>
    </div>
    <div className="flex items-end gap-[2px] h-7">
      {bar.map((h, i) => (
        <div
          key={i}
          className={`flex-1 rounded-t-sm ${accentColor}`}
          style={{ height: `${h}%`, opacity: i === bar.length - 1 ? 1 : 0.3 }}
        />
      ))}
    </div>
  </div>
);

const QuickStatCard = ({ icon, label, value, barColor, progress }) => (
  <div className="bg-white rounded-[1.25rem] p-4 shadow-[0_4px_24px_rgb(0,0,0,0.05)] hover:shadow-md transition-shadow">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: `${barColor}18`, color: barColor }}>
      {icon}
    </div>
    <p className="text-[10px] font-bold text-[#646A66] uppercase tracking-wide">{label}</p>
    <p className="text-lg font-extrabold text-[#1A1D1B] mt-0.5 leading-tight">{value}</p>
    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: barColor }}
      />
    </div>
  </div>
);

const STATUS_META = {
  pending:      { label: 'Menunggu',      color: '#C29656', bg: 'bg-amber-50',    text: 'text-amber-700' },
  awaiting_dp:  { label: 'Menunggu DP',   color: '#607d6e', bg: 'bg-[#EAF4EF]',  text: 'text-[#347B5A]' },
  validated:    { label: 'Tervalidasi',   color: '#6366f1', bg: 'bg-indigo-50',   text: 'text-indigo-600' },
  dp_confirmed: { label: 'DP Confirmed',  color: '#8b5cf6', bg: 'bg-purple-50',   text: 'text-purple-600' },
  cetak:        { label: 'Cetak',         color: '#0ea5e9', bg: 'bg-sky-50',      text: 'text-sky-600' },
  finishing:    { label: 'Finishing',     color: '#f97316', bg: 'bg-orange-50',   text: 'text-orange-600' },
  packing:      { label: 'Packing',       color: '#14b8a6', bg: 'bg-teal-50',     text: 'text-teal-600' },
  ready:        { label: 'Siap',          color: '#607d6e', bg: 'bg-[#EAF4EF]',  text: 'text-[#607d6e]' },
  done:         { label: 'Selesai',       color: '#347B5A', bg: 'bg-[#EAF4EF]',  text: 'text-[#347B5A]' },
  rejected:     { label: 'Ditolak',       color: '#ef4444', bg: 'bg-red-50',      text: 'text-red-600' },
};

const ProductionStatusBreakdown = ({ statusCounts, total }) => {
  const entries = Object.entries(statusCounts)
    .map(([status, count]) => ({ status, count, ...(STATUS_META[status] || { label: status, color: '#94a3b8', bg: 'bg-slate-50', text: 'text-slate-500' }) }))
    .sort((a, b) => b.count - a.count);

  if (entries.length === 0) return <p className="text-sm text-[#646A66] font-medium text-center py-4">Belum ada data</p>;

  const safeTotal = total || 1;
  return (
    <div className="flex flex-col gap-2.5">
      {entries.map(({ status, count, label, color, bg, text }) => (
        <div key={status} className="flex items-center gap-2.5">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${bg} ${text} shrink-0 w-[80px] text-center`}>
            {label}
          </span>
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(count / safeTotal * 100)}%`, backgroundColor: color }} />
          </div>
          <span className="text-[12px] font-extrabold text-[#1A1D1B] w-4 text-right shrink-0">{count}</span>
        </div>
      ))}
    </div>
  );
};
