import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type {
  WalletConfigsResponse,
  UpdateWalletConfigRequest,
  LogsResponse,
  ClearLogsResponse,
  LoginRequest,
  LoginResponse,
  TradeHistoryRequest,
  TradeHistoryResponse
} from '../types';

// 创建axios实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: import.meta.env.DEV ? '' : 'http://127.0.0.1:8080', // 开发环境使用代理，生产环境使用绝对URL
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器 - 添加认证token
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器 - 统一错误处理
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401) {
        // 未授权，清除token并跳转到登录页
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// API服务类
export class ApiService {
  // 钱包配置相关API
  static async getWalletConfigurations(): Promise<WalletConfigsResponse> {
    const response = await apiClient.get<WalletConfigsResponse>('/api/v1/wallets/configurations');
    return response.data;
  }

  static async updateWalletConfiguration(config: UpdateWalletConfigRequest): Promise<string> {
    const response = await apiClient.post<string>('/api/v1/wallets/configurations', config);
    return response.data;
  }

  static async deleteWalletConfiguration(walletAddress: string): Promise<string> {
    const response = await apiClient.delete<string>(`/api/v1/wallets/configurations/${walletAddress}`);
    return response.data;
  }

  // 日志相关API
  static async getLogs(): Promise<LogsResponse> {
    const response = await apiClient.get<LogsResponse>('/api/v1/logs');
    return response.data;
  }

  static async clearLogs(): Promise<ClearLogsResponse> {
    // 直接调用后端接口清除日志，不传任何参数
    const response = await axios.post<ClearLogsResponse>('http://127.0.0.1:8080/api/v1/logs/clear');
    return response.data;
  }

  // 交易记录相关API
  static async getTradeHistory(params?: TradeHistoryRequest): Promise<TradeHistoryResponse> {
    const response = await apiClient.get<TradeHistoryResponse>('/api/v1/trades/history', {
      params: params
    });
    return response.data;
  }

  // 认证相关API
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', credentials);
    return response.data;
  }

  static async logout(): Promise<void> {
    // 清除本地存储的token
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
  }

  // SSE连接相关
  static createPriceStream(): EventSource {
    return new EventSource('/api/v1/prices/stream');
  }

  static createTradeStream(): EventSource {
    return new EventSource('/api/v1/trades/stream');
  }

  // SOL价格相关API
  static async getSolPrice(): Promise<number> {
    try {
      // 使用CoinGecko API获取SOL价格
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      return response.data.solana.usd;
    } catch (error) {
      console.error('获取SOL价格失败:', error);
      // 如果API失败，尝试备用API
      try {
        const response = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
        return parseFloat(response.data.data.rates.USD);
      } catch (backupError) {
        console.error('备用SOL价格API也失败:', backupError);
        // 返回默认价格或抛出错误
        return 135; // 默认价格
      }
    }
  }
}

export default ApiService;
