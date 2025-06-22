import React, { useState, useEffect, useRef } from 'react';
import { Card, Table, Tag, Button, Typography, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClearOutlined,
  WifiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import type { TradeRecord } from '../types';

const { Text } = Typography;

interface RealTimeTradeListProps {
  maxItems?: number;
}

// 实时交易记录列表组件
const RealTimeTradeList: React.FC<RealTimeTradeListProps> = ({ maxItems = 50 }) => {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 清空交易记录
  const clearTrades = () => {
    setTrades([]);
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

  // 格式化金额显示
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 6 
    });
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
        <Text style={{ fontSize: '12px', fontFamily: 'monospace' }}>
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
        return (
          <Tag
            icon={display.icon}
            color={type === 'buy' ? 'green' : 'red'}
            style={{ fontWeight: 'bold' }}
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
        <Text style={{ fontSize: '12px', fontWeight: 'bold' }}>
          ${formatAmount(amount)}
        </Text>
      ),
    },
    {
      title: '数量',
      dataIndex: 'token_amount',
      key: 'token_amount',
      width: 120,
      render: (amount: number) => (
        <Text style={{ fontSize: '12px' }}>
          {formatAmount(amount)}
        </Text>
      ),
    },
    {
      title: '价格',
      dataIndex: 'sol_price_usd',
      key: 'price',
      width: 100,
      render: (price: number) => (
        <Text style={{ fontSize: '12px' }}>
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
            <Text code style={{ fontSize: '11px', cursor: 'pointer' }}>
              {formatAddress(wallet)}
            </Text>
          </Tooltip>
          <Tooltip title={`代币: ${record.mint}`}>
            <Text code style={{ fontSize: '10px', color: '#999', cursor: 'pointer' }}>
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
      render: (status: string, record: TradeRecord) => (
        <Space direction="vertical" size={0}>
          <Tag color={getStatusColor(status)} style={{ fontSize: '11px' }}>
            {status}
          </Tag>
          {record.trade_type === 'sell' && record.profit_usd !== undefined && (
            <Text
              style={{
                fontSize: '10px',
                color: record.profit_usd >= 0 ? '#52c41a' : '#ff4d4f',
                fontWeight: 'bold'
              }}
            >
              {record.profit_usd >= 0 ? '+' : ''}${formatAmount(record.profit_usd)}
            </Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <span>实时交易记录</span>
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
        </Space>
      }
      extra={
        <Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            最大 {maxItems} 条
          </Text>
          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={clearTrades}
            size="small"
            disabled={trades.length === 0}
          >
            清空
          </Button>
        </Space>
      }
      size="small"
    >
      <Table
        columns={columns}
        dataSource={trades}
        rowKey="trade_id"
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无交易记录' }}
        scroll={{ y: 'calc(100vh - 300px)' }}
        rowClassName={(record) =>
          record.status === 'Pending' ? 'pending-trade-row' : ''
        }
      />
      <style jsx>{`
        .pending-trade-row {
          background-color: #fff7e6 !important;
        }
        .pending-trade-row:hover {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </Card>
  );
};

export default RealTimeTradeList;
