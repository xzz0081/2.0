import { useState, useEffect } from 'react';
import ApiService from '../services/api';

// SOL价格Hook
export const useSolPrice = () => {
  const [solPrice, setSolPrice] = useState<number>(135); // 默认价格
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取SOL价格
  const fetchSolPrice = async (isInitial: boolean = false) => {
    try {
      // 只在初始加载时显示loading
      if (isInitial) {
        setLoading(true);
      }
      setError(null);
      const price = await ApiService.getSolPrice();
      setSolPrice(price);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取SOL价格失败');
      console.error('获取SOL价格失败:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // 初始化和定时更新
  useEffect(() => {
    // 立即获取一次（显示loading）
    fetchSolPrice(true);

    // 每5秒更新一次价格（不显示loading）
    const interval = setInterval(() => fetchSolPrice(false), 5000);

    // 清理定时器
    return () => clearInterval(interval);
  }, []);

  return {
    solPrice,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchSolPrice(true),
  };
};
