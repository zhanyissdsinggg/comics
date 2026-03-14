import { AdminLayout } from "../../../components/admin/AdminLayout";

function SettingsContent() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">后台访问</h2>
        <p className="mt-2 text-sm text-slate-600">
          后台认证现在统一走共享的 HttpOnly Cookie 会话。不要再通过 URL 参数、前端本地存储或手动拼接 Bearer Token 传递后台凭据。
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">环境说明</h2>
        <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">后端 API</p>
            <p className="mt-2">优先读取 `API_BASE_URL`，也兼容 `NEXT_PUBLIC_API_BASE_URL`。</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Swagger 文档</p>
            <p className="mt-2">当后端部署暴露文档时，可通过 `/api/docs` 访问。</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">指标口径</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>浏览量：章节内容请求成功返回后计一次。</li>
          <li>注册数：新账号完成创建后计一次。</li>
          <li>DAU：按当日触发过行为的去重登录用户统计。</li>
        </ul>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <AdminLayout
      title="系统设置"
      subtitle="查看后台访问、环境变量和数据指标定义的参考说明。"
    >
      <SettingsContent />
    </AdminLayout>
  );
}
