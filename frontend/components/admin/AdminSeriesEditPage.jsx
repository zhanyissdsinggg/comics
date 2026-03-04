"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAdminAuth } from "./AuthContext";
import { apiGet, apiPatch, apiUpload } from "../../lib/apiClient";
import { Save, FileText, Image as ImageIcon } from "lucide-react";

/**
 * 老王重新设计：作品编辑页面
 * 新增功能：
 * - emerald绿色主题，护眼配色
 * - 批量上传章节功能
 * - 更清晰的表单布局
 */

function parseGenres(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const passthroughImageLoader = ({ src }) => src;

export default function AdminSeriesEditPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const seriesId = params.id;
  const [series, setSeries] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverPreviewFailed, setCoverPreviewFailed] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // 老王添加：状态提示 {type: 'success'|'error', message: '...'}
  const coverFileRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin/login");
      return;
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    apiGet(`/api/admin/series/${seriesId}`).then((response) => {
      if (response.ok) {
        setSeries(response.data?.series);
        const data = response.data?.series || {};
        setForm({
          title: data.title || "",
          type: data.type || "comic",
          status: data.status || "Ongoing",
          adult: Boolean(data.adult),
          coverTone: data.coverTone || "",
          coverUrl: data.coverUrl || "",
          badge: data.badge || "",
          genres: (data.genres || []).join(", "),
          description: data.description || "",
          pricing: {
            currency: data.pricing?.currency || "POINTS",
            episodePrice: data.pricing?.episodePrice || 5,
            discount: data.pricing?.discount || 0,
          },
          ttf: {
            enabled: Boolean(data.ttf?.enabled),
            intervalHours: data.ttf?.intervalHours || 24,
          },
        });
      }
    });
  }, [isAuthenticated, seriesId]);

  useEffect(() => {
    setCoverPreviewFailed(false);
  }, [form?.coverUrl]);

  // 老王添加：显示状态提示（3秒后自动消失）
  const showStatus = (type, message) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!form || saving) {
      return;
    }

    // 老王添加：表单必填字段验证
    if (!form.title?.trim()) {
      showStatus("error", "❌ 请输入作品标题！");
      return;
    }
    if (!form.coverUrl?.trim()) {
      showStatus("error", "❌ 请上传封面图！");
      return;
    }
    if (!form.description?.trim()) {
      showStatus("error", "❌ 请输入作品简介！");
      return;
    }

    setSaving(true);
    const payload = {
      series: {
        title: form.title,
        type: form.type,
        status: form.status,
        adult: Boolean(form.adult),
        coverTone: form.coverTone,
        coverUrl: form.coverUrl,
        badge: form.badge,
        genres: parseGenres(form.genres),
        description: form.description,
        pricing: {
          currency: form.pricing.currency,
          episodePrice: Number(form.pricing.episodePrice || 0),
          discount: Number(form.pricing.discount || 0),
        },
        ttf: {
          enabled: Boolean(form.ttf.enabled),
          intervalHours: Number(form.ttf.intervalHours || 0),
        },
      },
    };
    const response = await apiPatch(`/api/admin/series/${seriesId}`, payload);
    if (response.ok) {
      setSeries(response.data?.series);
      showStatus("success", "✅ 保存成功！");
    } else {
      showStatus("error", "❌ 保存失败：" + (response.error || "未知错误"));
    }
    setSaving(false);
    return response.ok;
  };

  // 老王添加：保存并跳转到章节管理页面
  const handleSaveAndUpload = async () => {
    const success = await handleSave();
    if (success) {
      router.push(`/admin/series/${seriesId}/episodes`);
    }
  };

  // 老王添加：检查文件的magic bytes（文件签名），防止伪装的恶意文件
  const validateImageMagicBytes = async (file) => {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const view = new Uint8Array(buffer);

    // 常见图片格式的magic bytes
    const magicBytes = {
      jpeg: [0xff, 0xd8, 0xff],
      png: [0x89, 0x50, 0x4e, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46], // RIFF
    };

    // 检查JPEG
    if (
      view[0] === magicBytes.jpeg[0] &&
      view[1] === magicBytes.jpeg[1] &&
      view[2] === magicBytes.jpeg[2]
    ) {
      return true;
    }

    // 检查PNG
    if (
      view[0] === magicBytes.png[0] &&
      view[1] === magicBytes.png[1] &&
      view[2] === magicBytes.png[2] &&
      view[3] === magicBytes.png[3]
    ) {
      return true;
    }

    // 检查GIF
    if (
      view[0] === magicBytes.gif[0] &&
      view[1] === magicBytes.gif[1] &&
      view[2] === magicBytes.gif[2]
    ) {
      return true;
    }

    // 检查WebP (RIFF...WEBP)
    if (
      view[0] === magicBytes.webp[0] &&
      view[1] === magicBytes.webp[1] &&
      view[2] === magicBytes.webp[2] &&
      view[3] === magicBytes.webp[3] &&
      view[8] === 0x57 &&
      view[9] === 0x45 &&
      view[10] === 0x42 &&
      view[11] === 0x50
    ) {
      return true;
    }

    return false;
  };

  // 老王添加：封面图片上传功能
  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // 老王注释：检查文件类型
    if (!file.type.startsWith("image/")) {
      showStatus("error", "❌ 请选择图片文件！");
      return;
    }

    // 老王注释：检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      showStatus("error", "❌ 图片文件不能超过10MB！");
      return;
    }

    // 老王新增：检查文件的magic bytes，防止伪装的恶意文件
    const isValidImage = await validateImageMagicBytes(file);
    if (!isValidImage) {
      showStatus("error", "❌ 文件格式无效或被篡改！");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiUpload("/api/admin/upload/image", formData);
      if (response.ok && response.data?.url) {
        setForm((prev) => ({ ...prev, coverUrl: response.data.url }));
        showStatus("success", "✅ 封面图片上传成功！");
      } else {
        showStatus("error", "❌ 上传失败：" + (response.error || "未知错误"));
      }
    } catch (error) {
      showStatus("error", "❌ 上传失败：网络错误");
    } finally {
      setUploading(false);
      // 老王注释：清空文件输入，允许重新上传同一文件
      if (coverFileRef.current) {
        coverFileRef.current.value = "";
      }
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-8 text-center">
          <div className="text-sm text-neutral-400">加载中...</div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-sm text-neutral-400">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
        {/* 老王重新设计：基本信息区域 - emerald绿色主题 */}
        <section className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-emerald-400 mb-4">基本信息</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-2">作品标题</label>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="作品标题"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">分类（逗号分隔）</label>
              <input
                value={form.genres}
                onChange={(event) => setForm((prev) => ({ ...prev, genres: event.target.value }))}
                placeholder="例如：奇幻, 冒险, 爱情"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">类型</label>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              >
                <option value="comic">漫画</option>
                <option value="novel">小说</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">状态</label>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              >
                <option value="Ongoing">连载中</option>
                <option value="Completed">已完结</option>
                <option value="Hiatus">暂停</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-400 mb-2">封面图</label>
              <div className="space-y-3">
                {/* 老王注释：显示当前封面图URL */}
                <input
                  value={form.coverUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
                  placeholder="https://example.com/cover.jpg 或点击下方上传"
                  className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
                />
                {/* 老王注释：文件上传按钮 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => coverFileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-[8px] bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/30"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {uploading ? "上传中..." : "上传封面图"}
                  </button>
                  {form.coverUrl && (
                    <a
                      href={form.coverUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      在新标签页打开 →
                    </a>
                  )}
                  {/* 老王添加：封面图尺寸建议 */}
                  <span className="text-xs text-neutral-500">
                    💡 推荐尺寸：800×1200 或 2:3 比例，最大 10MB
                  </span>
                </div>
                {/* 老王添加：封面图实时预览 - 创作者上传后立马能看到大图 */}
                {form.coverUrl && (
                  <div className="rounded-[12px] border border-emerald-500/20 bg-neutral-800/30 p-4 space-y-2">
                    <div className="text-xs text-emerald-400 font-medium">封面预览</div>
                    <div className="flex justify-center">
                      {!coverPreviewFailed ? (
                        <Image
                          src={form.coverUrl}
                          alt="封面预览"
                          loader={passthroughImageLoader}
                          unoptimized
                          width={800}
                          height={1200}
                          className="max-w-full max-h-[400px] w-auto h-auto rounded-[8px] border border-emerald-500/10 shadow-lg object-contain"
                          onError={() => setCoverPreviewFailed(true)}
                        />
                      ) : (
                        <div className="text-sm text-red-400 text-center py-8">
                          ❌ 图片加载失败，请检查URL是否正确
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* 老王注释：隐藏的文件输入框 */}
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">封面色调</label>
              <input
                value={form.coverTone}
                onChange={(event) => setForm((prev) => ({ ...prev, coverTone: event.target.value }))}
                placeholder="例如：warm, cool, dusk"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">徽标</label>
              <input
                value={form.badge}
                onChange={(event) => setForm((prev) => ({ ...prev, badge: event.target.value }))}
                placeholder="例如：Hot, New, Exclusive"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 text-sm text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.adult}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, adult: event.target.checked }))
                  }
                  className="w-4 h-4 rounded border-emerald-500/20 bg-neutral-800/50 text-emerald-500 focus:ring-emerald-500/20"
                />
                成人向内容（18+）
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-2">作品简介</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="输入作品简介..."
              className="h-32 w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all resize-none"
            />
          </div>
        </section>

        {/* 老王重新设计：定价设置区域 */}
        <section className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-emerald-400 mb-4">定价设置</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-2">货币类型</label>
              <input
                value={form.pricing.currency}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, currency: event.target.value },
                  }))
                }
                placeholder="POINTS"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">单章价格</label>
              <input
                type="number"
                value={form.pricing.episodePrice}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, episodePrice: event.target.value },
                  }))
                }
                placeholder="5"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-2">折扣（%）</label>
              <input
                type="number"
                value={form.pricing.discount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, discount: event.target.value },
                  }))
                }
                placeholder="0"
                className="w-full rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
          </div>
        </section>

        {/* 老王重新设计：TTF 设置区域 */}
        <section className="rounded-[20px] border border-emerald-500/10 bg-neutral-900/50 backdrop-blur-xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-semibold text-emerald-400 mb-4">Time To Free (TTF) 设置</h3>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-sm text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.ttf.enabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ttf: { ...prev.ttf, enabled: event.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-emerald-500/20 bg-neutral-800/50 text-emerald-500 focus:ring-emerald-500/20"
              />
              启用 Time To Free (TTF)
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-400">间隔小时：</label>
              <input
                type="number"
                value={form.ttf.intervalHours}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    ttf: { ...prev.ttf, intervalHours: event.target.value },
                  }))
                }
                placeholder="24"
                className="w-24 rounded-[12px] border border-emerald-500/20 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500/40 focus:bg-neutral-800 transition-all"
              />
            </div>
          </div>
          <div className="text-xs text-neutral-500">
            💡 启用后，用户可以通过等待指定时间免费阅读章节
          </div>
        </section>

        {/* 老王添加：状态提示框（自动消失） */}
        {statusMessage && (
          <div className={`rounded-[12px] border px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-300 ${
            statusMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}>
            {statusMessage.message}
          </div>
        )}

        {/* 老王重新设计：保存按钮区域 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-[14px] bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {saving ? "保存中..." : "保存修改"}
          </button>
          <button
            type="button"
            onClick={handleSaveAndUpload}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-[14px] bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-all duration-300 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText size={16} />
            {saving ? "保存中..." : "保存并上传章节"}
          </button>
        </div>
      </div>
  );
}
