import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  Switch,
  Tag,
  Space,
  Typography,
  Button,
  Popconfirm,
  Tooltip,
  Input,
  Select,
  Row,
  Col,
  Checkbox,
  Alert,
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import type { WalletConfig } from '../../types/api';
import { useWalletRemarks } from '../../hooks/useWalletRemarks';
import { formatPrice, priceMultiplierToUsd } from '../../utils/priceUtils';

interface WalletConfigTableProps {
  data: WalletConfig[];
  loading: boolean;
  solPrice: number;
  onEdit: (wallet: WalletConfig) => void;
  onDelete: (walletAddress: string) => void;
  onBatchDelete: (walletAddresses: string[]) => void;
  onBatchStatusToggle: (walletAddresses: string[], isActive: boolean) => void;
  onSaveAsTemplate?: (wallet: WalletConfig) => void;
  onStatusToggle: (wallet: WalletConfig, checked: boolean) => void;
  updateLoading: boolean;
  deleteLoading: boolean;
}

const WalletConfigTable: React.FC<WalletConfigTableProps> = React.memo(({
  data = [],
  loading = false,
  solPrice,
  onEdit,
  onDelete,
  onBatchDelete,
  onBatchStatusToggle,
  onSaveAsTemplate,
  onStatusToggle,
  updateLoading = false,
  deleteLoading = false
}) => {
  const [editingRemark, setEditingRemark] = useState<string | null>(null);
  const [remarkInputValue, setRemarkInputValue] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const { getWalletRemarkOrNull, setWalletRemark, remarks } = useWalletRemarks();

  if (!Array.isArray(data)) {
    console.warn('WalletConfigTable: data is not an array:', data);
    return <div>数据格式错误</div>;
  }

  // 优化：缓存价格计算结果
  const priceCalculations = useMemo(() => {
    const cache: Record<string, { minPrice?: string; maxPrice?: string }> = {};
    
    data.forEach(item => {
      const hasMinPrice = item.min_price_multiplier !== null && item.min_price_multiplier !== undefined;
      const hasMaxPrice = item.max_price_multiplier !== null && item.max_price_multiplier !== undefined;
      
      cache[item.wallet_address] = {
        minPrice: hasMinPrice ? (item.min_price_multiplier! * solPrice).toFixed(6) : undefined,
        maxPrice: hasMaxPrice ? (item.max_price_multiplier! * solPrice).toFixed(3) : undefined,
      };
    });
    
    return cache;
  }, [data, solPrice]);

  // 优化：使用remarks对象而不是函数来减少依赖
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 搜索过滤（钱包地址和备注）
      const searchLower = searchText.toLowerCase();
      const remarkText = remarks[item.wallet_address]?.remark || '';
      const matchesSearch = !searchText || 
        item.wallet_address.toLowerCase().includes(searchLower) ||
        remarkText.toLowerCase().includes(searchLower);

      // 状态过滤
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active);

      // 模式过滤
      const matchesMode = modeFilter === 'all' ||
        (modeFilter === 'percentage' && item.follow_mode === 'Percentage') ||
        (modeFilter === 'fixed' && item.follow_mode === 'FixedAmount');

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [data, searchText, statusFilter, modeFilter, remarks]);

  // 批量删除处理
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0 || deleteLoading) {
      message.warning('请选择要删除的钱包');
      return;
    }
    onBatchDelete(selectedRowKeys);
    setSelectedRowKeys([]);
  }, [selectedRowKeys, deleteLoading, onBatchDelete]);

  // 批量状态切换处理
  const handleBatchStatusToggle = useCallback((isActive: boolean) => {
    if (selectedRowKeys.length === 0 || updateLoading) {
      message.warning('请选择要操作的钱包');
      return;
    }
    onBatchStatusToggle(selectedRowKeys, isActive);
    setSelectedRowKeys([]);
  }, [selectedRowKeys, updateLoading, onBatchStatusToggle]);

  // 清空筛选
  const handleClearFilters = useCallback(() => {
    setSearchText('');
    setStatusFilter('all');
    setModeFilter('all');
  }, []);

  // 优化：缓存列定义
  const columns = useMemo(() => [
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
        const localRemark = remarks[address]?.remark || null;
        const isEditing = editingRemark === address;

        if (isEditing) {
          const handleSaveRemark = async () => {
            const newRemark = remarkInputValue.trim();
            if (newRemark) {
              try {
                await setWalletRemark(address, newRemark);
                message.success('备注保存成功');
              } catch (error) {
                message.error('备注保存失败');
                console.error('保存备注失败:', error);
              }
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
        const prices = priceCalculations[record.wallet_address];
        
        if (!prices?.minPrice && !prices?.maxPrice) {
          return <Tag color="default">无限制</Tag>;
        }

        return (
          <Space direction="vertical" size="small">
            {prices?.minPrice && (
              <Typography.Text type="secondary">
                最低: ${prices.minPrice}
              </Typography.Text>
            )}
            {prices?.maxPrice && (
              <Typography.Text type="secondary">
                最高: ${prices.maxPrice}
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
      width: 160,
      render: (_: any, record: WalletConfig) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
            title="编辑配置"
          />
          {onSaveAsTemplate && (
            <Button
              type="text"
              icon={<SaveOutlined />}
              onClick={() => onSaveAsTemplate(record)}
              size="small"
              title="保存为模板"
            />
          )}
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
              title="删除配置"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ], [
    onEdit, 
    onDelete, 
    onSaveAsTemplate, 
    onStatusToggle, 
    updateLoading, 
    deleteLoading, 
    remarks,
    editingRemark,
    remarkInputValue,
    setWalletRemark,
    priceCalculations
  ]);

  // 行选择配置
  const rowSelection = useMemo(() => ({
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[]);
    },
    onSelect: (record: WalletConfig, selected: boolean, selectedRows: WalletConfig[]) => {
      console.log('选择行:', record, selected, selectedRows);
    },
    onSelectAll: (selected: boolean, selectedRows: WalletConfig[], changeRows: WalletConfig[]) => {
      console.log('全选:', selected, selectedRows, changeRows);
    },
  }), [selectedRowKeys]);

  return (
    <div>
      {/* 筛选和批量操作区域 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="搜索钱包地址或备注"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="状态筛选"
            value={statusFilter}
            onChange={setStatusFilter}
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="active">已启用</Select.Option>
            <Select.Option value="inactive">已停用</Select.Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            placeholder="模式筛选"
            value={modeFilter}
            onChange={setModeFilter}
          >
            <Select.Option value="all">全部模式</Select.Option>
            <Select.Option value="percentage">百分比</Select.Option>
            <Select.Option value="fixed">固定金额</Select.Option>
          </Select>
        </Col>
        <Col span={8}>
          <Space>
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
            >
              清空筛选
            </Button>
            {selectedRowKeys.length > 0 && (
              <>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleBatchStatusToggle(true)}
                  loading={updateLoading}
                  disabled={updateLoading || selectedRowKeys.length === 0}
                >
                  批量启用 ({selectedRowKeys.length})
                </Button>
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={() => handleBatchStatusToggle(false)}
                  loading={updateLoading}
                  disabled={updateLoading || selectedRowKeys.length === 0}
                >
                  批量停用 ({selectedRowKeys.length})
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                  loading={deleteLoading}
                  disabled={deleteLoading || selectedRowKeys.length === 0}
                >
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      {/* 筛选结果提示 */}
      {filteredData.length !== data.length && (
        <Alert
          message={`筛选结果: ${filteredData.length} / ${data.length} 个钱包配置`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 表格 */}
      <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        rowKey="wallet_address"
        rowSelection={rowSelection}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 个钱包配置`,
        }}
        scroll={{ x: 1200, y: 600 }}
      />
    </div>
  );
});

WalletConfigTable.displayName = 'WalletConfigTable';

export default WalletConfigTable; 