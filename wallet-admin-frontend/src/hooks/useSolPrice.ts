import { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/api';

// SOL价格Hook - 优化版本，降低API请求频率
export const useSolPrice = (enableAutoRefresh: boolean = true) => {
  const [solPrice, setSolPrice] = useState<number>(135); // 默认价格
  const [loading, setLoading] = useState(false); // 改为false，避免初始加载态
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<string>('缓存');

  // 获取SOL价格
  const fetchSolPrice = useCallback(async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      console.log('🔄 Hook: 开始获取SOL价格...');
      
      const price = await ApiService.getSolPrice();
      setSolPrice(price);
      setLastUpdated(new Date());
      setDataSource('API');
      
      console.log(`✅ Hook: SOL价格更新成功: $${price.toFixed(4)}`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取SOL价格失败';
      setError(errorMessage);
      console.error('❌ Hook: 获取SOL价格失败:', err);
      
      // 失败时使用缓存价格
      const cachedPrice = ApiService.getCachedSolPrice();
      if (cachedPrice > 0) {
        setSolPrice(cachedPrice);
        setDataSource('缓存');
        console.log(`💾 Hook: 使用缓存价格: $${cachedPrice.toFixed(2)}`);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // 手动刷新价格（用于配置时按需获取）
  const refreshPrice = useCallback(() => {
    console.log('🔄 Hook: 手动刷新价格...');
    fetchSolPrice(true);
  }, [fetchSolPrice]);

  // 初始化和定时更新
  useEffect(() => {
    // 先尝试获取缓存价格
    const cachedPrice = ApiService.getCachedSolPrice();
    if (cachedPrice > 0) {
      setSolPrice(cachedPrice);
      setDataSource('缓存');
      console.log(`💾 Hook: 初始化使用缓存价格: $${cachedPrice.toFixed(2)}`);
    }
    
    // 立即获取一次新价格（不显示loading，避免界面闪烁）
    fetchSolPrice(false);

    // 只有启用自动刷新时才设置定时器
    if (!enableAutoRefresh) {
      console.log('⏸️ Hook: 自动刷新已禁用');
      return;
    }

    // 每60秒更新一次价格（降低频率避免API限制）
    console.log('⏰ Hook: 设置定时器，每60秒更新价格');
    const interval = setInterval(() => {
      console.log('⏰ Hook: 定时器触发，更新价格...');
      fetchSolPrice(false);
    }, 60000); // 改为60秒

    // 清理定时器
    return () => {
      console.log('🧹 Hook: 清理定时器');
      clearInterval(interval);
    };
  }, [fetchSolPrice, enableAutoRefresh]);

  // 页面可见性变化时刷新价格
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enableAutoRefresh) {
        console.log('👁️ Hook: 页面重新可见，刷新价格...');
        fetchSolPrice(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSolPrice, enableAutoRefresh]);

  return {
    solPrice,
    loading,
    error,
    lastUpdated,
    dataSource, // 新增：数据来源信息
    refreshPrice, // 手动刷新价格
    refetch: refreshPrice, // 保持向后兼容
  };
};
