import { useState, useEffect } from 'react';
import { listenToOrders, createOrder, updateOrderStatus, logActivity, updateOrder } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export const useOrdersSnapshot = (filters = {}) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    try {
        const unsubscribe = listenToOrders(filters, (data) => {
            setOrders(data);
            setLoading(false);
            setError(null);
        });

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    } catch (err) {
        setError(err);
        setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return { orders, loading, error };
};

export const useOrderActions = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState(null);
  const { user, role } = useAuth();

  const addOrder = async (orderData) => {
    setIsUpdating(true);
    try {
      const id = await createOrder(orderData);
      await logActivity('CREATE_ORDER', `Membuat pesanan baru: ${orderData.product_name} (${orderData.quantity} ${orderData.product_unit}) untuk ${orderData.customer_name}`, { email: user?.email, role });
      setIsUpdating(false);
      return id;
    } catch (err) {
      setActionError(err);
      setIsUpdating(false);
      throw err;
    }
  };

  const editOrder = async (orderId, orderData) => {
    setIsUpdating(true);
    try {
      await updateOrder(orderId, orderData);
      await logActivity('UPDATE_ORDER', `Mengubah pesanan: ${orderData.product_name} untuk ${orderData.customer_name}`, { email: user?.email, role });
      setIsUpdating(false);
      return true;
    } catch (err) {
      setActionError(err);
      setIsUpdating(false);
      throw err;
    }
  };

  const changeStatus = async (orderId, newStatus, additionalData = {}) => {
    setIsUpdating(true);
    try {
      await updateOrderStatus(orderId, newStatus, additionalData);
      await logActivity('UPDATE_STATUS', `Mengubah status pesanan menjadi: ${newStatus.replace(/_/g, ' ').toUpperCase()}`, { email: user?.email, role });
      setIsUpdating(false);
      return true;
    } catch (err) {
      setActionError(err);
      setIsUpdating(false);
      throw err;
    }
  };

  return { addOrder, editOrder, changeStatus, isUpdating, actionError };
};
