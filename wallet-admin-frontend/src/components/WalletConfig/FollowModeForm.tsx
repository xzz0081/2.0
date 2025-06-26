import React from 'react';
import { Form, Row, Col, Radio, InputNumber, Typography } from 'antd';

interface FollowModeFormProps {
  form: any;
}

const FollowModeForm: React.FC<FollowModeFormProps> = ({ form }) => {
  const followMode = Form.useWatch('follow_mode', form);

  return (
    <>
      <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#722ed1' }}>
        💰 跟单模式配置
      </Typography.Title>
      
      <Row gutter={[8, 4]}>
        <Col span={6}>
          <Form.Item
            name="follow_mode"
            label="跟单模式"
            rules={[{ required: true, message: '请选择跟单模式' }]}
          >
            <Radio.Group>
              <Radio value="Percentage">按百分比跟单</Radio>
              <Radio value="FixedAmount">固定金额跟单</Radio>
            </Radio.Group>
          </Form.Item>
        </Col>

        {followMode === 'Percentage' && (
          <Col span={4}>
            <Form.Item
              name="follow_percentage"
              label="跟单百分比 (%)"
              rules={[
                { required: followMode === 'Percentage', message: '请输入跟单百分比' },
                { type: 'number', min: 0.1, max: 100, message: '百分比范围：0.1-100%' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="5.0"
                min={0.1}
                max={100}
                step={0.1}
                precision={1}
              />
            </Form.Item>
          </Col>
        )}

        {followMode === 'FixedAmount' && (
          <Col span={4}>
            <Form.Item
              name="fixed_follow_amount_sol"
              label="固定跟单金额 (SOL)"
              rules={[
                { required: followMode === 'FixedAmount', message: '请输入固定跟单金额' },
                { type: 'number', min: 0.001, message: '金额必须大于 0.001 SOL' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.1"
                min={0.001}
                step={0.01}
                precision={3}
              />
            </Form.Item>
          </Col>
        )}
      </Row>
    </>
  );
};

export default FollowModeForm; 