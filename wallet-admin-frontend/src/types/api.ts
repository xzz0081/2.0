// API接口类型定义
export interface WalletConfig {
  // 基础配置
  wallet_address: string; // [必需] 钱包地址
  is_active: boolean; // [必需] 此策略配置是否启用
  remark?: string | null; // [可选] 钱包备注名称

  // --- 跟单模式控制 ---
  follow_mode?: "Percentage" | "FixedAmount"; // [可选] 跟单模式，向后兼容

  // --- 跟单金额控制 ---
  follow_percentage?: number | null; // [%] 百分比跟单
  fixed_follow_amount_sol?: number | null; // [SOL] 固定金额跟单，百分比模式下填 null
  sol_amount_min?: number | null; // [SOL] 被跟随者最小成交额
  sol_amount_max?: number | null; // [SOL] 被跟随者最大成交额

  // --- 价格筛选 ---
  min_price_multiplier?: number | null; // [可选] 最低价格筛选倍数（内部存储）
  max_price_multiplier?: number | null; // [可选] 最高价格筛选倍数（内部存储）

  // 交易执行参数
  slippage_percentage: number; // [必需] 滑点容忍度百分比
  priority_fee: number; // [必需] Solana交易的优先费用，单位是 micro-lamports
  compute_unit_limit: number; // [必需] 交易的计算单元限制
  accelerator_tip_percentage?: number | null; // [可选] 使用交易加速器时的小费百分比

  // --- 核心止盈策略选择 ---
  take_profit_strategy?: "standard" | "trailing" | "exponential" | "volatility" | null; // [重要] 止盈策略类型

  // --- standard 策略 ---
  take_profit_start_pct?: number | null;
  take_profit_step_pct?: number | null;
  take_profit_sell_portion_pct?: number | null;

  // --- trailing 策略 ---
  trailing_stop_profit_percentage?: number | null;

  // --- exponential 策略 ---
  exponential_sell_trigger_step_pct?: number | null; // [指数策略] 触发卖出的盈利台阶
  exponential_sell_base_portion_pct?: number | null; // [指数策略] 计算卖出份额的基础比例
  exponential_sell_power?: number | null; // [指数策略] 计算卖出份额的幂

  // --- volatility 策略 ---
  volatility_bb_window_size?: number | null; // [波动性策略] 布林带窗口大小
  volatility_bb_stddev?: number | null; // [波动性策略] 布林带标准差倍数
  volatility_atr_samples?: number | null; // [波动性策略] ATR采样数量
  volatility_atr_multiplier?: number | null; // [波动性策略] ATR倍数
  volatility_sell_percent?: number | null; // [波动性策略] 卖出比例
  volatility_cooldown_ms?: number | null; // [波动性策略] 冷却时间(毫秒)

  // --- 最小卖出/剩余仓位比例保护 ---
  min_partial_sell_pct?: number | null; // [%] 单次卖出或剩余仓位低于该百分比时直接清仓；0 或 null 关闭

  // --- 通用风险管理 ---
  hard_stop_loss_pct?: number | null; // [可选] 硬止损
  callback_stop_pct?: number | null; // [可选] 回调止损

  // --- 动态持仓时间策略 ---
  entry_confirmation_ms?: number | null; // [可选] 初始持仓时间（毫秒）
  dynamic_hold_trigger_pct?: number | null; // [可选] 触发持仓延长的价格波动百分比
  dynamic_hold_check_window_secs?: number | null; // [可选] 检查窗口时间
  dynamic_hold_extend_ms?: number | null; // [可选] 每次触发后，延长持仓的毫秒数
  dynamic_hold_max_ms?: number | null; // [可选] 通过动态延长，一笔交易允许的最长总持仓时间（毫秒）

  // --- 自动暂停 ---
  auto_suspend_config?: {
    enabled: boolean;
    window_size: number;
    loss_count: number;
    loss_threshold: number;
  } | null;

  // 已废弃或暂不使用的字段
  stop_loss_percentage?: number | null; // (已废弃)
  take_profit_percentage_legacy?: number | null; // (已废弃)
  tip_config?: any | null; // (兼容旧版本)

  // --- 卖出专属参数 ---
  sell_slippage_percentage?: number | null; // [可选] 卖出滑点容忍度
  sell_priority_fee?: number | null; // [可选] 卖出优先费用 μlamports
  sell_tip_percentage?: number | null; // [可选] 卖出Tip百分比
  sell_compute_unit_limit?: number | null; // [可选] 卖出计算单元限制
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

// 清除日志响应类型
export interface ClearLogsResponse {
  success: boolean;
  message: string;
  cleared_files?: number;
  freed_space_bytes?: number;
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

// 历史交易记录查询类型
export interface TradeHistoryRequest {
  limit?: number; // 限制返回记录数，默认100
  offset?: number; // 偏移量，用于分页
  start_time?: number; // 开始时间戳（秒）
  end_time?: number; // 结束时间戳（秒）
  trade_type?: 'buy' | 'sell'; // 交易类型筛选
  status?: 'Pending' | 'Confirmed' | 'Failed'; // 状态筛选
  wallet_address?: string; // 钱包地址筛选
}

export interface TradeHistoryResponse {
  trades: TradeRecord[];
  total: number; // 总记录数
  has_more: boolean; // 是否还有更多数据
}

// 交易记录类型定义
export interface TradeRecord {
  trade_id: string; // 交易ID
  status: 'Pending' | 'Confirmed' | 'Failed'; // 交易状态
  trade_type: 'Buy' | 'Sell' | 'buy' | 'sell'; // 交易类型
  signature: string; // 交易签名
  mint: string; // 代币合约地址
  block_time: number; // 区块时间戳（秒）
  sol_price_usd: number; // SOL价格（USD）
  sol_amount: number; // SOL数量
  usd_amount: number; // USD金额
  token_amount: number; // 代币数量（原始值，需要除以10^6）
  user_wallet: string; // 我们自己的钱包地址
  followed_wallet: string | null; // [新增] 被跟随的钱包地址
  profit_usd: number | null; // 盈亏金额（USD），买入时为null
  failure_reason: string | null; // 失败原因
  target_wallet?: string; // [可选] 跟单目标钱包地址（向后兼容）
  target_wallet_remark?: string; // [可选] 跟单目标钱包备注（向后兼容）
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
  success: boolean;
  token: string | null;
  message: string;
}
