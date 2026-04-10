"use client";

import { useEffect } from "react";

// Temporary compatibility layer for low-frequency admin pages that have not been fully source-cleaned yet.
// New admin UI should render Chinese copy directly instead of depending on this bridge.
const TEXT_MAP = new Map([
  ["Loading...", "加载中..."],
  ["Overview", "总览"],
  ["Analytics", "分析"],
  ["Stats", "统计"],
  ["Actions", "操作"],
  ["Action", "操作"],
  ["Status", "状态"],
  ["Title", "标题"],
  ["Series", "作品"],
  ["Episode", "章节"],
  ["Episodes", "章节管理"],
  ["User", "用户"],
  ["Users", "用户"],
  ["Created", "创建时间"],
  ["Updated", "更新时间"],
  ["Date", "日期"],
  ["Price", "价格"],
  ["Draft", "草稿"],
  ["Unknown", "未知"],
  ["Save", "保存"],
  ["Save changes", "保存更改"],
  ["Save settings", "保存设置"],
  ["Cancel", "取消"],
  ["Close", "关闭"],
  ["Delete", "删除"],
  ["Edit", "编辑"],
  ["Duplicate", "复制"],
  ["Create", "创建"],
  ["Publish", "发布"],
  ["Unpublish", "取消发布"],
  ["Refresh", "刷新"],
  ["Refreshing...", "刷新中..."],
  ["Search", "搜索"],
  ["Export", "导出"],
  ["Reply", "回复"],
  ["Retry", "重试"],
  ["Retrying...", "重试中..."],
  ["Open", "打开"],
  ["Previous", "上一页"],
  ["Next", "下一页"],
  ["Per page", "每页"],
  ["Grid view", "网格视图"],
  ["List view", "列表视图"],
  ["Grid", "网格"],
  ["List", "列表"],
  ["All", "全部"],
  ["All series", "全部作品"],
  ["Rankings", "榜单"],
  ["Campaigns", "活动"],
  ["Trend", "趋势"],
  ["Channels", "渠道"],
  ["Loading campaigns...", "正在加载活动..."],
  ["Loading email settings...", "正在加载邮件设置..."],
  ["Loading region settings...", "正在加载地区设置..."],
  ["Open asset", "打开素材"],
  ["Storefront audit", "前台体检"],
  ["Home merchandising", "首页编排"],
  ["No action needed", "无需处理"],
  ["No support tickets yet.", "当前还没有客服工单。"],
  ["No support tickets match this view yet.", "当前视图下还没有匹配的客服工单。"],
  ["No users match this view yet.", "当前视图下还没有匹配的用户。"],
  ["No promotions match this view yet.", "当前视图下还没有匹配的活动。"],
  ["No top-up packages match this view yet.", "当前视图下还没有匹配的充值套餐。"],
  ["No audit logs were found for this view.", "当前视图下没有审计日志。"],
  ["No revenue data is available for this range.", "当前时间范围内还没有收入数据。"],
  ["No comments match this view yet.", "当前视图下还没有匹配的评论。"],
  ["No notifications match this view yet.", "当前视图下还没有匹配的通知。"],
  ["No message body", "暂无消息内容"],
  ["No detail payload", "暂无详情内容"],
  ["Unknown email", "未知邮箱"],
  ["Unknown user", "未知用户"],
  ["No email listed", "未填写邮箱"],
  ["Search by account ID or email...", "搜索账号 ID 或邮箱..."],
  ["Search by ticket ID, user, subject, or message...", "搜索工单 ID、用户、主题或消息内容..."],
  ["Search by order ID or user ID...", "搜索订单 ID 或用户 ID..."],
  ["Search package ID, name, or label", "搜索套餐 ID、名称或标签"],
  ["Search promotion ID or title", "搜索活动 ID 或标题"],
  ["Search notification ID, title, or text", "搜索通知 ID、标题或正文"],
  ["Search comment ID, reader ID, email, or text", "搜索评论 ID、读者 ID、邮箱或正文"],
  ["Search ID, action, resource, target, or operator", "搜索日志 ID、动作、资源、目标或操作者"],
]);

const PATTERNS = [
  [/^([0-9]+)\s+minutes ago$/i, (_, minutes) => `${minutes} 分钟前`],
  [/^([0-9]+)\s+hours ago$/i, (_, hours) => `${hours} 小时前`],
  [/^([0-9]+)\s+days ago$/i, (_, days) => `${days} 天前`],
  [/^Page\s+([0-9]+)\s+of\s+([0-9]+)\s+[·•-]\s+([0-9]+)\s+total episodes$/i, (_, page, totalPages, totalEpisodes) => `第 ${page} / ${totalPages} 页，共 ${totalEpisodes} 章`],
  [/^Page\s+([0-9]+)\s+of\s+([0-9]+)$/i, (_, page, totalPages) => `第 ${page} / ${totalPages} 页`],
  [/^Current results\s+([0-9]+)\s+items$/i, (_, total) => `当前结果 ${total} 条`],
  [/^Delete slot "(.+)"\?$/i, (_, name) => `确定删除推荐位“${name}”吗？`],
  [/^Delete ranking "(.+)"\?$/i, (_, name) => `确定删除榜单“${name}”吗？`],
  [/^Delete\s+([0-9]+)\s+selected\s+(.+?)\?\s+This action cannot be undone\.$/i, (_, total, target) => `确定删除 ${total} 个已选 ${target} 吗？此操作无法撤销。`],
  [/^Delete (.+)\? This action cannot be undone\.$/i, (_, target) => `确定删除 ${target} 吗？此操作无法撤销。`],
  [/^Average order:\s*(.+)$/i, (_, value) => `平均客单价：${value}`],
  [/^(\d+)\s+paid orders$/i, (_, count) => `${count} 笔已支付订单`],
  [/^(\d+)\s+failed in this view$/i, (_, count) => `当前视图中有 ${count} 条失败任务`],
  [/^Updated\s+(.+)$/i, (_, value) => `更新于 ${value}`],
  [/^Released:\s*(.+)$/i, (_, value) => `发布时间：${value}`],
  [/^Generation finished\. Run ID:\s*(.+)\.$/i, (_, runId) => `生成完成。运行 ID：${runId}。`],
  [/^Country calling codes must be unique:\s*(.+)\.$/i, (_, value) => `国家区号必须唯一：${value}。`],
];

const ATTRIBUTE_NAMES = ["placeholder", "title", "aria-label"];

function translateCopy(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  const exactHit = TEXT_MAP.get(trimmed);
  if (exactHit) {
    return value.replace(trimmed, exactHit);
  }

  for (const [pattern, replacer] of PATTERNS) {
    if (pattern.test(trimmed)) {
      return value.replace(trimmed, trimmed.replace(pattern, replacer));
    }
  }

  return value;
}

function localizeNode(root) {
  if (!root) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();

  while (current) {
    const parent = current.parentElement;
    const isEditable =
      parent?.isContentEditable ||
      parent?.tagName === "SCRIPT" ||
      parent?.tagName === "STYLE" ||
      parent?.tagName === "TEXTAREA" ||
      parent?.tagName === "INPUT";

    if (!isEditable) {
      const nextValue = translateCopy(current.textContent || "");
      if (nextValue !== current.textContent) {
        current.textContent = nextValue;
      }
    }

    current = walker.nextNode();
  }

  root.querySelectorAll("*").forEach((element) => {
    ATTRIBUTE_NAMES.forEach((attributeName) => {
      const currentValue = element.getAttribute(attributeName);
      if (!currentValue) {
        return;
      }

      const nextValue = translateCopy(currentValue);
      if (nextValue !== currentValue) {
        element.setAttribute(attributeName, nextValue);
      }
    });
  });
}

export default function AdminLocaleBridge() {
  useEffect(() => {
    const root = document.querySelector(".admin-theme");
    if (!(root instanceof HTMLElement)) {
      return undefined;
    }

    localizeNode(root);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          localizeNode(mutation.target.parentElement || root);
          continue;
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          localizeNode(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            localizeNode(node);
          } else if (node.nodeType === Node.TEXT_NODE) {
            localizeNode(node.parentElement || root);
          }
        });
      }
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTE_NAMES,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
