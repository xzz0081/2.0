import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type {
  WalletConfigsResponse,
  UpdateWalletConfigRequest,
  LogsResponse,
  LoginRequest,
  LoginResponse
} from '../types';

// 创建axios实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: 'http://127.0.0.1:8080', // 根据API文档的默认地址
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

  // 认证相关API (模拟实现，实际需要后端支持)
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    // 模拟登录API调用
    // 实际项目中需要后端提供认证接口
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (credentials.username === 'admin' && credentials.password === 'admin123') {
          const response: LoginResponse = {
            user: {
              id: '1',
              username: credentials.username,
              role: 'admin',
              token: 'mock_jwt_token_' + Date.now()
            },
            token: 'mock_jwt_token_' + Date.now()
          };
          resolve(response);
        } else {
          reject(new Error('用户名或密码错误'));
        }
      }, 1000);
    });
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
}

export default ApiService;
