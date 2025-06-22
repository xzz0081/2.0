import { create } from 'zustand';
import type { TradeRecord, WalletConfig } from '../types';
import ApiService from '../services/api';

interface TradeStore {
  // 状态
  trades: TradeRecord[];
  isConnected: boolean;
  isLoading: boolean;
  dataSource: 'backend' | 'localStorage' | 'none';
  walletConfigs: Record<string, WalletConfig>;
  isPanelOpen: boolean;
  
  // SSE连接
  eventSource: EventSource | null;
  
  // 操作方法
  setTrades: (trades: TradeRecord[]) => void;
  addTrade: (trade: TradeRecord) => void;
  updateTrade: (trade: TradeRecord) => void;
  clearTrades: () => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setDataSource: (source: 'backend' | 'localStorage' | 'none') => void;
  setWalletConfigs: (configs: Record<string, WalletConfig>) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  
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
  isConnected: false,
  isLoading: true,
  dataSource: 'none',
  walletConfigs: {},
  isPanelOpen: false,
  eventSource: null,

  // 基础操作
  setTrades: (trades) => {
    set({ trades });
    // 保存到localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
    } catch (error) {
      console.error('❌ 保存交易记录失败:', error);
    }
  },

  addTrade: (trade) => {
    const { trades } = get();
    const newTrades = [trade, ...trades].slice(0, MAX_TRADES);
    get().setTrades(newTrades);
  },

  updateTrade: (trade) => {
    const { trades } = get();
    const existingIndex = trades.findIndex(t => t.trade_id === trade.trade_id);
    
    if (existingIndex >= 0) {
      const newTrades = [...trades];
      newTrades[existingIndex] = trade;
      get().setTrades(newTrades);
      console.log('🔄 更新交易记录:', trade.trade_id, trade.status);
    } else {
      get().addTrade(trade);
      console.log('➕ 添加新交易记录:', trade.trade_id, trade.status);
    }
  },

  clearTrades: () => {
    set({ trades: [] });
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ 交易记录已清空');
  },

  setConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setDataSource: (dataSource) => set({ dataSource }),
  setWalletConfigs: (walletConfigs) => set({ walletConfigs }),
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),

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
      
      if (historyData.trades && historyData.trades.length > 0) {
        console.log('✅ 从后端加载交易记录:', historyData.trades.length, '条');
        setTrades(historyData.trades);
        setDataSource('backend');
      } else {
        console.log('📭 后端暂无交易记录，尝试从localStorage加载...');
        throw new Error('后端无数据');
      }
    } catch (error) {
      console.warn('⚠️ 后端获取失败，降级到localStorage:', error);
      
      // 降级到localStorage
      try {
        const savedTrades = localStorage.getItem(STORAGE_KEY);
        if (savedTrades) {
          const parsedTrades = JSON.parse(savedTrades);
          if (Array.isArray(parsedTrades) && parsedTrades.every(trade => 
            trade && typeof trade === 'object' && trade.trade_id
          )) {
            console.log('📂 从localStorage加载交易记录:', parsedTrades.length, '条');
            setTrades(parsedTrades);
            setDataSource('localStorage');
          } else {
            console.warn('⚠️ localStorage中的交易记录格式无效');
            localStorage.removeItem(STORAGE_KEY);
            setDataSource('none');
          }
        } else {
          console.log('📭 localStorage中无交易记录');
          setDataSource('none');
        }
      } catch (localError) {
        console.error('❌ localStorage加载失败:', localError);
        localStorage.removeItem(STORAGE_KEY);
        setDataSource('none');
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
