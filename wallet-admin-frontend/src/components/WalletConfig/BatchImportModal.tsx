import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Progress,
  Alert,
  Row,
  Col,
  message,
  Divider,
  Spin
} from 'antd';
import {
  PlayCircleOutlined
} from '@ant-design/icons';
import { WalletTemplate, BatchImportProgress, BatchImportWallet } from '../../types/template';
import { useWalletTemplates } from '../../hooks/useWalletTemplates';

const { TextArea } = Input;
const { Option } = Select;

interface BatchImportModalProps {
  visible: boolean;
  onCancel: () => void;
  onImport: (wallets: BatchImportWallet[], template: WalletTemplate, onProgress: (progress: BatchImportProgress) => void) => Promise<void>;
  loading: boolean;
}

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('BatchImportModal Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          message="批量导入组件出错"
          description={`错误信息: ${this.state.error?.message || '未知错误'}`}
          type="error"
          showIcon
        />
      );
    }

    return this.props.children;
  }
}

const BatchImportModalContent: React.FC<BatchImportModalProps> = ({
  visible,
  onCancel,
  onImport,
  loading
}) => {
  const { templates } = useWalletTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [walletListText, setWalletListText] = useState('');
  const [progress, setProgress] = useState<BatchImportProgress | null>(null);

  // 使用useMemo来缓存解析结果，避免在渲染期间调用setErrors
  const parseResult = useMemo(() => {
    if (!walletListText.trim()) {
      return { wallets: [], errors: [] };
    }

    try {
      const lines = walletListText.trim().split('\n').filter(line => line.trim());
      const wallets: BatchImportWallet[] = [];
      const errors: string[] = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // 支持两种格式：
        // 1. 钱包地址
        // 2. 钱包地址,备注
        const parts = trimmed.split(',').map(part => part.trim());
        const walletAddress = parts[0];
        const remark = parts[1] || '';

        // 简单的钱包地址验证
        if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
          errors.push(`第${index + 1}行：钱包地址格式无效`);
          return;
        }

        // 检查是否重复
        if (wallets.some(w => w.wallet_address === walletAddress)) {
          errors.push(`第${index + 1}行：钱包地址重复`);
          return;
        }

        wallets.push({
          wallet_address: walletAddress,
          remark: remark || undefined
        });
      });

      return { wallets, errors };
    } catch (error) {
      console.error('Parse wallet list error:', error);
      return { wallets: [], errors: ['解析钱包地址列表时出错'] };
    }
  }, [walletListText]);

  // 使用useCallback来避免不必要的重新创建
  const handleReset = useCallback(() => {
    try {
      setSelectedTemplateId('');
      setWalletListText('');
      setProgress(null);
      setErrors([]);
    } catch (error) {
      console.error('Reset error:', error);
    }
  }, []);

  // 移除原来的parseWalletList函数，因为现在使用useMemo
  const handleImport = async () => {
    try {
      if (!selectedTemplateId) {
        message.error('请选择一个配置模板');
        return;
      }

      if (!walletListText.trim()) {
        message.error('请输入钱包地址列表');
        return;
      }

      const template = templates.find(t => t.id === selectedTemplateId);
      if (!template) {
        message.error('所选模板不存在');
        return;
      }

      const { wallets, errors: parseErrors } = parseResult;
      if (wallets.length === 0) {
        message.error('没有有效的钱包地址');
        return;
      }

      if (parseErrors.length > 0) {
        message.error(`存在${parseErrors.length}个错误，请修正后重试`);
        return;
      }

      setProgress({
        total: wallets.length,
        current: 0,
        success: 0,
        failed: 0,
        errors: []
      });

      // 定义进度更新回调
      const updateProgress = (newProgress: BatchImportProgress) => {
        setProgress(newProgress);
      };

      await onImport(wallets, template, updateProgress);
      
      // 导入成功后清空表单
      handleReset();
      message.success('批量导入完成');
    } catch (error) {
      console.error('批量导入失败:', error);
      message.error('批量导入失败');
    }
  };

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  // 如果模板数据还没加载完成，显示加载状态
  if (!templates) {
    return (
      <Modal
        title="批量导入钱包地址"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>加载模板数据中...</div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="批量导入钱包地址"
      open={visible}
      onCancel={() => {
        handleReset();
        onCancel();
      }}
      destroyOnClose={true}
      width={800}
      footer={[
        <Button key="reset" onClick={handleReset}>
          重置
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="import"
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleImport}
          loading={loading}
          disabled={!selectedTemplateId || !walletListText.trim()}
        >
          开始导入
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 模板选择 */}
        <div>
          <Typography.Text strong>1. 选择配置模板</Typography.Text>
          {templates.length === 0 ? (
            <Alert
              style={{ marginTop: 8 }}
              message="暂无可用模板"
              description="请先保存一个钱包配置作为模板，然后再进行批量导入。"
              type="warning"
              showIcon
            />
          ) : (
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="请选择一个已保存的配置模板"
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              showSearch
              optionFilterProp="children"
            >
              {templates.map(template => (
                <Option key={template.id} value={template.id}>
                  {template.name} - {template.description || '无描述'}
                </Option>
              ))}
            </Select>
          )}
          
          {selectedTemplate && (
            <Alert
              style={{ marginTop: 8 }}
              message={`所选模板：${selectedTemplate.name}`}
              description={`跟单模式：${selectedTemplate.config.follow_mode === 'Percentage' ? '百分比' : '固定金额'}`}
              type="info"
              showIcon
            />
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 钱包地址输入 */}
        <div>
          <Typography.Text strong>2. 输入钱包地址列表</Typography.Text>
          <Typography.Paragraph style={{ margin: '8px 0', fontSize: '12px', color: '#666' }}>
            支持两种格式：<br/>
            • 每行一个钱包地址<br/>
            • 钱包地址,备注（用英文逗号分隔）
          </Typography.Paragraph>
          <TextArea
            rows={8}
            placeholder="请输入钱包地址，每行一个&#10;例如：&#10;A1B2C3D4...&#10;A1B2C3D4...,主力钱包&#10;A1B2C3D4...,测试钱包"
            value={walletListText}
            onChange={(e) => setWalletListText(e.target.value)}
          />
          
          {walletListText && (
            <div style={{ marginTop: 8 }}>
              <Typography.Text type="secondary">
                已识别 {parseResult.wallets.length} 个有效钱包地址
              </Typography.Text>
              {parseResult.errors.length > 0 && (
                <Alert
                  style={{ marginTop: 8 }}
                  message={`发现 ${parseResult.errors.length} 个错误`}
                  description={
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {parseResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {parseResult.errors.length > 5 && <li>...</li>}
                    </ul>
                  }
                  type="error"
                  showIcon
                />
              )}
            </div>
          )}
        </div>

        {/* 导入进度 */}
        {progress && (
          <div>
            <Typography.Text strong>导入进度</Typography.Text>
            <Progress
              percent={Math.round((progress.current / progress.total) * 100)}
              status={progress.current === progress.total ? 'success' : 'active'}
              format={() => `${progress.current}/${progress.total}`}
            />
            <Row gutter={16} style={{ marginTop: 8 }}>
              <Col span={8}>
                <Typography.Text type="success">成功: {progress.success}</Typography.Text>
              </Col>
              <Col span={8}>
                <Typography.Text type="danger">失败: {progress.failed}</Typography.Text>
              </Col>
              <Col span={8}>
                <Typography.Text>总计: {progress.total}</Typography.Text>
              </Col>
            </Row>
            
            {progress.errors.length > 0 && (
              <Alert
                style={{ marginTop: 8 }}
                message="部分导入失败"
                description={
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {progress.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {progress.errors.length > 3 && <li>...</li>}
                  </ul>
                }
                type="warning"
                showIcon
              />
            )}
          </div>
        )}
      </Space>
    </Modal>
  );
};

const BatchImportModal: React.FC<BatchImportModalProps> = (props) => {
  return (
    <ErrorBoundary>
      <BatchImportModalContent {...props} />
    </ErrorBoundary>
  );
};

export default BatchImportModal; 