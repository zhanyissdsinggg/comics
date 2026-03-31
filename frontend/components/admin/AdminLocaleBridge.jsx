"use client";

import { useEffect } from "react";

const TEXT_MAP = new Map([
  ["Loading...", "加载中..."],
  ["Dashboard", "仪表盘"],
  ["Overview", "总览"],
  ["Stats", "统计"],
  ["Analytics", "分析"],
  ["Segments", "分群"],
  ["User detail", "用户详情"],
  ["All readers", "全部读者"],
  ["All users", "全部用户"],
  ["VIP users", "VIP 用户"],
  ["High value", "高价值用户"],
  ["At risk", "流失风险"],
  ["Never", "从未"],
  ["Invalid date", "日期无效"],
  ["Error", "错误"],
  ["Draft", "草稿"],
  ["Unknown", "未知"],
  ["Unknown user", "未知用户"],
  ["comic", "漫画"],
  ["novel", "小说"],
  ["Disabled", "关闭"],
  ["Grid view", "网格视图"],
  ["List view", "列表视图"],
  ["Clear selection", "清空选择"],
  ["Create", "创建"],
  ["Create campaign", "创建活动"],
  ["Create ranking", "创建榜单"],
  ["Delete campaign", "删除活动"],
  ["Delete this campaign?", "确定删除这个活动吗？"],
  ["Unknown email", "未知邮箱"],
  ["Rankings", "榜单"],
  ["Campaigns", "活动"],
  ["Trend", "趋势"],
  ["Channels", "渠道"],
  ["Date", "日期"],
  ["Series", "作品"],
  ["Retries", "重试次数"],
  ["Action", "操作"],
  ["Actions", "操作"],
  ["Status", "状态"],
  ["Subject", "主题"],
  ["Price", "价格"],
  ["Episode", "章节"],
  ["Updated", "更新时间"],
  ["Created", "创建时间"],
  ["Title", "标题"],
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
  ["Original message", "原始消息"],
  ["Series title", "作品标题"],
  ["Edit details", "编辑详情"],
  ["Grid", "网格"],
  ["List", "列表"],
  ["Performance overview", "表现概览"],
  ["Total users", "用户总数"],
  ["Active users", "活跃用户"],
  ["At-risk users", "流失风险用户"],
  ["Audience segments", "用户分群"],
  ["User deep dive", "用户深度分析"],
  ["Total spend", "累计消费"],
  ["Wallet balance", "钱包余额"],
  ["Activity score", "活跃评分"],
  ["First order", "首单时间"],
  ["Orders placed", "下单数量"],
  ["Current segment", "当前分群"],
  ["Registered", "注册时间"],
  ["Wallet coins", "钱包点数"],
  ["Generating demo content...", "正在生成演示内容..."],
  ["Optional reproducible seed", "可选的复现种子"],
  ["Generating...", "生成中..."],
  ["Generate content", "生成内容"],
  ["Loading campaigns...", "正在加载活动..."],
  ["All series", "全部作品"],
  ["Not available", "暂无"],
  ["Open this tab to load", "打开该标签后加载"],
  ["Failed to load analytics", "分析加载失败"],
  ["Adult content enabled", "已启用 18+ 内容"],
  ["Delete item", "删除项目"],
  ["Delete ranking", "删除榜单"],
  ["Delete series", "删除作品"],
  ["Back to series", "返回作品列表"],
  ["Save changes", "保存更改"],
  ["Uploading cover...", "封面上传中..."],
  ["Reply to ticket", "回复工单"],
  ["Sending...", "发送中..."],
  ["Episodes", "章节管理"],
  ["Per page", "每页"],
  ["Previous", "上一页"],
  ["Next", "下一页"],
  ["Bulk upload", "批量上传"],
  ["Add episode", "新增章节"],
  ["Bulk edit", "批量编辑"],
  ["Bulk update", "批量修改"],
  ["Auto-renumber", "自动重排章节号"],
  ["Episode number", "章节编号"],
  ["Adding...", "新增中..."],
  ["Updating...", "更新中..."],
  ["Apply updates", "应用更新"],
  ["Apply bulk update", "应用批量修改"],
  ["Delete episodes", "删除章节"],
  ["Success", "成功"],
  ["Failed", "失败"],
  ["Uploading...", "上传中..."],
  ["rating", "评分"],
  ["trending", "趋势热度"],
  ["ratingCount", "评分人数"],
  ["email", "邮件"],
  ["banner", "横幅"],
  ["discount", "折扣"],
  ["all", "全部"],
  ["vip", "VIP 用户"],
  ["at-risk", "流失风险"],
  ["home-free-start", "免费开篇位"],
  ["Storefront audit", "前台体检"],
  ["Home merchandising", "首页编排"],
  ["Delivery queue", "投递队列"],
  ["Loading the outbound job queue and recent email attempts.", "正在加载外发任务队列和最近的邮件尝试。"],
  ["Admin access is required before email operations can be reviewed.", "需要后台权限后才能查看邮件任务。"],
  ["Loading email jobs...", "正在加载邮件任务..."],
  ["Sign in as an admin to review delivery jobs.", "请先以管理员身份登录后再查看投递任务。"],
  ["Keep this queue readable: what was sent, where it went, and whether another delivery attempt is still needed.", "让队列保持清晰：发了什么、发给了谁、是否还需要再次投递。"],
  ["All jobs", "全部任务"],
  ["Failed only", "仅失败任务"],
  ["No failures in this view", "当前视图没有失败任务"],
  ["Only failed deliveries stay in view here so operators can retry cleanly.", "这里只保留失败投递，方便运营快速重试。"],
  ["All queued and completed delivery jobs stay visible in one calm table.", "所有排队中和已完成的投递任务都会在同一张安静的表格里展示。"],
  ["No email jobs match this view yet.", "当前视图下还没有匹配的邮件任务。"],
  ["The job was queued for another delivery attempt.", "任务已重新加入队列，等待下一次投递。"],
  ["The retry request failed.", "重试请求失败。"],
  ["Brand assets", "品牌素材"],
  ["Wait until admin access is confirmed before editing live brand assets.", "请先确认后台权限，再编辑线上品牌素材。"],
  ["Wait until the saved asset set is hydrated before editing the draft.", "请等已保存的素材配置加载完成后再编辑草稿。"],
  ["Loading branding settings...", "正在加载品牌配置..."],
  ["The saved brand configuration could not be loaded, so edits stay locked until the source is available again.", "已保存的品牌配置暂时无法加载，恢复前将保持只读。"],
  ["Branding settings could not be loaded.", "品牌配置加载失败。"],
  ["Assets configured", "已配置素材"],
  ["Upload limit", "上传限制"],
  ["Reader-facing surfaces", "读者可见位置"],
  ["Logo, favicon, and homepage banner stay in one shared brand set.", "Logo、favicon 和首页横幅共用同一套品牌素材。"],
  ["Large artwork is allowed, but the upload guard keeps files practical for review.", "允许较大的素材文件，但上传限制会保证处理流程仍然轻量。"],
  ["These assets shape the live storefront, so changes should stay editorial and restrained.", "这些素材会直接影响线上前台，调整时应保持克制。"],
  ["Ready for review", "可进入复核"],
  ["Needs asset coverage", "素材仍未补齐"],
  ["Save branding", "保存品牌配置"],
  ["Site logo", "站点 Logo"],
  ["Homepage banner", "首页横幅"],
  ["No site logo has been added yet.", "还没有上传站点 Logo。"],
  ["No favicon has been added yet.", "还没有上传站点图标。"],
  ["No homepage banner has been added yet.", "还没有上传首页横幅。"],
  ["Upload logo", "上传 Logo"],
  ["Upload favicon", "上传站点图标"],
  ["Upload banner", "上传横幅"],
  ["Use a transparent PNG or SVG so the mark stays clean in the header and footer.", "建议使用透明 PNG 或 SVG，保证头部和底部展示清晰。"],
  ["Keep this square and lightweight. A 32x32 or 64x64 file works well.", "建议保持正方形且体积轻量，32x32 或 64x64 就很合适。"],
  ["Use editorial artwork that still feels calm in the reader home hero.", "建议使用编辑感明确但不吵闹的首页头图素材。"],
  ["Branding settings saved.", "品牌配置已保存。"],
  ["Upload an image file.", "请上传图片文件。"],
  ["Images must stay under 10 MB.", "图片大小必须小于 10 MB。"],
  ["The upload failed.", "上传失败。"],
  ["Content Generator", "内容生成器"],
  ["Create demo catalog data for QA, layout checks, and backstage workflow reviews without turning the admin into a noisy tooling console.", "为 QA、版式检查和后台流程核验生成演示目录数据，但不要把后台变成吵闹的工具台。"],
  ["Estimated series", "预计作品数"],
  ["Episode range", "章节范围"],
  ["Access", "访问范围"],
  ["Admin-only", "仅后台使用"],
  ["Production use should stay gated behind ADMIN_CONTENT_GENERATOR_ENABLED.", "生产环境必须通过 ADMIN_CONTENT_GENERATOR_ENABLED 开关保护。"],
  ["Demo Content Generator", "演示内容生成器"],
  ["Generate controlled demo catalog data for QA and publishing checks. Keep the output intentional so the workspace stays useful instead of noisy.", "为 QA 和发布检查生成可控的演示目录数据，避免让后台充满无意义样板。"],
  ["Utility route", "工具路由"],
  ["Seed", "种子"],
  ["Optional. Use a repeatable seed when QA needs the same dataset again.", "可选。QA 需要复现同一批数据时可填写固定种子。"],
  ["Optional repeatable seed", "可选的可复现种子"],
  ["Series per type", "每种类型作品数"],
  ["Allowed range: 1 to 20.", "允许范围：1 到 20。"],
  ["Minimum episodes", "最少章节数"],
  ["Maximum episodes", "最多章节数"],
  ["Allowed range: 1 to 30.", "允许范围：1 到 30。"],
  ["Reset settings", "重置设置"],
  ["View series", "查看作品"],
  ["What this run will create", "本次将生成的内容"],
  ["This generator stays focused on usable demo inventory rather than fake dashboard theater.", "这个工具只生成可用的演示库存，不再配合后台演假数据。"],
  ["Metadata shaped for QA, layout review, and backstage workflow testing", "元数据面向 QA、版式检查和后台流程测试"],
  ["Series per type must be a whole number.", "每种类型作品数必须是整数。"],
  ["Series per type cannot be greater than 20.", "每种类型作品数不能大于 20。"],
  ["Minimum episodes must be a whole number.", "最少章节数必须是整数。"],
  ["Minimum episodes cannot be greater than 30.", "最少章节数不能大于 30。"],
  ["Maximum episodes must be a whole number.", "最多章节数必须是整数。"],
  ["Maximum episodes cannot be greater than 30.", "最多章节数不能大于 30。"],
  ["Maximum episodes must be greater than or equal to minimum episodes.", "最多章节数必须大于或等于最少章节数。"],
  ["Generation finished.", "生成完成。"],
  ["Country calling codes", "国家区号"],
  ["Add entry", "新增条目"],
  ["Country calling codes must be unique", "国家区号必须唯一"],
  ["No users match this view yet.", "当前视图下还没有匹配的用户。"],
  ["No support tickets yet.", "当前还没有客服工单。"],
  ["No tickets match the current filters.", "当前筛选条件下没有匹配的工单。"],
  ["No support tickets match this view yet.", "当前视图下还没有匹配的客服工单。"],
  ["No comments match this view yet.", "当前视图下还没有匹配的评论。"],
  ["No notifications match this view yet.", "当前视图下还没有匹配的通知。"],
  ["No promotions match this view yet.", "当前视图下还没有匹配的活动。"],
  ["No top-up packages match this view yet.", "当前视图下还没有匹配的充值套餐。"],
  ["No campaigns are available for this view.", "当前视图下还没有可用的活动。"],
  ["No recommendation slots exist yet.", "当前还没有推荐位。"],
  ["No audit logs were found for this view.", "当前视图下没有审计日志。"],
  ["No revenue data is available for this range.", "当前时间范围内还没有收入数据。"],
  ["No message was included.", "未附带消息内容。"],
  ["No message body", "暂无消息内容"],
  ["No detail payload", "暂无详情内容"],
  ["No email listed", "未填写邮箱"],
  ["Open user", "打开用户"],
  ["Delete selected", "删除已选项"],
  ["Delete users", "删除用户"],
  ["Delete tickets", "删除工单"],
  ["Delete orders", "删除订单"],
  ["Delete packages", "删除套餐"],
  ["Delete promotions", "删除活动"],
  ["Delete comments", "删除评论"],
  ["Delete notifications", "删除通知"],
  ["Retrying...", "重试中..."],
  ["No action needed", "无需处理"],
  ["Open tickets", "待处理工单"],
  ["Open (legacy)", "待处理（旧状态）"],
  ["Open", "待处理"],
  ["Search by account ID or email...", "搜索账号 ID 或邮箱..."],
  ["Search by ticket ID, user, subject, or message...", "搜索工单 ID、用户、主题或消息内容..."],
  ["Search by order ID or user ID...", "搜索订单 ID 或用户 ID..."],
  ["Search package ID, name, or label", "搜索套餐 ID、名称或标签"],
  ["Search promotion ID or title", "搜索活动 ID 或标题"],
  ["Search notification ID, title, or text", "搜索通知 ID、标题或正文"],
  ["Search comment ID, reader ID, email, or text", "搜索评论 ID、读者 ID、邮箱或正文"],
  ["Search ID, action, resource, target, or operator", "搜索日志 ID、动作、资源、目标或操作者"],
  ["Search by email or account ID, then handle status changes without turning the page into a noisy CRM.", "按邮箱或账号 ID 搜索，再处理状态变更，不把页面做成吵闹的 CRM。"],
  ["Search and sort against the current directory view.", "按当前目录视图搜索和排序。"],
  ["Status first", "先看状态"],
  ["No CRM sprawl", "不要做成 CRM"],
  ["Loading audit logs", "正在加载审计日志"],
  ["Loading region settings...", "正在加载地区设置..."],
  ["Save settings", "保存设置"],
  ["Save and send test", "保存并发送测试"],
  ["Loading email settings...", "正在加载邮件设置..."],
  ["No country calling codes have been added yet.", "当前还没有添加国家区号。"],
  ["Open asset", "打开素材"],
  ["Save after uploads so the storefront branding provider picks up the new asset set.", "上传后请记得保存，让前台品牌配置读取到最新素材。"],
]);

const PATTERNS = [
  [/^([0-9]+)\s+minutes ago$/i, (_, minutes) => `${minutes} 分钟前`],
  [/^([0-9]+)\s+hours ago$/i, (_, hours) => `${hours} 小时前`],
  [/^([0-9]+)\s+days ago$/i, (_, days) => `${days} 天前`],
  [/^Page\s+([0-9]+)\s+of\s+([0-9]+)\s+[·•-]\s+([0-9]+)\s+total episodes$/i, (_, page, totalPages, totalEpisodes) => `第 ${page} / ${totalPages} 页，共 ${totalEpisodes} 章`],
  [/^Page\s+([0-9]+)\s+of\s+([0-9]+)$/i, (_, page, totalPages) => `第 ${page} / ${totalPages} 页`],
  [/^Current results\s+([0-9]+)\s+items$/i, (_, total) => `当前结果 ${total} 条`],
  [/^Delete\s+([0-9]+)\s+selected\s+(.+?)\?\s+This action cannot be undone\.$/i, (_, total, target) => `确定删除 ${total} 个已选 ${target} 吗？此操作无法撤销。`],
  [/^Delete slot "(.+)"\?$/i, (_, name) => `确定删除推荐位“${name}”吗？`],
  [/^Delete ranking "(.+)"\?$/i, (_, name) => `确定删除榜单“${name}”吗？`],
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
