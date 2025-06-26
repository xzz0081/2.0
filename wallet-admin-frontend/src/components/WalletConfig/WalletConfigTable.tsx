import React, { useState } from 'react';
import {
  Table,
  Switch,
  Tag,
  Space,
  Typography,
  Button,
  Popconfirm,
  Tooltip,
  Input
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { WalletConfig } from '../../types/api';
import { useSolPrice } from '../../hooks/useSolPrice';
import { useWalletRemarks } from '../../hooks/useWalletRemarks';
import { formatPrice, priceMultiplierToUsd } from '../../utils/priceUtils';

interface WalletConfigTableProps {
  data: WalletConfig[];
  loading: boolean;
  onEdit: (wallet: WalletConfig) => void;
  onDelete: (walletAddress: string) => void;
  onStatusToggle: (wallet: WalletConfig, checked: boolean) => void;
  updateLoading: boolean;
  deleteLoading: boolean;
}

const WalletConfigTable: React.FC<WalletConfigTableProps> = ({
  data = [],
  loading = false,
  onEdit,
  onDelete,
  onStatusToggle,
  updateLoading = false,
  deleteLoading = false
}) => {
  const [editingRemark, setEditingRemark] = useState<string | null>(null);
  const [remarkInputValue, setRemarkInputValue] = useState<string>('');
  const { solPrice } = useSolPrice();
  const { getWalletRemarkOrNull, setWalletRemark } = useWalletRemarks();

  if (!Array.isArray(data)) {
    console.warn('WalletConfigTable: data is not an array:', data);
    return <div>数据格式错误</div>;
  }

  const columns = [
    {
      title: '钱包地址',
      dataIndex: 'wallet_address',
      key: 'wallet_address',
      width: 180,
      render: (address: string) => (
        <Tooltip title={`点击复制完整地址: ${address}`}>
          <Typography.Text
            code
            copyable={{
              text: address,
              tooltips: ['复制完整地址', '已复制完整地址']
            }}
          >
            {`${address.slice(0, 8)}...${address.slice(-8)}`}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '备注',
      dataIndex: 'wallet_address',
      key: 'remark',
      width: 120,
      render: (address: string) => {
        const localRemark = getWalletRemarkOrNull(address);
        const isEditing = editingRemark === address;

        if (isEditing) {
          const handleSaveRemark = () => {
            const newRemark = remarkInputValue.trim();
            if (newRemark) {
              setWalletRemark(address, newRemark);
            }
            setEditingRemark(null);
            setRemarkInputValue('');
          };

          return (
            <Input
              size="small"
              value={remarkInputValue}
              autoFocus
              onChange={(e) => setRemarkInputValue(e.target.value)}
              onBlur={handleSaveRemark}
              onPressEnter={handleSaveRemark}
              placeholder="输入备注"
              style={{ width: '100%' }}
            />
          );
        }

        return (
          <Tooltip title="点击编辑备注">
            <Typography.Text
              style={{
                color: localRemark ? '#ff4d4f' : '#999999',
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '2px',
                transition: 'background-color 0.2s',
                fontWeight: localRemark ? 'bold' : 'normal'
              }}
              onClick={() => {
                setEditingRemark(address);
                setRemarkInputValue(localRemark || '');
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {localRemark || '点击添加备注'}
            </Typography.Text>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: WalletConfig) => (
        <Switch
          checked={isActive}
          onChange={(checked) => onStatusToggle(record, checked)}
          loading={updateLoading}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '跟单模式',
      key: 'follow_mode',
      width: 150,
      render: (_: any, record: WalletConfig) => {
        const modeMap = {
          'Percentage': { text: '百分比', color: 'blue' },
          'FixedAmount': { text: '固定金额', color: 'green' }
        };
        
        // 安全检查和默认值
        const followMode = record.follow_mode || 'Percentage';
        const config = modeMap[followMode as keyof typeof modeMap] || { text: '百分比', color: 'blue' };
        
        return (
          <Space direction="vertical" size="small">
            <Tag color={config.color}>{config.text}</Tag>
            {followMode === 'Percentage' && record.follow_percentage && (
              <Typography.Text type="secondary">
                {record.follow_percentage}%
              </Typography.Text>
            )}
            {followMode === 'FixedAmount' && record.fixed_follow_amount_sol && (
              <Typography.Text type="secondary">
                {record.fixed_follow_amount_sol} SOL
              </Typography.Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'SOL 范围',
      key: 'sol_range',
      width: 150,
      render: (_: any, record: WalletConfig) => (
        <Space direction="vertical" size="small">
          <Typography.Text type="secondary">
            最小: {record.sol_amount_min || 'N/A'} SOL
          </Typography.Text>
          <Typography.Text type="secondary">
            最大: {record.sol_amount_max || 'N/A'} SOL
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '价格筛选',
      key: 'price_filter',
      width: 150,
      render: (_: any, record: WalletConfig) => {
        const hasMinPrice = record.min_price_multiplier !== null && record.min_price_multiplier !== undefined;
        const hasMaxPrice = record.max_price_multiplier !== null && record.max_price_multiplier !== undefined;

        if (!hasMinPrice && !hasMaxPrice) {
          return <Tag color="default">无限制</Tag>;
        }

        return (
          <Space direction="vertical" size="small">
            {hasMinPrice && (
              <Typography.Text type="secondary">
                最低: {formatPrice(priceMultiplierToUsd(record.min_price_multiplier!, solPrice))}
              </Typography.Text>
            )}
            {hasMaxPrice && (
              <Typography.Text type="secondary">
                最高: {formatPrice(priceMultiplierToUsd(record.max_price_multiplier!, solPrice))}
              </Typography.Text>
            )}
          </Space>
        );
      },
    },
    {
      title: '止盈策略',
      dataIndex: 'take_profit_strategy',
      key: 'take_profit_strategy',
      width: 120,
      render: (strategy: string) => {
        const strategyMap = {
          'standard': { text: '标准分步', color: 'blue' },
          'trailing': { text: '追踪止盈', color: 'green' },
          'exponential': { text: '指数加码', color: 'orange' },
          'volatility': { text: '波动性', color: 'purple' },
        };
        const config = strategyMap[strategy as keyof typeof strategyMap] || { text: '未设置', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '最小卖出保护',
      dataIndex: 'min_partial_sell_pct',
      key: 'min_partial_sell_pct',
      width: 120,
      render: (pct: number) => {
        if (!pct) return <Tag color="default">关闭</Tag>;
        return <Tag color="warning">{pct}%</Tag>;
      },
    },
    {
      title: '自动暂停',
      key: 'auto_suspend',
      width: 120,
      render: (_: any, record: WalletConfig) => {
        // 安全检查
        if (!record.auto_suspend_config || !record.auto_suspend_config.enabled) {
          return <Tag color="default">关闭</Tag>;
        }
        
        const config = record.auto_suspend_config;
        return (
          <Tooltip title={`${config.window_size || 1}h内${config.loss_count || 1}次亏损>${config.loss_threshold || -5}%时暂停`}>
            <Tag color="warning">启用</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '滑点',
      dataIndex: 'slippage_percentage',
      key: 'slippage_percentage',
      width: 80,
      render: (slippage: number) => `${slippage}%`,
    },
    {
      title: '交易参数',
      key: 'trading_params',
      width: 180,
      render: (_: any, record: WalletConfig) => (
        <Space direction="vertical" size="small">
          <Typography.Text type="secondary">
            优先费: {record.priority_fee?.toLocaleString() || 'N/A'}
          </Typography.Text>
          <Typography.Text type="secondary">
            计算单元: {record.compute_unit_limit?.toLocaleString() || 'N/A'}
          </Typography.Text>
          {record.accelerator_tip_percentage && (
            <Typography.Text type="secondary">
              加速器: {record.accelerator_tip_percentage}%
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '风险管理',
      key: 'risk_management',
      width: 150,
      render: (_: any, record: WalletConfig) => (
        <Space direction="vertical" size="small">
          {record.hard_stop_loss_pct && (
            <Typography.Text type="secondary">
              硬止损: {record.hard_stop_loss_pct}%
            </Typography.Text>
          )}
          {record.callback_stop_pct && (
            <Typography.Text type="secondary">
              回调止损: {record.callback_stop_pct}%
            </Typography.Text>
          )}
          {!record.hard_stop_loss_pct && !record.callback_stop_pct && (
            <Typography.Text type="secondary">未设置</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: WalletConfig) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
          />
          <Popconfirm
            title="确认删除"
            description="确定要删除这个钱包配置吗？"
            onConfirm={() => onDelete(record.wallet_address)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              size="small"
              loading={deleteLoading}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 个钱包配置`,
      }}
      scroll={{ x: 1200 }}
    />
  );
};

export default WalletConfigTable; 