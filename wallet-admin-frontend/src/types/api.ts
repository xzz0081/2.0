// API接口类型定义
export interface WalletConfig {
  // 基础配置
  wallet_address: string; // [必需] 钱包地址
  is_active: boolean; // [必需] 此策略配置是否启用

  // 交易执行参数
  slippage_percentage: number; // [必需] 滑点容忍度百分比
  priority_fee: number; // [必需] Solana交易的优先费用，单位是 micro-lamports
  compute_unit_limit: number; // [必需] 交易的计算单元限制
  accelerator_tip_percentage?: number | null; // [可选] 使用交易加速器时的小费百分比

  // 跟单金额控制
  follow_percentage?: number | null; // [可选] 跟单金额百分比
  sol_amount_min?: number | null; // [可选] 购买金额的SOL绝对值下限
  sol_amount_max?: number | null; // [可选] 购买金额的SOL绝对值上限

  // 价格筛选控制 (新增功能) - 内部存储为multiplier，界面显示为USD
  min_price_multiplier?: number | null; // [可选] 最低价格筛选倍数（内部存储）
  max_price_multiplier?: number | null; // [可选] 最高价格筛选倍数（内部存储）

  // 核心止盈策略选择
  take_profit_strategy?: string | null; // [重要] 止盈策略类型: "standard" | "trailing" | "exponential"

  // [策略一] "standard" (标准分步止盈)
  take_profit_start_pct?: number | null;
  take_profit_step_pct?: number | null;
  take_profit_sell_portion_pct?: number | null;

  // [策略二] "trailing" (追踪止盈)
  trailing_stop_profit_percentage?: number | null;

  // [策略三] "exponential" (指数加码卖出)
  exponential_sell_trigger_step_pct?: number | null; // [指数策略] 触发卖出的盈利台阶
  exponential_sell_base_portion_pct?: number | null; // [指数策略] 计算卖出份额的基础比例
  exponential_sell_power?: number | null; // [指数策略] 计算卖出份额的幂

  // 通用风险管理
  hard_stop_loss_pct?: number | null; // [可选] 硬止损
  callback_stop_pct?: number | null; // [可选] 回调止损

  // 动态持仓时间策略
  entry_confirmation_secs?: number | null; // [可选] 初始持仓时间
  dynamic_hold_trigger_pct?: number | null; // [可选] 触发持仓延长的价格波动百分比
  dynamic_hold_extend_secs?: number | null; // [可选] 每次触发后，延长持仓的秒数
  dynamic_hold_max_secs?: number | null; // [可选] 通过动态延长，一笔交易允许的最长总持仓时间

  // 已废弃或暂不使用的字段
  dynamic_hold_check_window_secs?: number | null; // (暂未使用)
  stop_loss_percentage?: number | null; // (已废弃)
  take_profit_percentage_legacy?: number | null; // (已废弃)
  tip_config?: any | null; // (兼容旧版本)
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
