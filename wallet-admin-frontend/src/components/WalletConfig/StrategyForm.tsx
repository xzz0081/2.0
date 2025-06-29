import React from 'react';
import { Form, Row, Col, Select, InputNumber, Typography, Divider } from 'antd';

const { Option } = Select;

interface StrategyFormProps {
  form: any;
}

const StrategyForm: React.FC<StrategyFormProps> = ({ form }) => {
  const strategy = Form.useWatch('take_profit_strategy', form);

  return (
    <>
      <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#13c2c2' }}>
        📈 止盈策略配置
      </Typography.Title>
      
      <Row gutter={[8, 4]}>
        <Col span={4}>
          <Form.Item
            name="take_profit_strategy"
            label="止盈策略类型"
            rules={[{ required: true, message: '请选择止盈策略' }]}
          >
            <Select placeholder="选择策略">
              <Option value="standard">标准分步止盈</Option>
              <Option value="trailing">动态追踪止盈</Option>
              <Option value="exponential">指数递增止盈</Option>
              <Option value="volatility">布林带策略</Option>
            </Select>
          </Form.Item>
        </Col>

        {/* 标准止盈策略 */}
        {strategy === 'standard' && (
          <>
            <Col span={4}>
              <Form.Item name="take_profit_start_pct" label="起始止盈阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="take_profit_step_pct" label="止盈步长 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="take_profit_sell_portion_pct" label="每次卖出比例 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="25"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
          </>
        )}

        {/* 动态止盈策略 */}
        {strategy === 'trailing' && (
          <>
            <Col span={6}>
              <Form.Item name="trailing_stop_profit_percentage" label="追踪止盈触发阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
          </>
        )}

        {/* 指数止盈策略 */}
        {strategy === 'exponential' && (
          <>
            <Col span={4}>
              <Form.Item name="exponential_sell_trigger_step_pct" label="触发步长 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="exponential_sell_base_portion_pct" label="基础卖出比例 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="exponential_sell_power" label="指数幂">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="2.0"
                  step={0.01}
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
          </>
        )}

        {/* Volatility Strategy Fields */}
        {strategy === 'volatility' && (
          <>
            <Col span={4}>
              <Form.Item
                label="布林带窗口大小"
                name="volatility_bb_window_size"
                rules={[{ required: true, message: '请输入布林带窗口大小' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={100} 
                  max={10000} 
                  placeholder="1000" 
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="布林带标准差倍数"
                name="volatility_bb_stddev"
                rules={[{ required: true, message: '请输入布林带标准差倍数' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={0.5} 
                  max={5} 
                  step={0.1} 
                  placeholder="1.8" 
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="ATR样本数"
                name="volatility_atr_samples"
                rules={[{ required: true, message: '请输入ATR样本数' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={10} 
                  max={1000} 
                  placeholder="100" 
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="ATR突增阈值倍数"
                name="volatility_atr_multiplier"
                rules={[{ required: true, message: '请输入ATR突增阈值倍数' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={0.5} 
                  max={5} 
                  step={0.1} 
                  placeholder="1.3" 
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="波动率策略卖出比例"
                name="volatility_sell_percent"
                rules={[{ required: true, message: '请输入波动率策略卖出比例' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={100}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                  placeholder="40"
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="波动率策略冷却时间"
                name="volatility_cooldown_ms"
                rules={[{ required: true, message: '请输入波动率策略冷却时间' }]}
              >
                <InputNumber 
                  style={{ width: '100%' }}
                  min={0} 
                  max={10000} 
                  placeholder="500" 
                  addonAfter="ms" 
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item
                label="最小卖出保护比例"
                name="min_partial_sell_pct"
                tooltip="当剩余仓位占初始仓位比例低于该值时直接清仓"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                  placeholder="30"
                />
              </Form.Item>
            </Col>
          </>
        )}
      </Row>
    </>
  );
};

export default StrategyForm; 