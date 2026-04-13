import Link from "next/link";
import { ShieldCheck, SlidersHorizontal } from "lucide-react";
import { AdminLayout } from "../../../components/admin/AdminLayout";

const linkButtonClassName =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--gush-border)] bg-white px-3.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[color:var(--gush-ink)] transition-[background-color,border-color,color] duration-200 hover:border-[color:var(--gush-border-strong)] hover:bg-[color:var(--gush-page-bg-muted)] hover:text-[color:var(--gush-ink-strong)]";

const linkGhostButtonClassName =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-transparent px-3.5 text-[0.82rem] font-semibold tracking-[-0.02em] text-[color:var(--gush-ink-soft)] transition-[background-color,color] duration-200 hover:bg-[rgba(29,29,31,0.03)] hover:text-[color:var(--gush-ink-strong)]";

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
          <Link href="/admin/members" className={linkButtonClassName}>
            <ShieldCheck className="size-4" />
            打开后台成员
          </Link>
        )}
      >
        <p>后台会话现在优先使用安全 Cookie，避免再把 token 散落在 URL 或本地存储里。</p>
        <p className="mt-2">
          正常登录已经切到
          <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">后台邮箱 + 密码</code>
          ，成员身份、角色、状态和两步验证都从数据库里的后台成员目录读取。
        </p>
      </SettingsCard>

      <SettingsCard eyebrow="身份治理" title="后台成员体系">
        <p>
          去后台成员页维护真实的管理员档案：姓名、邮箱、角色、状态、密钥槽位和二次验证密钥。这样做的目的很直接，就是别再让后台长期只靠环境变量硬撑身份治理。
        </p>
        <ul className="mt-4 space-y-2">
          <li>超级管理员：拥有全部工作区和成员管理能力</li>
          <li>内容运营：作品、章节、创作者、评论治理和前台编排</li>
          <li>客服支持：用户、工单、通知和评论处理</li>
          <li>财务管理：订单、营收、计费与套餐</li>
          <li>营销运营：活动、营销、推荐位和前台陈列</li>
          <li>系统运维：品牌、邮件、地区、日志和系统设置</li>
        </ul>
      </SettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard eyebrow="环境变量" title="现在环境里还保留什么？">
          <p>
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_PASSWORD_AUTH_ENABLED</code>
            需要保持开启，后台成员的邮箱密码登录才能正常工作。
          </p>
          <p className="mt-2">
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_KEYS</code>
            和
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_ROLE_ASSIGNMENTS</code>
            现在只建议当作应急引导或兼容配置，不该再作为日常后台登录入口。
          </p>
          <div className="mt-4 rounded-[18px] border border-[color:var(--gush-border)] bg-[color:var(--gush-page-bg-muted)] p-4 font-mono text-xs leading-6 text-slate-700">
            ADMIN_PASSWORD_AUTH_ENABLED=true
            <br />
            ADMIN_KEYS=bootstrap-key-a,bootstrap-key-b
            <br />
            ADMIN_ROLE_ASSIGNMENTS=1:super_admin,2:content_admin
          </div>
        </SettingsCard>

        <SettingsCard
          eyebrow="运行边界"
          title="这套后台现在依赖什么？"
          action={(
            <Link href="/admin/members" className={linkGhostButtonClassName}>
              <SlidersHorizontal className="size-4" />
              去整理成员与槽位
            </Link>
          )}
        >
          <ul className="space-y-2">
            <li>作品、章节、创作者、推荐位、活动、订单、通知已经能支撑日常运营</li>
            <li>后台成员页负责把管理员身份、邮箱密码、角色和两步验证收到一套真实可维护的目录里</li>
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
