import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Alert, Space, Tag } from 'antd';
import {
  WalletOutlined,
  RiseOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { WalletConfigsResponse } from '../types';

const { Title, Paragraph } = Typography;

// 仪表板页面组件
const Dashboard: React.FC = () => {
  const [priceData, setPriceData] = useState<{ price: number; timestamp: number } | null>(null);
  const [tradeCount, setTradeCount] = useState(0);

  // 获取钱包配置数据
  const { data: walletConfigs, isLoading, error } = useQuery<WalletConfigsResponse>({
    queryKey: ['walletConfigs'],
    queryFn: ApiService.getWalletConfigurations,
    refetchInterval: 30000, // 每30秒刷新一次
  });

  // 计算统计数据
  const stats = React.useMemo(() => {
    if (!walletConfigs) {
      return {
        totalWallets: 0,
        activeWallets: 0,
        totalSolAmount: 0,
        avgFollowPercentage: 0,
        strategyCounts: {},
        priceFilterStats: { withFilter: 0, withoutFilter: 0, bothLimits: 0, minOnly: 0, maxOnly: 0 },
      };
    }

    const wallets = Object.values(walletConfigs);
    const activeWallets = wallets.filter(w => w.is_active);
    const totalSolAmount = wallets.reduce((sum, w) => {
      return sum + (w.sol_amount_max || 0);
    }, 0);
    const avgFollowPercentage = wallets.length > 0
      ? wallets.reduce((sum, w) => sum + (w.follow_percentage || 0), 0) / wallets.length
      : 0;

    // 统计策略分布
    const strategyCounts = wallets.reduce((acc, w) => {
      const strategy = w.take_profit_strategy || 'none';
      acc[strategy] = (acc[strategy] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 统计价格筛选使用情况
    const priceFilterStats = wallets.reduce((acc, w) => {
      const hasMinPrice = w.min_price_multiplier !== null && w.min_price_multiplier !== undefined;
      const hasMaxPrice = w.max_price_multiplier !== null && w.max_price_multiplier !== undefined;

      if (hasMinPrice || hasMaxPrice) {
        acc.withFilter++;
      } else {
        acc.withoutFilter++;
      }

      if (hasMinPrice && hasMaxPrice) {
        acc.bothLimits++;
      } else if (hasMinPrice) {
        acc.minOnly++;
      } else if (hasMaxPrice) {
        acc.maxOnly++;
      }

      return acc;
    }, { withFilter: 0, withoutFilter: 0, bothLimits: 0, minOnly: 0, maxOnly: 0 });

    return {
      totalWallets: wallets.length,
      activeWallets: activeWallets.length,
      totalSolAmount,
      avgFollowPercentage,
      strategyCounts,
      priceFilterStats,
    };
  }, [walletConfigs]);

  // 设置SSE连接监听价格和交易数据
  useEffect(() => {
    let priceEventSource: EventSource | null = null;
    let tradeEventSource: EventSource | null = null;

    try {
      // 价格流连接
      priceEventSource = ApiService.createPriceStream();
      priceEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setPriceData({
            price: data.price || 0,
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('解析价格数据失败:', error);
        }
      };

      priceEventSource.onerror = (error) => {
        console.error('价格流连接错误:', error);
      };

      // 交易流连接
      tradeEventSource = ApiService.createTradeStream();
      tradeEventSource.onmessage = () => {
        try {
          setTradeCount(prev => prev + 1);
        } catch (error) {
          console.error('解析交易数据失败:', error);
        }
      };

      tradeEventSource.onerror = (error) => {
        console.error('交易流连接错误:', error);
      };

    } catch (error) {
      console.error('SSE连接初始化失败:', error);
    }

    // 清理函数
    return () => {
      if (priceEventSource) {
        priceEventSource.close();
      }
      if (tradeEventSource) {
        tradeEventSource.close();
      }
    };
  }, []);

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

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="钱包总数"
              value={stats.totalWallets}
              prefix={<WalletOutlined />}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
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
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="平均跟单比例"
              value={stats.avgFollowPercentage}
              prefix={<RiseOutlined />}
              suffix="%"
              precision={1}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 策略分布 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
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
                  <Col xs={12} sm={12} md={12} key={strategy}>
                    <Card size="small">
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
        <Col xs={24} lg={12}>
          <Card title="价格筛选统计">
            <Row gutter={16}>
              <Col xs={12} sm={12} md={12}>
                <Card size="small">
                  <Statistic
                    title={<Tag color="green">启用筛选</Tag>}
                    value={stats.priceFilterStats.withFilter}
                    suffix="个钱包"
                  />
                </Card>
              </Col>
              <Col xs={12} sm={12} md={12}>
                <Card size="small">
                  <Statistic
                    title={<Tag color="default">无筛选</Tag>}
                    value={stats.priceFilterStats.withoutFilter}
                    suffix="个钱包"
                  />
                </Card>
              </Col>
              <Col xs={8} sm={8} md={8}>
                <Card size="small">
                  <Statistic
                    title={<Tag color="blue" style={{ fontSize: '10px' }}>双限制</Tag>}
                    value={stats.priceFilterStats.bothLimits}
                  />
                </Card>
              </Col>
              <Col xs={8} sm={8} md={8}>
                <Card size="small">
                  <Statistic
                    title={<Tag color="cyan" style={{ fontSize: '10px' }}>仅最低</Tag>}
                    value={stats.priceFilterStats.minOnly}
                  />
                </Card>
              </Col>
              <Col xs={8} sm={8} md={8}>
                <Card size="small">
                  <Statistic
                    title={<Tag color="purple" style={{ fontSize: '10px' }}>仅最高</Tag>}
                    value={stats.priceFilterStats.maxOnly}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 实时数据 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="实时价格" extra={<Tag color="blue">实时</Tag>}>
            {priceData ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="SOL 价格"
                  value={priceData.price}
                  prefix="$"
                  precision={2}
                />
                <Typography.Text type="secondary">
                  更新时间: {new Date(priceData.timestamp).toLocaleTimeString()}
                </Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary">等待价格数据...</Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="交易统计" extra={<Tag color="green">实时</Tag>}>
            <Statistic
              title="今日交易次数"
              value={tradeCount}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
