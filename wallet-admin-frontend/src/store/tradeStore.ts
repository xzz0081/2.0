import { create } from 'zustand';
import { TradeRecord, WalletConfig } from '../types/api';
import ApiService from '../services/api';

interface TradeStore {
  // 交易数据相关
  trades: TradeRecord[];
  selectedTrade: TradeRecord | null;
  
  // 连接状态
  isConnected: boolean;
  isLoading: boolean;
  
  // 数据源控制
  dataSource: 'api' | 'sse';
  
  // 钱包配置
  walletConfigs: Record<string, WalletConfig>;
  
  // 面板控制
  isPanelOpen: boolean;
  
  // 分页
  currentPage: number;
  pageSize: number;
  total: number;
  
  // SSE连接
  eventSource: EventSource | null;
  
  // 操作方法
  setTrades: (trades: TradeRecord[]) => void;
  setSelectedTrade: (trade: TradeRecord | null) => void;
  addTrade: (trade: TradeRecord) => void;
  updateTrade: (trade: TradeRecord) => void;
  clearTrades: () => void;
  
  // 连接状态控制
  setConnected: (isConnected: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setDataSource: (dataSource: 'api' | 'sse') => void;
  setWalletConfigs: (walletConfigs: Record<string, WalletConfig>) => void;
  setPanelOpen: (isPanelOpen: boolean) => void;
  
  // 分页控制
  setCurrentPage: (currentPage: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  
  // 初始化和连接方法
  initializeStore: () => Promise<void>;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

const STORAGE_KEY = 'realtime_trades';
const MAX_TRADES = 50;

export const useTradeStore = create<TradeStore>((set, get) => ({
  // 初始状态
  trades: [],
  selectedTrade: null,
  isConnected: false,
  isLoading: false,
  dataSource: 'api',
  walletConfigs: {},
  isPanelOpen: false,
  currentPage: 1,
  pageSize: 20,
  total: 0,
  eventSource: null,

  // Actions implementation
  setTrades: (trades: TradeRecord[]) => {
    set({ 
      trades,
      total: trades.length 
    });
  },
  
  setSelectedTrade: (trade: TradeRecord | null) => set({ selectedTrade: trade }),
  
  addTrade: (trade: TradeRecord) => {
    const { trades } = get();
    set({ trades: [trade, ...trades] });
  },
  
  updateTrade: (trade: TradeRecord) => {
    const { trades } = get();
    const existingIndex = trades.findIndex((t: TradeRecord) => t.trade_id === trade.trade_id);
    if (existingIndex >= 0) {
      const newTrades = [...trades];
      newTrades[existingIndex] = trade;
      set({ trades: newTrades });
    }
  },
  
  clearTrades: () => set({ 
    trades: [], 
    selectedTrade: null,
    total: 0 
  }),
  
  // 连接状态控制
  setConnected: (isConnected: boolean) => set({ isConnected }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setDataSource: (dataSource: 'api' | 'sse') => set({ dataSource }),
  setWalletConfigs: (walletConfigs: Record<string, WalletConfig>) => set({ walletConfigs }),
  setPanelOpen: (isPanelOpen: boolean) => set({ isPanelOpen }),
  
  // 分页控制
  setCurrentPage: (currentPage: number) => set({ currentPage }),
  setPageSize: (pageSize: number) => set({ pageSize }),
  setTotal: (total: number) => set({ total }),

  // 初始化存储
  initializeStore: async () => {
    const { setLoading, setTrades, setDataSource, setWalletConfigs } = get();
    setLoading(true);

    try {
      // 获取钱包配置
      console.log('🔍 获取钱包配置...');
      const configs = await ApiService.getWalletConfigurations();
      setWalletConfigs(configs);
      console.log('✅ 钱包配置加载完成:', Object.keys(configs).length, '个');
    } catch (error) {
      console.warn('⚠️ 获取钱包配置失败:', error);
    }

    try {
      // 尝试从后端获取历史数据
      console.log('🔍 尝试从后端获取交易历史...');
      const historyData = await ApiService.getTradeHistory({ 
        limit: MAX_TRADES,
      });
      
      if (historyData.trades.length > 0) {
        console.log('✅ 从后端加载交易记录:', historyData.trades.length, '条');
        setTrades(historyData.trades);
        setDataSource('api');
      } else {
        console.log('📭 后端暂无交易记录，尝试从localStorage加载...');
        // 从localStorage加载
        try {
          const savedTrades = localStorage.getItem(STORAGE_KEY);
          if (savedTrades) {
            const parsedTrades = JSON.parse(savedTrades);
            if (Array.isArray(parsedTrades) && parsedTrades.length > 0) {
              console.log('✅ 从localStorage加载交易记录:', parsedTrades.length, '条');
              setTrades(parsedTrades);
              setDataSource('api');
            } else {
              console.log('📭 localStorage也无数据');
              setDataSource('api');
            }
          } else {
            console.log('📭 localStorage也无数据');
            setDataSource('api');
          }
        } catch (localError) {
          console.error('❌ localStorage加载失败:', localError);
          setDataSource('api');
        }
      }
    } catch (error) {
      console.error('❌ 从后端加载交易记录失败:', error);
      // 尝试从localStorage加载
      try {
        const savedTrades = localStorage.getItem(STORAGE_KEY);
        if (savedTrades) {
          const parsedTrades = JSON.parse(savedTrades);
          if (Array.isArray(parsedTrades) && parsedTrades.length > 0) {
            console.log('✅ 从localStorage加载交易记录:', parsedTrades.length, '条');
            setTrades(parsedTrades);
            setDataSource('api');
          } else {
            setDataSource('api');
          }
        } else {
          setDataSource('api');
        }
      } catch (localError) {
        console.error('❌ localStorage加载失败:', localError);
        setDataSource('api');
      }
    } finally {
      setLoading(false);
    }
  },

  // SSE连接
  connectSSE: () => {
    const { eventSource, setConnected, updateTrade } = get();
    
    // 如果已经连接，先断开
    if (eventSource) {
      eventSource.close();
    }

    console.log('🔌 连接SSE流...');
    const newEventSource = new EventSource('/api/v1/trades/stream');

    newEventSource.onopen = () => {
      console.log('✅ SSE连接已建立');
      setConnected(true);
    };

    newEventSource.onerror = (error) => {
      console.error('❌ SSE连接错误:', error);
      setConnected(false);
    };

    newEventSource.onmessage = (event) => {
      try {
        console.log('🔄 收到SSE消息:', event.data);

        // 跳过keep-alive消息
        if (event.data.trim() === '' || event.data.includes('keep-alive')) {
          console.log('⏭️ 跳过keep-alive消息');
          return;
        }

        const tradeData: TradeRecord = JSON.parse(event.data);
        console.log('📊 解析的交易数据:', {
          trade_id: tradeData.trade_id,
          status: tradeData.status,
          trade_type: tradeData.trade_type,
          usd_amount: tradeData.usd_amount,
          profit_usd: tradeData.profit_usd,
        });

        updateTrade(tradeData);
      } catch (error) {
        console.error('❌ 解析SSE消息失败:', error, event.data);
      }
    };

    set({ eventSource: newEventSource });
  },

  // 断开SSE连接
  disconnectSSE: () => {
    const { eventSource, setConnected } = get();
    
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null });
      setConnected(false);
      console.log('🔌 SSE连接已断开');
    }
  },
}));
