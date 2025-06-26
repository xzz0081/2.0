import React from 'react';
import { Form, Row, Col, Switch, Input, Typography, Alert } from 'antd';

interface AutoSuspendFormProps {
  form: any;
}

const AutoSuspendForm: React.FC<AutoSuspendFormProps> = ({ form }) => {
  // 将所有Hook调用移到组件顶部，避免条件性调用
  const autoSuspendEnabled = Form.useWatch(['auto_suspend_config', 'enabled'], form);
  const windowSize = Form.useWatch(['auto_suspend_config', 'window_size'], form);
  const lossCount = Form.useWatch(['auto_suspend_config', 'loss_count'], form);
  const lossThreshold = Form.useWatch(['auto_suspend_config', 'loss_threshold'], form);

  return (
    <>
      <Typography.Title level={5} style={{ margin: '0 0 8px 0', color: '#eb2f96' }}>
        ⏸️ 自动暂停配置
      </Typography.Title>
      
      <Row gutter={[8, 4]}>
        <Col span={4}>
          <Form.Item
            name={['auto_suspend_config', 'enabled']}
            label="启用自动暂停"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="启用" 
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Col>

        {autoSuspendEnabled && (
          <>
            <Col span={3}>
              <Form.Item
                name={['auto_suspend_config', 'window_size']}
                label="监控窗口 (小时)"
                rules={[
                  { required: autoSuspendEnabled, message: '请输入监控窗口' }
                ]}
                initialValue={1}
              >
                <Input
                  style={{ width: '100%' }}
                  placeholder="1"
                  type="number"
                />
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item
                name={['auto_suspend_config', 'loss_count']}
                label="连续亏损次数"
                rules={[
                  { required: autoSuspendEnabled, message: '请输入亏损次数阈值' }
                ]}
                initialValue={1}
              >
                <Input
                  style={{ width: '100%' }}
                  placeholder="1"
                  type="number"
                />
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item
                name={['auto_suspend_config', 'loss_threshold']}
                label="亏损阈值 (%)"
                rules={[
                  { required: autoSuspendEnabled, message: '请输入亏损阈值' }
                ]}
                initialValue={-5.0}
              >
                <Input
                  style={{ width: '100%' }}
                  placeholder="-5.0"
                  type="number"
                />
              </Form.Item>
            </Col>
            <Col span={11}>
              <Alert
                message="触发条件"
                description={`在 ${windowSize || 1} 小时内连续 ${lossCount || 1} 次亏损超过 ${Math.abs(lossThreshold || 5)}% 时，系统将自动暂停该钱包的跟单功能，避免进一步损失`}
                type="info"
                showIcon
              />
            </Col>
          </>
        )}
      </Row>
    </>
  );
};

export default AutoSuspendForm; 