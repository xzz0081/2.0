import React, { useState, useEffect } from 'react';
import { WalletTemplate } from '../types/template';
import { WalletConfig } from '../types/api';

const TEMPLATES_STORAGE_KEY = 'wallet_templates';

// 全局状态管理
let globalTemplates: WalletTemplate[] = [];
const listeners = new Set<() => void>();

// 通知所有监听器
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// 加载模板从localStorage
const loadTemplatesFromStorage = (): WalletTemplate[] => {
  try {
    const storedTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return storedTemplates ? JSON.parse(storedTemplates) : [];
  } catch (error) {
    console.error('加载模板失败:', error);
    return [];
  }
};

// 保存模板到localStorage
const saveTemplatesToStorage = (templates: WalletTemplate[]) => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    globalTemplates = templates;
    notifyListeners();
  } catch (error) {
    console.error('保存模板失败:', error);
    throw new Error('保存模板失败');
  }
};

// 初始化全局状态
if (globalTemplates.length === 0) {
  globalTemplates = loadTemplatesFromStorage();
}

export const useWalletTemplates = () => {
  const [templates, setTemplates] = useState<WalletTemplate[]>(globalTemplates);

  // 订阅全局状态变化
  useEffect(() => {
    const listener = () => {
      setTemplates([...globalTemplates]);
    };
    
    listeners.add(listener);
    
    // 确保初始状态同步
    setTemplates([...globalTemplates]);
    
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // 创建新模板
  const createTemplate = (
    name: string,
    config: Omit<WalletConfig, 'wallet_address' | 'remark'>,
    description?: string
  ): WalletTemplate => {
    const newTemplate: WalletTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      config,
      created_at: new Date().toISOString(),
    };

    const newTemplates = [...globalTemplates, newTemplate];
    saveTemplatesToStorage(newTemplates);
    return newTemplate;
  };

  // 更新模板
  const updateTemplate = (id: string, updates: Partial<Omit<WalletTemplate, 'id' | 'created_at'>>) => {
    const newTemplates = globalTemplates.map((template: WalletTemplate) => 
      template.id === id 
        ? { ...template, ...updates, updated_at: new Date().toISOString() }
        : template
    );
    saveTemplatesToStorage(newTemplates);
  };

  // 删除模板
  const deleteTemplate = (id: string) => {
    const newTemplates = globalTemplates.filter((template: WalletTemplate) => template.id !== id);
    saveTemplatesToStorage(newTemplates);
  };

  // 根据ID获取模板
  const getTemplate = (id: string): WalletTemplate | undefined => {
    return globalTemplates.find((template: WalletTemplate) => template.id === id);
  };

  // 从现有配置创建模板
  const createTemplateFromConfig = (
    name: string,
    walletConfig: WalletConfig,
    description?: string
  ): WalletTemplate => {
    // 排除钱包地址和备注
    const { wallet_address, remark, ...config } = walletConfig;
    return createTemplate(name, config, description);
  };

  // 强制刷新模板列表（从localStorage重新加载）
  const refreshTemplates = () => {
    const refreshedTemplates = loadTemplatesFromStorage();
    saveTemplatesToStorage(refreshedTemplates);
  };

  return {
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate,
    createTemplateFromConfig,
    refreshTemplates,
  };
}; 