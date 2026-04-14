import React from 'react';

const STATUS_CONFIG = {
  pending:      { label: 'Menunggu',      bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  validated:    { label: 'Divalidasi',    bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  rejected:     { label: 'Ditolak',       bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'    },
  dp_confirmed: { label: 'DP Lunas',      bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  cetak:        { label: 'Proses Cetak',  bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
  finishing:    { label: 'Finishing',     bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-500' },
  packing:      { label: 'Packing',       bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  done:         { label: 'Selesai',       bg: 'bg-[#EAF4EF]',  text: 'text-[#347B5A]',  dot: 'bg-[#347B5A]'  },
};

export const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${textSize} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

export const STATUS_LABELS = STATUS_CONFIG;
