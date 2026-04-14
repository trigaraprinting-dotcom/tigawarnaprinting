import { useState, useEffect } from 'react';
import { listenToOrders, createOrder, updateOrderStatus } from '../firebase/firestore';

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

  const addOrder = async (orderData) => {
    setIsUpdating(true);
    try {
      const id = await createOrder(orderData);
      setIsUpdating(false);
      return id;
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
      setIsUpdating(false);
      return true;
    } catch (err) {
      setActionError(err);
      setIsUpdating(false);
      throw err;
    }
  };

  return { addOrder, changeStatus, isUpdating, actionError };
};
