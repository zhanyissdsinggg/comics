/**
 * 美国本地化配置和格式化工具
 * US Localization utilities for formatting dates, currency, and numbers
 */

// 美国本地化配置
export const US_LOCALE = 'en-US';
export const US_TIMEZONE = 'America/New_York'; // 可以根据需要调整
export const US_CURRENCY = 'USD';

/**
 * 格式化日期为美国格式 (MM/DD/YYYY)
 * @param {Date|string|number} date - 日期对象、ISO字符串或时间戳
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期字符串
 */
export function formatUSDate(date, options = {}) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    ...options,
  };

  return dateObj.toLocaleDateString(US_LOCALE, defaultOptions);
}

/**
 * 格式化时间为美国格式 (12小时制 with AM/PM)
 * @param {Date|string|number} date - 日期对象、ISO字符串或时间戳
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的时间字符串
 */
export function formatUSTime(date, options = {}) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // 12小时制
    ...options,
  };

  return dateObj.toLocaleTimeString(US_LOCALE, defaultOptions);
}

/**
 * 格式化日期时间为美国格式
 * @param {Date|string|number} date - 日期对象、ISO字符串或时间戳
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的日期时间字符串
 */
export function formatUSDateTime(date, options = {}) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };

  return dateObj.toLocaleString(US_LOCALE, defaultOptions);
}

/**
 * 格式化相对时间 (e.g., "2 hours ago", "just now")
 * @param {Date|string|number} date - 日期对象、ISO字符串或时间戳
 * @returns {string} 相对时间字符串
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * 格式化货币为美元格式 ($1,234.56)
 * @param {number} amount - 金额
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的货币字符串
 */
export function formatUSCurrency(amount, options = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  const defaultOptions = {
    style: 'currency',
    currency: US_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  };

  return new Intl.NumberFormat(US_LOCALE, defaultOptions).format(amount);
}

/**
 * 格式化数字为美国格式 (1,234.56)
 * @param {number} number - 数字
 * @param {Object} options - 格式化选项
 * @returns {string} 格式化后的数字字符串
 */
export function formatUSNumber(number, options = {}) {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  return new Intl.NumberFormat(US_LOCALE, options).format(number);
}

/**
 * 格式化百分比
 * @param {number} value - 数值 (0-1 或 0-100)
 * @param {boolean} isDecimal - 是否为小数形式 (0-1)
 * @returns {string} 格式化后的百分比字符串
 */
export function formatPercentage(value, isDecimal = true) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percentage = isDecimal ? value * 100 : value;
  return `${Math.round(percentage)}%`;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小字符串
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 美国常用的文案和标签
 */
export const US_LABELS = {
  // 通用
  loading: 'Loading...',
  error: 'Error',
  success: 'Success',
  cancel: 'Cancel',
  confirm: 'Confirm',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  close: 'Close',
  back: 'Back',
  next: 'Next',
  previous: 'Previous',
  submit: 'Submit',

  // 时间相关
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',

  // 支付相关
  price: 'Price',
  total: 'Total',
  subtotal: 'Subtotal',
  tax: 'Tax',
  shipping: 'Shipping',
  discount: 'Discount',
  checkout: 'Checkout',
  payNow: 'Pay Now',

  // 用户相关
  signIn: 'Sign In',
  signUp: 'Sign Up',
  signOut: 'Sign Out',
  profile: 'Profile',
  settings: 'Settings',
  account: 'Account',

  // 内容相关
  readMore: 'Read More',
  showLess: 'Show Less',
  viewAll: 'View All',
  noResults: 'No results found',
  searchPlaceholder: 'Search...',
};

/**
 * 使用示例：
 *
 * // 日期格式化
 * formatUSDate(new Date()) // "01/31/2026"
 * formatUSTime(new Date()) // "11:30 PM"
 * formatUSDateTime(new Date()) // "01/31/2026, 11:30 PM"
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 *
 * // 货币格式化
 * formatUSCurrency(1234.56) // "$1,234.56"
 * formatUSCurrency(99) // "$99.00"
 *
 * // 数字格式化
 * formatUSNumber(1234567) // "1,234,567"
 * formatPercentage(0.75) // "75%"
 * formatFileSize(1024000) // "1000 KB"
 */
