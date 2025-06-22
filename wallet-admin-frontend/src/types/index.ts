// 导出所有类型定义
export * from './api';

// 通用UI类型
export interface TableColumn {
  key: string;
  title: string;
  dataIndex: string;
  width?: number;
  render?: (value: any, record: any) => React.ReactNode;
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  path?: string;
}

// 表单类型
export interface FormField {
  name: string;
  label: string;
  type: 'input' | 'number' | 'switch' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
}

// 页面状态类型
export interface PageState {
  loading: boolean;
  error: string | null;
  data: any;
}

// 路由类型
export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  title: string;
  requireAuth?: boolean;
}
