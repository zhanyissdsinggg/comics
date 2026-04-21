"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Save, ShieldCheck, Trash2, Upload } from "lucide-react";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";
import { adminDelete, adminGet, adminPatch, adminPost } from "../../lib/adminApiClient";

const emptyStory = () => ({
  slug: "",
  title: "",
  seriesId: "",
  description: "",
  baseContext: "",
  isPublished: false,
  aiEnabled: true,
});

const emptyNode = () => ({
  nodeKey: "",
  title: "",
  sortOrder: 0,
  baseContext: "",
  basePrompt: "",
  isEnding: false,
  aiEnabled: true,
});

const emptyChoice = () => ({
  choiceKey: "",
  label: "",
  targetNodeId: "",
  sortOrder: 0,
});

function messageOf(resp, fallback) {
  return String(resp?.error || resp?.message || resp?.data?.message || fallback || "").trim();
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminInteractiveStoriesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAdminAuth();

  const [stories, setStories] = useState([]);
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [story, setStory] = useState(emptyStory);
  const [detail, setDetail] = useState(null);

  const [nodeDraft, setNodeDraft] = useState(emptyNode);
  const [choiceDraftByNode, setChoiceDraftByNode] = useState({});
  const [nodeForms, setNodeForms] = useState({});
  const [choiceForms, setChoiceForms] = useState({});

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [validation, setValidation] = useState(null);

  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState("create");

  const nodes = useMemo(
    () => (Array.isArray(detail?.nodes) ? detail.nodes : []),
    [detail],
  );

  const loadStories = useCallback(async () => {
    setLoading(true);
    const resp = await adminGet("/api/admin/interactive-stories?page=1&pageSize=100");
    if (!resp.ok) {
      setStories([]);
      setFeedback({ type: "error", message: messageOf(resp, "加载互动故事失败") });
      setLoading(false);
      return;
    }

    const list = Array.isArray(resp.data?.stories) ? resp.data.stories : [];
    setStories(list);
    setSelectedStoryId((current) => (
      list.some((item) => item.id === current) ? current : (list[0]?.id || "")
    ));
    setLoading(false);
  }, []);

  const loadValidation = useCallback(async (storyId) => {
    const id = String(storyId || "").trim();
    if (!id) {
      setValidation(null);
      return;
    }
    const resp = await adminGet(`/api/admin/interactive-stories/${id}/validation`);
    if (!resp.ok) {
      setValidation(null);
      return;
    }
    setValidation(resp.data?.validation || null);
  }, []);

  const loadDetail = useCallback(async (storyId) => {
    const id = String(storyId || "").trim();
    if (!id) {
      setDetail(null);
      setStory(emptyStory());
      setValidation(null);
      return;
    }

    const resp = await adminGet(`/api/admin/interactive-stories/${id}`);
    if (!resp.ok) {
      setDetail(null);
      setFeedback({ type: "error", message: messageOf(resp, "加载故事详情失败") });
      setValidation(null);
      return;
    }

    const nextDetail = resp.data?.story || null;
    setDetail(nextDetail);
    setStory({
      slug: nextDetail?.slug || "",
      title: nextDetail?.title || "",
      seriesId: nextDetail?.seriesId || "",
      description: nextDetail?.description || "",
      baseContext: nextDetail?.baseContext || "",
      isPublished: Boolean(nextDetail?.isPublished),
      aiEnabled: Boolean(nextDetail?.aiEnabled),
    });

    const nextNodeForms = {};
    const nextChoiceForms = {};
    const nextChoiceDrafts = {};
    for (const node of nextDetail?.nodes || []) {
      nextNodeForms[node.id] = {
        nodeKey: node.nodeKey || "",
        title: node.title || "",
        sortOrder: Number(node.sortOrder || 0),
        baseContext: node.baseContext || "",
        basePrompt: node.basePrompt || "",
        isEnding: Boolean(node.isEnding),
        aiEnabled: Boolean(node.aiEnabled),
      };
      nextChoiceDrafts[node.id] = emptyChoice();
      for (const choice of node.choices || []) {
        nextChoiceForms[choice.id] = {
          choiceKey: choice.choiceKey || "",
          label: choice.label || "",
          targetNodeId: choice.targetNodeId || "",
          sortOrder: Number(choice.sortOrder || 0),
        };
      }
    }
    setNodeForms(nextNodeForms);
    setChoiceForms(nextChoiceForms);
    setChoiceDraftByNode(nextChoiceDrafts);
    await loadValidation(id);
  }, [loadValidation]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/admin/login");
      return;
    }
    if (isAuthenticated) {
      void loadStories();
    }
  }, [isLoading, isAuthenticated, loadStories, router]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadDetail(selectedStoryId);
    }
  }, [isAuthenticated, selectedStoryId, loadDetail]);

  async function createStory() {
    if (!story.slug.trim() || !story.title.trim()) {
      setFeedback({ type: "error", message: "slug 和标题不能为空" });
      return;
    }
    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories", {
      story: {
        ...story,
        seriesId: story.seriesId || null,
        description: story.description || null,
        baseContext: story.baseContext || null,
      },
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "创建故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事已创建" });
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
  }

  async function saveStory() {
    if (!selectedStoryId) {
      return;
    }
    setBusy(true);
    const resp = await adminPatch(`/api/admin/interactive-stories/${selectedStoryId}`, {
      story: {
        ...story,
        seriesId: story.seriesId || null,
        description: story.description || null,
        baseContext: story.baseContext || null,
      },
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "保存故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事已保存" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function publishStory() {
    if (!selectedStoryId) {
      return;
    }
    setBusy(true);
    const resp = await adminPost(`/api/admin/interactive-stories/${selectedStoryId}/publish`, {
      publish: true,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({
        type: "error",
        message: messageOf(resp, "发布失败，通常是图谱校验未通过"),
      });
      return;
    }
    setFeedback({ type: "success", message: "故事已发布" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function unpublishStory() {
    if (!selectedStoryId) {
      return;
    }
    setBusy(true);
    const resp = await adminPost(`/api/admin/interactive-stories/${selectedStoryId}/publish`, {
      publish: false,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "下线失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事已下线" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function removeStory() {
    if (!selectedStoryId || !window.confirm("确认删除当前故事？")) {
      return;
    }
    const resp = await adminDelete(`/api/admin/interactive-stories/${selectedStoryId}`);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "删除故事失败") });
      return;
    }
    setFeedback({ type: "success", message: "故事已删除" });
    await loadStories();
  }

  async function exportStory() {
    if (!selectedStoryId) {
      return;
    }
    const resp = await adminGet(`/api/admin/interactive-stories/${selectedStoryId}/export`);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "导出失败") });
      return;
    }
    const payload = resp.data?.payload || {};
    const slug = payload?.story?.slug || selectedStoryId;
    downloadJson(`${slug}-interactive-story.json`, payload);
    setFeedback({ type: "success", message: "导出完成" });
  }

  async function importStory() {
    if (!importText.trim()) {
      setFeedback({ type: "error", message: "请先粘贴导入 JSON" });
      return;
    }
    let payload;
    try {
      payload = JSON.parse(importText);
    } catch {
      setFeedback({ type: "error", message: "JSON 格式不合法" });
      return;
    }

    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories/import", {
      mode: importMode,
      payload,
    });
    setBusy(false);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "导入失败") });
      return;
    }
    setFeedback({ type: "success", message: "导入成功，已自动刷新故事" });
    await loadStories();
    const nextId = resp.data?.story?.id || "";
    if (nextId) {
      setSelectedStoryId(nextId);
    } else if (selectedStoryId) {
      await loadDetail(selectedStoryId);
    }
    setValidation(resp.data?.validation || null);
  }

  async function createNode() {
    if (!selectedStoryId) {
      return;
    }
    const resp = await adminPost(`/api/admin/interactive-stories/${selectedStoryId}/nodes`, {
      node: {
        ...nodeDraft,
        baseContext: nodeDraft.baseContext || null,
        basePrompt: nodeDraft.basePrompt || null,
      },
    });
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "创建节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已创建" });
    setNodeDraft(emptyNode());
    await loadDetail(selectedStoryId);
  }

  async function saveNode(nodeId) {
    const form = nodeForms[nodeId];
    const resp = await adminPatch(`/api/admin/interactive-stories/nodes/${nodeId}`, {
      node: {
        ...form,
        baseContext: form.baseContext || null,
        basePrompt: form.basePrompt || null,
      },
    });
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "保存节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已保存" });
    await loadDetail(selectedStoryId);
  }

  async function removeNode(nodeId) {
    if (!window.confirm("确认删除节点？")) {
      return;
    }
    const resp = await adminDelete(`/api/admin/interactive-stories/nodes/${nodeId}`);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "删除节点失败") });
      return;
    }
    setFeedback({ type: "success", message: "节点已删除" });
    await loadDetail(selectedStoryId);
  }

  async function createChoice(nodeId) {
    const form = choiceDraftByNode[nodeId] || emptyChoice();
    const resp = await adminPost(`/api/admin/interactive-stories/nodes/${nodeId}/choices`, {
      choice: {
        ...form,
        targetNodeId: form.targetNodeId || null,
      },
    });
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "创建选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "选项已创建" });
    setChoiceDraftByNode((current) => ({ ...current, [nodeId]: emptyChoice() }));
    await loadDetail(selectedStoryId);
  }

  async function saveChoice(choiceId) {
    const form = choiceForms[choiceId];
    const resp = await adminPatch(`/api/admin/interactive-stories/choices/${choiceId}`, {
      choice: {
        ...form,
        targetNodeId: form.targetNodeId || null,
      },
    });
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "保存选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "选项已保存" });
    await loadDetail(selectedStoryId);
  }

  async function removeChoice(choiceId) {
    if (!window.confirm("确认删除选项？")) {
      return;
    }
    const resp = await adminDelete(`/api/admin/interactive-stories/choices/${choiceId}`);
    if (!resp.ok) {
      setFeedback({ type: "error", message: messageOf(resp, "删除选项失败") });
      return;
    }
    setFeedback({ type: "success", message: "选项已删除" });
    await loadDetail(selectedStoryId);
  }

  return (
    <AdminShell
      title="互动小说管理"
      subtitle="企业模式：支持发布前校验、导入导出、图谱维护。"
    >
      <div className="space-y-4">
        {feedback.message ? (
          <section
            className={`rounded-xl border px-3 py-2 text-sm ${
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.message}
          </section>
        ) : null}

        <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 text-sm font-semibold text-slate-900">企业工具</h2>
            <select
              value={importMode}
              onChange={(event) => setImportMode(event.target.value)}
              className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1 text-xs"
            >
              <option value="create">导入模式：新建</option>
              <option value="replace">导入模式：替换</option>
            </select>
            <Button size="sm" variant="outline" onClick={importStory} disabled={busy}>
              <Upload className="size-4" />
              导入 JSON
            </Button>
            {selectedStoryId ? (
              <>
                <Button size="sm" variant="outline" onClick={exportStory}>
                  <Download className="size-4" />
                  导出 JSON
                </Button>
                <Button size="sm" variant="outline" onClick={() => loadValidation(selectedStoryId)}>
                  <ShieldCheck className="size-4" />
                  健康检查
                </Button>
                <Button size="sm" onClick={publishStory} disabled={busy}>
                  发布
                </Button>
                <Button size="sm" variant="secondary" onClick={unpublishStory} disabled={busy}>
                  下线
                </Button>
              </>
            ) : null}
          </div>
          <textarea
            rows={4}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="mt-3 w-full rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-xs"
            placeholder="粘贴导入 JSON（包含 story 和 nodes）"
          />
          {validation ? (
            <div className="mt-3 rounded-lg border border-[color:var(--gush-border)] bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold">
                校验结果：{validation.ok ? "通过" : "未通过"}（错误 {validation.errors}，警告 {validation.warnings}）
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {(validation.issues || []).slice(0, 12).map((item, index) => (
                  <li key={`${item.code}-${index}`} className={item.severity === "error" ? "text-rose-700" : "text-amber-700"}>
                    [{item.severity}] {item.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <div className="grid gap-4 xl:grid-cols-[300px,minmax(0,1fr)]">
          <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">故事列表</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedStoryId("");
                  setStory(emptyStory());
                  setDetail(null);
                }}
              >
                新建
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {loading ? <p className="text-xs text-slate-500">加载中...</p> : stories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStoryId(item.id)}
                  className={`w-full rounded-lg border p-2 text-left ${
                    selectedStoryId === item.id
                      ? "border-[color:var(--gush-border-strong)] bg-slate-50"
                      : "border-[color:var(--gush-border)]"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.slug} · {item._count?.nodes || 0} 节点 · {item.isPublished ? "已发布" : "草稿"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">故事信息</h2>
                <div className="flex gap-2">
                  {selectedStoryId ? (
                    <Button size="sm" onClick={saveStory} disabled={busy}>
                      <Save className="size-4" />
                      保存
                    </Button>
                  ) : (
                    <Button size="sm" onClick={createStory} disabled={busy}>
                      <Plus className="size-4" />
                      创建
                    </Button>
                  )}
                  {selectedStoryId ? (
                    <Button size="sm" variant="destructive" onClick={removeStory}>
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="slug" value={story.slug} onChange={(event) => setStory((current) => ({ ...current, slug: event.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="标题" value={story.title} onChange={(event) => setStory((current) => ({ ...current, title: event.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="seriesId（可选）" value={story.seriesId} onChange={(event) => setStory((current) => ({ ...current, seriesId: event.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="描述" value={story.description} onChange={(event) => setStory((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <textarea rows={3} className="mt-2 w-full rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="baseContext" value={story.baseContext} onChange={(event) => setStory((current) => ({ ...current, baseContext: event.target.value }))} />
              <div className="mt-2 flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={story.isPublished} onChange={(event) => setStory((current) => ({ ...current, isPublished: event.target.checked }))} />发布状态</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={story.aiEnabled} onChange={(event) => setStory((current) => ({ ...current, aiEnabled: event.target.checked }))} />AI 启用</label>
              </div>
            </section>

            {selectedStoryId ? (
              <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
                <h3 className="text-sm font-semibold">新增节点</h3>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="nodeKey" value={nodeDraft.nodeKey} onChange={(event) => setNodeDraft((current) => ({ ...current, nodeKey: event.target.value }))} />
                  <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="title" value={nodeDraft.title} onChange={(event) => setNodeDraft((current) => ({ ...current, title: event.target.value }))} />
                  <input type="number" className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="sortOrder" value={nodeDraft.sortOrder} onChange={(event) => setNodeDraft((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))} />
                </div>
                <Button className="mt-2" size="sm" onClick={createNode}>
                  <Plus className="size-4" />
                  添加节点
                </Button>
              </section>
            ) : null}

            {nodes.map((node) => {
              const nodeForm = nodeForms[node.id] || emptyNode();
              const choiceDraft = choiceDraftByNode[node.id] || emptyChoice();
              return (
                <section key={node.id} className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{node.nodeKey} · {node.title}</h3>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNode(node.id)}>
                        <Save className="size-4" />
                        保存节点
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeNode(node.id)}>
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.nodeKey} onChange={(event) => setNodeForms((current) => ({ ...current, [node.id]: { ...nodeForm, nodeKey: event.target.value } }))} />
                    <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.title} onChange={(event) => setNodeForms((current) => ({ ...current, [node.id]: { ...nodeForm, title: event.target.value } }))} />
                    <input type="number" className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.sortOrder} onChange={(event) => setNodeForms((current) => ({ ...current, [node.id]: { ...nodeForm, sortOrder: Number(event.target.value || 0) } }))} />
                  </div>
                  <div className="mt-3 rounded-lg border border-[color:var(--gush-border)] p-3">
                    <p className="text-xs font-semibold text-slate-600">选项</p>
                    <div className="mt-2 space-y-2">
                      {(node.choices || []).map((choice) => {
                        const form = choiceForms[choice.id] || emptyChoice();
                        return (
                          <div key={choice.id} className="rounded-lg border border-[color:var(--gush-border)] p-2">
                            <div className="grid gap-2 md:grid-cols-4">
                              <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.choiceKey} onChange={(event) => setChoiceForms((current) => ({ ...current, [choice.id]: { ...form, choiceKey: event.target.value } }))} />
                              <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.label} onChange={(event) => setChoiceForms((current) => ({ ...current, [choice.id]: { ...form, label: event.target.value } }))} />
                              <select className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.targetNodeId || ""} onChange={(event) => setChoiceForms((current) => ({ ...current, [choice.id]: { ...form, targetNodeId: event.target.value } }))}>
                                <option value="">无跳转</option>
                                {nodes.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.nodeKey}
                                  </option>
                                ))}
                              </select>
                              <input type="number" className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.sortOrder} onChange={(event) => setChoiceForms((current) => ({ ...current, [choice.id]: { ...form, sortOrder: Number(event.target.value || 0) } }))} />
                            </div>
                            <div className="mt-1 flex gap-2">
                              <Button size="sm" onClick={() => saveChoice(choice.id)}>
                                <Save className="size-4" />
                                保存选项
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => removeChoice(choice.id)}>
                                <Trash2 className="size-4" />
                                删除
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-4">
                      <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="choiceKey" value={choiceDraft.choiceKey} onChange={(event) => setChoiceDraftByNode((current) => ({ ...current, [node.id]: { ...choiceDraft, choiceKey: event.target.value } }))} />
                      <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="label" value={choiceDraft.label} onChange={(event) => setChoiceDraftByNode((current) => ({ ...current, [node.id]: { ...choiceDraft, label: event.target.value } }))} />
                      <select className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={choiceDraft.targetNodeId || ""} onChange={(event) => setChoiceDraftByNode((current) => ({ ...current, [node.id]: { ...choiceDraft, targetNodeId: event.target.value } }))}>
                        <option value="">无跳转</option>
                        {nodes.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nodeKey}
                          </option>
                        ))}
                      </select>
                      <input type="number" className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="sortOrder" value={choiceDraft.sortOrder} onChange={(event) => setChoiceDraftByNode((current) => ({ ...current, [node.id]: { ...choiceDraft, sortOrder: Number(event.target.value || 0) } }))} />
                    </div>
                    <Button size="sm" className="mt-2" onClick={() => createChoice(node.id)}>
                      <Plus className="size-4" />
                      添加选项
                    </Button>
                  </div>
                </section>
              );
            })}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
