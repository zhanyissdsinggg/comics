"use client";

export const searchFields = [
  { field: "id", type: "string" },
  { field: "email", type: "string" },
];

export const sortFields = [
  { field: "createdAt", type: "date" },
  { field: "email", type: "string" },
];

export const sortOptions = [
  { value: "createdAt", label: "创建时间" },
  { value: "email", label: "邮箱地址" },
];

export function formatDate(value) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
}

export function buildUsersMetricCards({ total, blockedCount, walletBalance }) {
  return [
    {
      label: "当前视图账号数",
      value: formatNumber(total),
      detail: "按当前搜索和排序条件统计。",
      tone: "accent",
    },
    {
      label: "已封禁账号",
      value: formatNumber(blockedCount),
      detail: "当前结果里被限制访问的账号数量。",
    },
    {
      label: "钱包余额",
      value: formatNumber(walletBalance),
      detail: "当前视图内账号的付费点数和赠送点数总和。",
    },
  ];
}
