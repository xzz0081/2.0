import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Tooltip, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClearOutlined,
  WifiOutlined,
  DisconnectOutlined,
  LinkOutlined
} from '@ant-design/icons';
import type { TradeRecord } from '../types';
import ApiService from '../services/api';

const { Text } = Typography;

interface RealTimeTradeListProps {
  maxItems?: number;
}

// 实时交易记录列表组件
const RealTimeTradeList: React.FC<RealTimeTradeListProps> = ({ maxItems = 50 }) => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'backend' | 'localStorage' | 'none'>('none');
  const eventSourceRef = useRef<EventSource | null>(null);
  const STORAGE_KEY = 'realtime_trades';

  // 初始化数据加载：优先从后端获取，降级到localStorage
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);

      try {
        // 首先尝试从后端获取历史数据
        console.log('🔍 尝试从后端获取交易历史...');
        const historyData = await ApiService.getTradeHistory({
          limit: maxItems,
          // 获取最近的记录
        });

        if (historyData.trades && historyData.trades.length > 0) {
          console.log('✅ 从后端加载交易记录:', historyData.trades.length, '条');
          setTrades(historyData.trades);
          setDataSource('backend');
          // 同时保存到localStorage作为备份
          localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData.trades));
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
            // 验证数据格式
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
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [maxItems]);

  // 保存交易记录到localStorage（仅在有数据更新时）
  useEffect(() => {
    // 只在有数据且不是初始加载时保存
    if (trades.length > 0 && !isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
        console.log('💾 交易记录已保存到localStorage:', trades.length, '条');
      } catch (error) {
        console.error('❌ 保存交易记录失败:', error);
      }
    }
  }, [trades, isLoading]);

  // 清空交易记录
  const clearTrades = () => {
    setTrades([]);
    localStorage.removeItem(STORAGE_KEY);
    setDataSource('none');
    console.log('🗑️ 交易记录已清空');
  };

  // 连接SSE交易流
  useEffect(() => {
    const connectTradeStream = () => {
      try {
        // 使用正确的后端URL
        const sseUrl = 'http://127.0.0.1:8080/api/v1/trades/stream';
        console.log('尝试连接交易流:', sseUrl);
        
        eventSourceRef.current = new EventSource(sseUrl);
        
        eventSourceRef.current.onopen = () => {
          setIsConnected(true);
          console.log('交易流连接成功');
        };

        eventSourceRef.current.onmessage = (event) => {
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
              sol_amount: tradeData.sol_amount,
              profit_usd: tradeData.profit_usd,
              block_time: tradeData.block_time
            });

            setTrades(prevTrades => {
              // 检查是否已存在相同trade_id的记录
              const existingIndex = prevTrades.findIndex(t => t.trade_id === tradeData.trade_id);

              let newTrades;
              if (existingIndex >= 0) {
                // 更新现有记录（状态变化：Pending -> Confirmed/Failed）
                newTrades = [...prevTrades];
                newTrades[existingIndex] = tradeData;
                console.log('🔄 更新现有交易记录:', tradeData.trade_id,
                  `${prevTrades[existingIndex].status} -> ${tradeData.status}`);
              } else {
                // 添加新记录到顶部
                newTrades = [tradeData, ...prevTrades];
                console.log('➕ 添加新交易记录:', tradeData.trade_id, tradeData.status);
              }

              // 限制最大记录数
              return newTrades.slice(0, maxItems);
            });
          } catch (error) {
            console.error('❌ 解析交易数据失败:', error, '原始数据:', event.data);
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error('交易流连接错误:', error);
          setIsConnected(false);
          
          // 尝试重连
          setTimeout(() => {
            if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
              console.log('尝试重新连接交易流...');
              connectTradeStream();
            }
          }, 5000);
        };

      } catch (error) {
        console.error('SSE连接初始化失败:', error);
        setIsConnected(false);
      }
    };

    connectTradeStream();

    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      }
    };
  }, [maxItems]);

  // 格式化地址显示
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 跳转到区块链浏览器
  const openBlockchainExplorer = (signature: string) => {
    if (signature) {
      const url = `https://solscan.io/tx/${signature}`;
      window.open(url, '_blank');
    }
  };

  // 格式化金额显示（美元价格）
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    });
  };

  // 格式化大数字显示（代币数量，精度为6）
  const formatLargeNumber = (num: number) => {
    // 先除以10^6得到真实数量
    const realAmount = num / 1e6;

    if (realAmount >= 1e9) {
      return (realAmount / 1e9).toFixed(2) + 'B';
    } else if (realAmount >= 1e6) {
      return (realAmount / 1e6).toFixed(2) + 'M';
    } else if (realAmount >= 1e3) {
      return (realAmount / 1e3).toFixed(2) + 'K';
    } else {
      return realAmount.toFixed(2);
    }
  };

  // 获取交易类型显示
  const getTradeTypeDisplay = (tradeType: string) => {
    switch (tradeType) {
      case 'buy':
        return { icon: <ArrowUpOutlined />, color: '#52c41a', text: '买入' };
      case 'sell':
        return { icon: <ArrowDownOutlined />, color: '#ff4d4f', text: '卖出' };
      default:
        return { icon: null, color: '#666', text: tradeType };
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'orange';
      case 'Confirmed':
        return 'green';
      case 'Failed':
        return 'red';
      default:
        return 'default';
    }
  };

  // 表格列定义
  const columns: ColumnsType<TradeRecord> = [
    {
      title: '时间',
      dataIndex: 'block_time',
      key: 'time',
      width: 80,
      render: (time: number) => (
        <Text style={{ fontSize: '12px', fontFamily: 'monospace', color: '#ffffff' }}>
          {new Date(time * 1000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </Text>
      ),
    },
    {
      title: '类型',
      dataIndex: 'trade_type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const display = getTradeTypeDisplay(type);
        const isBuy = type.toLowerCase() === 'buy';
        return (
          <Tag
            icon={display.icon}
            color={isBuy ? 'green' : 'red'}
            style={{
              fontWeight: 'bold',
              backgroundColor: isBuy ? '#52c41a' : '#ff4d4f',
              borderColor: isBuy ? '#52c41a' : '#ff4d4f',
              color: '#ffffff'
            }}
          >
            {display.text}
          </Tag>
        );
      },
    },
    {
      title: '金额 USD',
      dataIndex: 'usd_amount',
      key: 'usd_amount',
      width: 100,
      render: (amount: number) => (
        <Text style={{ fontSize: '12px', fontWeight: 'bold', color: '#ffffff' }}>
          ${formatAmount(amount)}
        </Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'token_amount',
      key: 'token_amount',
      width: 120,
      render: (amount: number, record: TradeRecord) => {
        const isBuyPending = record.trade_type.toLowerCase().includes('buy') && record.status === 'Pending';
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '12px', color: '#ffffff' }}>
              {formatLargeNumber(amount)}
            </Text>
            {isBuyPending && (
              <Text style={{ fontSize: '10px', color: '#cccccc' }}>
                (预计)
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '价格',
      dataIndex: 'sol_price_usd',
      key: 'price',
      width: 100,
      render: (price: number) => (
        <Text style={{ fontSize: '12px', color: '#ffffff' }}>
          ${formatAmount(price)}
        </Text>
      ),
    },
    {
      title: '交易者',
      dataIndex: 'user_wallet',
      key: 'trader',
      width: 120,
      render: (wallet: string, record: TradeRecord) => (
        <Space direction="vertical" size={0}>
          <Tooltip title={`钱包: ${wallet}`}>
            <Text code style={{ fontSize: '11px', cursor: 'pointer', color: '#ffffff', backgroundColor: '#333333' }}>
              {formatAddress(wallet)}
            </Text>
          </Tooltip>
          <Tooltip title={`代币: ${record.mint}`}>
            <Text code style={{ fontSize: '10px', color: '#cccccc', cursor: 'pointer', backgroundColor: '#333333' }}>
              {formatAddress(record.mint)}
            </Text>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} style={{ fontSize: '11px' }}>
          {status}
        </Tag>
      ),
    },
    {
      title: '盈亏',
      dataIndex: 'profit_usd',
      key: 'profit',
      width: 90,
      render: (profit: number | null, record: TradeRecord) => {
        if (profit === null || profit === undefined) {
          return <Text style={{ fontSize: '10px', color: '#666666' }}>-</Text>;
        }

        const isProfit = profit >= 0;
        const displayValue = Math.abs(profit);

        return (
          <Space direction="vertical" size={0} style={{ textAlign: 'center' }}>
            <Text
              style={{
                fontSize: '11px',
                color: isProfit ? '#52c41a' : '#ff4d4f',
                fontWeight: 'bold'
              }}
            >
              {isProfit ? '+' : '-'}${formatAmount(displayValue)}
            </Text>
            <Text
              style={{
                fontSize: '9px',
                color: isProfit ? '#52c41a' : '#ff4d4f',
                opacity: 0.8
              }}
            >
              {isProfit ? '盈利' : '亏损'}
            </Text>
          </Space>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record: TradeRecord) => (
        <Tooltip title="查看区块链浏览器">
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            onClick={() => openBlockchainExplorer(record.signature)}
            disabled={!record.signature}
            style={{
              color: '#ffffff',
              fontSize: '12px',
              padding: '2px 4px',
              height: '24px',
              width: '24px'
            }}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span style={{ color: '#ffffff' }}>实时交易记录</span>
          <Tag
            icon={isConnected ? <WifiOutlined /> : <DisconnectOutlined />}
            color={isConnected ? 'green' : 'red'}
          >
            {isConnected ? '已连接' : '未连接'}
          </Tag>
          {trades.length > 0 && (
            <Tag color="blue">
              {trades.length} 条记录
            </Tag>
          )}
          {dataSource !== 'none' && (
            <Tag color={dataSource === 'backend' ? 'green' : 'orange'}>
              {dataSource === 'backend' ? '后端数据' : '本地缓存'}
            </Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Text style={{ fontSize: '12px', color: '#cccccc' }}>
            最大 {maxItems} 条
          </Text>
          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={clearTrades}
            size="small"
            disabled={trades.length === 0}
            style={{ color: '#ffffff' }}
          >
            清空
          </Button>
        </Space>
      }
      size="small"
      style={{
        backgroundColor: '#1f1f1f',
        borderColor: '#404040'
      }}
      headStyle={{
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #404040'
      }}
      bodyStyle={{
        backgroundColor: '#1f1f1f',
        padding: '12px'
      }}
    >
      <Spin spinning={isLoading} tip="加载交易记录中...">
        <Table
          columns={columns}
          dataSource={trades}
          rowKey="trade_id"
          pagination={false}
          size="small"
          locale={{
            emptyText: isLoading ? '加载中...' :
              dataSource === 'none' ? '暂无交易记录，等待实时数据...' : '暂无交易记录'
          }}
          scroll={{ y: 'calc(100vh - 300px)' }}
          className="dark-table"
          rowClassName={(record) =>
            record.status === 'Pending' ? 'pending-trade-row' : 'normal-trade-row'
          }
        />
      </Spin>
      <style jsx global>{`
        .dark-table {
          background-color: #1f1f1f !important;
        }
        .dark-table .ant-table {
          background-color: #1f1f1f !important;
          color: #ffffff !important;
        }
        .dark-table .ant-table-thead > tr > th {
          background-color: #2a2a2a !important;
          color: #ffffff !important;
          border-bottom: 1px solid #404040 !important;
        }
        .dark-table .ant-table-tbody > tr > td {
          background-color: #1f1f1f !important;
          color: #ffffff !important;
          border-bottom: 1px solid #404040 !important;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background-color: #2a2a2a !important;
        }
        .normal-trade-row > td {
          background-color: #1f1f1f !important;
        }
        .normal-trade-row:hover > td {
          background-color: #2a2a2a !important;
        }
        .pending-trade-row > td {
          background-color: #3a2a00 !important;
        }
        .pending-trade-row:hover > td {
          background-color: #4a3500 !important;
        }
        .dark-table .ant-empty-description {
          color: #ffffff !important;
        }
      `}</style>
    </Card>
  );
};

export default RealTimeTradeList;
