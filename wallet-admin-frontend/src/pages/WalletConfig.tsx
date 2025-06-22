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
  // Input,
  InputNumber,
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

const { Title } = Typography;

// 钱包配置管理页面
const WalletConfigPage: React.FC = () => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletConfig | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

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
    form.setFieldsValue(wallet);
    setEditModalVisible(true);
  };

  // 处理删除
  const handleDelete = (walletAddress: string) => {
    deleteMutation.mutate(walletAddress);
  };

  // 处理表单提交
  const handleFormSubmit = async (values: any) => {
    if (!editingWallet) return;
    
    const updatedConfig: WalletConfig = {
      ...editingWallet,
      ...values,
    };
    
    updateMutation.mutate(updatedConfig);
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
      title: '滑点',
      dataIndex: 'slippage_percentage',
      key: 'slippage_percentage',
      width: 80,
      render: (slippage: number) => `${slippage}%`,
    },
    {
      title: '优先费用',
      dataIndex: 'priority_fee',
      key: 'priority_fee',
      width: 120,
      render: (fee: number) => fee.toLocaleString(),
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
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
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
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="follow_percentage"
            label="跟单比例 (%)"
            rules={[{ required: true, message: '请输入跟单比例' }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sol_amount_min"
            label="最小 SOL 数量"
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="sol_amount_max"
            label="最大 SOL 数量"
          >
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="slippage_percentage"
            label="滑点百分比 (%)"
            rules={[{ required: true, message: '请输入滑点百分比' }]}
          >
            <InputNumber min={0} max={50} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="priority_fee"
            label="优先费用"
            rules={[{ required: true, message: '请输入优先费用' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="compute_unit_limit"
            label="计算单元限制"
            rules={[{ required: true, message: '请输入计算单元限制' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WalletConfigPage;
