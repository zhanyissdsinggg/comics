/**
 * US localization helpers for dates, time, currency, and shared labels.
 */

export const US_LOCALE = 'en-US';
export const US_TIMEZONE = 'America/New_York';
export const US_CURRENCY = 'USD';

export function formatUSDate(date, options = {}) {
  if (!date) {
    return '';
  }

  const dateObject = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObject.getTime())) {
    return '';
  }

  return dateObject.toLocaleDateString(US_LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    ...options,
  });
}

export function formatUSTime(date, options = {}) {
  if (!date) {
    return '';
  }

  const dateObject = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObject.getTime())) {
    return '';
  }

  return dateObject.toLocaleTimeString(US_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function formatUSDateTime(date, options = {}) {
  if (!date) {
    return '';
  }

  const dateObject = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObject.getTime())) {
    return '';
  }

  return dateObject.toLocaleString(US_LOCALE, {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  });
}

export function formatRelativeTime(date) {
  if (!date) {
    return '';
  }

  const dateObject = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(dateObject.getTime())) {
    return '';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObject) / 1000);

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

export function formatUSCurrency(amount, options = {}) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '$0.00';
  }

  return new Intl.NumberFormat(US_LOCALE, {
    style: 'currency',
    currency: US_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatUSNumber(number, options = {}) {
  if (number === null || number === undefined || Number.isNaN(Number(number))) {
    return '0';
  }

  return new Intl.NumberFormat(US_LOCALE, options).format(number);
}

export function formatPercentage(value, isDecimal = true) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '0%';
  }

  const percentage = isDecimal ? Number(value) * 100 : Number(value);
  return `${Math.round(percentage)}%`;
}

export function formatFileSize(bytes) {
  if (!bytes) {
    return '0 Bytes';
  }

  const unitSize = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(unitSize));

  return `${parseFloat((bytes / Math.pow(unitSize, unitIndex)).toFixed(2))} ${units[unitIndex]}`;
}

export const US_LABELS = {
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
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  thisWeek: 'This Week',
  lastWeek: 'Last Week',
  thisMonth: 'This Month',
  lastMonth: 'Last Month',
  price: 'Price',
  total: 'Total',
  subtotal: 'Subtotal',
  tax: 'Tax',
  shipping: 'Shipping',
  discount: 'Discount',
  checkout: 'Checkout',
  payNow: 'Pay Now',
  signIn: 'Sign In',
  signUp: 'Sign Up',
  signOut: 'Sign Out',
  profile: 'Profile',
  settings: 'Settings',
  account: 'Account',
  readMore: 'Read More',
  showLess: 'Show Less',
  viewAll: 'View All',
  noResults: 'No results found',
  searchPlaceholder: 'Search...',
};
