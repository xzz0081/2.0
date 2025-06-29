// 钱包配置模板类型定义
import { WalletConfig } from './api';

export interface WalletTemplate {
  id: string;
  name: string;
  description?: string;
  config: Omit<WalletConfig, 'wallet_address' | 'remark'>; // 去掉钱包地址和备注的配置模板
  created_at: string;
  updated_at?: string;
}

export interface BatchImportProgress {
  total: number;
  current: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface BatchImportWallet {
  wallet_address: string;
  remark?: string;
}

export interface BatchImportOptions {
  onProgress?: (progress: BatchImportProgress) => void;
} 