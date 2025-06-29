import { useState, useEffect, useCallback, useRef } from 'react';
import ApiService from '../services/api';
import type { WalletConfig } from '../types/api';

// 本地钱包备注管理hook
export interface WalletRemark {
  address: string;
  remark: string;
  updatedAt: number;
  source: 'server' | 'local'; // 备注来源：服务器或本地
}

const STORAGE_KEY = 'wallet_remarks_cache';

export const useWalletRemarks = () => {
  const [remarks, setRemarks] = useState<Record<string, WalletRemark>>({});
  const [isLoading, setIsLoading] = useState(true);
  const isLoadedRef = useRef(false);
  const serverRemarksRef = useRef<Record<string, string>>({});

  // 从localStorage加载缓存的备注数据（异步）
  const loadLocalCache = useCallback(() => {
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRemarks(parsed);
          console.log(`📝 加载了 ${Object.keys(parsed).length} 个缓存备注`);
        }
      } catch (error) {
        console.error('加载钱包备注缓存失败:', error);
      }
    }, 0);
  }, []);

  // 更新服务器端备注引用（从WalletConfig中同步）
  const updateServerRemarks = useCallback((walletConfigs: Record<string, WalletConfig>) => {
    const newServerRemarks: Record<string, string> = {};
    let hasChanges = false;

    Object.values(walletConfigs).forEach(config => {
      if (config.remark) {
        newServerRemarks[config.wallet_address] = config.remark;
        // 检查是否有变化
        if (serverRemarksRef.current[config.wallet_address] !== config.remark) {
          hasChanges = true;
        }
      }
    });

    // 检查是否有删除的备注
    Object.keys(serverRemarksRef.current).forEach(address => {
      if (!newServerRemarks[address]) {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      serverRemarksRef.current = newServerRemarks;
      
      // 合并服务器备注和本地缓存
      setRemarks(prevRemarks => {
        const mergedRemarks: Record<string, WalletRemark> = { ...prevRemarks };
        
        // 添加/更新服务器备注
        Object.entries(newServerRemarks).forEach(([address, remark]) => {
          mergedRemarks[address] = {
            address,
            remark,
            updatedAt: Date.now(),
            source: 'server'
          };
        });
        
        // 移除服务器上已删除的备注，保留纯本地备注
        Object.keys(prevRemarks).forEach(address => {
          if (prevRemarks[address].source === 'server' && !newServerRemarks[address]) {
            delete mergedRemarks[address];
          }
        });
        
        return mergedRemarks;
      });
      
      console.log(`📝 同步了 ${Object.keys(newServerRemarks).length} 个服务器备注`);
    }
  }, []);

  // 保存备注数据到localStorage缓存（防抖）
  const saveCacheDebounced = useCallback((newRemarks: Record<string, WalletRemark>) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newRemarks));
        } catch (error) {
          console.error('保存钱包备注缓存失败:', error);
        }
      });
    } else {
      setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newRemarks));
        } catch (error) {
          console.error('保存钱包备注缓存失败:', error);
        }
      }, 0);
    }
  }, []);

  // 设置或更新钱包备注（同时更新服务器和本地）
  const setWalletRemark = useCallback(async (address: string, remark: string) => {
    const trimmedRemark = remark.trim();
    
    // 立即更新本地状态（乐观更新）
    setRemarks(prevRemarks => {
      const newRemarks = {
        ...prevRemarks,
        [address]: {
          address,
          remark: trimmedRemark,
          updatedAt: Date.now(),
          source: 'local' as const
        }
      };
      
      // 异步保存到localStorage缓存
      saveCacheDebounced(newRemarks);
      
      return newRemarks;
    });

    // 尝试更新服务器端（如果存在该钱包配置）
    try {
      // 先获取当前钱包配置
      const walletConfigs = await ApiService.getWalletConfigurations();
      const currentConfig = walletConfigs[address];
      
      if (currentConfig) {
        // 更新服务器端备注
        const updatedConfig: WalletConfig = {
          ...currentConfig,
          remark: trimmedRemark || null
        };
        
        await ApiService.updateWalletConfiguration(updatedConfig);
        
        // 更新状态标记为服务器来源
        setRemarks(prevRemarks => ({
          ...prevRemarks,
          [address]: {
            address,
            remark: trimmedRemark,
            updatedAt: Date.now(),
            source: 'server'
          }
        }));
        
        console.log(`📝 备注已同步到服务器: ${address}`);
      } else {
        console.log(`📝 钱包配置不存在，备注仅保存在本地: ${address}`);
      }
    } catch (error) {
      console.error('同步备注到服务器失败:', error);
      // 服务器更新失败时保持本地状态，但标记为本地来源
    }
  }, [saveCacheDebounced]);

  // 删除钱包备注
  const removeWalletRemark = useCallback(async (address: string) => {
    // 立即更新本地状态
    setRemarks(prevRemarks => {
      const newRemarks = { ...prevRemarks };
      delete newRemarks[address];
      
      // 异步保存到localStorage缓存
      saveCacheDebounced(newRemarks);
      
      return newRemarks;
    });

    // 尝试删除服务器端备注
    try {
      const walletConfigs = await ApiService.getWalletConfigurations();
      const currentConfig = walletConfigs[address];
      
      if (currentConfig && currentConfig.remark) {
        const updatedConfig: WalletConfig = {
          ...currentConfig,
          remark: null
        };
        
        await ApiService.updateWalletConfiguration(updatedConfig);
        console.log(`📝 服务器备注已删除: ${address}`);
      }
    } catch (error) {
      console.error('删除服务器备注失败:', error);
    }
  }, [saveCacheDebounced]);

  // 获取钱包备注（优先服务器，后备本地）
  const getWalletRemark = useCallback((address: string): string => {
    const remark = remarks[address];
    if (remark && remark.remark) {
      return remark.remark;
    }
    // 返回格式化的地址作为默认显示
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [remarks]);

  // 获取钱包备注（如果没有备注则返回null）
  const getWalletRemarkOrNull = useCallback((address: string): string | null => {
    const remark = remarks[address];
    return remark?.remark || null;
  }, [remarks]);

  // 检查是否有备注
  const hasRemark = useCallback((address: string): boolean => {
    return !!(remarks[address]?.remark);
  }, [remarks]);

  // 获取所有备注
  const getAllRemarks = useCallback(() => {
    return Object.values(remarks);
  }, [remarks]);

  // 清空所有备注（仅本地缓存）
  const clearAllRemarks = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRemarks({});
    isLoadedRef.current = false;
  }, []);

  // 手动重新加载（兼容旧接口）
  const loadRemarks = useCallback(() => {
    loadLocalCache();
  }, [loadLocalCache]);

  // 初始化时加载本地缓存
  useEffect(() => {
    if (!isLoadedRef.current) {
      loadLocalCache();
      setIsLoading(false);
      isLoadedRef.current = true;
    }
  }, [loadLocalCache]);

  return {
    remarks,
    isLoading,
    setWalletRemark,
    removeWalletRemark,
    getWalletRemark,
    getWalletRemarkOrNull,
    hasRemark,
    getAllRemarks,
    clearAllRemarks,
    loadRemarks,
    updateServerRemarks, // 新增：供外部调用以同步服务器备注
  };
};
