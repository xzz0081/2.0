import { useState, useEffect, createContext, useContext } from 'react';
import type { User, LoginRequest } from '../types';
import ApiService from '../services/api';

// 认证上下文类型
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// 创建认证上下文
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth必须在AuthProvider内部使用');
  }
  return context;
};

// 认证状态管理Hook
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时检查本地存储的用户信息
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = localStorage.getItem('auth_token');
        const userInfo = localStorage.getItem('user_info');
        
        if (token && userInfo) {
          const parsedUser = JSON.parse(userInfo);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        // 清除可能损坏的数据
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 登录函数
  const login = async (credentials: LoginRequest): Promise<void> => {
    setLoading(true);
    try {
      const response = await ApiService.login(credentials);

      if (response.success && response.token) {
        // 创建用户对象
        const user: User = {
          id: '1', // 后端API没有返回用户ID，使用默认值
          username: credentials.username,
          role: credentials.username === 'admin' ? 'admin' : 'user',
          token: response.token
        };

        // 保存用户信息和token到本地存储
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user_info', JSON.stringify(user));

        setUser(user);
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出函数
  const logout = () => {
    setLoading(true);
    try {
      ApiService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 计算认证状态
  const isAuthenticated = !!user;

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
  };
};
