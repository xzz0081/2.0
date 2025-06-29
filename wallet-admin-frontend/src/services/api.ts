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
  TradeHistoryResponse,
  WalletConfig
} from '../types';

// 创建axios实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: '', // 始终使用相对路径，通过Nginx代理
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
        config.headers['Authorization'] = `Bearer ${token}`;
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

// 多数据源SOL价格获取服务
class SolPriceService {
  private static instance: SolPriceService;
  private lastPrice: number = 135; // 默认价格
  private lastUpdateTime: number = 0;
  private cacheTimeout: number = 30000; // 30秒缓存
  private currentSourceIndex: number = 0;

  // 价格数据源配置
  private priceSources = [
    {
      name: 'OKEx',
      url: 'https://www.okx.com/api/v5/market/ticker?instId=SOL-USDT',
      parser: (data: any) => parseFloat(data.data?.[0]?.last || '0'),
    },
    {
      name: 'Binance',
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
      parser: (data: any) => parseFloat(data.price || '0'),
    },
    {
      name: 'HTX(火币)',
      url: 'https://api.huobi.pro/market/detail/merged?symbol=solusdt',
      parser: (data: any) => parseFloat(data.tick?.close || '0'),
    },
    {
      name: 'Gate.io',
      url: 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair=SOL_USDT',
      parser: (data: any) => parseFloat(data[0]?.last || '0'),
    },
    {
      name: 'Coinbase',
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=SOL',
      parser: (data: any) => parseFloat(data.data?.rates?.USD || '0'),
    },
    {
      name: 'CoinGecko',
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      parser: (data: any) => parseFloat(data.solana?.usd || '0'),
    },
  ];

  public static getInstance(): SolPriceService {
    if (!SolPriceService.instance) {
      SolPriceService.instance = new SolPriceService();
    }
    return SolPriceService.instance;
  }

  /**
   * 获取SOL价格，支持多数据源轮询
   */
  public async getSolPrice(forceRefresh: boolean = false): Promise<number> {
    const now = Date.now();
    
    // 如果缓存有效且不强制刷新，返回缓存价格
    if (!forceRefresh && now - this.lastUpdateTime < this.cacheTimeout) {
      console.log(`💰 使用缓存的SOL价格: $${this.lastPrice.toFixed(2)}`);
      return this.lastPrice;
    }

    console.log('🔄 开始获取SOL价格...');

    // 尝试所有数据源
    for (let i = 0; i < this.priceSources.length; i++) {
      const sourceIndex = (this.currentSourceIndex + i) % this.priceSources.length;
      const source = this.priceSources[sourceIndex];

      try {
        console.log(`📡 尝试从 ${source.name} 获取价格...`);
        
        const response = await axios.get(source.url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        const price = source.parser(response.data);
        
        if (price > 0 && price < 1000) { // 合理性检查
          this.lastPrice = price;
          this.lastUpdateTime = now;
          this.currentSourceIndex = sourceIndex; // 下次优先使用这个源
          
          console.log(`✅ 从 ${source.name} 获取到SOL价格: $${price.toFixed(4)}`);
          return price;
        } else {
          console.warn(`⚠️ ${source.name} 返回异常价格: ${price}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`❌ ${source.name} API失败: ${errorMsg}`);
        
        // 如果是429错误，跳过该数据源更久
        if (errorMsg.includes('429')) {
          console.warn(`🚫 ${source.name} 被限制访问，跳过...`);
        }
      }
    }

    // 所有数据源都失败，返回缓存价格
    console.error('❌ 所有价格数据源都失败，使用缓存价格');
    return this.lastPrice;
  }

  /**
   * 获取当前缓存的价格（不发起网络请求）
   */
  public getCachedPrice(): number {
    return this.lastPrice;
  }

  /**
   * 清除价格缓存
   */
  public clearCache(): void {
    this.lastUpdateTime = 0;
    console.log('🗑️ SOL价格缓存已清除');
  }
}

// API服务类
export class ApiService {
  private static solPriceService = SolPriceService.getInstance();

  // 钱包配置相关API
  static async getWalletConfigurations(): Promise<WalletConfigsResponse> {
    const response = await apiClient.get<WalletConfigsResponse>('/api/v1/wallets/configurations');
    return response.data;
  }

  static async updateWalletConfiguration(config: UpdateWalletConfigRequest): Promise<WalletConfig> {
    const response = await apiClient.post<WalletConfig>('/api/v1/wallets/configurations', config);
    return response.data;
  }

  static async deleteWalletConfiguration(walletAddress: string): Promise<void> {
    await apiClient.delete(`/api/v1/wallets/configurations/${walletAddress}`);
  }

  // 日志相关API
  static async getLogs(): Promise<LogsResponse> {
    const response = await apiClient.get<LogsResponse>('/api/v1/logs');
    return response.data;
  }

  static async clearLogs(): Promise<ClearLogsResponse> {
    // 直接调用后端接口清除日志，不传任何参数
    const response = await axios.post<ClearLogsResponse>('/api/v1/logs/clear');
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

  // SOL价格相关API - 使用新的多数据源服务
  static async getSolPrice(): Promise<number> {
    return await ApiService.solPriceService.getSolPrice();
  }

  // 强制刷新SOL价格
  static async refreshSolPrice(): Promise<number> {
    return await ApiService.solPriceService.getSolPrice(true);
  }

  // 获取缓存的SOL价格（不发起网络请求）
  static getCachedSolPrice(): number {
    return ApiService.solPriceService.getCachedPrice();
  }

  // 清除SOL价格缓存
  static clearSolPriceCache(): void {
    ApiService.solPriceService.clearCache();
  }
}

export default ApiService;
