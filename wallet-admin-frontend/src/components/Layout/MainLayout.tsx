import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Typography, Space, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  WalletOutlined,
  FileTextOutlined,
  LogoutOutlined,
  UserOutlined,
  LineChartOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSolPrice } from '../../hooks/useSolPrice';
import { useQueryClient } from '@tanstack/react-query';
import ApiService from '../../services/api';
import type { TradeRecord, WalletConfig } from '../../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 交易记录Context
interface TradeContextType {
  trades: TradeRecord[];
  isConnected: boolean;
  isLoading: boolean;
  dataSource: 'backend' | 'localStorage' | 'none';
  walletConfigs: Record<string, WalletConfig>;
  clearTrades: () => void;
}

const TradeContext = createContext<TradeContextType | null>(null);

export const useTradeContext = () => {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error('useTradeContext must be used within TradeProvider');
  }
  return context;
};

interface MainLayoutProps {
  children: React.ReactNode;
}

// 主布局组件
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // 获取实时SOL价格
  const { solPrice, dataSource: priceDataSource, refreshPrice, loading: priceLoading, error: priceError } = useSolPrice();

  // 交易记录状态
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'backend' | 'localStorage' | 'none'>('none');
  const [walletConfigs] = useState<Record<string, WalletConfig>>({});
  const eventSourceRef = useRef<EventSource | null>(null);
  const STORAGE_KEY = 'realtime_trades';
  const MAX_ITEMS = 50;

  // 预加载钱包配置数据（优化性能）
  useEffect(() => {
    // 延迟2秒后预加载，避免影响初始页面加载
    const timer = setTimeout(() => {
      console.log('🔄 预加载钱包配置数据...');
      queryClient.prefetchQuery({
        queryKey: ['walletConfigs'],
        queryFn: ApiService.getWalletConfigurations,
        staleTime: 5 * 60 * 1000, // 5分钟
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [queryClient]);

  // 初始化数据加载
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      // 暂时注释掉后端调用，因为后端未运行
      console.log('⚠️ 后端未运行，直接从localStorage加载数据');

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

      setIsLoading(false);
    };

    loadInitialData();
  }, []);

  // SSE连接
  useEffect(() => {
    console.log('🔌 建立SSE连接...');
    const eventSource = new EventSource('/api/v1/trades/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE连接已建立');
      setIsConnected(true);
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE连接错误:', error);
      setIsConnected(false);
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('🔄 收到SSE消息:', event.data);

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

        setTrades(prevTrades => {
          const existingIndex = prevTrades.findIndex(t => t.trade_id === tradeData.trade_id);
          let newTrades;

          if (existingIndex >= 0) {
            newTrades = [...prevTrades];
            newTrades[existingIndex] = tradeData;
            console.log('🔄 更新现有交易记录:', tradeData.trade_id, tradeData.status);
          } else {
            newTrades = [tradeData, ...prevTrades];
            console.log('➕ 添加新交易记录:', tradeData.trade_id, tradeData.status);
          }

          const finalTrades = newTrades.slice(0, MAX_ITEMS);

          // 保存到localStorage
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalTrades));
          } catch (error) {
            console.error('❌ 保存交易记录失败:', error);
          }

          return finalTrades;
        });
      } catch (error) {
        console.error('❌ 解析SSE消息失败:', error, event.data);
      }
    };

    // 清理函数
    return () => {
      console.log('🔌 断开SSE连接');
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  // 清空交易记录
  const clearTrades = () => {
    setTrades([]);
    localStorage.removeItem(STORAGE_KEY);
    setDataSource('none');
    console.log('🗑️ 交易记录已清空');
  };

  // 菜单项配置
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/real-time-trades',
      icon: <LineChartOutlined />,
      label: '实时交易记录',
    },
    {
      key: '/wallet-config',
      icon: <WalletOutlined />,
      label: '钱包配置',
    },
    {
      key: '/logs',
      icon: <FileTextOutlined />,
      label: '系统日志',
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  // 处理登出
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 用户下拉菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  // TradeContext值
  const tradeContextValue: TradeContextType = {
    trades,
    isConnected,
    isLoading,
    dataSource,
    walletConfigs,
    clearTrades,
  };

  return (
    <TradeContext.Provider value={tradeContextValue}>
      <Layout style={{ minHeight: '100vh' }}>
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: '#001529',
          }}
        >
          {/* Logo区域 */}
          <div style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? '12px' : '16px',
            fontWeight: 'bold',
            borderBottom: '1px solid #1f1f1f',
            padding: '0 8px',
            textAlign: 'center',
            lineHeight: collapsed ? '14px' : '18px'
          }}>
            {collapsed ? '磐石钱包' : '磐石钱包管理系统'}
          </div>

          {/* 导航菜单 */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{ borderRight: 0 }}
          />
        </Sider>

        <Layout>
          {/* 顶部导航栏 */}
          <Header style={{
            padding: '0 16px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0'
          }}>
            {/* 左侧：折叠按钮 */}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />

            {/* 右侧：SOL价格、技术支持和用户信息区域 */}
            <Space size="large">
              {/* SOL价格显示 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ff4d4f',
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ fontSize: '16px' }}>
                  SOL: ${solPrice.toFixed(2)}
                </span>
                                 {/* 数据源和刷新按钮 */}
                 <div style={{
                   display: 'flex',
                   flexDirection: 'column',
                   alignItems: 'flex-start',
                   fontSize: '10px',
                   color: '#999',
                   lineHeight: '12px'
                 }}>
                   <span style={{ marginBottom: '2px' }}>
                     {priceDataSource} {priceError && '(错误)'}
                   </span>
                   <Tooltip title={`点击手动刷新SOL价格 ${priceError ? `(当前错误: ${priceError})` : ''}`}>
                     <Button
                       type="text"
                       size="small"
                       loading={priceLoading}
                       style={{
                         padding: '0',
                         height: '12px',
                         fontSize: '10px',
                         color: priceError ? '#ff4d4f' : '#999'
                       }}
                       onClick={() => {
                         console.log('🔄 手动刷新SOL价格');
                         refreshPrice();
                       }}
                     >
                       刷新
                     </Button>
                   </Tooltip>
                 </div>
              </div>

              {/* 磐石社区技术支持 */}
              <Tooltip title="磐石社区" placement="bottom">
                <Button
                  type="text"
                  icon={<CustomerServiceOutlined />}
                  style={{
                    color: '#1890ff',
                    fontSize: '14px',
                    height: '32px',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    background: '#f9f9f9'
                  }}
                  onClick={() => window.open('https://t.me/panshishequ1', '_blank')}
                >
                  <span style={{
                    marginLeft: '4px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    技术支持
                  </span>
                </Button>
              </Tooltip>

              {/* 用户信息 */}
              <Space>
                <Text type="secondary">欢迎回来，</Text>
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  arrow
                >
                  <Space style={{ cursor: 'pointer' }}>
                    <Avatar
                      size="small"
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <Text strong>{user?.username}</Text>
                  </Space>
                </Dropdown>
              </Space>
            </Space>
          </Header>

          {/* 主内容区域 */}
          <Content style={{
            margin: '16px',
            padding: '24px',
            background: '#fff',
            borderRadius: '6px',
            minHeight: 'calc(100vh - 112px)',
          }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </TradeContext.Provider>
  );
};

export default MainLayout;
