import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Form,
  message,
  Modal,
  Input,
} from 'antd';
import {
  ReloadOutlined,
  WalletOutlined,
  ImportOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { WalletConfig, WalletConfigsResponse } from '../types';
import { priceMultiplierToUsd } from '../utils/priceUtils';
import { 
  WalletConfigTable, 
  WalletFormModal 
} from '../components/WalletConfig';
import TemplateModal from '../components/WalletConfig/TemplateModal';
import BatchImportModal from '../components/WalletConfig/BatchImportModal';
import { useWalletTemplates } from '../hooks/useWalletTemplates';
import { useWalletRemarks } from '../hooks/useWalletRemarks';
import { WalletTemplate, BatchImportWallet, BatchImportProgress } from '../types/template';

const { Title } = Typography;

// 钱包配置管理页面
const WalletConfigPage: React.FC = React.memo(() => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [batchImportModalVisible, setBatchImportModalVisible] = useState(false);
  const [saveTemplateModalVisible, setSaveTemplateModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletConfig | null>(null);
  const [savingTemplateWallet, setSavingTemplateWallet] = useState<WalletConfig | null>(null);
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const [saveTemplateForm] = Form.useForm();
  const queryClient = useQueryClient();

  // 获取缓存的SOL价格，避免重复API请求（MainLayout已经在请求了）
  const solPrice = ApiService.getCachedSolPrice();

  // 本地钱包备注管理
  const { setWalletRemark, loadRemarks, updateServerRemarks } = useWalletRemarks();

  // 模板管理
  const { createTemplateFromConfig } = useWalletTemplates();

  // 获取钱包配置数据
  const { data: walletConfigs, isLoading, refetch } = useQuery<WalletConfigsResponse>({
    queryKey: ['walletConfigs'],
    queryFn: ApiService.getWalletConfigurations,
  });

  // 优化：缓存表格数据转换
  const tableData = useMemo(() => {
    if (!walletConfigs) return [];
    
    return Object.values(walletConfigs).map(config => ({
      ...config,
      key: config.wallet_address,
    }));
  }, [walletConfigs]);

  // 同步服务器端备注到本地状态
  React.useEffect(() => {
    if (walletConfigs) {
      updateServerRemarks(walletConfigs);
    }
  }, [walletConfigs, updateServerRemarks]);

  // 更新钱包配置
  const updateMutation = useMutation({
    mutationFn: ApiService.updateWalletConfiguration,
    onSuccess: () => {
      // 判断是否是新增操作（没有editingWallet表示是新增）
      const isAddOperation = !editingWallet;

      message.success(isAddOperation ? '钱包配置添加成功' : '钱包配置更新成功');
      queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });

      // 备注会通过服务器端配置自动同步，不需要手动保存

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

  // 批量删除钱包配置
  const batchDeleteMutation = useMutation({
    mutationFn: async (walletAddresses: string[]) => {
      // 控制并发数量，避免同时发起过多请求
      const BATCH_SIZE = 5; // 每批处理5个请求
      const results = [];
      
      for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
        const batch = walletAddresses.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(address => 
          ApiService.deleteWalletConfiguration(address)
        );
        
        // 等待当前批次完成再处理下一批
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    },
    onMutate: async (walletAddresses: string[]) => {
      // 乐观更新：立即从UI中移除
      await queryClient.cancelQueries({ queryKey: ['walletConfigs'] });
      
      const previousData = queryClient.getQueryData<WalletConfigsResponse>(['walletConfigs']);
      
      if (previousData) {
        const optimisticData = { ...previousData };
        walletAddresses.forEach(address => {
          delete optimisticData[address];
        });
        
        queryClient.setQueryData(['walletConfigs'], optimisticData);
      }
      
      return { previousData };
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      if (failedCount === 0) {
        message.success(`成功删除 ${successCount} 个钱包配置`);
      } else {
        message.warning(`删除完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
      }
      
      // 延迟刷新数据，避免频繁更新
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });
      }, 300);
    },
    onError: (error, _, context) => {
      // 回滚乐观更新
      if (context?.previousData) {
        queryClient.setQueryData(['walletConfigs'], context.previousData);
      }
      message.error(`批量删除失败: ${error.message}`);
    },
  });

  // 批量状态切换
  const batchStatusToggleMutation = useMutation({
    mutationFn: async ({ walletAddresses, isActive }: { walletAddresses: string[], isActive: boolean }) => {
      // 获取当前钱包配置
      const currentConfigs = walletConfigs ? Object.values(walletConfigs) : [];
      
      // 控制并发数量，避免同时发起过多请求
      const BATCH_SIZE = 5; // 每批处理5个请求
      const results = [];
      
      for (let i = 0; i < walletAddresses.length; i += BATCH_SIZE) {
        const batch = walletAddresses.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(address => {
          const currentConfig = currentConfigs.find(config => config.wallet_address === address);
          if (currentConfig) {
            const updatedConfig = { ...currentConfig, is_active: isActive };
            return ApiService.updateWalletConfiguration(updatedConfig);
          }
          return Promise.reject(new Error(`找不到钱包配置: ${address}`));
        });
        
        // 等待当前批次完成再处理下一批
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    },
    onMutate: async ({ walletAddresses, isActive }) => {
      // 乐观更新：立即更新UI，不等待服务器响应
      await queryClient.cancelQueries({ queryKey: ['walletConfigs'] });
      
      const previousData = queryClient.getQueryData<WalletConfigsResponse>(['walletConfigs']);
      
      if (previousData) {
        const optimisticData = { ...previousData };
        walletAddresses.forEach(address => {
          if (optimisticData[address]) {
            optimisticData[address] = {
              ...optimisticData[address],
              is_active: isActive
            };
          }
        });
        
        queryClient.setQueryData(['walletConfigs'], optimisticData);
      }
      
      return { previousData };
    },
    onSuccess: (results, { isActive }) => {
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;
      
      const action = isActive ? '启用' : '停用';
      
      if (failedCount === 0) {
        message.success(`成功${action} ${successCount} 个钱包配置`);
      } else {
        message.warning(`${action}完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
      }
      
      // 延迟刷新数据，避免频繁更新
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });
      }, 300);
    },
    onError: (error, _, context) => {
      // 回滚乐观更新
      if (context?.previousData) {
        queryClient.setQueryData(['walletConfigs'], context.previousData);
      }
      message.error(`批量状态切换失败: ${error.message}`);
    },
  });

  // 优化：使用useCallback缓存事件处理函数
  // 处理状态切换
  const handleStatusToggle = useCallback(async (wallet: WalletConfig, checked: boolean) => {
    const updatedConfig = { ...wallet, is_active: checked };
    updateMutation.mutate(updatedConfig);
  }, [updateMutation]);

  // 处理编辑
  const handleEdit = useCallback((wallet: WalletConfig) => {
    setEditingWallet(wallet);

    // 转换价格multiplier为美元价格显示
    const formValues = {
      ...wallet,
      min_price_usd: wallet.min_price_multiplier ? priceMultiplierToUsd(wallet.min_price_multiplier, solPrice) : undefined,
      max_price_usd: wallet.max_price_multiplier ? priceMultiplierToUsd(wallet.max_price_multiplier, solPrice) : undefined,
    };

    form.setFieldsValue(formValues);
    setEditModalVisible(true);
  }, [form, solPrice]);

  // 处理删除
  const handleDelete = useCallback((walletAddress: string) => {
    deleteMutation.mutate(walletAddress);
  }, [deleteMutation]);

  // 处理批量删除
  const handleBatchDelete = useCallback((walletAddresses: string[]) => {
    batchDeleteMutation.mutate(walletAddresses);
  }, [batchDeleteMutation]);

  // 处理批量状态切换
  const handleBatchStatusToggle = useCallback((walletAddresses: string[], isActive: boolean) => {
    batchStatusToggleMutation.mutate({ walletAddresses, isActive });
  }, [batchStatusToggleMutation]);

  // 处理批量导入
  const handleBatchImport = useCallback(async (
    wallets: BatchImportWallet[], 
    template: WalletTemplate,
    onProgress: (progress: BatchImportProgress) => void
  ) => {
    const errors: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    
    // 初始化进度
    onProgress({
      total: wallets.length,
      current: 0,
      success: 0,
      failed: 0,
      errors: []
    });
    
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      try {
        const newConfig: WalletConfig = {
          ...template.config,
          wallet_address: wallet.wallet_address,
          remark: wallet.remark,
        };
        
        await ApiService.updateWalletConfiguration(newConfig);
        
        // 由于新的setWalletRemark已经会自动同步到服务器，这里不需要额外调用
        // 服务器端的remark会通过钱包配置更新自动同步
        
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        const errorMsg = `${wallet.wallet_address}: ${errorMessage}`;
        errors.push(errorMsg);
        failedCount++;
      }
      
      // 更新进度
      onProgress({
        total: wallets.length,
        current: i + 1,
        success: successCount,
        failed: failedCount,
        errors: errors
      });
    }
    
    // 刷新数据
    queryClient.invalidateQueries({ queryKey: ['walletConfigs'] });
    
    // 手动刷新备注状态，确保备注立即显示
    setTimeout(() => {
      loadRemarks();
    }, 100);
    
    if (errors.length === 0) {
      message.success(`成功导入 ${successCount} 个钱包配置`);
    } else {
      message.warning(`导入完成，成功: ${successCount}，失败: ${errors.length}`);
    }
  }, [queryClient, setWalletRemark, loadRemarks]);

  // 保存配置为模板
  const handleSaveAsTemplate = useCallback((wallet: WalletConfig) => {
    setSavingTemplateWallet(wallet);
    setSaveTemplateModalVisible(true);
  }, []);

  // 处理保存模板提交
  const handleSaveTemplateSubmit = useCallback(async () => {
    if (!savingTemplateWallet) return;
    
    try {
      const values = await saveTemplateForm.validateFields();
      createTemplateFromConfig(
        values.templateName,
        savingTemplateWallet,
        values.templateDescription
      );
      message.success('模板保存成功');
      setSaveTemplateModalVisible(false);
      setSavingTemplateWallet(null);
      saveTemplateForm.resetFields();
    } catch (error) {
      console.error('保存模板失败:', error);
      message.error('模板保存失败');
    }
  }, [savingTemplateWallet, saveTemplateForm, createTemplateFromConfig]);

  // 处理保存模板取消
  const handleSaveTemplateCancel = useCallback(() => {
    setSaveTemplateModalVisible(false);
    setSavingTemplateWallet(null);
    saveTemplateForm.resetFields();
  }, [saveTemplateForm]);

  // 处理模板选择
  const handleTemplateSelect = useCallback((template: WalletTemplate) => {
    // 将模板配置应用到添加表单
    const templateConfig = {
      ...template.config,
      wallet_address: '', // 清空地址，让用户输入
      remark: '', // 清空备注，让用户输入
    };
    
    addForm.setFieldsValue(templateConfig);
    setAddModalVisible(true);
  }, [addForm]);

  // 处理编辑表单提交
  const handleEditSubmit = useCallback(async (values: any) => {
    if (!editingWallet) return;

    const updatedConfig: WalletConfig = {
      ...editingWallet,
      ...values,
    };

    updateMutation.mutate(updatedConfig);
  }, [editingWallet, updateMutation]);

  // 处理添加表单提交
  const handleAddSubmit = useCallback(async (values: any) => {
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
  }, [updateMutation]);

  // 处理编辑取消
  const handleEditCancel = useCallback(() => {
    setEditModalVisible(false);
    setEditingWallet(null);
    form.resetFields();
  }, [form]);

  // 处理添加取消
  const handleAddCancel = useCallback(() => {
    setAddModalVisible(false);
    addForm.resetFields();
  }, [addForm]);

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
            icon={<ImportOutlined />}
            onClick={() => setBatchImportModalVisible(true)}
          >
            批量导入
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setTemplateModalVisible(true)}
          >
            模板管理
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
          solPrice={solPrice}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBatchDelete={handleBatchDelete}
          onBatchStatusToggle={handleBatchStatusToggle}
          onSaveAsTemplate={handleSaveAsTemplate}
          onStatusToggle={handleStatusToggle}
          updateLoading={updateMutation.isPending || batchStatusToggleMutation.isPending}
          deleteLoading={deleteMutation.isPending || batchDeleteMutation.isPending}
        />
      </Card>

      {/* 编辑模态框 */}
      {editModalVisible && (
        <WalletFormModal
          visible={editModalVisible}
          mode="edit"
          editingWallet={editingWallet}
          solPrice={solPrice}
          form={form}
          onSubmit={handleEditSubmit}
          onCancel={handleEditCancel}
          loading={updateMutation.isPending}
        />
      )}

      {/* 添加模态框 */}
      {addModalVisible && (
        <WalletFormModal
          visible={addModalVisible}
          mode="add"
          solPrice={solPrice}
          form={addForm}
          onSubmit={handleAddSubmit}
          onCancel={handleAddCancel}
          loading={updateMutation.isPending}
        />
      )}

      {/* 保存模板模态框 */}
      {saveTemplateModalVisible && (
        <Modal
          title="保存为模板"
          open={saveTemplateModalVisible}
          onOk={handleSaveTemplateSubmit}
          onCancel={handleSaveTemplateCancel}
          width={500}
        >
          <div style={{ marginBottom: 16 }}>
            <p>将当前配置保存为模板，以便批量应用到其他钱包。</p>
          </div>
          <Form form={saveTemplateForm} layout="vertical">
            <Form.Item 
              name="templateName" 
              label="模板名称"
              rules={[{ required: true, message: '请输入模板名称' }]}
            >
              <Input placeholder="例如：高频交易模板" />
            </Form.Item>
            <Form.Item name="templateDescription" label="模板描述">
              <Input.TextArea 
                rows={3} 
                placeholder="描述该模板的使用场景和特点..." 
              />
            </Form.Item>
          </Form>
        </Modal>
      )}

      {/* 模板管理模态框 */}
      {templateModalVisible && (
        <TemplateModal
          visible={templateModalVisible}
          onCancel={() => setTemplateModalVisible(false)}
          onSelectTemplate={handleTemplateSelect}
        />
      )}

      {/* 批量导入模态框 */}
      {batchImportModalVisible && (
        <BatchImportModal
          visible={batchImportModalVisible}
          onCancel={() => setBatchImportModalVisible(false)}
          onImport={handleBatchImport}
          loading={updateMutation.isPending}
        />
      )}
    </div>
  );
});

WalletConfigPage.displayName = 'WalletConfigPage';

export default WalletConfigPage;
