import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Alert, Tag, Modal, List, Button, message } from 'antd';
import {
  RiseOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  PercentageOutlined,
  TrophyOutlined,
  WarningOutlined,
  SwapOutlined,
  FallOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { WalletConfigsResponse, WalletConfig } from '../types';
import { useTradeContext } from '../components/Layout/MainLayout';
import { useWalletRemarks } from '../hooks/useWalletRemarks';

const { Title, Paragraph } = Typography;

// 仪表板页面组件
const Dashboard: React.FC = () => {
  // 获取交易记录数据
  const { trades } = useTradeContext();

  // 本地钱包备注管理
  const { getWalletRemark } = useWalletRemarks();

  // 弹窗状态管理
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<{
    strategy: string;
    text: string;
    wallets: WalletConfig[];
  } | null>(null);

  // 获取钱包配置数据
  const { data: walletConfigs, isLoading, error } = useQuery<WalletConfigsResponse>({
    queryKey: ['walletConfigs'],
    queryFn: ApiService.getWalletConfigurations,
    refetchInterval: 30000, // 每30秒刷新一次
  });

  // 计算交易统计
  const tradeStats = React.useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        successTrades: 0,
        failedTrades: 0,
        totalUsdAmount: 0,
        totalSolAmount: 0,
        totalProfit: 0,
        profitableTrades: 0,
        lossTrades: 0,
        avgTradeAmount: 0,
        maxTradeAmount: 0,
        minTradeAmount: 0,
        buySuccessRate: 0,
        sellSuccessRate: 0,
        overallSuccessRate: 0,
        profitRate: 0,
        currentHoldings: 0,
        uniqueTokens: 0,
      };
    }

    const confirmedTrades = trades.filter(t => t.status === 'Confirmed');
    const buyTrades = confirmedTrades.filter(t => t.trade_type.toLowerCase() === 'buy');
    const sellTrades = confirmedTrades.filter(t => t.trade_type.toLowerCase() === 'sell');
    const failedTrades = trades.filter(t => t.status === 'Failed');

    const totalUsdAmount = confirmedTrades.reduce((sum, t) => sum + t.usd_amount, 0);
    const totalSolAmount = confirmedTrades.reduce((sum, t) => sum + t.sol_amount, 0);
    const totalProfit = sellTrades.reduce((sum, t) => sum + (t.profit_usd || 0), 0);

    const profitableTrades = sellTrades.filter(t => (t.profit_usd || 0) > 0).length;
    const lossTrades = sellTrades.filter(t => (t.profit_usd || 0) < 0).length;

    const usdAmounts = confirmedTrades.map(t => t.usd_amount);
    const maxTradeAmount = usdAmounts.length > 0 ? Math.max(...usdAmounts) : 0;
    const minTradeAmount = usdAmounts.length > 0 ? Math.min(...usdAmounts) : 0;
    const avgTradeAmount = confirmedTrades.length > 0 ? totalUsdAmount / confirmedTrades.length : 0;

    const buySuccessRate = trades.filter(t => t.trade_type.toLowerCase() === 'buy').length > 0
      ? (buyTrades.length / trades.filter(t => t.trade_type.toLowerCase() === 'buy').length) * 100
      : 0;
    const sellSuccessRate = trades.filter(t => t.trade_type.toLowerCase() === 'sell').length > 0
      ? (sellTrades.length / trades.filter(t => t.trade_type.toLowerCase() === 'sell').length) * 100
      : 0;
    const overallSuccessRate = trades.length > 0 ? (confirmedTrades.length / trades.length) * 100 : 0;
    const profitRate = sellTrades.length > 0 ? (profitableTrades / sellTrades.length) * 100 : 0;

    // 计算当前持仓（买入 - 卖出）
    const buyTokenAmounts = new Map<string, number>();
    const sellTokenAmounts = new Map<string, number>();

    buyTrades.forEach(t => {
      const current = buyTokenAmounts.get(t.mint) || 0;
      buyTokenAmounts.set(t.mint, current + t.token_amount);
    });

    sellTrades.forEach(t => {
      const current = sellTokenAmounts.get(t.mint) || 0;
      sellTokenAmounts.set(t.mint, current + t.token_amount);
    });

    let currentHoldings = 0;
    const uniqueTokens = new Set([...buyTokenAmounts.keys(), ...sellTokenAmounts.keys()]).size;

    buyTokenAmounts.forEach((buyAmount, mint) => {
      const sellAmount = sellTokenAmounts.get(mint) || 0;
      if (buyAmount > sellAmount) {
        currentHoldings++;
      }
    });

    return {
      totalTrades: trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      successTrades: confirmedTrades.length,
      failedTrades: failedTrades.length,
      totalUsdAmount,
      totalSolAmount,
      totalProfit,
      profitableTrades,
      lossTrades,
      avgTradeAmount,
      maxTradeAmount,
      minTradeAmount,
      buySuccessRate,
      sellSuccessRate,
      overallSuccessRate,
      profitRate,
      currentHoldings,
      uniqueTokens,
    };
  }, [trades]);

  // 计算钱包统计数据
  const stats = React.useMemo(() => {
    if (!walletConfigs) {
      return {
        activeWallets: 0,
        strategyCounts: {},
        strategyWallets: {},
      };
    }

    const wallets = Object.values(walletConfigs);
    const activeWallets = wallets.filter(w => w.is_active);

    // 统计策略分布和按策略分组钱包
    const strategyCounts: Record<string, number> = {};
    const strategyWallets: Record<string, WalletConfig[]> = {};

    wallets.forEach(w => {
      const strategy = w.take_profit_strategy || 'none';
      strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;

      if (!strategyWallets[strategy]) {
        strategyWallets[strategy] = [];
      }
      strategyWallets[strategy].push(w);
    });

    return {
      activeWallets: activeWallets.length,
      strategyCounts,
      strategyWallets,
    };
  }, [walletConfigs]);

  // 处理策略卡片点击
  const handleStrategyClick = (strategy: string) => {
    const strategyMap = {
      'standard': '标准分步',
      'trailing': '追踪止盈',
      'exponential': '指数加码',
      'none': '未设置',
    };

    const strategyText = strategyMap[strategy as keyof typeof strategyMap] || strategy;
    const wallets = stats.strategyWallets[strategy] || [];

    setSelectedStrategy({
      strategy,
      text: strategyText,
      wallets,
    });
    setModalVisible(true);
  };

  // 复制地址到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('地址已复制到剪贴板');
    } catch (err) {
      message.error('复制失败');
    }
  };

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description="无法获取钱包配置数据，请检查网络连接或稍后重试。"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Title level={2}>系统概览</Title>
      <Paragraph type="secondary">
        实时监控钱包跟单系统的运行状态和关键指标
      </Paragraph>

      {/* 交易统计 - 置顶 */}
      <Card
        title={
          <span>
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            交易统计
          </span>
        }
        extra={<Tag color="green">实时</Tag>}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {/* 基础交易统计 */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="总交易次数"
                value={tradeStats.totalTrades}
                prefix={<SwapOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="买入次数"
                value={tradeStats.buyTrades}
                prefix={<RiseOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="卖出次数"
                value={tradeStats.sellTrades}
                prefix={<FallOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="成功率"
                value={tradeStats.overallSuccessRate}
                prefix={<CheckCircleOutlined />}
                suffix="%"
                precision={1}
                valueStyle={{ color: tradeStats.overallSuccessRate >= 80 ? '#52c41a' : tradeStats.overallSuccessRate >= 60 ? '#faad14' : '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {/* 金额统计 */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="总交易额"
                value={tradeStats.totalUsdAmount}
                prefix={<DollarOutlined />}
                suffix="USD"
                precision={2}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="平均交易额"
                value={tradeStats.avgTradeAmount}
                prefix={<PercentageOutlined />}
                suffix="USD"
                precision={2}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="总盈亏"
                value={tradeStats.totalProfit}
                prefix={tradeStats.totalProfit >= 0 ? <TrophyOutlined /> : <WarningOutlined />}
                suffix="USD"
                precision={4}
                valueStyle={{ color: tradeStats.totalProfit >= 0 ? '#52c41a' : '#f5222d' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="盈利率"
                value={tradeStats.profitRate}
                prefix={<TrophyOutlined />}
                suffix="%"
                precision={1}
                valueStyle={{ color: tradeStats.profitRate >= 60 ? '#52c41a' : tradeStats.profitRate >= 40 ? '#faad14' : '#f5222d' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {/* 持仓统计 */}
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="当前持仓"
                value={tradeStats.currentHoldings}
                suffix="个代币"
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="交易代币数"
                value={tradeStats.uniqueTokens}
                suffix="种"
                valueStyle={{ color: '#eb2f96' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card size="small">
              <Statistic
                title="买卖比例"
                value={tradeStats.buyTrades > 0 && tradeStats.sellTrades > 0
                  ? (tradeStats.buyTrades / tradeStats.sellTrades).toFixed(2)
                  : tradeStats.buyTrades > 0 ? '∞' : '0'}
                suffix={tradeStats.buyTrades > 0 && tradeStats.sellTrades > 0 ? ':1' : ''}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 活跃钱包统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card>
            <Statistic
              title="活跃钱包"
              value={stats.activeWallets}
              prefix={<ThunderboltOutlined />}
              loading={isLoading}
              suffix={
                <Tag color={stats.activeWallets > 0 ? 'green' : 'red'}>
                  {stats.activeWallets > 0 ? '运行中' : '已停止'}
                </Tag>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* 策略分布 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card title="策略分布统计">
            <Row gutter={16}>
              {Object.entries(stats.strategyCounts).map(([strategy, count]) => {
                const strategyMap = {
                  'standard': { text: '标准分步', color: 'blue' },
                  'trailing': { text: '追踪止盈', color: 'green' },
                  'exponential': { text: '指数加码', color: 'orange' },
                  'none': { text: '未设置', color: 'default' },
                };
                const config = strategyMap[strategy as keyof typeof strategyMap] || { text: strategy, color: 'default' };

                return (
                  <Col xs={12} sm={8} md={6} key={strategy}>
                    <Card
                      size="small"
                      hoverable
                      onClick={() => handleStrategyClick(strategy)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Statistic
                        title={<Tag color={config.color}>{config.text}</Tag>}
                        value={count}
                        suffix="个钱包"
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 策略钱包详情弹窗 */}
      <Modal
        title={`${selectedStrategy?.text || ''} - 钱包列表`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedStrategy && (
          <List
            dataSource={selectedStrategy.wallets}
            renderItem={(wallet) => {
              const remark = getWalletRemark(wallet.wallet_address);
              const isActive = wallet.is_active;

              return (
                <List.Item
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      onClick={() => copyToClipboard(wallet.wallet_address)}
                    >
                      复制地址
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 'bold' }}>{remark}</span>
                        <Tag color={isActive ? 'green' : 'red'}>
                          {isActive ? '运行中' : '已停止'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                          地址: {wallet.wallet_address}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          跟单比例: {wallet.follow_percentage || 0}% |
                          滑点: {wallet.slippage_percentage || 0}%
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Modal>

    </div>
  );
};

export default Dashboard;
