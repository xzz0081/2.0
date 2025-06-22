// API接口类型定义
export interface WalletConfig {
  wallet_address: string;
  is_active: boolean;
  follow_percentage: number;
  sol_amount_min: number | null;
  sol_amount_max: number | null;
  min_price_multiplier: number | null;
  max_price_multiplier: number | null;
  slippage_percentage: number;
  tip_config: any | null;
  priority_fee: number;
  compute_unit_limit: number;
  take_profit_start_pct: number;
  take_profit_step_pct: number;
  take_profit_sell_portion_pct: number;
  stop_loss_percentage: number | null;
  entry_confirmation_secs: number | null;
  dynamic_hold_trigger_pct: number | null;
  dynamic_hold_check_window_secs: number | null;
  dynamic_hold_extend_secs: number | null;
  dynamic_hold_max_secs: number | null;
  hard_stop_loss_pct: number;
  callback_stop_pct: number | null;
  take_profit_percentage_legacy: number | null;
}

// 钱包配置响应类型
export interface WalletConfigsResponse {
  [walletAddress: string]: WalletConfig;
}

// 更新钱包配置请求类型
export interface UpdateWalletConfigRequest extends WalletConfig {}

// API响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 日志响应类型
export interface LogsResponse {
  [logFileName: string]: string;
}

// SSE事件类型
export interface PriceStreamEvent {
  type: 'price';
  data: {
    symbol: string;
    price: number;
    timestamp: number;
  };
}

export interface TradeStreamEvent {
  type: 'trade';
  data: {
    wallet_address: string;
    action: 'buy' | 'sell';
    amount: number;
    price: number;
    timestamp: number;
    signature: string;
  };
}

// 用户认证类型
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
