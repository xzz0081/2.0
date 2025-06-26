import React from 'react';
import { Modal, Form, Row, Col, Input, Switch, InputNumber, Typography, Divider } from 'antd';
import { WalletConfig } from '../../types/api';
import { useSolPrice } from '../../hooks/useSolPrice';
import { usdToPriceMultiplier } from '../../utils/priceUtils';
import FollowModeForm from './FollowModeForm';
import StrategyForm from './StrategyForm';
import AutoSuspendForm from './AutoSuspendForm';

interface WalletFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  editingWallet?: WalletConfig | null;
  form: any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
  loading: boolean;
}

const WalletFormModal: React.FC<WalletFormModalProps> = ({
  visible,
  mode,
  editingWallet,
  form,
  onSubmit,
  onCancel,
  loading
}) => {
  const { solPrice } = useSolPrice();

  // 当编辑模式时，设置表单初始值
  React.useEffect(() => {
    if (mode === 'edit' && editingWallet && visible) {
      const formValues = {
        ...editingWallet,
        min_price_usd: editingWallet.min_price_multiplier ? 
          (editingWallet.min_price_multiplier * solPrice).toFixed(6) : undefined,
        max_price_usd: editingWallet.max_price_multiplier ? 
          (editingWallet.max_price_multiplier * solPrice).toFixed(3) : undefined,
      };
      form.setFieldsValue(formValues);
    }
  }, [mode, editingWallet, visible, form, solPrice]);

  const handleFormSubmit = async (values: any) => {
    // 转换美元价格为multiplier
    const processedValues = {
      ...values,
      min_price_multiplier: values.min_price_usd ? usdToPriceMultiplier(values.min_price_usd, solPrice) : null,
      max_price_multiplier: values.max_price_usd ? usdToPriceMultiplier(values.max_price_usd, solPrice) : null,
    };

    // 根据跟单模式清空对应字段
    if (values.follow_mode === 'Percentage') {
      processedValues.fixed_follow_amount_sol = null;
    } else if (values.follow_mode === 'FixedAmount') {
      processedValues.follow_percentage = null;
    }

    // 移除临时的USD字段
    delete processedValues.min_price_usd;
    delete processedValues.max_price_usd;

    onSubmit(processedValues);
  };

  const title = mode === 'add' ? '添加钱包配置' : '编辑钱包配置';

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
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.001"
                  min={0.000001}
                  step={0.001}
                  precision={6}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="max_price_usd" label="最高价格筛选 (USD)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  min={0.001}
                  step={0.1}
                  precision={3}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="min_follow_amount_sol" label="最小跟单金额 (SOL)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.01"
                  min={0.001}
                  step={0.01}
                  precision={3}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="max_follow_amount_sol" label="最大跟单金额 (SOL)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  min={0.01}
                  step={0.1}
                  precision={2}
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
                  min={1000}
                  max={1000000}
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
                  min={10000}
                  max={200000}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="accelerator_tip_percentage" label="加速器小费 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1.0"
                  min={0.1}
                  max={10}
                  step={0.1}
                  precision={1}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="slippage_percentage"
                label="滑点容忍度 (%)"
                rules={[{ required: true, message: '请输入滑点容忍度' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="5.0"
                  min={0.1}
                  max={50}
                  step={0.1}
                  precision={1}
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
                  min={1}
                  max={50}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="callback_stop_pct" label="回调止损 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  min={1}
                  max={50}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="entry_confirmation_secs" label="初始持仓时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10"
                  min={1}
                  max={300}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_max_secs" label="最大持仓时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  min={5}
                  max={600}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_trigger_pct" label="延长触发阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="0.5"
                  min={0.1}
                  max={10}
                  step={0.1}
                  precision={1}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="dynamic_hold_extend_secs" label="延长时间 (秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="5"
                  min={1}
                  max={60}
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