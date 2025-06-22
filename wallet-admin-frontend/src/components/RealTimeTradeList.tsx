import React from 'react';
import { Card, Table, Tag, Button, Typography, Space, Tooltip, Spin, message } from 'antd';
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
import { useTradeContext } from './Layout/MainLayout';
import { useWalletRemarks } from '../hooks/useWalletRemarks';

const { Text } = Typography;

interface RealTimeTradeListProps {
  maxItems?: number;
}

// 实时交易记录列表组件
const RealTimeTradeList: React.FC<RealTimeTradeListProps> = ({ maxItems = 50 }) => {
  // 使用全局交易记录状态
  const { trades, isConnected, isLoading, dataSource, clearTrades } = useTradeContext();

  // 本地钱包备注管理
  const { getWalletRemark } = useWalletRemarks();

  // 复制地址到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('地址已复制到剪贴板');
    } catch (err) {
      message.error('复制失败');
    }
  };

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
      render: (wallet: string, record: TradeRecord) => {
        // 优先使用followed_wallet，如果没有则使用target_wallet（向后兼容），最后使用我们自己的钱包
        const followedWallet = record.followed_wallet || record.target_wallet;
        const targetWallet = followedWallet || wallet;
        const displayRemark = getWalletRemark(targetWallet);
        const isOurWallet = !followedWallet;

        return (
          <Space direction="vertical" size={0}>
            <Tooltip title={`点击复制地址: ${targetWallet}`}>
              <Text
                style={{
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: isOurWallet ? '#ffa940' : '#52c41a',
                  fontWeight: 'bold'
                }}
                onClick={() => copyToClipboard(targetWallet)}
              >
                {displayRemark}
              </Text>
            </Tooltip>
            <Tooltip title={`代币: ${record.mint}`}>
              <Text code style={{ fontSize: '10px', color: '#cccccc', cursor: 'pointer', backgroundColor: '#333333' }}>
                {formatAddress(record.mint)}
              </Text>
            </Tooltip>
          </Space>
        );
      },
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
      render: (profit: number | null) => {
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
      <style>{`
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
