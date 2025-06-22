import { useState, useEffect, useCallback } from 'react';

// 本地钱包备注管理hook
export interface WalletRemark {
  address: string;
  remark: string;
  updatedAt: number;
}

const STORAGE_KEY = 'wallet_remarks';

export const useWalletRemarks = () => {
  const [remarks, setRemarks] = useState<Record<string, WalletRemark>>({});

  // 从localStorage加载备注数据
  const loadRemarks = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRemarks(parsed);
      }
    } catch (error) {
      console.error('加载钱包备注失败:', error);
    }
  }, []);

  // 保存备注数据到localStorage
  const saveRemarks = useCallback((newRemarks: Record<string, WalletRemark>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRemarks));
      setRemarks(newRemarks);
    } catch (error) {
      console.error('保存钱包备注失败:', error);
    }
  }, []);

  // 设置或更新钱包备注
  const setWalletRemark = useCallback((address: string, remark: string) => {
    const newRemarks = {
      ...remarks,
      [address]: {
        address,
        remark: remark.trim(),
        updatedAt: Date.now()
      }
    };
    saveRemarks(newRemarks);
  }, [remarks, saveRemarks]);

  // 删除钱包备注
  const removeWalletRemark = useCallback((address: string) => {
    const newRemarks = { ...remarks };
    delete newRemarks[address];
    saveRemarks(newRemarks);
  }, [remarks, saveRemarks]);

  // 获取钱包备注
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

  // 清空所有备注
  const clearAllRemarks = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRemarks({});
  }, []);

  // 初始化时加载数据
  useEffect(() => {
    loadRemarks();
  }, [loadRemarks]);

  return {
    remarks,
    setWalletRemark,
    removeWalletRemark,
    getWalletRemark,
    getWalletRemarkOrNull,
    hasRemark,
    getAllRemarks,
    clearAllRemarks,
    loadRemarks
  };
};
