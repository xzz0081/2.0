import React from 'react';
import { Form, Row, Col, Select, InputNumber, Typography } from 'antd';

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
            <Col span={3}>
              <Form.Item name="take_profit_targets_1_pct" label="止盈目标1 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="take_profit_targets_1_amount" label="卖出比例1 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="50"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="take_profit_targets_2_pct" label="止盈目标2 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="50"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="take_profit_targets_2_amount" label="卖出比例2 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="100"
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
            <Col span={4}>
              <Form.Item name="trailing_stop_activation_pct" label="激活阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="trailing_stop_callback_pct" label="回调阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="10"
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
            <Col span={3}>
              <Form.Item name="exponential_base_threshold" label="基础阈值 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="50"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="exponential_multiplier" label="递增倍数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="2.0"
                  step={0.01}
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="exponential_max_stages" label="最大阶段数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="5"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="exponential_sell_pct" label="每阶段卖出 (%)">
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

        {/* 布林带策略 */}
        {strategy === 'volatility' && (
          <>
            <Col span={4}>
              <Form.Item name="volatility_bb_window_size" label="布林带窗口">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="volatility_bb_stddev" label="标准差倍数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="2.0"
                  step={0.01}
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="volatility_atr_samples" label="ATR采样大小">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="14"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="volatility_atr_multiplier" label="ATR倍数">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1.5"
                  step={0.01}
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>

            <Col span={4}>
              <Form.Item name="volatility_sell_percent" label="卖出比例 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="100"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="min_partial_sell_pct" label="最小卖出保护 (%)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="20"
                  stringMode
                  controls={false}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="volatility_cooldown_ms" label="冷却时间 (毫秒)">
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="1000"
                  stringMode
                  controls={false}
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