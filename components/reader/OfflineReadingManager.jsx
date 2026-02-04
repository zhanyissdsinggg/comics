"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";

/**
 * 老王注释：离线阅读管理组件
 * 功能：下载章节、管理离线内容、存储空间管理
 * 遵循KISS原则：简洁的下载管理界面
 * 遵循DRY原则：统一的存储逻辑
 */
const OfflineReadingManager = React.memo(() => {
  // 老王注释：离线内容状态
  const [offlineEpisodes, setOfflineEpisodes] = useState([]);
  const [downloading, setDownloading] = useState({});
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(100); // 老王注释：100MB限制

  // 老王注释：加载离线内容
  useEffect(() => {
    const loadOfflineContent = () => {
      try {
        const saved = localStorage.getItem("mn_offline_episodes");
        if (saved) {
          const episodes = JSON.parse(saved);
          setOfflineEpisodes(episodes);

          // 老王注释：计算存储使用量
          const totalSize = episodes.reduce(
            (sum, ep) => sum + (ep.size || 0),
            0
          );
          setStorageUsed(totalSize);
        }
      } catch (error) {
        console.error("艹，加载离线内容失败:", error);
      }
    };

    loadOfflineContent();
  }, []);

  // 老王注释：保存离线内容
  const saveOfflineContent = useCallback((episodes) => {
    try {
      localStorage.setItem("mn_offline_episodes", JSON.stringify(episodes));
      setOfflineEpisodes(episodes);

      // 老王注释：更新存储使用量
      const totalSize = episodes.reduce((sum, ep) => sum + (ep.size || 0), 0);
      setStorageUsed(totalSize);
    } catch (error) {
      console.error("艹，保存离线内容失败:", error);
    }
  }, []);

  // 老王注释：下载章节
  const handleDownload = useCallback(
    async (episode) => {
      // 老王注释：检查存储空间
      if (storageUsed + episode.estimatedSize > storageLimit) {
        alert(
          "Not enough storage space. Please delete some episodes first."
        );
        return;
      }

      setDownloading((prev) => ({ ...prev, [episode.id]: 0 }));

      try {
        // 老王注释：模拟下载过程
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          setDownloading((prev) => ({ ...prev, [episode.id]: progress }));
        }

        // 老王注释：添加到离线列表
        const newEpisode = {
          ...episode,
          downloadedAt: new Date().toISOString(),
          size: episode.estimatedSize,
        };

        const updatedEpisodes = [...offlineEpisodes, newEpisode];
        saveOfflineContent(updatedEpisodes);

        // 老王注释：清除下载状态
        setDownloading((prev) => {
          const newState = { ...prev };
          delete newState[episode.id];
          return newState;
        });
      } catch (error) {
        console.error("艹，下载章节失败:", error);
        alert("Failed to download episode. Please try again.");
        setDownloading((prev) => {
          const newState = { ...prev };
          delete newState[episode.id];
          return newState;
        });
      }
    },
    [offlineEpisodes, storageUsed, storageLimit, saveOfflineContent]
  );

  // 老王注释：删除章节
  const handleDelete = useCallback(
    (episodeId) => {
      const updatedEpisodes = offlineEpisodes.filter(
        (ep) => ep.id !== episodeId
      );
      saveOfflineContent(updatedEpisodes);
    },
    [offlineEpisodes, saveOfflineContent]
  );

  // 老王注释：清空所有离线内容
  const handleClearAll = useCallback(() => {
    if (
      confirm(
        `Are you sure you want to delete all ${offlineEpisodes.length} offline episodes?`
      )
    ) {
      saveOfflineContent([]);
    }
  }, [offlineEpisodes.length, saveOfflineContent]);

  // 老王注释：格式化文件大小
  const formatSize = useCallback((sizeInMB) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  }, []);

  // 老王注释：存储使用百分比
  const storagePercentage = useMemo(
    () => (storageUsed / storageLimit) * 100,
    [storageUsed, storageLimit]
  );

  // 老王注释：模拟可下载章节（实际项目中应该从API获取）
  const availableEpisodes = useMemo(
    () => [
      {
        id: 1,
        seriesTitle: "Solo Leveling",
        episodeTitle: "Chapter 180",
        estimatedSize: 5.2,
      },
      {
        id: 2,
        seriesTitle: "Tower of God",
        episodeTitle: "Chapter 550",
        estimatedSize: 4.8,
      },
      {
        id: 3,
        seriesTitle: "The Beginning After The End",
        episodeTitle: "Chapter 175",
        estimatedSize: 6.1,
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-white">
        Offline Reading Manager
      </h1>

      {/* 老王注释：存储空间显示 */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Storage Usage</h2>
          <span className="text-sm text-neutral-400">
            {formatSize(storageUsed)} / {formatSize(storageLimit)}
          </span>
        </div>
        <div className="mb-2 h-3 overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full transition-all ${
              storagePercentage > 90
                ? "bg-red-500"
                : storagePercentage > 70
                  ? "bg-yellow-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${storagePercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-neutral-500">
          {offlineEpisodes.length} episodes downloaded
        </p>
      </div>

      {/* 老王注释：已下载章节列表 */}
      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Downloaded Episodes
          </h2>
          {offlineEpisodes.length > 0 && (
            <button
              onClick={handleClearAll}
              className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
            >
              Clear All
            </button>
          )}
        </div>

        {offlineEpisodes.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-12 text-center">
            <p className="text-neutral-500">
              No episodes downloaded yet. Download episodes below to read
              offline.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {offlineEpisodes.map((episode) => (
              <div
                key={episode.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-white">
                    {episode.seriesTitle}
                  </h3>
                  <p className="mb-1 text-sm text-neutral-400">
                    {episode.episodeTitle}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatSize(episode.size)} •{" "}
                    {new Date(episode.downloadedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(episode.id)}
                  className="rounded-lg bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 老王注释：可下载章节列表 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Available for Download
        </h2>
        <div className="space-y-3">
          {availableEpisodes
            .filter(
              (ep) => !offlineEpisodes.some((offline) => offline.id === ep.id)
            )
            .map((episode) => (
              <div
                key={episode.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-white">
                    {episode.seriesTitle}
                  </h3>
                  <p className="mb-1 text-sm text-neutral-400">
                    {episode.episodeTitle}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatSize(episode.estimatedSize)}
                  </p>
                </div>

                {/* 老王注释：下载按钮或进度 */}
                {downloading[episode.id] !== undefined ? (
                  <div className="w-32">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Downloading</span>
                      <span className="text-emerald-400">
                        {downloading[episode.id]}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${downloading[episode.id]}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(episode)}
                    className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    Download
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
});

OfflineReadingManager.displayName = "OfflineReadingManager";

export default OfflineReadingManager;