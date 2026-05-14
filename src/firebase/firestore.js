import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

export const ROLES = {
  ADMIN: 'admin',
  CS: 'customer_service',
  VALIDASI: 'petugas_validasi',
  KASIR: 'kasir',
  PRODUKSI: 'petugas_produksi'
};

export const ORDER_STATUS = {
  AWAITING_DP: 'awaiting_dp',
  PENDING: 'pending',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
  DP_CONFIRMED: 'dp_confirmed',
  DESIGNING: 'designing',
  CETAK: 'cetak',
  FINISHING: 'finishing',
  PACKING: 'packing',
  READY: 'ready',
  DONE: 'done'
};

export const createOrder = async (orderData) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      status: orderData.status || ORDER_STATUS.PENDING,
      ...orderData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const logActivity = async (action, details, user) => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      action,
      details,
      user_email: user?.email || 'System',
      user_role: user?.role || 'Unknown',
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};


export const updateOrderStatus = async (orderId, newStatus, additionalData = {}) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updated_at: serverTimestamp(),
      ...additionalData
    });
    return true;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const listenToOrders = (filters, callback) => {
  let q = collection(db, 'orders');
  
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      q = query(q, where('status', 'in', filters.status));
    } else {
      q = query(q, where('status', '==', filters.status));
    }
  } else if (filters.cs_id) {
    q = query(q, where('cs_id', '==', filters.cs_id));
  }
  
  // Note: we can map without orderBy first to avoid missing composite indexes error in development,
  // then sort it on the client side since data might be small initially.
  
  return onSnapshot(q, (snapshot) => {
    let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Client-side sort by created_at (descending)
    orders.sort((a, b) => {
      const getTime = (t) => {
          if (!t) return 0;
          if (typeof t.toMillis === 'function') return t.toMillis();
          if (typeof t.getTime === 'function') return t.getTime();
          return new Date(t).getTime() || 0;
      };
      
      const timeA = getTime(a.created_at);
      const timeB = getTime(b.created_at);
      return timeB - timeA;
    });
    callback(orders);
  });
};

export const fetchAllInvoices = async () => {
    // placeholder for kasir
    return [];
};
