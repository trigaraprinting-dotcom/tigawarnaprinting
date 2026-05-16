import React, { useMemo, useState, useEffect } from 'react';
import { useOrdersSnapshot } from '../../hooks/useOrders';
import { ORDER_STATUS } from '../../firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebaseConfig';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { seedDummyData, clearDummyData } from '../../utils/seedDummyData';
import {
  TrendingUp, TrendingDown, Users, ShoppingBag, PackageCheck,
  RefreshCw, ArrowUpRight, Activity, ChevronRight, BarChart2,
  Trophy, Medal, Crown, Tag, Sun, Moon, Sunrise,
  DollarSign, CheckCircle, UserCheck, Layers, Info
} from 'lucide-react';
import { Modal } from '../../components/Modal';

// ─── Helpers ────────────────────────────────────────────────────
const formatRupiah = (val) => {
  if (!val || val === 0) return 'Rp 0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const sign = isNegative ? '-Rp\u00A0' : 'Rp\u00A0';
  if (absVal >= 1_000_000_000) return `${sign}${(absVal / 1_000_000_000).toFixed(1)}M`;
  if (absVal >= 1_000_000) return `${sign}${(absVal / 1_000_000).toFixed(1)}jt`;
  if (absVal >= 1_000) return `${sign}${(absVal / 1_000).toFixed(0)}rb`;
  return `${sign}${absVal}`;
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

const formatInputDate = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
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
        <p className="text-xs font-bold text-[#646A66] mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-sm font-semibold text-[#1A1D1B] mb-1 last:mb-0">
            <span className="uppercase text-[10px] text-[#64748b]">{entry.dataKey === 'omzet' ? 'Omzet' : 'Profit'}</span>
            <span>{formatRupiahFull(entry.value)}</span>
          </div>
        ))}
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
  const { user, role } = useAuth();
  const { orders, loading } = useOrdersSnapshot({});
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('30 Hari Terakhir');
  const [filterStart, setFilterStart] = useState(() => formatInputDate(new Date(Date.now() - 29 * 86400000)));
  const [filterEnd, setFilterEnd] = useState(() => formatInputDate(new Date()));
  const [logs, setLogs] = useState([]);
  const [pengeluaranData, setPengeluaranData] = useState([]);
  const [showHppModal, setShowHppModal] = useState(false);

  const applyPreset = (value) => {
    const today = new Date();
    let start = '';
    let end = '';

    if (value === 'Hari Ini') {
      start = formatInputDate(today);
      end = formatInputDate(today);
    }
    if (value === 'Bulan Ini') {
      start = formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1));
      end = formatInputDate(today);
    }
    if (value === '30 Hari Terakhir') {
      start = formatInputDate(new Date(Date.now() - 29 * 86400000));
      end = formatInputDate(today);
    }
    if (value === 'Semua Waktu') {
      start = '';
      end = '';
    }

    setFilterPeriod(value);
    setFilterStart(start);
    setFilterEnd(end);
  };

  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('created_at', 'desc'), limit(1000));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'pengeluaran'), orderBy('tanggal', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setPengeluaranData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleClear = async () => {
    if(!window.confirm("Yakin ingin menghapus seluruh data transaksi (Pesanan, Pengeluaran, Log)?\n\nMaster data seperti Kategori, Produk, dan User akan tetap aman. Aksi ini tidak dapat dibatalkan.")) return;
    setSeeding(true);
    setSeedMsg('Membersihkan data...');
    try {
      const deleted = await clearDummyData();
      setSeedMsg(`${deleted} dokumen berhasil dihapus!`);
      setTimeout(() => setSeedMsg(''), 5000);
    } catch (e) {
      setSeedMsg('Gagal: ' + e.message);
    }
    setSeeding(false);
  };

  // ── Worker Leaderboard from logs ─────────────────────────────
  const leaderboard = useMemo(() => {
    const parseTimestamp = (ts) => {
      if (!ts) return null;
      if (typeof ts.toMillis === 'function') return new Date(ts.toMillis());
      if (typeof ts.toDate === 'function') return ts.toDate();
      return new Date(ts);
    };

    const start = filterStart ? new Date(`${filterStart}T00:00:00`) : null;
    const end = filterEnd ? new Date(`${filterEnd}T23:59:59.999`) : null;

    const statsMap = {};
    logs.forEach(log => {
      const logDate = parseTimestamp(log.created_at);
      if (logDate && start && logDate < start) return;
      if (logDate && end && logDate > end) return;

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
  }, [logs, filterStart, filterEnd]);

  const filteredOrders = useMemo(() => {
    const parseTimestamp = (ts) => {
      if (!ts) return null;
      if (typeof ts.toMillis === 'function') return new Date(ts.toMillis());
      if (typeof ts.toDate === 'function') return ts.toDate();
      return new Date(ts);
    };

    const start = filterStart ? new Date(`${filterStart}T00:00:00`) : null;
    const end = filterEnd ? new Date(`${filterEnd}T23:59:59.999`) : null;

    return orders.filter(o => {
      const created = parseTimestamp(o.created_at);
      if (!created) return false;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });
  }, [orders, filterStart, filterEnd]);

  // ── Category breakdown ───────────────────────────────────────
  const categoryStats = useMemo(() => {
    const catMap = {};
    filteredOrders.forEach(o => {
      const cat = o.kategori_produk || 'Umum';
      if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, omzet: 0 };
      catMap[cat].count += 1;
      catMap[cat].omzet += Number(o.total_price || 0);
    });
    return Object.values(catMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  // ── Product breakdown ───────────────────────────────────────
  const productStats = useMemo(() => {
    const prodMap = {};
    filteredOrders.forEach(o => {
      const name = o.product_name || 'Tidak Diketahui';
      const cat = o.kategori_produk || 'Umum';
      const key = `${name}-${cat}`;
      if (!prodMap[key]) prodMap[key] = { name, category: cat, count: 0, omzet: 0 };
      prodMap[key].count += Number(o.quantity || 1);
      prodMap[key].omzet += Number(o.total_price || 0);
    });
    return Object.values(prodMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredOrders]);

  // ── Main stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const parseTimestamp = (ts) => {
      if (!ts) return null;
      if (typeof ts.toMillis === 'function') return new Date(ts.toMillis());
      if (typeof ts.toDate === 'function') return ts.toDate();
      return new Date(ts);
    };

    const startDate = filterStart ? new Date(`${filterStart}T00:00:00`) : null;
    const endDate = filterEnd ? new Date(`${filterEnd}T23:59:59.999`) : null;
    const inRange = (date) => {
      if (!date) return false;
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      return true;
    };

    const rangeLengthMs = startDate && endDate ? (endDate.getTime() - startDate.getTime() + 1) : 0;
    const prevStart = startDate && endDate ? new Date(startDate.getTime() - rangeLengthMs) : null;
    const prevEnd = startDate ? new Date(startDate.getTime() - 1) : null;

    let totalOmzet = 0;
    let totalProfit = 0;
    let prevOmzet = 0;
    let totalPengeluaran = 0;
    let totalPengeluaranManual = 0;
    let clientSet = new Set();
    let activeCount = 0;
    let selesaiCount = 0;
    const chartDataMap = {};
    const hppBreakdownMap = {};

    const addEvent = (date, amount, orderProfit, totalPrice) => {
      if (!date || amount <= 0) return;
      const eventDate = parseTimestamp(date);
      if (!eventDate) return;
      const profitShare = totalPrice > 0 ? (amount / totalPrice) * orderProfit : 0;
      if (inRange(eventDate)) {
        totalOmzet += amount;
        totalProfit += profitShare;

        const dateStr = startDate && endDate && filterPeriod === 'Hari Ini'
          ? `${eventDate.getHours().toString().padStart(2, '0')}:00`
          : eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { name: dateStr, omzet: 0, profit: 0, ms: eventDate.getTime() };
        chartDataMap[dateStr].omzet += amount;
        chartDataMap[dateStr].profit += profitShare;
      }

      if (prevStart && prevEnd && eventDate >= prevStart && eventDate <= prevEnd) {
        prevOmzet += amount;
      }
    };

    orders.forEach(o => {
      const createdAt = parseTimestamp(o.created_at);
      const isCreatedInRange = createdAt && (!startDate || createdAt >= startDate) && (!endDate || createdAt <= endDate);
      
      const quantity = Number(o.quantity || 0);
      const costPerUnit = Number(o.product_cost_per_unit || 0);

      if (isCreatedInRange) {
        clientSet.add(o.customer_name);
        if (o.status === ORDER_STATUS.DONE || o.status === 'done') selesaiCount++;
        if (['cetak', 'finishing', 'packing', ORDER_STATUS.CETAK, ORDER_STATUS.FINISHING, ORDER_STATUS.PACKING].includes(o.status)) {
          activeCount++;
        }
        
        // Pengeluaran: hitung semua pesanan yg tidak dibatalkan
        if (o.status !== ORDER_STATUS.REJECTED && o.status !== 'rejected') {
          const hpp = costPerUnit * quantity;
          totalPengeluaran += hpp;
          
          if (hpp > 0) {
            const name = o.product_name || 'Tidak Diketahui';
            if (!hppBreakdownMap[name]) hppBreakdownMap[name] = { name, count: 0, totalHpp: 0 };
            hppBreakdownMap[name].count += quantity;
            hppBreakdownMap[name].totalHpp += hpp;
          }
        }
      }

      const totalPrice = Number(o.total_price || 0);
      const sellPrice = Number(o.product_sell_price || 0);
      
      let orderProfit = (sellPrice - costPerUnit) * quantity;
      const dpAmount = Number(o.dp_amount || 0);
      const remaining = Math.max(0, totalPrice - dpAmount);

      if (o.dp_confirmed_at && dpAmount > 0) {
        addEvent(o.dp_confirmed_at, dpAmount, orderProfit, totalPrice);
      }
      if (o.paid_at) {
        const paidAmount = dpAmount > 0 ? remaining : totalPrice;
        addEvent(o.paid_at, paidAmount, orderProfit, totalPrice);
      }
    });

    pengeluaranData.forEach(p => {
      const pDate = p.tanggal?.toDate ? p.tanggal.toDate() : new Date(p.tanggal);
      if (inRange(pDate)) {
        const amt = Number(p.jumlah) || 0;
        totalPengeluaranManual += amt;
        
        // Kurangi profit harian di grafik
        const dateStr = startDate && endDate && filterPeriod === 'Hari Ini'
          ? `${pDate.getHours().toString().padStart(2, '0')}:00`
          : pDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        if (!chartDataMap[dateStr]) {
          chartDataMap[dateStr] = { name: dateStr, omzet: 0, profit: 0, ms: pDate.getTime() };
        }
        // NOTE: We do not subtract pengeluaran manual from daily profit chart yet per user request.
        // chartDataMap[dateStr].profit -= amt;
      }
    });

    totalPengeluaran += totalPengeluaranManual;
    const grossProfit = totalProfit;
    // totalProfit -= totalPengeluaranManual; // Disabled per user request

    const growth = prevOmzet > 0 ? ((totalOmzet - prevOmzet) / prevOmzet * 100) : null;
    const sortedChart = Object.values(chartDataMap).sort((a, b) => a.ms - b.ms);

    const statusCounts = filteredOrders.reduce((counts, o) => {
      const s = o.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
      return counts;
    }, {});

    const recentOrders = [...filteredOrders].sort((a, b) => {
      const getDate = (ts) => parseTimestamp(ts)?.getTime() || 0;
      return getDate(b.created_at) - getDate(a.created_at);
    }).slice(0, 8);

    return {
      totalOmzet,
      omzetLabel: formatRupiah(totalOmzet),
      totalProfit,
      profitLabel: formatRupiah(totalProfit),
      grossProfitLabel: formatRupiah(grossProfit),
      growth,
      pengeluaranLabel: formatRupiah(totalPengeluaran),
      klienCount: clientSet.size,
      activeProduction: activeCount,
      selesaiCount,
      totalPesanan: filteredOrders.length,
      chartData: sortedChart.length > 0 ? sortedChart : [{ name: 'Belum Ada', omzet: 0, profit: 0 }],
      recentOrders,
      statusCounts,
      hppBreakdown: Object.values(hppBreakdownMap).sort((a,b) => b.totalHpp - a.totalHpp),
    };
  }, [orders, filteredOrders, filterPeriod, filterStart, filterEnd, pengeluaranData]);

  const userName = user?.email?.split('@')[0] || 'Admin';
  const hour = new Date().getHours();
  const GreetIcon = hour < 6 ? Moon : hour < 12 ? Sunrise : hour < 17 ? Sun : Moon;
  const greeting = hour < 6 ? 'Selamat Malam' : hour < 12 ? 'Selamat Pagi' : hour < 17 ? 'Selamat Siang' : 'Selamat Malam';
  const rangeLabel = filterPeriod === 'Rentang Tanggal' ? `${filterStart} sampai ${filterEnd}` : filterPeriod;

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
          <div className="flex items-center gap-4 mt-1.5 ml-8">
            <p className="text-sm font-medium text-[#646A66]">
              Ringkasan untuk {rangeLabel}.
            </p>
            {seedMsg && <span className="text-xs font-bold text-[#e05a5a] bg-red-50 px-3 py-1 rounded-full">{seedMsg}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {role === 'admin' && (
             <button 
                onClick={handleClear} 
                disabled={seeding}
                className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors shrink-0 border border-red-100 disabled:opacity-50"
                title="Hapus Pesanan, Pengeluaran, & Log"
             >
                <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
                {seeding ? 'Memproses...' : 'Kosongkan Transaksi'}
             </button>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <label className="flex flex-col gap-2 text-xs text-[#1A1D1B] font-semibold">
              Dari
              <input
                type="date"
                value={filterStart}
                onChange={(e) => { setFilterStart(e.target.value); setFilterPeriod('Rentang Tanggal'); }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#1A1D1B] outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs text-[#1A1D1B] font-semibold">
              Sampai
              <input
                type="date"
                value={filterEnd}
                onChange={(e) => { setFilterEnd(e.target.value); setFilterPeriod('Rentang Tanggal'); }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-[#1A1D1B] outline-none"
              />
            </label>
          </div>
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#607d6e]/10 flex items-center justify-center">
                  <BarChart2 size={18} className="text-[#607d6e]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1D1B]">Grafik Omzet</h3>
                  <p className="text-xs font-medium text-[#646A66]">Omzet berdasarkan tanggal pembayaran</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <span className="text-4xl font-extrabold text-[#1A1D1B] tracking-tight">{stats.omzetLabel}</span>
                  <p className="text-sm font-semibold text-[#646A66] mt-1">{rangeLabel}</p>
                </div>
                {stats.growth !== null && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${stats.growth >= 0 ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-red-50 text-red-600'}`}>
                    {stats.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradOmzet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#607d6e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#607d6e" stopOpacity={0.04} />
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

            <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-[#347B5A]/10 flex items-center justify-center">
                  <DollarSign size={18} className="text-[#347B5A]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#1A1D1B]">Grafik Profit</h3>
                  <p className="text-xs font-medium text-[#646A66]">Profit dihitung dari harga jual dikurangi harga modal</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <span className="text-4xl font-extrabold text-[#1A1D1B] tracking-tight">{stats.profitLabel}</span>
                  <p className="text-sm font-semibold text-[#646A66] mt-1">{rangeLabel}</p>
                </div>
                {stats.growth !== null && (
                  <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${stats.growth >= 0 ? 'bg-[#EAF4EF] text-[#347B5A]' : 'bg-red-50 text-red-600'}`}>
                    {stats.growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(1)}%
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#347B5A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#347B5A" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : `${(v / 1_000).toFixed(0)}rb`}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="profit" stroke="#347B5A" strokeWidth={2.5}
                    fill="url(#gradProfit)" dot={false} activeDot={{ r: 5, fill: '#347B5A', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown (Full Width Grid) */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-6 mb-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {categoryStats.map((cat, i) => {
                  const maxCount = categoryStats[0]?.count || 1;
                  const pct = Math.round(cat.count / maxCount * 100);
                  return (
                    <div key={cat.name} className="flex flex-col gap-3 p-5 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}15` }}
                        >
                          <Layers size={20} style={{ color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        </div>
                        <div className="text-right">
                          <span className="text-[18px] font-black text-[#1A1D1B] leading-none">{cat.count}</span>
                          <p className="text-[11px] font-bold text-[#94a3b8] mt-1">Pesanan</p>
                        </div>
                      </div>
                      
                      <div className="mt-1">
                        <h4 className="text-[14px] font-bold text-[#1A1D1B] capitalize mb-3 leading-snug">{cat.name}</h4>
                        <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
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

        </div>

        {/* ══ RIGHT SIDEBAR ══════════════════════════════ */}
        <div className="w-full xl:w-[300px] shrink-0 flex flex-col gap-5">

          {/* Status Produksi */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Status Produksi</h3>
              <PackageCheck size={16} className="text-[#607d6e]" />
            </div>
            <ProductionStatusBreakdown statusCounts={stats.statusCounts} total={stats.totalPesanan} />
          </div>

          {/* Laba Kotor card */}
          {/* <div className="bg-gradient-to-br from-[#347B5A] to-[#255C42] rounded-[1.75rem] p-5 text-white relative overflow-hidden shadow-xl shadow-[#347B5A]/25">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-white/70" />
                <p className="text-[12px] font-semibold text-white/80">Laba Kotor</p>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">{stats.grossProfitLabel}</h3>
              <p className="text-[11px] font-medium text-white/60 mt-2">
                Omzet dikurangi HPP (Modal Produk)
              </p>
            </div>
            <svg className="absolute bottom-4 right-2 w-44 h-20 stroke-white/10" fill="none" strokeWidth="3" strokeLinecap="round">
              <path d="M0,35 Q20,15 40,35 T80,35 T120,25 T176,38" />
            </svg>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
          </div> */}

          {/* Pengeluaran card */}
          <div className="bg-gradient-to-br from-[#e05a5a] to-[#c94949] rounded-[1.75rem] p-5 text-white relative overflow-hidden shadow-xl shadow-red-500/25">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingDown size={14} className="text-white/70" />
                  <p className="text-[12px] font-semibold text-white/80">Pengeluaran (HPP)</p>
                </div>
                <button onClick={() => setShowHppModal(true)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title="Lihat Rincian HPP">
                  <Info size={14} className="text-white" />
                </button>
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight">{stats.pengeluaranLabel}</h3>
              <p className="text-[11px] font-medium text-white/60 mt-2">
                Beban modal pesanan & pengeluaran manual
              </p>
            </div>
            <svg className="absolute bottom-4 right-2 w-44 h-20 stroke-white/10" fill="none" strokeWidth="3" strokeLinecap="round">
              <path d="M0,15 Q20,35 40,15 T80,15 T120,25 T176,8" />
            </svg>
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
          </div>

          {/* Top Produk mini */}
          <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-[#1A1D1B]">Barang Terbeli</h3>
              <ShoppingBag size={16} className="text-[#347B5A]" />
            </div>
            <div className="flex flex-col gap-3">
              {productStats.length === 0 ? (
                 <p className="text-xs text-[#646A66] text-center py-4">Belum ada data</p>
              ) : productStats.map((prod, i) => (
                <div key={prod.name+i} className="flex items-center justify-between border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-black text-[#347B5A]">#{i+1}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-bold text-[#1A1D1B] truncate leading-tight">{prod.name}</span>
                      <span className="text-[10px] font-semibold text-[#94a3b8]">{prod.category}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-[11px] font-extrabold text-[#347B5A] bg-[#EAF4EF] px-2 py-0.5 rounded-lg">{prod.count}x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Recent Orders Table (Full Width) */}
      <div className="bg-white rounded-[1.75rem] shadow-[0_4px_24px_rgb(0,0,0,0.05)] overflow-hidden mt-6">
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

      <Modal open={showHppModal} onClose={() => setShowHppModal(false)} title="Rincian Modal Pesanan (HPP)" size="md">
        <div className="space-y-4">
          <p className="text-sm text-[#646A66] font-medium leading-relaxed">
            Berikut adalah rincian total Harga Pokok Penjualan (HPP) dari barang-barang yang dipesan dalam periode ini. Ini merepresentasikan <b>modal dasar</b> untuk produksi barang.
          </p>
          {stats.hppBreakdown.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-[#646A66]">Belum ada data pesanan (HPP) di periode ini.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left px-4 py-3 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Produk</th>
                      <th className="text-right px-4 py-3 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Qty Terjual</th>
                      <th className="text-right px-4 py-3 text-[11px] font-extrabold text-[#94a3b8] uppercase tracking-wider">Total HPP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.hppBreakdown.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-[#1A1D1B]">{item.name}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#646A66]">{item.count}x</td>
                        <td className="px-4 py-3 text-right font-extrabold text-[#e05a5a]">{formatRupiahFull(item.totalHpp)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 sticky bottom-0 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right font-extrabold text-[#1A1D1B]">TOTAL HPP PRODUKSI</td>
                      <td className="px-4 py-3 text-right font-extrabold text-[#e05a5a]">
                        {formatRupiahFull(stats.hppBreakdown.reduce((acc, curr) => acc + curr.totalHpp, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

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
