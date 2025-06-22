import React, { useState, useEffect, useRef } from 'react';
import { Card, List, Tag, Button, Typography, Space, Tooltip } from 'antd';
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
            console.log('收到SSE消息:', event.data);
            
            // 跳过keep-alive消息
            if (event.data.trim() === '' || event.data.includes('keep-alive')) {
              return;
            }
            
            const tradeData: TradeRecord = JSON.parse(event.data);
            console.log('解析的交易数据:', tradeData);
            
            setTrades(prevTrades => {
              // 检查是否已存在相同trade_id的记录
              const existingIndex = prevTrades.findIndex(t => t.trade_id === tradeData.trade_id);
              
              let newTrades;
              if (existingIndex >= 0) {
                // 更新现有记录（状态变化：Pending -> Confirmed/Failed）
                newTrades = [...prevTrades];
                newTrades[existingIndex] = tradeData;
                console.log('更新现有交易记录:', tradeData.trade_id, tradeData.status);
              } else {
                // 添加新记录到顶部
                newTrades = [tradeData, ...prevTrades];
                console.log('添加新交易记录:', tradeData.trade_id, tradeData.status);
              }
              
              // 限制最大记录数
              return newTrades.slice(0, maxItems);
            });
          } catch (error) {
            console.error('解析交易数据失败:', error, '原始数据:', event.data);
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

  // 获取交易类型图标和颜色
  const getTradeTypeDisplay = (tradeType: string) => {
    switch (tradeType) {
      case 'buy':
        return { icon: <ArrowUpOutlined />, color: 'green', text: '买入' };
      case 'sell':
        return { icon: <ArrowDownOutlined />, color: 'red', text: '卖出' };
      default:
        return { icon: null, color: 'default', text: tradeType };
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
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<ClearOutlined />} 
          onClick={clearTrades}
          size="small"
        >
          清空
        </Button>
      }
      size="small"
    >
      <List
        dataSource={trades}
        locale={{ emptyText: '暂无交易记录' }}
        renderItem={(trade) => {
          const typeDisplay = getTradeTypeDisplay(trade.trade_type);
          
          return (
            <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ width: '100%' }}>
                {/* 第一行：交易类型、状态、时间 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <Space size="small">
                    <Tag icon={typeDisplay.icon} color={typeDisplay.color}>
                      {typeDisplay.text}
                    </Tag>
                    <Tag color={getStatusColor(trade.status)}>
                      {trade.status}
                    </Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {new Date(trade.block_time * 1000).toLocaleTimeString()}
                  </Text>
                </div>

                {/* 第二行：金额信息 */}
                <div style={{ marginBottom: '4px' }}>
                  <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: '12px' }}>
                      <strong>${formatAmount(trade.usd_amount)}</strong>
                      {' '}({formatAmount(trade.sol_amount)} SOL)
                    </Text>
                    {trade.trade_type === 'sell' && trade.profit_usd !== undefined && (
                      <Text 
                        style={{ 
                          fontSize: '11px',
                          color: trade.profit_usd >= 0 ? '#52c41a' : '#ff4d4f'
                        }}
                      >
                        利润: {trade.profit_usd >= 0 ? '+' : ''}${formatAmount(trade.profit_usd)}
                      </Text>
                    )}
                  </Space>
                </div>

                {/* 第三行：地址信息 */}
                <div style={{ fontSize: '10px', color: '#999' }}>
                  <div>
                    <Tooltip title={trade.user_wallet}>
                      钱包: {formatAddress(trade.user_wallet)}
                    </Tooltip>
                  </div>
                  <div>
                    <Tooltip title={trade.mint}>
                      代币: {formatAddress(trade.mint)}
                    </Tooltip>
                  </div>
                  {trade.signature && (
                    <div>
                      <Tooltip title={trade.signature}>
                        签名: {formatAddress(trade.signature)}
                      </Tooltip>
                    </div>
                  )}
                </div>

                {/* 失败原因 */}
                {trade.status === 'Failed' && trade.failure_reason && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type="danger" style={{ fontSize: '10px' }}>
                      失败原因: {trade.failure_reason}
                    </Text>
                  </div>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default RealTimeTradeList;
