import React from 'react';
import { Modal, Form, Row, Col, Input, Switch, InputNumber, Typography, Divider } from 'antd';
import { WalletConfig } from '../../types/api';
import { usdToPriceMultiplier } from '../../utils/priceUtils';
import FollowModeForm from './FollowModeForm';
import StrategyForm from './StrategyForm';
import AutoSuspendForm from './AutoSuspendForm';

interface WalletFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  editingWallet?: WalletConfig | null;
  solPrice: number; // 从父组件传入SOL价格，避免重复API请求
  form: any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading: boolean;
}

const WalletFormModal: React.FC<WalletFormModalProps> = ({
  visible,
  mode,
  editingWallet,
  solPrice, // 从props接收，不再使用Hook和主动刷新
  form,
  onSubmit,
  onCancel,
  loading
}) => {
  const title = mode === 'add' ? '添加钱包配置' : '编辑钱包配置';

  // 当编辑模式时，设置表单初始值（只在模态框打开时执行一次）
  React.useEffect(() => {
    if (mode === 'edit' && editingWallet && visible) {
      console.log(`💰 Modal: 使用SOL价格 $${solPrice.toFixed(4)} 进行价格转换`);
      
      const formValues = {
        ...editingWallet,
        // 价格转换 - 使用传入的SOL价格进行转换
        min_price_usd: editingWallet.min_price_multiplier ? 
          (editingWallet.min_price_multiplier * solPrice).toFixed(6) : undefined,
        max_price_usd: editingWallet.max_price_multiplier ? 
          (editingWallet.max_price_multiplier * solPrice).toFixed(3) : undefined,
        
        // 跟单金额字段名转换（API字段名 -> 前端字段名）
        min_follow_amount_sol: editingWallet.sol_amount_min || undefined,
        max_follow_amount_sol: editingWallet.sol_amount_max || undefined,

        // 策略字段直接映射（后端字段名 = 前端字段名，无需转换）
        take_profit_start_pct: editingWallet.take_profit_start_pct,
        take_profit_step_pct: editingWallet.take_profit_step_pct,
        take_profit_sell_portion_pct: editingWallet.take_profit_sell_portion_pct,
        trailing_stop_profit_percentage: editingWallet.trailing_stop_profit_percentage,
        exponential_sell_trigger_step_pct: editingWallet.exponential_sell_trigger_step_pct,
        exponential_sell_base_portion_pct: editingWallet.exponential_sell_base_portion_pct,
        exponential_sell_power: editingWallet.exponential_sell_power,
        
        // volatility 策略字段
        volatility_bb_window_size: editingWallet.volatility_bb_window_size,
        volatility_bb_stddev: editingWallet.volatility_bb_stddev,
        volatility_atr_samples: editingWallet.volatility_atr_samples,
        volatility_atr_multiplier: editingWallet.volatility_atr_multiplier,
        volatility_sell_percent: editingWallet.volatility_sell_percent,
        volatility_cooldown_ms: editingWallet.volatility_cooldown_ms,
        min_partial_sell_pct: editingWallet.min_partial_sell_pct,
        
        // 确保必需字段有默认值
        follow_mode: editingWallet.follow_mode || 'Percentage',
        slippage_percentage: editingWallet.slippage_percentage ?? 5.0,
        priority_fee: editingWallet.priority_fee ?? 150000,
        compute_unit_limit: editingWallet.compute_unit_limit ?? 80000,
        accelerator_tip_percentage: editingWallet.accelerator_tip_percentage ?? 1.0,
        take_profit_strategy: editingWallet.take_profit_strategy || 'standard',
        
        // 自动暂停配置默认值
        auto_suspend_config: editingWallet.auto_suspend_config || {
          enabled: true,
          window_size: 1,
          loss_count: 1,
          loss_threshold: -5.0
        }
      };
      form.setFieldsValue(formValues);
    }
  }, [mode, editingWallet, visible, form, solPrice]); // 添加solPrice到依赖，但不会导致频繁更新

  const handleFormSubmit = async (values: any) => {
    // 数据类型转换函数
    const parseNumber = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // 调试：打印提交前的原始数据
    console.log('🔍 提交前原始数据:', values);

    // 转换美元价格为multiplier
    const processedValues = {
      ...values,
      min_price_multiplier: values.min_price_usd ? usdToPriceMultiplier(parseNumber(values.min_price_usd) || 0, solPrice) : null,
      max_price_multiplier: values.max_price_usd ? usdToPriceMultiplier(parseNumber(values.max_price_usd) || 0, solPrice) : null,
      
      // 转换跟单金额字段名（前端字段名 -> API字段名）
      sol_amount_min: parseNumber(values.min_follow_amount_sol),
      sol_amount_max: parseNumber(values.max_follow_amount_sol),
      
      // 转换数字字段
      slippage_percentage: parseNumber(values.slippage_percentage),
      accelerator_tip_percentage: parseNumber(values.accelerator_tip_percentage),
      follow_percentage: parseNumber(values.follow_percentage),
      fixed_follow_amount_sol: parseNumber(values.fixed_follow_amount_sol),
    };

    // 处理自动暂停配置
    if (values.auto_suspend_config) {
      processedValues.auto_suspend_config = {
        enabled: values.auto_suspend_config.enabled,
        window_size: parseNumber(values.auto_suspend_config.window_size),
        loss_count: parseNumber(values.auto_suspend_config.loss_count),
        loss_threshold: parseNumber(values.auto_suspend_config.loss_threshold),
      };
    }

    // 处理所有策略字段（现在前端和后端使用相同字段名）
    const strategyFields = [
      // standard 策略字段
      'take_profit_start_pct', 'take_profit_step_pct', 'take_profit_sell_portion_pct',
      // trailing 策略字段
      'trailing_stop_profit_percentage',
      // exponential 策略字段
      'exponential_sell_trigger_step_pct', 'exponential_sell_base_portion_pct', 'exponential_sell_power',
      // volatility 策略字段
      'volatility_bb_window_size', 'volatility_bb_stddev', 'volatility_atr_samples', 'volatility_atr_multiplier',
      'volatility_sell_percent', 'volatility_cooldown_ms',
      // 通用字段
      'min_partial_sell_pct'
    ];
    
    strategyFields.forEach(field => {
      if (values[field] !== undefined) {
        processedValues[field] = parseNumber(values[field]);
      }
    });

    // 处理风险管理字段
    const riskFields = [
      'hard_stop_loss_pct', 'callback_stop_pct', 'entry_confirmation_secs',
      'dynamic_hold_max_secs', 'dynamic_hold_trigger_pct', 'dynamic_hold_extend_secs'
    ];
    
    riskFields.forEach(field => {
      if (values[field] !== undefined) {
        processedValues[field] = parseNumber(values[field]);
      }
    });

    // 根据跟单模式清空对应字段
    if (values.follow_mode === 'Percentage') {
      processedValues.fixed_follow_amount_sol = null;
    } else if (values.follow_mode === 'FixedAmount') {
      processedValues.follow_percentage = null;
    }

    // 移除临时字段和不存在的后端字段
    delete processedValues.min_price_usd;
    delete processedValues.max_price_usd;
    delete processedValues.min_follow_amount_sol;
    delete processedValues.max_follow_amount_sol;
    
    // 这些字段在新版本中不再使用，已移除

    // 根据策略类型设置其他策略字段为null
    if (values.take_profit_strategy === 'standard') {
      processedValues.trailing_stop_profit_percentage = null;
      processedValues.exponential_sell_trigger_step_pct = null;
      processedValues.exponential_sell_base_portion_pct = null;
      processedValues.exponential_sell_power = null;
      // volatility策略字段
      processedValues.volatility_bb_window_size = null;
      processedValues.volatility_bb_stddev = null;
      processedValues.volatility_atr_samples = null;
      processedValues.volatility_atr_multiplier = null;
      processedValues.volatility_sell_percent = null;
      processedValues.volatility_cooldown_ms = null;
      processedValues.min_partial_sell_pct = null;
    } else if (values.take_profit_strategy === 'trailing') {
      processedValues.take_profit_start_pct = null;
      processedValues.take_profit_step_pct = null;
      processedValues.take_profit_sell_portion_pct = null;
      processedValues.exponential_sell_trigger_step_pct = null;
      processedValues.exponential_sell_base_portion_pct = null;
      processedValues.exponential_sell_power = null;
      // volatility策略字段
      processedValues.volatility_bb_window_size = null;
      processedValues.volatility_bb_stddev = null;
      processedValues.volatility_atr_samples = null;
      processedValues.volatility_atr_multiplier = null;
      processedValues.volatility_sell_percent = null;
      processedValues.volatility_cooldown_ms = null;
      processedValues.min_partial_sell_pct = null;
    } else if (values.take_profit_strategy === 'exponential') {
      processedValues.take_profit_start_pct = null;
      processedValues.take_profit_step_pct = null;
      processedValues.take_profit_sell_portion_pct = null;
      processedValues.trailing_stop_profit_percentage = null;
      // volatility策略字段
      processedValues.volatility_bb_window_size = null;
      processedValues.volatility_bb_stddev = null;
      processedValues.volatility_atr_samples = null;
      processedValues.volatility_atr_multiplier = null;
      processedValues.volatility_sell_percent = null;
      processedValues.volatility_cooldown_ms = null;
      processedValues.min_partial_sell_pct = null;
    } else if (values.take_profit_strategy === 'volatility') {
      processedValues.take_profit_start_pct = null;
      processedValues.take_profit_step_pct = null;
      processedValues.take_profit_sell_portion_pct = null;
      processedValues.trailing_stop_profit_percentage = null;
      processedValues.exponential_sell_trigger_step_pct = null;
      processedValues.exponential_sell_base_portion_pct = null;
      processedValues.exponential_sell_power = null;
      // volatility策略的字段保留，不设置为null
    }

    // 设置废弃字段为null
    processedValues.stop_loss_percentage = null;
    processedValues.take_profit_percentage_legacy = null;
    processedValues.dynamic_hold_check_window_secs = null;

    // 调试：打印处理后的数据
    console.log('🚀 提交到后端的数据:', processedValues);

    onSubmit(processedValues);
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={1400}
      style={{ top: 10 }}
      destroyOnHidden
    >
      <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          size="small"
          initialValues={{
            is_active: true,
            follow_mode: 'Percentage',
            slippage_percentage: 5.0,
            priority_fee: 150000,
            compute_unit_limit: 80000,
            accelerator_tip_percentage: 1.0,
            auto_suspend_config: {
              enabled: true,
              window_size: 1,
              loss_count: 1,
              loss_threshold: -5.0
            }
          }}
        >
          {/* 基础配置 */}
          <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
            📋 基础配置
          </Typography.Title>
          <Row gutter={[8, 4]}>
            {mode === 'add' && (
              <Col span={6}>
                <Form.Item
                  name="wallet_address"
                  label="钱包地址"
                  rules={[
                    { required: true, message: '请输入钱包地址' },
                    { pattern: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, message: '请输入有效的钱包地址' }
                  ]}
                >
                  <Input placeholder="输入钱包地址" />
                </Form.Item>
              </Col>
            )}
            <Col span={mode === 'add' ? 6 : 8}>
              <Form.Item name="remark" label="钱包备注">
                <Input placeholder="例如：主力钱包、测试钱包等" />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="is_active" label="启用状态" valuePropName="checked">
                <Switch checkedChildren="启用" unCheckedChildren="停用" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }} />

          {/* 交易筛选条件 */}
          <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#52c41a' }}>
            🔍 交易筛选条件
          </Typography.Title>
          <Row gutter={[8, 4]}>
            <Col span={3}>
              <Form.Item name="min_price_usd" label="最低价格筛选 (USD)">
                <Input
                  style={{ width: '100%' }}
                  placeholder="0.000001"
                  type="number"
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="max_price_usd" label="最高价格筛选 (USD)">
                <Input
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  type="number"
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="min_follow_amount_sol" label="最小跟单金额 (SOL)">
                <Input
                  style={{ width: '100%' }}
                  placeholder="0.001"
                  type="number"
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="max_follow_amount_sol" label="最大跟单金额 (SOL)">
                <Input
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  type="number"
                />
              </Form.Item>
            </Col>

          </Row>

          <Divider style={{ margin: '8px 0' }} />

          {/* 跟单模式配置 */}
          <FollowModeForm form={form} />

          <Divider style={{ margin: '8px 0' }} />

          {/* 交易执行参数 */}
          <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#fa8c16' }}>
            ⚙️ 交易执行参数
          </Typography.Title>
          <Row gutter={[8, 4]}>
            <Col span={4}>
              <Form.Item
                name="priority_fee"
                label="优先费用 (lamports)"
                rules={[{ required: true, message: '请输入优先费用' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="150000"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="compute_unit_limit"
                label="计算单元限制"
                rules={[{ required: true, message: '请输入计算单元限制' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="80000"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="accelerator_tip_percentage" label="加速器小费 (%)">
                <Input
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  type="number"
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="slippage_percentage"
                label="滑点容忍度 (%)"
                rules={[{ required: true, message: '请输入滑点容忍度' }]}
              >
                <Input
                  style={{ width: '100%' }}
                  placeholder="5.0"
                  type="number"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }} />

          {/* 风险管理 */}
          <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#f5222d' }}>
            🛡️ 风险管理
          </Typography.Title>
          <Row gutter={[8, 4]}>
            <Col span={4}>
              <Form.Item name="hard_stop_loss_pct" label="硬止损 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="callback_stop_pct" label="回调止损 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="entry_confirmation_secs" label="初始持仓时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_max_secs" label="最大持仓时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_trigger_pct" label="延长触发阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.5"
                  step={0.01}
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_extend_secs" label="延长时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="5"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }} />

          {/* 止盈策略配置 */}
          <StrategyForm form={form} />

          <Divider style={{ margin: '8px 0' }} />

          {/* 自动暂停配置 */}
          <AutoSuspendForm form={form} />
        </Form>
      </div>
    </Modal>
  );
};

export default WalletFormModal; 