import React from 'react';
import { AuthContext, useAuthState } from '../hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

// 认证提供者组件
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
