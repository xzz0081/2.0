import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Form,
  message,
} from 'antd';
import {
  ReloadOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { WalletConfig, WalletConfigsResponse } from '../types';
import { useSolPrice } from '../hooks/useSolPrice';
import { useWalletRemarks } from '../hooks/useWalletRemarks';
import { priceMultiplierToUsd } from '../utils/priceUtils';
import { 
  WalletConfigTable, 
  WalletFormModal 
} from '../components/WalletConfig';

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

  // 本地钱包备注管理
  const { getWalletRemarkOrNull, setWalletRemark } = useWalletRemarks();

  // 获取钱包配置数据
  const { data: walletConfigs, isLoading, refetch } = useQuery<WalletConfigsResponse>({
    queryKey: ['walletConfigs'],
    queryFn: ApiService.getWalletConfigurations,
  });

  // 同步后端备注到本地存储
  React.useEffect(() => {
    if (walletConfigs) {
      Object.values(walletConfigs).forEach(config => {
        if (config.remark && !getWalletRemarkOrNull(config.wallet_address)) {
          setWalletRemark(config.wallet_address, config.remark);
        }
      });
    }
  }, [walletConfigs, getWalletRemarkOrNull, setWalletRemark]);

  // 更新钱包配置
  const updateMutation = useMutation({
    mutationFn: ApiService.updateWalletConfiguration,
    onSuccess: (_, variables) => {
      // 判断是否是新增操作（没有editingWallet表示是新增）
      const isAddOperation = !editingWallet;

      message.success(isAddOperation ? '钱包配置添加成功' : '钱包配置更新成功');
      queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });

      // 如果是添加操作且有备注，同时保存到本地存储
      if (isAddOperation && variables.remark) {
        setWalletRemark(variables.wallet_address, variables.remark);
      }

      setEditModalVisible(false);
      setAddModalVisible(false);
      setEditingWallet(null);
      form.resetFields();
      addForm.resetFields();
    },
    onError: (error) => {
      message.error(`操作失败: ${error.message}`);
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
  const handleEditSubmit = async (values: any) => {
    if (!editingWallet) return;

    const updatedConfig: WalletConfig = {
      ...editingWallet,
      ...values,
    };

    updateMutation.mutate(updatedConfig);
  };

  // 处理添加表单提交
  const handleAddSubmit = async (values: any) => {
    const newConfig: WalletConfig = {
      wallet_address: values.wallet_address,
      is_active: values.is_active ?? true,
      follow_mode: values.follow_mode || 'Percentage', // 默认使用百分比模式
      slippage_percentage: values.slippage_percentage,
      priority_fee: values.priority_fee,
      compute_unit_limit: values.compute_unit_limit,
      ...values,
    };

    updateMutation.mutate(newConfig);
  };

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
        <WalletConfigTable
          data={tableData}
          loading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusToggle={handleStatusToggle}
          updateLoading={updateMutation.isPending}
          deleteLoading={deleteMutation.isPending}
        />
      </Card>

      {/* 编辑模态框 */}
      <WalletFormModal
        visible={editModalVisible}
        mode="edit"
        editingWallet={editingWallet}
        form={form}
        onSubmit={handleEditSubmit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingWallet(null);
          form.resetFields();
        }}
        loading={updateMutation.isPending}
      />

      {/* 添加模态框 */}
      <WalletFormModal
        visible={addModalVisible}
        mode="add"
        form={addForm}
        onSubmit={handleAddSubmit}
        onCancel={() => {
          setAddModalVisible(false);
          addForm.resetFields();
        }}
        loading={updateMutation.isPending}
      />
    </div>
  );
};

export default WalletConfigPage;
