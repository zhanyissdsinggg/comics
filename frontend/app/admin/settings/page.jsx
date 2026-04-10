import Link from "next/link";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AdminLayout } from "../../../components/admin/AdminLayout";

const inlineButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--gush-border)] bg-white px-3.5 text-[0.82rem] font-semibold text-slate-700 transition hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-slate-950";

const inlineGhostButtonClassName =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[0.82rem] font-semibold text-slate-600 transition hover:bg-[rgba(23,20,18,0.045)] hover:text-slate-950";

function SettingsCard({ eyebrow, title, children, action = null }) {
  return (
    <section className="rounded-[24px] border border-[color:var(--gush-border)] bg-white p-6 shadow-[var(--gush-shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-3 text-lg font-semibold text-slate-950">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <SettingsCard
        eyebrow="后台访问"
        title="成员会话与登录凭证"
        action={(
          <Link href="/admin/members" className={inlineButtonClassName}>
            <ShieldCheck className="size-4" />
            打开后台成员
          </Link>
        )}
      >
        <p>后台会话现在优先使用安全 Cookie，避免再把 token 散落在 URL 或本地存储里。</p>
        <p className="mt-2">
          当前登录仍以环境里的
          <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_KEYS</code>
          作为入口，但成员身份、角色、状态和 2FA 已经落到数据库里的后台成员目录中。
        </p>
      </SettingsCard>

      <SettingsCard eyebrow="身份治理" title="后台成员体系">
        <p>
          去后台成员页维护真实的管理员档案：姓名、邮箱、角色、状态、密钥槽位和二次验证密钥。
          这样做的目的很直接，就是别再让后台长期只靠环境变量硬扛身份管理。
        </p>
        <ul className="mt-4 space-y-2">
          <li>超级管理员：拥有全部工作区和成员管理能力</li>
          <li>内容运营：作品、章节、创作者、评论治理和前台编排</li>
          <li>客服支持：用户、工单、通知和评论处理</li>
          <li>财务管理：订单、收入、计费与套餐</li>
          <li>营销运营：活动、营销、推荐位和前台陈列</li>
          <li>系统运维：品牌、邮件、地区、日志和系统设置</li>
        </ul>
      </SettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard eyebrow="环境变量" title="还需要保留什么">
          <p>
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_KEYS</code>
            仍然是当前的登录凭证来源，建议至少预留 2 到 3 个槽位，方便轮换。
          </p>
          <p className="mt-2">
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_ROLE_ASSIGNMENTS</code>
            现在只负责给新同步出来的槽位一个初始角色，后续以后台成员页里的数据库配置为准。
          </p>
          <div className="mt-4 rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 font-mono text-xs leading-6 text-slate-700">
            ADMIN_KEYS=keyA,keyB,keyC
            <br />
            ADMIN_ROLE_ASSIGNMENTS=1:super_admin,2:content_admin,3:support_admin
          </div>
        </SettingsCard>

        <SettingsCard
          eyebrow="运行边界"
          title="这套后台现在依赖什么"
          action={(
            <Link href="/admin/members" className={inlineGhostButtonClassName}>
              <SlidersHorizontal className="size-4" />
              去整理成员与槽位
            </Link>
          )}
        >
          <ul className="space-y-2">
            <li>作品、章节、创作者、推荐位、活动、订单、通知已经能支撑日常运营</li>
            <li>后台成员页负责把管理员身份、角色和 2FA 收到一套真实可维护的目录里</li>
            <li>停用成员后，会在下一次验权或刷新会话时失去后台访问能力</li>
            <li>如果还要继续提高可运维性，下一步就是补更完整的创作者资料 CRUD 和专题集合编排</li>
          </ul>
        </SettingsCard>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="系统设置"
      subtitle="把后台访问方式、成员治理和当前运行边界讲清楚，方便你正式接手运营。"
    >
      <SettingsContent />
    </AdminLayout>
  );
}
