// 价格相关工具函数

/**
 * 格式化价格显示，特殊处理小数位
 * @param price 价格数值
 * @param currency 货币符号，默认为 '$'
 * @returns 格式化后的价格字符串
 */
export const formatPrice = (price: number | null | undefined, currency: string = '$'): string => {
  if (price === null || price === undefined || isNaN(price)) {
    return `${currency}0.00`;
  }

  // 如果价格大于等于1，显示2位小数
  if (price >= 1) {
    return `${currency}${price.toFixed(2)}`;
  }

  // 如果价格小于1，需要特殊处理
  if (price === 0) {
    return `${currency}0.00`;
  }

  // 转换为字符串进行分析
  const priceStr = price.toString();
  
  // 如果是科学计数法，先转换
  if (priceStr.includes('e')) {
    price = parseFloat(price.toFixed(20));
  }

  // 找到第一个非零数字的位置
  const decimalStr = price.toString().split('.')[1] || '';
  let zeroCount = 0;
  let firstNonZeroIndex = -1;

  for (let i = 0; i < decimalStr.length; i++) {
    if (decimalStr[i] === '0') {
      zeroCount++;
    } else {
      firstNonZeroIndex = i;
      break;
    }
  }

  // 如果有连续的0，使用特殊格式
  if (zeroCount >= 3) {
    // 获取第一个非零数字后的几位
    const significantPart = decimalStr.substring(firstNonZeroIndex, firstNonZeroIndex + 4);
    return `${currency}0.0${zeroCount}${significantPart}`;
  }

  // 否则使用常规格式，显示足够的小数位
  const decimalPlaces = Math.max(4, zeroCount + 4);
  return `${currency}${price.toFixed(decimalPlaces)}`;
};

/**
 * 美元价格转换为价格倍数（相对于SOL价格）
 * @param usdPrice 美元价格
 * @param solPrice SOL当前价格（美元）
 * @returns 价格倍数
 */
export const usdToPriceMultiplier = (usdPrice: number, solPrice: number): number => {
  if (solPrice === 0) return 0;
  return usdPrice / solPrice;
};

/**
 * 价格倍数转换为美元价格
 * @param multiplier 价格倍数
 * @param solPrice SOL当前价格（美元）
 * @returns 美元价格
 */
export const priceMultiplierToUsd = (multiplier: number, solPrice: number): number => {
  return multiplier * solPrice;
};

/**
 * 解析价格输入，支持多种格式
 * @param input 用户输入的价格字符串
 * @returns 解析后的数值
 */
export const parsePrice = (input: string): number => {
  if (!input) return 0;
  
  // 移除货币符号和空格
  const cleanInput = input.replace(/[$\s,]/g, '');
  
  // 处理特殊格式，如 "0.04" 表示 0.0004
  if (cleanInput.startsWith('0.0') && cleanInput.length <= 5) {
    const afterZero = cleanInput.substring(3);
    if (afterZero && !isNaN(parseFloat(afterZero))) {
      const zeroCount = cleanInput.length - 3;
      return parseFloat(`0.${'0'.repeat(zeroCount)}${afterZero}`);
    }
  }
  
  return parseFloat(cleanInput) || 0;
};

/**
 * 验证价格输入是否有效
 * @param price 价格数值
 * @returns 是否有效
 */
export const isValidPrice = (price: number): boolean => {
  return !isNaN(price) && price >= 0 && price < Infinity;
};

/**
 * 格式化SOL价格显示（首页用）
 * @param price SOL价格
 * @returns 格式化的价格字符串，带红色样式类名提示
 */
export const formatSolPrice = (price: number): { text: string; className: string } => {
  const formattedPrice = formatPrice(price);
  return {
    text: formattedPrice,
    className: 'sol-price-display' // 可以用于CSS样式
  };
};
