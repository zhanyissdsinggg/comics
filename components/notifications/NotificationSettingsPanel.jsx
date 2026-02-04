"use client";

import { memo, useState } from "react";
import { apiPost } from "../../lib/apiClient";
import PushNotificationManager from "./PushNotificationManager";

/**
 * 老王注释：通知设置页面组件
 * 允许用户自定义接收哪些类型的通知
 */
const NotificationSettingsPanel = memo(function NotificationSettingsPanel({ initialSettings = {} }) {
  const [settings, setSettings] = useState({
    newEpisode: initialSettings.newEpisode !== false,
    ttfReady: initialSettings.ttfReady !== false,
    promotions: initialSettings.promotions !== false,
    comments: initialSettings.comments !== false,
    likes: initialSettings.likes !== false,
    follows: initialSettings.follows !== false,
    systemUpdates: initialSettings.systemUpdates !== false,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 老王注释：切换单个设置
  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 老王注释：保存设置
  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const response = await apiPost("/api/notifications/settings", settings);

      if (response.ok) {
        setMessage("Settings saved successfully");
      } else {
        setMessage(response.error || "Failed to save settings");
      }
    } catch (err) {
      setMessage("An error occurred");
    }

    setSaving(false);
  };

  // 老王注释：通知类型配置
  const NOTIFICATION_TYPES = [
    {
      key: "newEpisode",
      title: "New Episodes",
      description: "Get notified when series you follow release new episodes",
      icon: "📚",
      category: "Content Updates",
    },
    {
      key: "ttfReady",
      title: "Time Till Free Ready",
      description: "Notify when your TTF episodes are ready to read",
      icon: "⏰",
      category: "Content Updates",
    },
    {
      key: "promotions",
      title: "Promotions & Offers",
      description: "Special deals, discounts, and limited-time offers",
      icon: "🎁",
      category: "Marketing",
    },
    {
      key: "comments",
      title: "Comments & Replies",
      description: "Someone replies to your comments",
      icon: "💬",
      category: "Social",
    },
    {
      key: "likes",
      title: "Likes & Reactions",
      description: "Someone likes your comments or reviews",
      icon: "❤️",
      category: "Social",
    },
    {
      key: "follows",
      title: "New Followers",
      description: "Someone follows you",
      icon: "👥",
      category: "Social",
    },
    {
      key: "systemUpdates",
      title: "System Updates",
      description: "Important announcements and system maintenance",
      icon: "🔔",
      category: "System",
    },
  ];

  // 老王注释：按类别分组
  const groupedNotifications = NOTIFICATION_TYPES.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 老王注释：推送通知管理 */}
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Browser Push Notifications</h2>
        <PushNotificationManager />
      </section>

      {/* 老王注释：通知偏好设置 */}
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notification Preferences</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Choose which notifications you want to receive
            </p>
          </div>
          {message ? (
            <div className="text-xs text-emerald-400">{message}</div>
          ) : null}
        </div>

        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-3 text-sm font-medium text-neutral-400">{category}</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                  >
                    <div className="flex-shrink-0 text-2xl">{item.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-neutral-400">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSetting(item.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                        settings[item.key] ? "bg-emerald-500" : "bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings[item.key] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 老王注释：快捷操作 */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
          <span className="text-sm text-neutral-400">Quick Actions</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const allEnabled = {};
                Object.keys(settings).forEach((key) => {
                  allEnabled[key] = true;
                });
                setSettings(allEnabled);
              }}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => {
                const allDisabled = {};
                Object.keys(settings).forEach((key) => {
                  allDisabled[key] = false;
                });
                setSettings(allDisabled);
              }}
              className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-900"
            >
              Disable All
            </button>
          </div>
        </div>

        {/* 老王注释：保存按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </section>

      {/* 老王注释：通知历史预览 */}
      <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Notification History</h2>
        <div className="text-center py-8 text-sm text-neutral-500">
          Your recent notifications will appear here
        </div>
      </section>
    </div>
  );
});

export default NotificationSettingsPanel;
