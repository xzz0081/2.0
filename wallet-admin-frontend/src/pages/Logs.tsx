import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Input, 
  Space, 
  Tag, 
  Select,
  Alert,
  Spin
} from 'antd';
import { 
  ReloadOutlined, 
  SearchOutlined, 
  FileTextOutlined,
  DownloadOutlined 
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import ApiService from '../services/api';
import type { LogsResponse } from '../types';

const { Title, Text } = Typography;
// const { TextArea } = Input;
const { Option } = Select;

// 日志级别颜色映射
const LOG_LEVEL_COLORS = {
  INFO: 'blue',
  WARN: 'orange',
  ERROR: 'red',
  DEBUG: 'green',
  TRACE: 'purple',
} as const;

// 日志查看页面
const LogsPage: React.FC = () => {
  const [selectedLogFile, setSelectedLogFile] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('ALL');

  // 获取日志数据
  const { data: logsData, isLoading, refetch, error } = useQuery<LogsResponse>({
    queryKey: ['logs'],
    queryFn: ApiService.getLogs,
    refetchInterval: 10000, // 每10秒自动刷新
  });

  // 获取日志文件列表
  const logFiles = logsData ? Object.keys(logsData) : [];

  // 当日志数据或筛选条件变化时，更新过滤后的日志
  useEffect(() => {
    if (!logsData || !selectedLogFile) {
      setFilteredLogs('');
      return;
    }

    let logs = logsData[selectedLogFile] || '';
    
    // 按日志级别过滤
    if (logLevel !== 'ALL') {
      const lines = logs.split('\n');
      const filteredLines = lines.filter(line => 
        line.includes(logLevel) || !line.trim()
      );
      logs = filteredLines.join('\n');
    }

    // 按搜索文本过滤
    if (searchText.trim()) {
      const lines = logs.split('\n');
      const filteredLines = lines.filter(line => 
        line.toLowerCase().includes(searchText.toLowerCase())
      );
      logs = filteredLines.join('\n');
    }

    setFilteredLogs(logs);
  }, [logsData, selectedLogFile, searchText, logLevel]);

  // 自动选择第一个日志文件
  useEffect(() => {
    if (logFiles.length > 0 && !selectedLogFile) {
      setSelectedLogFile(logFiles[0]);
    }
  }, [logFiles, selectedLogFile]);

  // 解析日志行获取级别
  const getLogLevel = (line: string): string => {
    const match = line.match(/\s+(INFO|WARN|ERROR|DEBUG|TRACE)\s+/);
    return match ? match[1] : 'INFO';
  };

  // 格式化日志显示
  const formatLogContent = (content: string): React.ReactNode => {
    if (!content) return null;

    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (!line.trim()) return <br key={index} />;

      const level = getLogLevel(line);
      const color = LOG_LEVEL_COLORS[level as keyof typeof LOG_LEVEL_COLORS] || 'default';

      return (
        <div key={index} style={{ marginBottom: 2, fontFamily: 'monospace', fontSize: '12px' }}>
          <Tag color={color} style={{ marginRight: 8, minWidth: 50, textAlign: 'center', fontSize: '10px' }}>
            {level}
          </Tag>
          <Text code style={{ fontSize: '12px' }}>
            {line.replace(/\s+(INFO|WARN|ERROR|DEBUG|TRACE)\s+/, ' ')}
          </Text>
        </div>
      );
    });
  };

  // 下载日志文件
  const handleDownload = () => {
    if (!selectedLogFile || !logsData) return;

    const content = logsData[selectedLogFile];
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedLogFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Alert
        message="日志加载失败"
        description="无法获取系统日志，请检查网络连接或稍后重试。"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>
          <FileTextOutlined /> 系统日志
        </Title>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          loading={isLoading}
        >
          刷新
        </Button>
      </div>

      {/* 控制面板 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <div>
            <Text strong>日志文件:</Text>
            <Select
              style={{ width: 200, marginLeft: 8 }}
              value={selectedLogFile}
              onChange={setSelectedLogFile}
              loading={isLoading}
            >
              {logFiles.map(file => (
                <Option key={file} value={file}>{file}</Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong>日志级别:</Text>
            <Select
              style={{ width: 120, marginLeft: 8 }}
              value={logLevel}
              onChange={setLogLevel}
            >
              <Option value="ALL">全部</Option>
              <Option value="ERROR">ERROR</Option>
              <Option value="WARN">WARN</Option>
              <Option value="INFO">INFO</Option>
              <Option value="DEBUG">DEBUG</Option>
              <Option value="TRACE">TRACE</Option>
            </Select>
          </div>

          <Input
            placeholder="搜索日志内容..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />

          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!selectedLogFile || !logsData}
          >
            下载
          </Button>
        </Space>
      </Card>

      {/* 日志内容 */}
      <Card 
        title={`日志内容 - ${selectedLogFile}`}
        extra={
          <Tag color="blue">
            自动刷新: 10秒
          </Tag>
        }
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" tip="加载日志中..." />
          </div>
        ) : (
          <div
            style={{
              height: '600px',
              overflow: 'auto',
              backgroundColor: '#f5f5f5',
              padding: '16px',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
            }}
          >
            {filteredLogs ? (
              formatLogContent(filteredLogs)
            ) : (
              <Text type="secondary">
                {selectedLogFile ? '没有找到匹配的日志内容' : '请选择一个日志文件'}
              </Text>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default LogsPage;
