import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api';

// SOL价格Hook - 优化版本
export const useSolPrice = (enableAutoRefresh: boolean = true) => {
  const [solPrice, setSolPrice] = useState<number>(135); // 默认价格
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 获取SOL价格
  const fetchSolPrice = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
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
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // 手动刷新价格（用于配置时按需获取）
  const refreshPrice = useCallback(() => {
    fetchSolPrice(true);
  }, [fetchSolPrice]);

  // 初始化和定时更新
  useEffect(() => {
    // 立即获取一次（显示loading）
    fetchSolPrice(true);

    // 只有启用自动刷新时才设置定时器
    if (!enableAutoRefresh) {
      return;
    }

    // 每15秒更新一次价格（不显示loading）
    const interval = setInterval(() => fetchSolPrice(false), 15000);

    // 清理定时器
    return () => clearInterval(interval);
  }, [fetchSolPrice, enableAutoRefresh]);

  return {
    solPrice,
    loading,
    error,
    lastUpdated,
    refreshPrice, // 新增：手动刷新价格
    refetch: refreshPrice, // 保持向后兼容
  };
};
