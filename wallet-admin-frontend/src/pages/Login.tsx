import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import type { LoginRequest } from '../types';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Link } = Typography;

// 登录页面组件
const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // 处理登录表单提交
  const handleLogin = async (values: LoginRequest) => {
    setLoading(true);
    try {
      await login(values);
      message.success('登录成功！');
      navigate('/dashboard'); // 登录成功后跳转到仪表板
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: 480,
          boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
          borderRadius: '16px',
          border: '1px solid #e8e8e8',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: '40px 48px' }}
      >
        {/* 标题区域 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{
            color: '#1890ff',
            marginBottom: 0,
            fontSize: '24px',
            fontWeight: 600
          }}>
            磐石钱包管理系统
          </Title>
        </div>

        {/* 登录表单 */}
        <div style={{
          border: '1px solid #e8e8e8',
          borderRadius: '12px',
          padding: '32px',
          background: '#fafafa'
        }}>
          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
            layout="vertical"
          >
            <Form.Item
              label="用户名："
              name="username"
              rules={[
                { required: true, message: '请输入用户名!' },
                { min: 3, message: '用户名至少3个字符!' }
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="请输入用户名"
                style={{
                  height: '44px',
                  borderRadius: '8px'
                }}
              />
            </Form.Item>

            <Form.Item
              label="密码："
              name="password"
              rules={[
                { required: true, message: '请输入密码!' },
                { min: 6, message: '密码至少6个字符!' }
              ]}
              style={{ marginBottom: '24px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="请输入密码"
                iconRender={(visible) => (
                  <EyeOutlined style={{ color: visible ? '#1890ff' : '#bfbfbf' }} />
                )}
                style={{
                  height: '44px',
                  borderRadius: '8px'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                  border: 'none'
                }}
              >
                {loading ? '登录中...' : '立即登录'}
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                忘记密码？
              </Text>
            </div>
          </Form>
        </div>

        {/* 底部信息 */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #f0f0f0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <Link
              href="https://t.me/panshishequ1"
              target="_blank"
              style={{ fontSize: '12px', color: '#1890ff' }}
            >
              磐石社区
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              ©2025 Panshi Wallet All Rights Reserved.
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Login;
