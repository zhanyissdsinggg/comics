import { AdminLayout } from '../../../components/admin/AdminLayout';

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">后台访问</h2>
        <p className="mt-2 text-sm text-slate-600">
          后台认证可通过查询参数、请求头或 Bearer Token 提供。
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">环境说明</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">后端 API</p>
            <p className="mt-2">读取 `API_BASE_URL` 或 `NEXT_PUBLIC_API_BASE_URL`。</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Swagger 文档</p>
            <p className="mt-2">访问路径为 `/api/docs`。</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">指标规则</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>浏览量：当章节内容被请求时计数。</li>
          <li>注册量：当新账号成功创建时计数。</li>
          <li>DAU：当日产生行为的唯一登录用户数。</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="系统设置"
      subtitle="后台访问、环境变量与统计指标定义说明。"
    >
      <SettingsContent />
    </AdminLayout>
  );
}
