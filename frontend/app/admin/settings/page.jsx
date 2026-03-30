import { AdminLayout } from "../../../components/admin/AdminLayout";

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">后台访问</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          后台认证走共享的 HttpOnly Cookie 会话。这个工作区不要再通过 URL 参数、本地存储或手写 Bearer 流转 token。
        </p>
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">环境说明</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              后端 API
            </p>
            <p className="mt-2">
              优先读取 <code>API_BASE_URL</code>，同时继续兼容 <code>NEXT_PUBLIC_API_BASE_URL</code>。
            </p>
          </div>
          <div className="rounded-[18px] border border-black/8 bg-[rgba(250,247,241,0.82)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              API 文档
            </p>
            <p className="mt-2">
              如果后端开放了文档入口，可以访问 <code>/api/docs</code> 查看线上 Swagger。
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-black/8 bg-white p-6 shadow-[var(--gush-shadow-soft)]">
        <h2 className="text-lg font-semibold">指标说明</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>浏览量会在章节请求成功返回后记一次。</li>
          <li>注册量会在新账号创建成功后增加。</li>
          <li>DAU 统计的是在选定日期内产生过行为的唯一登录用户。</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="系统设置"
      subtitle="集中查看后台访问方式、环境接线，以及这个工作区里常用指标的定义。"
    >
      <SettingsContent />
    </AdminLayout>
  );
}
