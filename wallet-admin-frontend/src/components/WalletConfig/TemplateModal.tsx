import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Input,
  Form
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { WalletTemplate } from '../../types/template';
import { useWalletTemplates } from '../../hooks/useWalletTemplates';

const { TextArea } = Input;

interface TemplateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelectTemplate: (template: WalletTemplate) => void;
}

interface TemplateFormModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  template?: WalletTemplate;
  onCancel: () => void;
  onSave: (name: string, description?: string) => void;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  visible,
  mode,
  template,
  onCancel,
  onSave
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (visible && template && mode === 'edit') {
      form.setFieldsValue({
        name: template.name,
        description: template.description || ''
      });
    } else if (visible && mode === 'create') {
      form.resetFields();
    }
  }, [visible, template, mode, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSave(values.name, values.description);
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? '创建模板' : '编辑模板'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={500}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="模板名称"
          rules={[{ required: true, message: '请输入模板名称' }]}
        >
          <Input placeholder="例如：高频交易模板" />
        </Form.Item>
        <Form.Item
          name="description"
          label="模板描述"
        >
          <TextArea
            rows={3}
            placeholder="描述该模板的使用场景和特点..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const TemplateModal: React.FC<TemplateModalProps> = ({
  visible,
  onCancel,
  onSelectTemplate
}) => {
  const { templates, deleteTemplate, updateTemplate } = useWalletTemplates();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WalletTemplate | null>(null);

  const handleEdit = (template: WalletTemplate) => {
    setEditingTemplate(template);
    setEditModalVisible(true);
  };

  const handleDelete = (id: string) => {
    try {
      deleteTemplate(id);
      message.success('模板删除成功');
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleEditSave = (name: string, description?: string) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, { name, description });
      message.success('模板更新成功');
      setEditModalVisible(false);
      setEditingTemplate(null);
    }
  };

  const handleSelect = (template: WalletTemplate) => {
    onSelectTemplate(template);
    onCancel();
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (description: string) => description || '无描述',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '跟单模式',
      key: 'follow_mode',
      width: 100,
      render: (_: any, record: WalletTemplate) => {
        const mode = record.config.follow_mode || 'Percentage';
        return (
          <Tag color={mode === 'Percentage' ? 'blue' : 'green'}>
            {mode === 'Percentage' ? '百分比' : '固定金额'}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: WalletTemplate) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleSelect(record)}
            size="small"
            title="使用此模板"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
            title="编辑模板"
          />
          <Popconfirm
            title="确认删除"
            description="确定要删除这个模板吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              danger
              size="small"
              title="删除模板"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title="选择配置模板"
        open={visible}
        onCancel={onCancel}
        footer={null}
        width={800}
      >
        <Table
          columns={columns}
          dataSource={templates}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无模板，请先保存一个配置作为模板' }}
        />
      </Modal>

      <TemplateFormModal
        visible={editModalVisible}
        mode="edit"
        template={editingTemplate || undefined}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTemplate(null);
        }}
        onSave={handleEditSave}
      />
    </>
  );
};

export default TemplateModal; 