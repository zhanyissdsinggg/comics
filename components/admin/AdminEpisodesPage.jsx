"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AdminShell from "./AdminShell";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "../../lib/apiClient";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sortFilesByName(files) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "zh", { numeric: true, sensitivity: "base" })
  );
}

export default function AdminEpisodesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const seriesId = params.id;
  const key = searchParams.get("key") || "";
  const isAuthorized = key === ADMIN_KEY;
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrice, setBulkPrice] = useState(5);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [selectedMap, setSelectedMap] = useState({});
  const [applySelectedOnly, setApplySelectedOnly] = useState(true);
  const [bulkPricePts, setBulkPricePts] = useState("");
  const [bulkPreview, setBulkPreview] = useState("");
  const [bulkTtf, setBulkTtf] = useState("keep");
  const [ttfInterval, setTtfInterval] = useState(24);
  const [newEpisode, setNewEpisode] = useState({
    number: 1,
    title: "",
    pricePts: 5,
    ttfEligible: true,
    releasedAt: "",
    ttfReadyAt: "",
    previewFreePages: 3,
  });

  const comicUploadRef = useRef(null);
  const novelUploadRef = useRef(null);

  const loadEpisodes = useCallback(async () => {
    setLoading(true);
    const response = await apiGet(`/api/admin/series/${seriesId}/episodes?key=${key}`);
    if (response.ok) {
      setEpisodes(response.data?.episodes || []);
    }
    setLoading(false);
  }, [key, seriesId]);

  useEffect(() => {
    if (isAuthorized) {
      loadEpisodes();
    } else {
      setLoading(false);
    }
  }, [isAuthorized, loadEpisodes]);

  const selectedIds = useMemo(
    () => Object.keys(selectedMap).filter((id) => selectedMap[id]),
    [selectedMap]
  );

  const toggleSelectAll = (checked) => {
    const next = {};
    if (checked) {
      episodes.forEach((item) => {
        next[item.id] = true;
      });
    }
    setSelectedMap(next);
  };

  const handleBulk = async () => {
    const response = await apiPost(`/api/admin/series/${seriesId}/episodes`, {
      key,
      bulk: {
        count: parseNumber(bulkCount),
        pricePts: parseNumber(bulkPrice),
      },
    });
    if (response.ok) {
      setEpisodes(response.data?.episodes || []);
    }
  };

  const handleAdd = async () => {
    const response = await apiPost(`/api/admin/series/${seriesId}/episodes`, {
      key,
      episode: {
        ...newEpisode,
        number: parseNumber(newEpisode.number),
        pricePts: parseNumber(newEpisode.pricePts),
        previewFreePages: parseNumber(newEpisode.previewFreePages),
      },
    });
    if (response.ok) {
      loadEpisodes();
    }
  };

  const handleSave = async (episode) => {
    await apiPatch(`/api/admin/series/${seriesId}/episodes/${episode.id}`, {
      key,
      episode: {
        ...episode,
        number: parseNumber(episode.number),
        pricePts: parseNumber(episode.pricePts),
        previewFreePages: parseNumber(episode.previewFreePages),
      },
    });
    loadEpisodes();
  };

  const handleDelete = async (episodeId) => {
    await apiDelete(`/api/admin/series/${seriesId}/episodes/${episodeId}?key=${key}`);
    loadEpisodes();
  };

  const applyBulkUpdate = async (updates, options = {}) => {
    const ids = applySelectedOnly ? selectedIds : [];
    const response = await apiPost(`/api/admin/series/${seriesId}/episodes/bulk`, {
      key,
      ids,
      updates,
      intervalHours: options.intervalHours,
    });
    if (response.ok) {
      setSelectedMap({});
      loadEpisodes();
    }
  };

  const handleChapterUpload = async (type, files) => {
    if (!files || files.length === 0) {
      return;
    }
    const sorted = sortFilesByName(files).filter((file) => file.name.endsWith(".zip"));
    if (sorted.length === 0) {
      setUploadStatus({
        type,
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        current: "",
        errors: ["请上传 zip 文件"],
      });
      return;
    }
    setUploading(true);
    setUploadStatus({
      type,
      total: sorted.length,
      processed: 0,
      success: 0,
      failed: 0,
      current: "",
      errors: [],
    });

    let success = 0;
    let failed = 0;
    const errors = [];
    let currentNumber = parseNumber(startNumber || 1);

    for (const file of sorted) {
      const formData = new FormData();
      formData.append("key", key);
      formData.append("type", type);
      formData.append("startNumber", String(currentNumber));
      formData.append("files", file, file.name);

      setUploadStatus((prev) => ({
        ...prev,
        current: file.name,
      }));

      const response = await apiUpload(`/api/admin/series/${seriesId}/episodes/upload`, formData);
      if (response.ok) {
        success += 1;
      } else {
        failed += 1;
        errors.push(`${file.name}: ${response.error || response.status || "上传失败"}`);
      }
      currentNumber += 1;
      setUploadStatus((prev) => ({
        ...prev,
        processed: success + failed,
        success,
        failed,
        errors,
      }));
    }

    setUploading(false);
    loadEpisodes();
  };

  const dropZoneHandlers = (type) => ({
    onDragOver: (event) => {
      event.preventDefault();
      setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop: (event) => {
      event.preventDefault();
      setDragActive(false);
      const files = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
      handleChapterUpload(type, files);
    },
  });

  if (!isAuthorized) {
    return (
      <AdminShell title="403 Forbidden" subtitle="无效的管理员密钥">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">403 Forbidden</h2>
            <p className="mt-2 text-sm text-slate-500">Invalid admin key.</p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="章节管理" subtitle={seriesId}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">批量上传章节</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div
                {...dropZoneHandlers("comic")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm ${
                  dragActive ? "border-slate-900 bg-slate-50" : "border-slate-200"
                }`}
              >
                <p className="text-slate-600">拖拽 zip 到此处（漫画）</p>
                <button
                  type="button"
                  onClick={() => comicUploadRef.current?.click()}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                >
                  选择漫画 zip
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">起始章节号</label>
              <input
                type="number"
                value={startNumber}
                onChange={(event) => setStartNumber(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => novelUploadRef.current?.click()}
                className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs text-slate-600"
              >
                选择小说 zip
              </button>
            </div>
          </div>

          <div
            {...dropZoneHandlers("novel")}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-sm ${
              dragActive ? "border-slate-900 bg-slate-50" : "border-slate-200"
            }`}
          >
            <p className="text-slate-600">拖拽 zip 到此处（小说）</p>
            <button
              type="button"
              onClick={() => novelUploadRef.current?.click()}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              选择小说 zip
            </button>
          </div>

          <input
            ref={comicUploadRef}
            type="file"
            accept=".zip"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              handleChapterUpload("comic", files);
              event.target.value = "";
            }}
          />
          <input
            ref={novelUploadRef}
            type="file"
            accept=".zip"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              handleChapterUpload("novel", files);
              event.target.value = "";
            }}
          />

          {uploadStatus ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>
                  批量上传({uploadStatus.type === "novel" ? "小说" : "漫画"})：
                  {uploadStatus.processed || 0}/{uploadStatus.total} 章
                </span>
                <span>
                  成功 {uploadStatus.success} · 失败 {uploadStatus.failed}
                </span>
              </div>
              {uploadStatus.current ? (
                <div className="mt-2 text-slate-500">当前：{uploadStatus.current}</div>
              ) : null}
              {uploadStatus.errors?.length ? (
                <div className="mt-2 space-y-1 text-red-600">
                  {uploadStatus.errors.slice(0, 8).map((err) => (
                    <div key={err}>{err}</div>
                  ))}
                </div>
              ) : null}
              {uploading ? <div className="mt-2 text-slate-500">上传中...</div> : null}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">批量设置</h3>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={applySelectedOnly}
                onChange={(event) => setApplySelectedOnly(event.target.checked)}
              />
              仅对选中章节生效
            </label>
            <span>已选 {selectedIds.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={bulkPricePts}
              onChange={(event) => setBulkPricePts(event.target.value)}
              placeholder="批量价格"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={bulkPreview}
              onChange={(event) => setBulkPreview(event.target.value)}
              placeholder="批量试看页数"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <select
              value={bulkTtf}
              onChange={(event) => setBulkTtf(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="keep">TTF 不变</option>
              <option value="enable">启用 TTF</option>
              <option value="disable">关闭 TTF</option>
            </select>
            <input
              value={ttfInterval}
              onChange={(event) => setTtfInterval(event.target.value)}
              placeholder="TTF 间隔小时"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                applyBulkUpdate({
                  pricePts: bulkPricePts !== "" ? parseNumber(bulkPricePts) : undefined,
                  previewFreePages: bulkPreview !== "" ? parseNumber(bulkPreview) : undefined,
                  ttfEligible:
                    bulkTtf === "enable" ? true : bulkTtf === "disable" ? false : undefined,
                })
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              应用批量设置
            </button>
            <button
              type="button"
              onClick={() =>
                applyBulkUpdate({ generateTtfReadyAt: true }, { intervalHours: parseNumber(ttfInterval) })
              }
              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
            >
              生成 TTF 时间
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">批量生成</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="number"
              value={bulkCount}
              onChange={(event) => setBulkCount(event.target.value)}
              placeholder="生成数量"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={bulkPrice}
              onChange={(event) => setBulkPrice(event.target.value)}
              placeholder="单章价格"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleBulk}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              生成
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-semibold">新增章节</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="number"
              value={newEpisode.number}
              onChange={(event) =>
                setNewEpisode((prev) => ({ ...prev, number: event.target.value }))
              }
              placeholder="章节序号"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={newEpisode.title}
              onChange={(event) =>
                setNewEpisode((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="章节标题"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={newEpisode.pricePts}
              onChange={(event) =>
                setNewEpisode((prev) => ({ ...prev, pricePts: event.target.value }))
              }
              placeholder="单章价格"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={newEpisode.releasedAt}
              onChange={(event) =>
                setNewEpisode((prev) => ({ ...prev, releasedAt: event.target.value }))
              }
              placeholder="上线时间 (ISO)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              value={newEpisode.ttfReadyAt}
              onChange={(event) =>
                setNewEpisode((prev) => ({ ...prev, ttfReadyAt: event.target.value }))
              }
              placeholder="TTF 可领取时间 (ISO)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={newEpisode.previewFreePages}
              onChange={(event) =>
                setNewEpisode((prev) => ({
                  ...prev,
                  previewFreePages: event.target.value,
                }))
              }
              placeholder="试看页数"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={newEpisode.ttfEligible}
                onChange={(event) =>
                  setNewEpisode((prev) => ({
                    ...prev,
                    ttfEligible: event.target.checked,
                  }))
                }
              />
              支持 TTF
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            新增
          </button>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">章节列表</h3>
            {loading ? <span className="text-xs text-slate-400">加载中...</span> : null}
          </div>
          <div className="space-y-3">
            {episodes.map((episode) => (
              <div
                key={episode.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedMap[episode.id])}
                      onChange={(event) =>
                        setSelectedMap((prev) => ({
                          ...prev,
                          [episode.id]: event.target.checked,
                        }))
                      }
                    />
                    选择
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    type="number"
                    value={episode.number}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, number: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={episode.title}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, title: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={episode.pricePts}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, pricePts: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={episode.releasedAt}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, releasedAt: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={episode.ttfReadyAt || ""}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, ttfReadyAt: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={episode.previewFreePages}
                    onChange={(event) =>
                      setEpisodes((prev) =>
                        prev.map((item) =>
                          item.id === episode.id
                            ? { ...item, previewFreePages: event.target.value }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={episode.ttfEligible}
                      onChange={(event) =>
                        setEpisodes((prev) =>
                          prev.map((item) =>
                            item.id === episode.id
                              ? { ...item, ttfEligible: event.target.checked }
                              : item
                          )
                        )
                      }
                    />
                    支持 TTF
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSave(episode)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(episode.id)}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={episodes.length > 0 && episodes.every((item) => selectedMap[item.id])}
                onChange={(event) => toggleSelectAll(event.target.checked)}
              />
              全选
            </label>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
