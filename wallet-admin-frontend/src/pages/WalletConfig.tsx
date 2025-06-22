import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Switch,
  Tag,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Alert,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import { 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  WalletOutlined 
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { WalletConfig, WalletConfigsResponse } from '../types';
import { useSolPrice } from '../hooks/useSolPrice';
import { formatPrice, usdToPriceMultiplier, priceMultiplierToUsd } from '../utils/priceUtils';

const { Title } = Typography;

// 钱包配置管理页面
const WalletConfigPage: React.FC = () => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletConfig | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取实时SOL价格用于转换
  const { solPrice } = useSolPrice();

  // 获取钱包配置数据
  const { data: walletConfigs, isLoading, refetch } = useQuery<WalletConfigsResponse>({
    queryKey: ['walletConfigs'],
    queryFn: ApiService.getWalletConfigurations,
  });

  // 更新钱包配置
  const updateMutation = useMutation({
    mutationFn: ApiService.updateWalletConfiguration,
    onSuccess: () => {
      message.success('钱包配置更新成功');
      queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });
      setEditModalVisible(false);
      setEditingWallet(null);
      form.resetFields();
    },
    onError: (error) => {
      message.error(`更新失败: ${error.message}`);
    },
  });

  // 删除钱包配置
  const deleteMutation = useMutation({
    mutationFn: ApiService.deleteWalletConfiguration,
    onSuccess: () => {
      message.success('钱包配置删除成功');
      queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });
    },
    onError: (error) => {
      message.error(`删除失败: ${error.message}`);
    },
  });

  // 处理状态切换
  const handleStatusToggle = async (wallet: WalletConfig, checked: boolean) => {
    const updatedConfig = { ...wallet, is_active: checked };
    updateMutation.mutate(updatedConfig);
  };

  // 处理编辑
  const handleEdit = (wallet: WalletConfig) => {
    setEditingWallet(wallet);

    // 转换价格multiplier为美元价格显示
    const formValues = {
      ...wallet,
      min_price_usd: wallet.min_price_multiplier ? priceMultiplierToUsd(wallet.min_price_multiplier, solPrice) : undefined,
      max_price_usd: wallet.max_price_multiplier ? priceMultiplierToUsd(wallet.max_price_multiplier, solPrice) : undefined,
    };

    form.setFieldsValue(formValues);
    setEditModalVisible(true);
  };

  // 处理删除
  const handleDelete = (walletAddress: string) => {
    deleteMutation.mutate(walletAddress);
  };

  // 处理编辑表单提交
  const handleFormSubmit = async (values: any) => {
    if (!editingWallet) return;

    // 转换美元价格为multiplier
    const updatedConfig: WalletConfig = {
      ...editingWallet,
      ...values,
      min_price_multiplier: values.min_price_usd ? usdToPriceMultiplier(values.min_price_usd, solPrice) : null,
      max_price_multiplier: values.max_price_usd ? usdToPriceMultiplier(values.max_price_usd, solPrice) : null,
    };

    // 移除临时的USD字段
    delete (updatedConfig as any).min_price_usd;
    delete (updatedConfig as any).max_price_usd;

    updateMutation.mutate(updatedConfig);
  };

  // 处理添加表单提交
  const handleAddSubmit = async (values: any) => {
    const newConfig: WalletConfig = {
      wallet_address: values.wallet_address,
      is_active: values.is_active ?? true,
      slippage_percentage: values.slippage_percentage,
      priority_fee: values.priority_fee,
      compute_unit_limit: values.compute_unit_limit,
      ...values,
      // 转换美元价格为multiplier
      min_price_multiplier: values.min_price_usd ? usdToPriceMultiplier(values.min_price_usd, solPrice) : null,
      max_price_multiplier: values.max_price_usd ? usdToPriceMultiplier(values.max_price_usd, solPrice) : null,
    };

    // 移除临时的USD字段
    delete (newConfig as any).min_price_usd;
    delete (newConfig as any).max_price_usd;

    updateMutation.mutate(newConfig);
    setAddModalVisible(false);
    addForm.resetFields();
  };

  // 表格列定义
  const columns = [
    {
      title: '钱包地址',
      dataIndex: 'wallet_address',
      key: 'wallet_address',
      width: 200,
      render: (address: string) => (
        <Tooltip title={address}>
          <Typography.Text code copyable>
            {`${address.slice(0, 8)}...${address.slice(-8)}`}
          </Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: WalletConfig) => (
        <Switch
          checked={isActive}
          onChange={(checked) => handleStatusToggle(record, checked)}
          loading={updateMutation.isPending}
          checkedChildren="启用"
          unCheckedChildren="停用"
        />
      ),
    },
    {
      title: '跟单比例',
      dataIndex: 'follow_percentage',
      key: 'follow_percentage',
      width: 120,
      render: (percentage: number) => (
        <Tag color={percentage >= 80 ? 'red' : percentage >= 50 ? 'orange' : 'green'}>
          {percentage}%
        </Tag>
      ),
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
        };
        const config = strategyMap[strategy as keyof typeof strategyMap] || { text: '未设置', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
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
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="确认删除"
            description="确定要删除这个钱包配置吗？"
            onConfirm={() => handleDelete(record.wallet_address)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              size="small"
              loading={deleteMutation.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 转换数据为表格格式
  const tableData = walletConfigs 
    ? Object.values(walletConfigs).map(config => ({
        ...config,
        key: config.wallet_address,
      }))
    : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>
          <WalletOutlined /> 钱包配置管理
        </Title>
        <Space>
          <Button
            type="primary"
            onClick={() => setAddModalVisible(true)}
          >
            添加钱包
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            刷新
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={tableData}
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个钱包配置`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 编辑模态框 */}
      <Modal
        title="编辑钱包配置"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingWallet(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
        width={800}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          {/* 基础配置 */}
          <Typography.Title level={5}>基础配置</Typography.Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="follow_percentage"
                label="跟单比例 (%)"
                tooltip="相对于被跟随者的交易额，100.0代表1:1跟单"
              >
                <InputNumber min={0} max={1000} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slippage_percentage"
                label="滑点百分比 (%)"
                rules={[{ required: true, message: '请输入滑点百分比' }]}
                tooltip="允许成交价与预估价的偏差百分比"
              >
                <InputNumber min={0} max={50} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 交易执行参数 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>交易执行参数</Typography.Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="priority_fee"
                label="优先费用"
                rules={[{ required: true, message: '请输入优先费用' }]}
                tooltip="Solana交易的优先费用，单位是 micro-lamports"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="compute_unit_limit"
                label="计算单元限制"
                rules={[{ required: true, message: '请输入计算单元限制' }]}
                tooltip="交易的计算单元限制"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="accelerator_tip_percentage"
                label="加速器小费 (%)"
                tooltip="使用交易加速器时，支付的小费占买入金额的百分比"
              >
                <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 跟单金额控制 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>跟单金额控制</Typography.Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sol_amount_min"
                label="最小 SOL 数量"
                tooltip="购买金额的SOL绝对值下限"
              >
                <InputNumber min={0} step={0.00000001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sol_amount_max"
                label="最大 SOL 数量"
                tooltip="购买金额的SOL绝对值上限"
              >
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 价格筛选控制 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>价格筛选控制</Typography.Title>
          <Alert
            message={`当前SOL价格: ${formatPrice(solPrice)}`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="min_price_usd"
                label="最低价格筛选 (美元)"
                tooltip="只跟单价格 >= 此值的代币。设为空表示不限制最低价格"
              >
                <InputNumber
                  min={0}
                  step={0.0001}
                  style={{ width: '100%' }}
                  placeholder="例如: $0.0001"
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_price_usd"
                label="最高价格筛选 (美元)"
                tooltip="只跟单价格 <= 此值的代币。设为空表示不限制最高价格"
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  style={{ width: '100%' }}
                  placeholder="例如: $0.01"
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 止盈策略配置 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>止盈策略配置</Typography.Title>
          <Form.Item
            name="take_profit_strategy"
            label="止盈策略类型"
            tooltip="选择止盈策略：标准分步、追踪止盈或指数加码"
          >
            <Select style={{ width: '100%' }} placeholder="请选择止盈策略">
              <Select.Option value="standard">标准分步止盈</Select.Option>
              <Select.Option value="trailing">追踪止盈</Select.Option>
              <Select.Option value="exponential">指数加码卖出</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prevValues, currentValues) =>
            prevValues.take_profit_strategy !== currentValues.take_profit_strategy
          }>
            {({ getFieldValue }) => {
              const strategy = getFieldValue('take_profit_strategy');

              if (strategy === 'standard') {
                return (
                  <>
                    <Typography.Text type="secondary">标准分步止盈配置</Typography.Text>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <Form.Item
                          name="take_profit_start_pct"
                          label="起始止盈 (%)"
                          tooltip="开始止盈的盈利百分比"
                        >
                          <InputNumber min={0} max={1000} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="take_profit_step_pct"
                          label="止盈步长 (%)"
                          tooltip="每次止盈的步长百分比"
                        >
                          <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="take_profit_sell_portion_pct"
                          label="卖出比例 (%)"
                          tooltip="每次止盈时卖出的持仓比例"
                        >
                          <InputNumber min={0} max={100} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }

              if (strategy === 'trailing') {
                return (
                  <>
                    <Typography.Text type="secondary">追踪止盈配置</Typography.Text>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={12}>
                        <Form.Item
                          name="trailing_stop_profit_percentage"
                          label="追踪止盈百分比 (%)"
                          tooltip="价格回调多少百分比时触发止盈"
                        >
                          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }

              if (strategy === 'exponential') {
                return (
                  <>
                    <Typography.Text type="secondary">指数加码卖出配置</Typography.Text>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <Form.Item
                          name="exponential_sell_trigger_step_pct"
                          label="触发台阶 (%)"
                          tooltip="触发卖出的盈利台阶，例如10.0表示在+10%, +20%, +30%...时触发"
                        >
                          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="exponential_sell_base_portion_pct"
                          label="基础比例 (%)"
                          tooltip="计算卖出份额的基础比例"
                        >
                          <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="exponential_sell_power"
                          label="指数幂"
                          tooltip="计算卖出份额的幂，例如2.0代表按阶段的平方计算"
                        >
                          <InputNumber min={1} max={10} step={0.1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                );
              }

              return null;
            }}
          </Form.Item>

          {/* 风险管理 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>风险管理</Typography.Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hard_stop_loss_pct"
                label="硬止损 (%)"
                tooltip="价格相比买入价下跌这么多时，立即清仓"
              >
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="callback_stop_pct"
                label="回调止损 (%)"
                tooltip="价格相比历史最高价下跌这么多时，立即清仓"
              >
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* 动态持仓时间策略 */}
          <Typography.Title level={5} style={{ marginTop: 16 }}>动态持仓时间策略</Typography.Title>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="entry_confirmation_secs"
                label="初始持仓时间 (秒)"
                tooltip="买入后，若超过这个秒数无任何操作，则自动清仓"
              >
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="dynamic_hold_trigger_pct"
                label="延长触发 (%)"
                tooltip="触发持仓延长的价格波动百分比"
              >
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="dynamic_hold_extend_secs"
                label="延长时间 (秒)"
                tooltip="每次触发后，延长持仓的秒数"
              >
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="dynamic_hold_max_secs"
                label="最长持仓 (秒)"
                tooltip="通过动态延长，一笔交易允许的最长总持仓时间"
              >
                <InputNumber min={0} max={3600} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 添加钱包模态框 */}
      <Modal
        title="添加新钱包配置"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
        }}
        onOk={() => addForm.submit()}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddSubmit}
          initialValues={{
            is_active: true,
            slippage_percentage: 15.0,
            priority_fee: 150000,
            compute_unit_limit: 80000,
            take_profit_strategy: 'exponential',
            exponential_sell_trigger_step_pct: 10.0,
            exponential_sell_base_portion_pct: 5.0,
            exponential_sell_power: 2.0,
            follow_percentage: 100.0,
            accelerator_tip_percentage: 1.0,
            min_price_usd: 0.0001,
            max_price_usd: 0.01,
          }}
        >
          <Form.Item
            name="wallet_address"
            label="钱包地址"
            rules={[
              { required: true, message: '请输入钱包地址' },
              { min: 32, message: '钱包地址长度不正确' }
            ]}
          >
            <Input placeholder="请输入Solana钱包地址" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="slippage_percentage"
                label="滑点百分比 (%)"
                rules={[{ required: true, message: '请输入滑点百分比' }]}
              >
                <InputNumber min={0} max={50} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="follow_percentage"
                label="跟单比例 (%)"
              >
                <InputNumber min={0} max={1000} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority_fee"
                label="优先费用"
                rules={[{ required: true, message: '请输入优先费用' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="compute_unit_limit"
                label="计算单元限制"
                rules={[{ required: true, message: '请输入计算单元限制' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="min_price_usd"
                label="最低价格筛选 (美元)"
                tooltip="只跟单价格 >= 此值的代币"
              >
                <InputNumber
                  min={0}
                  step={0.0001}
                  style={{ width: '100%' }}
                  placeholder="$0.0001"
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="max_price_usd"
                label="最高价格筛选 (美元)"
                tooltip="只跟单价格 <= 此值的代币"
              >
                <InputNumber
                  min={0}
                  step={0.001}
                  style={{ width: '100%' }}
                  placeholder="$0.01"
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="take_profit_strategy"
            label="止盈策略"
          >
            <Select>
              <Select.Option value="exponential">指数加码卖出（推荐）</Select.Option>
              <Select.Option value="standard">标准分步止盈</Select.Option>
              <Select.Option value="trailing">追踪止盈</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WalletConfigPage;
