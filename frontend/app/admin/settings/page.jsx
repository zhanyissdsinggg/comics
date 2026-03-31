import { AdminLayout } from "../../../components/admin/AdminLayout";

function SettingsCard({ eyebrow, title, children }) {
  return (
    <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-3 text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <SettingsCard eyebrow="后台访问" title="会话与登录">
        <p>后台登录现在优先使用安全 Cookie 会话，不再依赖把 token 到处塞进 URL 或本地存储。</p>
        <p className="mt-2">如果启用了动态验证码，运营登录时需要同时填写后台密钥和 6 位动态码。</p>
      </SettingsCard>

      <SettingsCard eyebrow="角色权限" title="管理员角色分配">
        <p>
          现在支持按管理员密钥顺序分配角色。后端环境里可以通过
          <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">ADMIN_ROLE_ASSIGNMENTS</code>
          控制不同后台入口的访问范围。
        </p>
        <div className="mt-4 rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4 font-mono text-xs leading-6 text-slate-700">
          ADMIN_KEYS=keyA,keyB,keyC
          <br />
          ADMIN_ROLE_ASSIGNMENTS=1:super_admin,2:content_admin,3:support_admin
        </div>
        <ul className="mt-4 space-y-2">
          <li>super_admin：全部工作区</li>
          <li>content_admin：作品、章节、创作者、编排</li>
          <li>support_admin：用户、客服、通知、评论</li>
          <li>finance_admin：订单、收入、计费</li>
          <li>marketing_admin：营销、活动、推荐位</li>
          <li>ops_admin：品牌、邮件、地区、日志、系统设置</li>
        </ul>
      </SettingsCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard eyebrow="环境接线" title="接口与文档">
          <p>
            前端优先读取
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">API_BASE_URL</code>
            ，同时兼容
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">NEXT_PUBLIC_API_BASE_URL</code>
            。
          </p>
          <p className="mt-2">
            如果后端开放了文档入口，可以访问
            <code className="mx-1 rounded bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5">/api/docs</code>
            查看在线 Swagger。
          </p>
        </SettingsCard>

        <SettingsCard eyebrow="运营口径" title="你现在可以依赖什么">
          <ul className="space-y-2">
            <li>作品、章节、署名、推荐位、活动、订单、通知已经能支撑日常运营。</li>
            <li>角色权限已经开始生效，长尾页面和菜单会按访问范围收口。</li>
            <li>还没走管理员账号体系前，管理员身份仍然由后台密钥和环境配置驱动。</li>
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
      subtitle="把后台访问方式、角色权限和当前这套系统的运行边界讲清楚，方便你正式接手运营。"
    >
      <SettingsContent />
    </AdminLayout>
  );
}
