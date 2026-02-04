"use client";

import { memo, useEffect, useState } from "react";

/**
 * 老王注释：浏览器推送通知管理组件
 * 处理通知权限请求、订阅和推送
 */
const PushNotificationManager = memo(function PushNotificationManager() {
  const [permission, setPermission] = useState("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // 老王注释：检查浏览器是否支持推送通知
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // 老王注释：请求通知权限
  const requestPermission = async () => {
    if (!isSupported) {
      alert("Your browser does not support push notifications");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // 老王注释：权限授予后，可以订阅推送服务
        await subscribeToPush();
      }
    } catch (err) {
      console.error("Failed to request notification permission:", err);
    }
  };

  // 老王注释：订阅推送服务
  const subscribeToPush = async () => {
    try {
      // 老王注释：这里应该调用后端API注册推送订阅
      // 实际项目中需要使用Service Worker和Push API
      setIsSubscribed(true);

      // 老王注释：发送测试通知
      if (Notification.permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You'll now receive updates about new episodes and promotions.",
          icon: "/icon.svg",
          badge: "/icon.svg",
        });
      }
    } catch (err) {
      console.error("Failed to subscribe to push:", err);
    }
  };

  // 老王注释：取消订阅
  const unsubscribe = async () => {
    try {
      // 老王注释：这里应该调用后端API取消订阅
      setIsSubscribed(false);
    } catch (err) {
      console.error("Failed to unsubscribe:", err);
    }
  };

  // 老王注释：发送测试通知
  const sendTestNotification = () => {
    if (Notification.permission === "granted") {
      new Notification("Test Notification", {
        body: "This is a test notification from Tappytoon!",
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "test-notification",
        requireInteraction: false,
      });
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm text-neutral-400">
        Your browser does not support push notifications.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 老王注释：权限状态显示 */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Push Notifications</p>
            <p className="mt-1 text-xs text-neutral-400">
              {permission === "granted"
                ? "Enabled - You'll receive notifications"
                : permission === "denied"
                ? "Blocked - Please enable in browser settings"
                : "Not enabled - Click to enable"}
            </p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              permission === "granted"
                ? "bg-emerald-500/20 text-emerald-400"
                : permission === "denied"
                ? "bg-red-500/20 text-red-400"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            {permission === "granted" ? "✓" : permission === "denied" ? "✕" : "🔔"}
          </div>
        </div>
      </div>

      {/* 老王注释：操作按钮 */}
      <div className="flex flex-wrap gap-3">
        {permission === "default" ? (
          <button
            type="button"
            onClick={requestPermission}
            className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Enable Notifications
          </button>
        ) : permission === "granted" ? (
          <>
            {!isSubscribed ? (
              <button
                type="button"
                onClick={subscribeToPush}
                className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Subscribe to Updates
              </button>
            ) : (
              <button
                type="button"
                onClick={unsubscribe}
                className="rounded-full border border-neutral-700 px-6 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
              >
                Unsubscribe
              </button>
            )}
            <button
              type="button"
              onClick={sendTestNotification}
              className="rounded-full border border-neutral-700 px-6 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
            >
              Send Test
            </button>
          </>
        ) : (
          <div className="text-xs text-neutral-500">
            Notifications are blocked. Please enable them in your browser settings.
          </div>
        )}
      </div>

      {/* 老王注释：通知类型说明 */}
      {permission === "granted" ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
          <p className="text-xs font-medium text-neutral-400">You&apos;ll receive notifications for:</p>
          <ul className="mt-2 space-y-1 text-xs text-neutral-500">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              New episodes of series you follow
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Time Till Free (TTF) ready notifications
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span>
              Special promotions and offers
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
});

export default PushNotificationManager;
