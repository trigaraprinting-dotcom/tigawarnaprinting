import { collection, doc, writeBatch, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const DEFAULT_CATEGORIES = [
  { nama: 'Umum',    slug: 'umum',    icon: 'Package', color: '#607d6e' },
  { nama: 'Indoor',  slug: 'indoor',  icon: 'Home',    color: '#5b7fa6' },
  { nama: 'Laser',   slug: 'laser',   icon: 'Zap',     color: '#8b5cf6' },
  { nama: 'Offset',  slug: 'offset',  icon: 'Layers',  color: '#c2773a' },
  { nama: 'Buku',    slug: 'buku',    icon: 'BookOpen',color: '#347B5A' },
  { nama: 'Outdoor', slug: 'outdoor', icon: 'Sun',     color: '#d4a017' },
  { nama: 'Barang',  slug: 'barang',  icon: 'Box',     color: '#e05a5a' },
  { nama: 'Print',   slug: 'print',   icon: 'Printer', color: '#1A1D1B' },
];

/**
 * Seed the 8 default categories if they don't exist yet.
 * Safe to call multiple times (idempotent).
 */
export async function seedDefaultCategories() {
  const colRef = collection(db, 'kategori_produksi');
  const existing = await getDocs(query(colRef, where('is_default', '==', true)));
  if (existing.size >= DEFAULT_CATEGORIES.length) return;

  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach(cat => {
    const ref = doc(colRef, cat.slug); // use slug as doc ID so it's idempotent
    batch.set(ref, { ...cat, is_default: true, created_at: new Date() });
  });
  await batch.commit();
}

export { DEFAULT_CATEGORIES };

// ─── Order dummy seeder ──────────────────────────────────────────────────────

const CUSTOMERS = [
  'PT. Maju Bersama', 'CV. Karya Indah', 'Budi Santoso', 'Dina Mega Corp',
  'Sekolah Harapan Bangsa', 'Universitas Nusantara', 'Toko Sempurna',
  'UD. Aneka Usaha', 'Klinik Sehat Selalu', 'Event Organizer Prima',
  'Yayasan Peduli', 'PT. Globalindo', 'Ibu Sari', 'Pak Hendra',
];

const PRODUCTS = [
  { name: 'Cetak Buku A5 Full Color', unit: 'eksemplar', basePrice: 25000,  category: 'buku'    },
  { name: 'Banner Vinyl 4x2m',         unit: 'pcs',       basePrice: 180000, category: 'outdoor' },
  { name: 'Kartu Nama Premium',         unit: 'kotak',     basePrice: 45000,  category: 'print'   },
  { name: 'Undangan Pernikahan',        unit: 'lembar',    basePrice: 3500,   category: 'offset'  },
  { name: 'Nota Custom 3 Ply',          unit: 'buku',      basePrice: 35000,  category: 'offset'  },
  { name: 'Cetak Foto 4R',              unit: 'lembar',    basePrice: 2500,   category: 'print'   },
  { name: 'Stiker Cutting Vinyl',       unit: 'set',       basePrice: 75000,  category: 'laser'   },
  { name: 'Brosur A4 2 Sisi',           unit: 'lembar',    basePrice: 1500,   category: 'umum'    },
  { name: 'Roll Up Banner 160x60',      unit: 'pcs',       basePrice: 350000, category: 'indoor'  },
  { name: 'Mug Print Custom',           unit: 'pcs',       basePrice: 55000,  category: 'barang'  },
  { name: 'Kaos Sablon DTF',            unit: 'pcs',       basePrice: 85000,  category: 'barang'  },
  { name: 'Backdrop Foto 3x2m',         unit: 'pcs',       basePrice: 250000, category: 'indoor'  },
  { name: 'Akrilik Laser Custom',       unit: 'pcs',       basePrice: 120000, category: 'laser'   },
  { name: 'Cetak Kanvas 40x60',         unit: 'pcs',       basePrice: 95000,  category: 'print'   },
];

const STATUSES = ['pending','validated','dp_confirmed','cetak','finishing','packing','done','done','done'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedDummyData() {
  const batch = writeBatch(db);
  let count = 0;

  for (let i = 0; i < 30; i++) {
    const product = randomItem(PRODUCTS);
    const qty     = randomBetween(10, 500);
    const totalPrice = product.basePrice * qty;
    const createdAt  = daysAgo(randomBetween(0, 30));
    const status     = randomItem(STATUSES);

    let dpAmount = null;
    if (['dp_confirmed','cetak','finishing','packing','done'].includes(status)) {
      dpAmount = Math.round(totalPrice * 0.5);
    }

    const orderRef = doc(collection(db, 'orders'));
    batch.set(orderRef, {
      customer_name:  randomItem(CUSTOMERS),
      customer_phone: `08${randomBetween(100000000, 999999999)}`,
      product_name:   product.name,
      product_unit:   product.unit,
      category:       product.category,
      quantity:       qty,
      total_price:    totalPrice,
      dp_amount:      dpAmount,
      status,
      notes:          i % 4 === 0 ? 'Tolong dikerjakan cepat, deadline mepet.' : '',
      cs_email:       'cs@trigara.com',
      created_at:     createdAt,
      updated_at:     createdAt,
    });
    count++;
    if (count % 20 === 0) await batch.commit();
  }

  await batch.commit();
  return count;
}
