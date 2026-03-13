"use client";

import { useEffect } from "react";

const TEXT_MAP = new Map([
  ["Loading...", "加载中..."],
  ["Overview", "总览"],
  ["Stats", "统计"],
  ["Analytics", "分析"],
  ["Segments", "分群"],
  ["User detail", "用户详情"],
  ["All users", "全部用户"],
  ["VIP users", "VIP 用户"],
  ["High value", "高价值"],
  ["At risk", "流失风险"],
  ["Custom", "自定义"],
  ["Never", "从未"],
  ["Invalid date", "日期无效"],
  ["Pending", "待处理"],
  ["Error", "错误"],
  ["Open", "待处理"],
  ["In progress", "处理中"],
  ["Closed", "已关闭"],
  ["Draft", "草稿"],
  ["Active", "启用中"],
  ["Paused", "已暂停"],
  ["Completed", "已完成"],
  ["Cancelled", "已取消"],
  ["Unknown", "未知"],
  ["Unknown user", "未知用户"],
  ["Comic", "漫画"],
  ["Novel", "小说"],
  ["comic", "漫画"],
  ["novel", "小说"],
  ["Ongoing", "连载中"],
  ["Hiatus", "暂停中"],
  ["Published", "已发布"],
  ["Hidden", "已隐藏"],
  ["Unpublished", "未发布"],
  ["Enabled", "开启"],
  ["Disabled", "关闭"],
  ["Grid view", "网格视图"],
  ["List view", "列表视图"],
  ["Select all", "全选"],
  ["Clear selection", "清空选择"],
  ["Create", "创建"],
  ["Create campaign", "创建活动"],
  ["Create slot", "创建推荐位"],
  ["Create ranking", "创建榜单"],
  ["Delete campaign", "删除活动"],
  ["Delete this campaign?", "确定删除这个活动吗？"],
  ["Unknown email", "未知邮箱"],
  ["Slots", "推荐位"],
  ["Rankings", "榜单"],
  ["Campaigns", "活动"],
  ["By segment", "按分群"],
  ["By type", "按类型"],
  ["Trend", "趋势"],
  ["Channels", "渠道"],
  ["Date", "日期"],
  ["Slot", "推荐位"],
  ["Series", "作品"],
  ["Impressions", "曝光量"],
  ["Views", "浏览量"],
  ["Clicks", "点击量"],
  ["Conversions", "转化量"],
  ["Conversion rate", "转化率"],
  ["CTR", "点击率"],
  ["Provider", "服务商"],
  ["Priority", "优先级"],
  ["Retries", "重试次数"],
  ["Action", "操作"],
  ["Actions", "操作"],
  ["Subject", "主题"],
  ["Recipient", "收件人"],
  ["Price", "价格"],
  ["Episode", "章节"],
  ["Episodes", "章节数"],
  ["Updated", "更新时间"],
  ["Created", "创建时间"],
  ["Title", "标题"],
  ["Description", "简介"],
  ["Status", "状态"],
  ["User", "用户"],
  ["Save", "保存"],
  ["Cancel", "取消"],
  ["Delete", "删除"],
  ["Edit", "编辑"],
  ["Duplicate", "复制"],
  ["Publish", "发布"],
  ["Unpublish", "取消发布"],
  ["Refresh", "刷新"],
  ["Refreshing...", "刷新中..."],
  ["Export", "导出"],
  ["Reply", "回复"],
  ["Retry", "重试"],
  ["Close ticket", "关闭工单"],
  ["Ticket already closed", "工单已关闭"],
  ["Original message", "原始消息"],
  ["No message provided", "未提供消息内容"],
  ["No cover asset uploaded yet.", "尚未上传封面资源。"],
  ["Series title", "作品标题"],
  ["Adult content (18+)", "成人内容（18+）"],
  ["No description yet.", "暂无简介。"],
  ["Edit details", "编辑详情"],
  ["Grid", "网格"],
  ["List", "列表"],
  ["Performance overview", "表现概览"],
  ["Track the current balance between active readers, premium spend, and churn exposure.", "查看活跃读者、付费消耗与流失风险之间的当前平衡。"],
  ["Failed to load analytics overview.", "分析概览加载失败。"],
  ["No analytics data is available yet.", "暂无分析数据。"],
  ["Total users", "用户总数"],
  ["Active users", "活跃用户"],
  ["Active rate", "活跃率"],
  ["High-value users", "高价值用户"],
  ["At-risk users", "流失风险用户"],
  ["Total revenue", "总收入"],
  ["All registered accounts.", "全部注册账号。"],
  ["Users active in the current measurement window.", "当前统计窗口内活跃的用户。"],
  ["Share of active users across the entire base.", "活跃用户在总用户中的占比。"],
  ["Users who cross the LTV threshold.", "达到 LTV 阈值的用户。"],
  ["Users currently flagged for churn intervention.", "当前被标记为需要流失干预的用户。"],
  ["Realized paid revenue attributed to tracked users.", "归因到已跟踪用户的已实现付费收入。"],
  ["No at-risk cohort is currently flagged in the latest analytics pass.", "最新分析结果中暂无流失风险人群。"],
  ["High-value user revenue density will appear once qualifying users exist.", "出现符合条件的高价值用户后，这里会显示收入密度。"],
  ["No recent activity was reported in the current analytics snapshot.", "当前分析快照中暂无最近活动。"],
  ["Audience segments", "用户分群"],
  ["Slice the user base, inspect spend quality, and jump into individual accounts from the same view.", "拆分用户群体，查看付费质量，并在同一视图中跳转到单个账号。"],
  ["Failed to load audience segments.", "用户分群加载失败。"],
  ["No users match this segment yet.", "该分群下暂无用户。"],
  ["User deep dive", "用户深度分析"],
  ["Failed to load user analytics.", "用户分析加载失败。"],
  ["This user could not be found.", "未找到该用户。"],
  ["Pick a user from the segment table to inspect details.", "请先从分群列表中选择用户查看详情。"],
  ["Lifetime value", "生命周期价值"],
  ["Total spend", "累计消费"],
  ["Wallet balance", "钱包余额"],
  ["Activity score", "活跃评分"],
  ["First order", "首单时间"],
  ["Last order", "最近下单"],
  ["Orders placed", "下单数量"],
  ["Current segment", "当前分群"],
  ["Series viewed", "浏览作品数"],
  ["Reading minutes", "阅读分钟数"],
  ["Comments", "评论数"],
  ["Ratings", "评分数"],
  ["Bookmarks", "收藏数"],
  ["Registered", "注册时间"],
  ["Wallet coins", "钱包点数"],
  ["Wallet bonus", "赠送点数"],
  ["Last active", "最近活跃"],
  ["Content Generator", "内容生成器"],
  ["Generation failed.", "生成失败。"],
  ["Generating demo content...", "正在生成演示内容..."],
  ["Optional reproducible seed", "可选的复现种子"],
  ["Generating...", "生成中..."],
  ["Generate content", "生成内容"],
  ["No audit logs found", "未找到审计日志"],
  ["Try widening the filters or generate a fresh admin action.", "请放宽筛选条件，或先执行一次新的后台操作。"],
  ["Search id, action, resource, target, or admin", "搜索 ID、动作、资源、目标或管理员"],
  ["Campaign created.", "活动已创建。"],
  ["Campaign deleted.", "活动已删除。"],
  ["Campaign name is required.", "活动名称不能为空。"],
  ["Budget must be a valid non-negative number.", "预算必须是有效的非负数。"],
  ["End date must be on or after the start date.", "结束日期不能早于开始日期。"],
  ["Unable to resolve the selected campaign.", "无法识别所选活动。"],
  ["Loading campaigns...", "正在加载活动..."],
  ["Campaigns could not be loaded.", "活动加载失败。"],
  ["Failed to load campaigns.", "活动加载失败。"],
  ["No campaigns yet.", "暂无活动。"],
  ["No revenue data available yet.", "暂无收入数据。"],
  ["All series", "全部作品"],
  ["Not available", "暂无"],
  ["Open this tab to load", "打开该标签后加载"],
  ["Failed to load recommendation slots.", "推荐位加载失败。"],
  ["Failed to load ranking configs.", "榜单配置加载失败。"],
  ["Failed to load recommendation analytics.", "推荐分析加载失败。"],
  ["Slot name is required.", "推荐位名称不能为空。"],
  ["Failed to create recommendation slot.", "创建推荐位失败。"],
  ["Recommendation slot created.", "推荐位已创建。"],
  ["Ranking name is required.", "榜单名称不能为空。"],
  ["Max items must be between 1 and 200.", "最大条目数必须在 1 到 200 之间。"],
  ["Failed to create ranking config.", "创建榜单配置失败。"],
  ["Ranking config created.", "榜单配置已创建。"],
  ["Failed to delete recommendation slot.", "删除推荐位失败。"],
  ["Recommendation slot deleted.", "推荐位已删除。"],
  ["Failed to delete ranking config.", "删除榜单配置失败。"],
  ["Ranking config deleted.", "榜单配置已删除。"],
  ["Failed to load slots", "推荐位加载失败"],
  ["The slot list could not be loaded.", "推荐位列表加载失败。"],
  ["No recommendation slots have been created yet.", "暂无推荐位。"],
  ["Failed to load analytics", "分析加载失败"],
  ["Analytics data could not be loaded.", "分析数据加载失败。"],
  ["No recommendation analytics are available yet.", "暂无推荐分析数据。"],
  ["Adult content enabled", "已启用 18+ 内容"],
  ["Delete item", "删除项目"],
  ["Delete slot", "删除推荐位"],
  ["Delete ranking", "删除榜单"],
  ["Title is required.", "标题不能为空。"],
  ["Failed to load series.", "作品加载失败。"],
  ["Series updated.", "作品已更新。"],
  ["Failed to save changes.", "保存更改失败。"],
  ["Series published.", "作品已发布。"],
  ["Series unpublished.", "作品已取消发布。"],
  ["Failed to create the series.", "创建作品失败。"],
  ["Series created successfully.", "作品创建成功。"],
  ["Delete series", "删除作品"],
  ["Series deleted.", "作品已删除。"],
  ["Failed to delete the series.", "删除作品失败。"],
  ["A new series ID is required.", "请输入新的作品 ID。"],
  ["Series duplicated.", "作品复制成功。"],
  ["Failed to duplicate the series.", "复制作品失败。"],
  ["Selected series published.", "已发布所选作品。"],
  ["Selected series unpublished.", "已取消发布所选作品。"],
  ["Delete selected series", "删除所选作品"],
  ["Selected series deleted.", "已删除所选作品。"],
  ["Failed to load series details.", "作品详情加载失败。"],
  ["Episode price must be a whole number of coins.", "章节价格必须是整数点数。"],
  ["Free ticket refresh interval must be a whole number of hours.", "免费票刷新间隔必须是整数小时。"],
  ["Free ticket refresh interval must be at least 1 hour.", "免费票刷新间隔至少为 1 小时。"],
  ["Failed to save series details.", "作品详情保存失败。"],
  ["Series details were saved.", "作品详情已保存。"],
  ["Failed to upload cover image.", "封面上传失败。"],
  ["Cover image uploaded. Save changes to publish it.", "封面已上传，保存后生效。"],
  ["Please upload a valid image file.", "请上传有效的图片文件。"],
  ["Cover images must be 10MB or smaller.", "封面图片不能超过 10MB。"],
  ["This series could not be found.", "未找到该作品。"],
  ["Back to series", "返回作品列表"],
  ["Save changes", "保存更改"],
  ["Uploading cover...", "封面上传中..."],
  ["Reply to ticket", "回复工单"],
  ["Write the reply that will be sent to the user", "输入要发送给用户的回复内容"],
  ["Send reply", "发送回复"],
  ["Sending...", "发送中..."],
  ["Episodes", "章节管理"],
  ["Manage episode metadata, pricing, previews, and bulk uploads for this series.", "管理当前作品的章节信息、价格、预览与批量上传。"],
  ["Search episode number or title", "搜索章节编号或标题"],
  ["Bulk upload", "批量上传"],
  ["Add episode", "新增章节"],
  ["Bulk edit", "批量编辑"],
  ["Failed to load episodes.", "章节加载失败。"],
  ["No episodes yet.", "暂无章节。"],
  ["Episode number", "章节编号"],
  ["Free preview pages", "免费预览页"],
  ["Episode number and title are required.", "章节编号和标题不能为空。"],
  ["Enter at least one field to update.", "请至少填写一个需要更新的字段。"],
  ["Adding...", "新增中..."],
  ["Updating...", "更新中..."],
  ["Apply updates", "应用更新"],
  ["Delete episodes", "删除章节"],
  ["Upload failed.", "上传失败。"],
  ["Bulk upload completed successfully.", "批量上传已完成。"],
  ["Select at least one ZIP file.", "请至少选择一个 ZIP 文件。"],
  ["You can upload up to 50 files at once.", "单次最多可上传 50 个文件。"],
  ["Select files before uploading.", "请先选择文件后再上传。"],
  ["Success", "成功"],
  ["Failed", "失败"],
  ["Waiting", "等待中"],
  ["Uploading...", "上传中..."],
  ["Start upload", "开始上传"],
  ["views", "浏览量"],
  ["rating", "评分"],
  ["trending", "趋势热度"],
  ["ratingCount", "评分人数"],
  ["email", "邮件"],
  ["push", "推送"],
  ["banner", "横幅"],
  ["discount", "折扣"],
  ["all", "全部"],
  ["vip", "VIP 用户"],
  ["new", "新用户"],
  ["at-risk", "流失风险"],
  ["high-value", "高价值用户"],
]);

const PATTERNS = [
  [/^([0-9]+)\s+minutes ago$/i, (_, minutes) => `${minutes} 分钟前`],
  [/^([0-9]+)\s+hours ago$/i, (_, hours) => `${hours} 小时前`],
  [/^([0-9]+)\s+days ago$/i, (_, days) => `${days} 天前`],
  [/^Current results\s+([0-9]+)\s+items$/i, (_, total) => `当前结果 ${total} 条`],
  [/^Delete\s+([0-9]+)\s+selected\s+(.+?)\?\s+This action cannot be undone\.$/i, (_, total, target) => `确定删除 ${total} 个选中的${target}吗？此操作无法撤销。`],
  [/^Delete slot \"(.+)\"\?$/i, (_, name) => `确定删除推荐位「${name}」吗？`],
  [/^Delete ranking \"(.+)\"\?$/i, (_, name) => `确定删除榜单「${name}」吗？`],
  [/^Delete (.+)\? This action cannot be undone\.$/i, (_, target) => `确定删除 ${target} 吗？此操作无法撤销。`],
  [/^Average order:\s*(.+)$/i, (_, value) => `平均客单价：${value}`],
  [/^(\d+)\s+paid orders$/i, (_, count) => `${count} 笔已支付订单`],
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
    const root = document.body;
    if (!root) {
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
