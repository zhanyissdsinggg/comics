"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import AdminShell from "./AdminShell";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "./AuthContext";
import { adminDelete, adminGet, adminPatch, adminPost } from "../../lib/adminApiClient";

const emptyStory = () => ({ slug: "", title: "", seriesId: "", description: "", baseContext: "", isPublished: false, aiEnabled: true });
const emptyNode = () => ({ nodeKey: "", title: "", sortOrder: 0, baseContext: "", basePrompt: "", isEnding: false, aiEnabled: true });
const emptyChoice = () => ({ choiceKey: "", label: "", targetNodeId: "", sortOrder: 0 });

function messageOf(resp, fallback) {
  return String(resp?.error || resp?.message || resp?.data?.message || fallback || "").trim();
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

  const nodes = useMemo(() => (Array.isArray(detail?.nodes) ? detail.nodes : []), [detail]);

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
    setSelectedStoryId((current) => (list.some((x) => x.id === current) ? current : (list[0]?.id || "")));
    setLoading(false);
  }, []);

  const loadDetail = useCallback(async (storyId) => {
    const id = String(storyId || "").trim();
    if (!id) {
      setDetail(null);
      setStory(emptyStory());
      return;
    }
    const resp = await adminGet(`/api/admin/interactive-stories/${id}`);
    if (!resp.ok) {
      setDetail(null);
      setFeedback({ type: "error", message: messageOf(resp, "加载故事详情失败") });
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
    for (const n of nextDetail?.nodes || []) {
      nextNodeForms[n.id] = { nodeKey: n.nodeKey || "", title: n.title || "", sortOrder: Number(n.sortOrder || 0), baseContext: n.baseContext || "", basePrompt: n.basePrompt || "", isEnding: Boolean(n.isEnding), aiEnabled: Boolean(n.aiEnabled) };
      nextChoiceDrafts[n.id] = emptyChoice();
      for (const c of n.choices || []) {
        nextChoiceForms[c.id] = { choiceKey: c.choiceKey || "", label: c.label || "", targetNodeId: c.targetNodeId || "", sortOrder: Number(c.sortOrder || 0) };
      }
    }
    setNodeForms(nextNodeForms);
    setChoiceForms(nextChoiceForms);
    setChoiceDraftByNode(nextChoiceDrafts);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/admin/login");
    if (isAuthenticated) void loadStories();
  }, [isLoading, isAuthenticated, loadStories, router]);

  useEffect(() => {
    if (isAuthenticated) void loadDetail(selectedStoryId);
  }, [isAuthenticated, selectedStoryId, loadDetail]);

  async function createStory() {
    if (!story.slug.trim() || !story.title.trim()) return setFeedback({ type: "error", message: "slug 和标题不能为空" });
    setBusy(true);
    const resp = await adminPost("/api/admin/interactive-stories", { story: { ...story, seriesId: story.seriesId || null, description: story.description || null, baseContext: story.baseContext || null } });
    setBusy(false);
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "创建故事失败") });
    setFeedback({ type: "success", message: "故事已创建" });
    await loadStories();
    setSelectedStoryId(resp.data?.story?.id || "");
  }

  async function saveStory() {
    if (!selectedStoryId) return;
    setBusy(true);
    const resp = await adminPatch(`/api/admin/interactive-stories/${selectedStoryId}`, { story: { ...story, seriesId: story.seriesId || null, description: story.description || null, baseContext: story.baseContext || null } });
    setBusy(false);
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "保存故事失败") });
    setFeedback({ type: "success", message: "故事已保存" });
    await loadStories();
    await loadDetail(selectedStoryId);
  }

  async function removeStory() {
    if (!selectedStoryId || !window.confirm("确认删除当前故事？")) return;
    const resp = await adminDelete(`/api/admin/interactive-stories/${selectedStoryId}`);
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "删除故事失败") });
    setFeedback({ type: "success", message: "故事已删除" });
    await loadStories();
  }

  async function createNode() {
    if (!selectedStoryId) return;
    const resp = await adminPost(`/api/admin/interactive-stories/${selectedStoryId}/nodes`, { node: { ...nodeDraft, baseContext: nodeDraft.baseContext || null, basePrompt: nodeDraft.basePrompt || null } });
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "创建节点失败") });
    setFeedback({ type: "success", message: "节点已创建" });
    setNodeDraft(emptyNode());
    await loadDetail(selectedStoryId);
  }

  async function saveNode(nodeId) {
    const form = nodeForms[nodeId];
    const resp = await adminPatch(`/api/admin/interactive-stories/nodes/${nodeId}`, { node: { ...form, baseContext: form.baseContext || null, basePrompt: form.basePrompt || null } });
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "保存节点失败") });
    setFeedback({ type: "success", message: "节点已保存" });
    await loadDetail(selectedStoryId);
  }

  async function removeNode(nodeId) {
    if (!window.confirm("确认删除节点？")) return;
    const resp = await adminDelete(`/api/admin/interactive-stories/nodes/${nodeId}`);
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "删除节点失败") });
    setFeedback({ type: "success", message: "节点已删除" });
    await loadDetail(selectedStoryId);
  }

  async function createChoice(nodeId) {
    const form = choiceDraftByNode[nodeId] || emptyChoice();
    const resp = await adminPost(`/api/admin/interactive-stories/nodes/${nodeId}/choices`, { choice: { ...form, targetNodeId: form.targetNodeId || null } });
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "创建选项失败") });
    setFeedback({ type: "success", message: "选项已创建" });
    setChoiceDraftByNode((c) => ({ ...c, [nodeId]: emptyChoice() }));
    await loadDetail(selectedStoryId);
  }

  async function saveChoice(choiceId) {
    const form = choiceForms[choiceId];
    const resp = await adminPatch(`/api/admin/interactive-stories/choices/${choiceId}`, { choice: { ...form, targetNodeId: form.targetNodeId || null } });
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "保存选项失败") });
    setFeedback({ type: "success", message: "选项已保存" });
    await loadDetail(selectedStoryId);
  }

  async function removeChoice(choiceId) {
    if (!window.confirm("确认删除选项？")) return;
    const resp = await adminDelete(`/api/admin/interactive-stories/choices/${choiceId}`);
    if (!resp.ok) return setFeedback({ type: "error", message: messageOf(resp, "删除选项失败") });
    setFeedback({ type: "success", message: "选项已删除" });
    await loadDetail(selectedStoryId);
  }

  return (
    <AdminShell title="互动小说管理" subtitle="维护故事骨架、节点和选项，支持运营直接配置。">
      <div className="space-y-4">
        {feedback.message ? <section className={`rounded-xl border px-3 py-2 text-sm ${feedback.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{feedback.message}</section> : null}
        <div className="grid gap-4 xl:grid-cols-[300px,minmax(0,1fr)]">
          <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-3">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">故事列表</h2><Button size="sm" variant="outline" onClick={() => { setSelectedStoryId(""); setStory(emptyStory()); setDetail(null); }}>新建</Button></div>
            <div className="mt-2 space-y-2">
              {loading ? <p className="text-xs text-slate-500">加载中...</p> : stories.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelectedStoryId(item.id)} className={`w-full rounded-lg border p-2 text-left ${selectedStoryId === item.id ? "border-[color:var(--gush-border-strong)] bg-slate-50" : "border-[color:var(--gush-border)]"}`}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.slug} · {item._count?.nodes || 0} 节点</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">故事信息</h2><div className="flex gap-2">{selectedStoryId ? <Button size="sm" onClick={saveStory} disabled={busy}><Save className="size-4" />保存</Button> : <Button size="sm" onClick={createStory} disabled={busy}><Plus className="size-4" />创建</Button>}{selectedStoryId ? <Button size="sm" variant="destructive" onClick={removeStory}><Trash2 className="size-4" />删除</Button> : null}</div></div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="slug" value={story.slug} onChange={(e) => setStory((c) => ({ ...c, slug: e.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="标题" value={story.title} onChange={(e) => setStory((c) => ({ ...c, title: e.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="seriesId" value={story.seriesId} onChange={(e) => setStory((c) => ({ ...c, seriesId: e.target.value }))} />
                <input className="rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="描述" value={story.description} onChange={(e) => setStory((c) => ({ ...c, description: e.target.value }))} />
              </div>
              <textarea rows={3} className="mt-2 w-full rounded-lg border border-[color:var(--gush-border)] px-3 py-2 text-sm" placeholder="baseContext" value={story.baseContext} onChange={(e) => setStory((c) => ({ ...c, baseContext: e.target.value }))} />
              <div className="mt-2 flex gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={story.isPublished} onChange={(e) => setStory((c) => ({ ...c, isPublished: e.target.checked }))} />发布</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={story.aiEnabled} onChange={(e) => setStory((c) => ({ ...c, aiEnabled: e.target.checked }))} />AI</label>
              </div>
            </section>

            {selectedStoryId ? (
              <section className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
                <h3 className="text-sm font-semibold">新增节点</h3>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="nodeKey" value={nodeDraft.nodeKey} onChange={(e) => setNodeDraft((c) => ({ ...c, nodeKey: e.target.value }))} />
                  <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="title" value={nodeDraft.title} onChange={(e) => setNodeDraft((c) => ({ ...c, title: e.target.value }))} />
                  <input type="number" className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-sm" placeholder="sortOrder" value={nodeDraft.sortOrder} onChange={(e) => setNodeDraft((c) => ({ ...c, sortOrder: Number(e.target.value || 0) }))} />
                </div>
                <Button className="mt-2" size="sm" onClick={createNode}><Plus className="size-4" />添加节点</Button>
              </section>
            ) : null}

            {nodes.map((node) => {
              const nodeForm = nodeForms[node.id] || emptyNode();
              const choiceDraft = choiceDraftByNode[node.id] || emptyChoice();
              return (
                <section key={node.id} className="rounded-xl border border-[color:var(--gush-border)] bg-white p-4">
                  <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{node.nodeKey} · {node.title}</h3><div className="flex gap-2"><Button size="sm" onClick={() => saveNode(node.id)}><Save className="size-4" />保存节点</Button><Button size="sm" variant="destructive" onClick={() => removeNode(node.id)}><Trash2 className="size-4" />删除</Button></div></div>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.nodeKey} onChange={(e) => setNodeForms((c) => ({ ...c, [node.id]: { ...nodeForm, nodeKey: e.target.value } }))} />
                    <input className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.title} onChange={(e) => setNodeForms((c) => ({ ...c, [node.id]: { ...nodeForm, title: e.target.value } }))} />
                    <input type="number" className="rounded-lg border border-[color:var(--gush-border)] px-2 py-1.5 text-xs" value={nodeForm.sortOrder} onChange={(e) => setNodeForms((c) => ({ ...c, [node.id]: { ...nodeForm, sortOrder: Number(e.target.value || 0) } }))} />
                  </div>
                  <div className="mt-3 rounded-lg border border-[color:var(--gush-border)] p-3">
                    <p className="text-xs font-semibold text-slate-600">选项</p>
                    <div className="mt-2 space-y-2">
                      {(node.choices || []).map((choice) => {
                        const form = choiceForms[choice.id] || emptyChoice();
                        return (
                          <div key={choice.id} className="rounded-lg border border-[color:var(--gush-border)] p-2">
                            <div className="grid gap-2 md:grid-cols-4">
                              <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.choiceKey} onChange={(e) => setChoiceForms((c) => ({ ...c, [choice.id]: { ...form, choiceKey: e.target.value } }))} />
                              <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.label} onChange={(e) => setChoiceForms((c) => ({ ...c, [choice.id]: { ...form, label: e.target.value } }))} />
                              <select className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.targetNodeId || ""} onChange={(e) => setChoiceForms((c) => ({ ...c, [choice.id]: { ...form, targetNodeId: e.target.value } }))}>
                                <option value="">无跳转</option>
                                {nodes.map((n) => <option key={n.id} value={n.id}>{n.nodeKey}</option>)}
                              </select>
                              <input type="number" className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={form.sortOrder} onChange={(e) => setChoiceForms((c) => ({ ...c, [choice.id]: { ...form, sortOrder: Number(e.target.value || 0) } }))} />
                            </div>
                            <div className="mt-1 flex gap-2"><Button size="sm" onClick={() => saveChoice(choice.id)}><Save className="size-4" />保存选项</Button><Button size="sm" variant="destructive" onClick={() => removeChoice(choice.id)}><Trash2 className="size-4" />删除</Button></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-4">
                      <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="choiceKey" value={choiceDraft.choiceKey} onChange={(e) => setChoiceDraftByNode((c) => ({ ...c, [node.id]: { ...choiceDraft, choiceKey: e.target.value } }))} />
                      <input className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="label" value={choiceDraft.label} onChange={(e) => setChoiceDraftByNode((c) => ({ ...c, [node.id]: { ...choiceDraft, label: e.target.value } }))} />
                      <select className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" value={choiceDraft.targetNodeId || ""} onChange={(e) => setChoiceDraftByNode((c) => ({ ...c, [node.id]: { ...choiceDraft, targetNodeId: e.target.value } }))}>
                        <option value="">无跳转</option>
                        {nodes.map((n) => <option key={n.id} value={n.id}>{n.nodeKey}</option>)}
                      </select>
                      <input type="number" className="rounded border border-[color:var(--gush-border)] px-2 py-1 text-xs" placeholder="sortOrder" value={choiceDraft.sortOrder} onChange={(e) => setChoiceDraftByNode((c) => ({ ...c, [node.id]: { ...choiceDraft, sortOrder: Number(e.target.value || 0) } }))} />
                    </div>
                    <Button size="sm" className="mt-2" onClick={() => createChoice(node.id)}><Plus className="size-4" />添加选项</Button>
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
