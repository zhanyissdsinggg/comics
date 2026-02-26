"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "../../../components/admin/AdminLayout";

export default function ContentGeneratorPage() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);

  const generateContent = async () => {
    setGenerating(true);
    setProgress("开始生成内容...");
    setResult(null);

    try {
      const response = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("生成失败");
      }

      const data = await response.json();
      setResult(data);
      setProgress("生成完成！");
    } catch (error) {
      setProgress(`错误: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout title="内容生成器">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">内容生成器</h1>
          <p className="text-neutral-400">
            一键生成测试数据：20个漫画系列 + 20个小说系列
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              生成内容
            </h2>
            <p className="text-neutral-400 mb-4">
              点击下面的按钮将生成：
            </p>
            <ul className="list-disc list-inside text-neutral-300 space-y-2 mb-6">
              <li>20个漫画系列，每个10-30章</li>
              <li>20个小说系列，每个10-30章</li>
              <li>完整的封面、描述、标签、评分等数据</li>
            </ul>

            <button
              onClick={generateContent}
              disabled={generating}
              className={`rounded-2xl px-6 py-3 font-semibold text-white transition-colors ${
                generating
                  ? "bg-neutral-600 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {generating ? "生成中..." : "开始生成"}
            </button>
          </div>

          {progress && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-neutral-300">{progress}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                生成成功！
              </h3>
              <div className="text-neutral-300 space-y-1">
                <p>漫画系列: {result.comicsCount} 个</p>
                <p>小说系列: {result.novelsCount} 个</p>
                <p>总章节数: {result.totalEpisodes} 章</p>
                <p>耗时: {result.duration} 秒</p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
              >
                查看网站
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
