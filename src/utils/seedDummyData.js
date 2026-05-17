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
  { name: 'Cetak Buku A5 Full Color', unit: 'Buku', basePrice: 25000,  category: 'Buku', isLembar: false, hasDim: false },
  { name: 'Banner Vinyl',             unit: 'Pcs',  basePrice: 18000,  category: 'Outdoor', isLembar: false, hasDim: true, dimUnit: 'm' },
  { name: 'Kartu Nama Premium',       unit: 'Box',  basePrice: 45000,  category: 'Print', isLembar: false, hasDim: false },
  { name: 'Undangan Pernikahan',      unit: 'Lembar',basePrice: 3500,  category: 'Offset', isLembar: true, hasDim: false },
  { name: 'Nota Custom 3 Ply',        unit: 'Buku', basePrice: 35000,  category: 'Offset', isLembar: false, hasDim: false },
  { name: 'Cetak Foto 4R',            unit: 'Lembar',basePrice: 2500,  category: 'Print', isLembar: true, hasDim: false },
  { name: 'Stiker Cutting Vinyl',     unit: 'Lembar',basePrice: 75000, category: 'Laser', isLembar: true, hasDim: true, dimUnit: 'cm' },
  { name: 'Brosur A4 2 Sisi',         unit: 'Lembar',basePrice: 1500,  category: 'Umum', isLembar: true, hasDim: false },
  { name: 'Roll Up Banner',           unit: 'Pcs',  basePrice: 350000, category: 'Indoor', isLembar: false, hasDim: true, dimUnit: 'cm' },
  { name: 'Mug Print Custom',         unit: 'Pcs',  basePrice: 55000,  category: 'Barang', isLembar: false, hasDim: false },
  { name: 'Kaos Sablon DTF',          unit: 'Pcs',  basePrice: 85000,  category: 'Barang', isLembar: false, hasDim: false },
  { name: 'Backdrop Foto',            unit: 'Pcs',  basePrice: 250000, category: 'Indoor', isLembar: false, hasDim: true, dimUnit: 'm' },
  { name: 'Akrilik Laser Custom',     unit: 'Pcs',  basePrice: 120000, category: 'Laser', isLembar: false, hasDim: true, dimUnit: 'cm' },
  { name: 'Cetak Kanvas',             unit: 'Pcs',  basePrice: 95000,  category: 'Print', isLembar: false, hasDim: true, dimUnit: 'cm' },
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

  for (let i = 0; i < 40; i++) {
    const product = randomItem(PRODUCTS);
    const qty     = randomBetween(5, 100);
    const createdAt  = daysAgo(randomBetween(0, 14));
    const status     = randomItem(STATUSES);

    let p = null, l = null, luas = null, keliling = null;
    let baseTotal = product.basePrice * qty;
    
    if (product.hasDim) {
      if (product.dimUnit === 'm') {
        p = randomBetween(1, 5); l = randomBetween(1, 4);
      } else {
        p = randomBetween(20, 200); l = randomBetween(20, 150);
      }
      luas = p * l;
      keliling = 2 * (p + l);
      baseTotal = luas * product.basePrice * qty;
    }

    let ongkos_potong = 0;
    if (product.isLembar) {
      ongkos_potong = randomBetween(20, 100) * 100; // 2k - 10k
    }

    const needs_design = Math.random() > 0.6;
    let design_price = 0;
    let designer_email = null;
    if (needs_design) {
      design_price = randomBetween(2, 15) * 10000;
      designer_email = 'desainer@trigara.com';
    }

    const totalPrice = baseTotal + ongkos_potong + design_price;
    const costPerUnit = Math.round(product.basePrice * 0.65);
    let orderProfit = Math.max(0, totalPrice - (costPerUnit * qty * (luas || 1)));

    let dpAmount = null;
    let dpConfirmedAt = null;
    let paidAt = null;

    if (['dp_confirmed','cetak','finishing','packing','done'].includes(status)) {
      dpAmount = Math.round(totalPrice * 0.5);
      dpConfirmedAt = createdAt;
    }
    if (status === 'done') {
      paidAt = createdAt;
    }

    const orderRef = doc(collection(db, 'orders'));

    batch.set(orderRef, {
      customer_name:  randomItem(CUSTOMERS),
      customer_phone: `08${randomBetween(100000000, 999999999)}`,
      product_name:   product.name,
      product_unit:   product.unit,
      kategori_produk: product.category,
      quantity:       qty,
      
      panjang: p,
      lebar: l,
      luas,
      keliling,
      dimension_unit: product.hasDim ? product.dimUnit : null,
      
      ongkos_potong,
      needs_design,
      designer_email,
      design_price,

      product_cost_per_unit: costPerUnit,
      product_sell_price: product.basePrice,
      total_price:    totalPrice,
      profit:         orderProfit,
      
      dp_amount:      dpAmount,
      status,
      notes:          i % 5 === 0 ? 'Tolong dikerjakan cepat.' : '',
      cs_email:       'cs@trigara.com',
      
      cetak_by: ['cetak','finishing','packing','done'].includes(status) ? 'produksi@trigara.com' : null,
      finishing_by: ['finishing','packing','done'].includes(status) ? 'produksi@trigara.com' : null,
      
      created_at:     createdAt,
      updated_at:     createdAt,
      dp_confirmed_at: dpConfirmedAt,
      paid_at: paidAt,
    });
    count++;
    if (count % 20 === 0) await batch.commit();
  }

  await batch.commit();
  return count;
}

export async function clearDummyData() {
  const collectionsToClear = ['orders', 'pengeluaran', 'activity_logs'];
  let totalDeleted = 0;

  for (const colName of collectionsToClear) {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);
    
    const batches = [];
    let batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
      count++;
      totalDeleted++;
      if (count === 490) { // Limit firestore batch to 500
        batches.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    });

    if (count > 0) {
      batches.push(batch.commit());
    }

    await Promise.all(batches);
  }

  return totalDeleted;
}
