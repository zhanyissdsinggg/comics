/**
 * 老王说：表单验证工具
 * 统一的表单验证规则，防止验证逻辑散落各处
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * 老王说：验证单个字段
 */
export function validateField(value: any, rules: ValidationRule): string | null {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return "This field is required";
  }

  if (value && typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be at most ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return "Invalid format";
    }
  }

  if (rules.custom) {
    const result = rules.custom(value);
    if (result !== true) {
      return typeof result === "string" ? result : "Validation failed";
    }
  }

  return null;
}

/**
 * 老王说：验证整个表单
 */
export function validateForm(
  data: Record<string, any>,
  rules: Record<string, ValidationRule>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [field, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[field], fieldRules);
    if (error) {
      errors.push({ field, message: error });
    }
  }

  return errors;
}

/**
 * 老王说：常用验证规则
 */
export const CommonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
  },
  username: {
    required: true,
    minLength: 3,
    maxLength: 32,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  phone: {
    pattern: /^1[3-9]\d{9}$/,
  },
  url: {
    pattern: /^https?:\/\/.+/,
  },
};
