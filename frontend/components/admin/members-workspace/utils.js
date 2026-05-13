"use client";

export const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  role: "content_admin",
  status: "active",
  keySlot: "",
  notes: "",
};

export const SEARCH_FIELDS = [
  { field: "id", type: "string" },
  { field: "name", type: "string" },
  { field: "email", type: "string" },
  { field: "role", type: "string" },
];

export const SORT_FIELDS = [
  { field: "createdAt", type: "date" },
  { field: "lastLoginAt", type: "date" },
  { field: "name", type: "string" },
];

export const SORT_OPTIONS = [
  { value: "createdAt", label: "创建时间" },
  { value: "lastLoginAt", label: "最近登录" },
  { value: "name", label: "成员名称" },
];

export const ROLE_LABELS = {
  super_admin: "超级管理员",
  content_admin: "内容运营",
  user_admin: "用户管理",
  finance_admin: "财务管理",
  support_admin: "客服支持",
  marketing_admin: "营销运营",
  ops_admin: "系统运维",
};

export const STATUS_LABELS = {
  active: "启用",
  disabled: "停用",
};

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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRole(role) {
  return (
    ROLE_LABELS[
      String(role || "")
        .trim()
        .toLowerCase()
    ] || "超级管理员"
  );
}

export function buildPayload(form) {
  const payload = {
    name: String(form.name || "").trim(),
    email: String(form.email || "").trim() || null,
    role: String(form.role || "").trim() || "content_admin",
    status: String(form.status || "").trim() || "active",
    keySlot: form.keySlot === "" ? null : Number(form.keySlot),
    notes: String(form.notes || "").trim() || null,
  };

  const password = String(form.password || "").trim();
  if (password) {
    payload.password = password;
  }

  return payload;
}

export function toFormState(member) {
  if (!member) {
    return { ...DEFAULT_FORM };
  }

  return {
    name: member.name || "",
    email: member.email || "",
    password: "",
    role: member.role || "content_admin",
    status: member.status || "active",
    keySlot: typeof member.keySlot === "number" ? String(member.keySlot) : "",
    notes: member.notes || "",
  };
}

export function getSourceLabel(source) {
  return source === "env_seed" ? "环境密钥槽位" : "手动成员";
}

export function getKeySlotTone(status) {
  if (status === "missing") {
    return "danger";
  }
  if (status === "assigned") {
    return "accent";
  }
  return "default";
}

export function getKeySlotLabel(member) {
  if (member.keySlotStatus === "missing") {
    return `槽位 ${member.keySlot}（环境未配置）`;
  }
  if (member.keySlotStatus === "assigned") {
    return `槽位 ${member.keySlot}`;
  }
  return "未绑定";
}
