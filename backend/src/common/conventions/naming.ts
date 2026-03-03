/**
 * 老王说：命名规范指南
 * 统一的命名规范，防止命名混乱
 */

// ============ 文件和文件夹命名规范 ============

/**
 * 文件命名规范：
 * - 组件文件：PascalCase (e.g., UserProfile.tsx)
 * - 工具函数：camelCase (e.g., formatDate.ts)
 * - 常量文件：UPPER_SNAKE_CASE (e.g., API_ENDPOINTS.ts)
 * - 类型定义：PascalCase (e.g., User.ts)
 * - 样式文件：kebab-case (e.g., user-profile.module.css)
 * - 测试文件：*.test.ts 或 *.spec.ts
 */

// ============ 变量命名规范 ============

/**
 * 变量命名规范：
 * - 常规变量：camelCase (e.g., userName, isLoading)
 * - 常量：UPPER_SNAKE_CASE (e.g., MAX_RETRIES, DEFAULT_TIMEOUT)
 * - 布尔值：is/has/can前缀 (e.g., isLoading, hasError, canDelete)
 * - 数组：复数形式 (e.g., users, items, comments)
 * - 私有属性：_前缀 (e.g., _internalState)
 * - 类型/接口：PascalCase (e.g., User, ApiResponse)
 */

// ============ 函数命名规范 ============

/**
 * 函数命名规范：
 * - 普通函数：camelCase (e.g., getUserById, formatDate)
 * - 事件处理：handle前缀 (e.g., handleClick, handleSubmit)
 * - 获取数据：get前缀 (e.g., getUser, getConfig)
 * - 设置数据：set前缀 (e.g., setUser, setConfig)
 * - 检查条件：is/has/can前缀 (e.g., isValid, hasPermission, canDelete)
 * - 异步操作：async函数 (e.g., async fetchUser())
 * - Hook函数：use前缀 (e.g., useAuth, useLoading)
 */

// ============ 类命名规范 ============

/**
 * 类命名规范：
 * - 类名：PascalCase (e.g., UserService, ApiClient)
 * - 方法：camelCase (e.g., getUserById, createUser)
 * - 私有方法：_前缀 (e.g., _validateInput)
 * - 静态方法：static关键字 (e.g., static create())
 */

// ============ API端点命名规范 ============

/**
 * API端点命名规范：
 * - 资源路由：/api/resource (e.g., /api/users, /api/orders)
 * - 单个资源：/api/resource/:id (e.g., /api/users/123)
 * - 子资源：/api/resource/:id/subresource (e.g., /api/users/123/orders)
 * - 操作：/api/resource/action (e.g., /api/users/search, /api/orders/reconcile)
 * - HTTP方法：GET/POST/PUT/PATCH/DELETE
 */

// ============ 数据库命名规范 ============

/**
 * 数据库命名规范：
 * - 表名：snake_case复数 (e.g., users, user_orders, payment_intents)
 * - 列名：snake_case (e.g., user_id, created_at, is_deleted)
 * - 主键：id (e.g., id)
 * - 外键：{table}_id (e.g., user_id, order_id)
 * - 时间戳：created_at, updated_at, deleted_at
 * - 布尔值：is_{property} (e.g., is_deleted, is_active)
 * - 索引：idx_{table}_{columns} (e.g., idx_users_email)
 */

// ============ 环境变量命名规范 ============

/**
 * 环境变量命名规范：
 * - 格式：UPPER_SNAKE_CASE
 * - 前缀：NEXT_PUBLIC_（前端可访问）或无前缀（后端私密）
 * - 示例：
 *   - NEXT_PUBLIC_API_BASE_URL
 *   - DATABASE_URL
 *   - JWT_SECRET
 *   - NODE_ENV
 */

export const NamingConventions = {
  file: {
    component: 'PascalCase (e.g., UserProfile.tsx)',
    utility: 'camelCase (e.g., formatDate.ts)',
    constant: 'UPPER_SNAKE_CASE (e.g., API_ENDPOINTS.ts)',
    type: 'PascalCase (e.g., User.ts)',
    style: 'kebab-case (e.g., user-profile.module.css)',
  },
  variable: {
    regular: 'camelCase (e.g., userName)',
    constant: 'UPPER_SNAKE_CASE (e.g., MAX_RETRIES)',
    boolean: 'is/has/can prefix (e.g., isLoading)',
    array: 'plural form (e.g., users)',
    private: '_ prefix (e.g., _internalState)',
  },
  function: {
    regular: 'camelCase (e.g., getUserById)',
    eventHandler: 'handle prefix (e.g., handleClick)',
    getter: 'get prefix (e.g., getUser)',
    setter: 'set prefix (e.g., setUser)',
    checker: 'is/has/can prefix (e.g., isValid)',
    hook: 'use prefix (e.g., useAuth)',
  },
  api: {
    resource: '/api/resource (e.g., /api/users)',
    single: '/api/resource/:id (e.g., /api/users/123)',
    subresource: '/api/resource/:id/subresource (e.g., /api/users/123/orders)',
    action: '/api/resource/action (e.g., /api/users/search)',
  },
  database: {
    table: 'snake_case plural (e.g., users)',
    column: 'snake_case (e.g., user_id)',
    primaryKey: 'id',
    foreignKey: '{table}_id (e.g., user_id)',
    timestamp: 'created_at, updated_at, deleted_at',
    boolean: 'is_{property} (e.g., is_deleted)',
  },
};
