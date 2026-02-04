"use client";

import { memo, useState } from "react";
import { apiPost } from "../../lib/apiClient";

/**
 * 老王注释：密码修改组件
 * 允许用户修改当前密码（需要输入旧密码验证）
 */
const PasswordChangeSection = memo(function PasswordChangeSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success or error

  // 老王注释：验证密码强度
  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  // 老王注释：处理密码修改
  const handleChangePassword = async () => {
    setMessage("");
    setMessageType("");

    // 老王注释：验证输入
    if (!currentPassword) {
      setMessage("Please enter your current password");
      setMessageType("error");
      return;
    }

    if (!newPassword) {
      setMessage("Please enter a new password");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      setMessageType("error");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("New password must be different from current password");
      setMessageType("error");
      return;
    }

    // 老王注释：验证密码强度
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      return;
    }

    setChanging(true);

    try {
      const response = await apiPost("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.ok) {
        setMessage("Password changed successfully");
        setMessageType("success");
        // 老王注释：清空表单
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage(response.error || "Failed to change password");
        setMessageType("error");
      }
    } catch (err) {
      setMessage("An error occurred. Please try again.");
      setMessageType("error");
    }

    setChanging(false);
  };

  // 老王注释：密码强度指示器
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: "Weak", color: "bg-red-500" };
    if (strength <= 4) return { strength: 2, label: "Medium", color: "bg-yellow-500" };
    return { strength: 3, label: "Strong", color: "bg-emerald-500" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Change Password</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Update your password to keep your account secure
        </p>
      </div>

      {/* 老王注释：消息提示 */}
      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
        {/* 老王注释：当前密码 */}
        <div>
          <label className="block text-xs font-medium text-neutral-400">
            Current Password
          </label>
          <div className="relative mt-2">
            <input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 pr-10 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 老王注释：新密码 */}
        <div>
          <label className="block text-xs font-medium text-neutral-400">
            New Password
          </label>
          <div className="relative mt-2">
            <input
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 pr-10 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {/* 老王注释：密码强度指示器 */}
          {newPassword ? (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500">
                  {passwordStrength.label}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 老王注释：确认新密码 */}
        <div>
          <label className="block text-xs font-medium text-neutral-400">
            Confirm New Password
          </label>
          <div className="relative mt-2">
            <input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 pr-10 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {/* 老王注释：密码匹配提示 */}
          {confirmPassword && newPassword !== confirmPassword ? (
            <p className="mt-1 text-[10px] text-red-400">Passwords do not match</p>
          ) : null}
        </div>

        {/* 老王注释：显示/隐藏密码 */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-passwords"
            checked={showPasswords}
            onChange={(e) => setShowPasswords(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500"
          />
          <label htmlFor="show-passwords" className="text-xs text-neutral-400 cursor-pointer">
            Show passwords
          </label>
        </div>
      </div>

      {/* 老王注释：密码要求提示 */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3">
        <p className="text-xs font-medium text-neutral-400">Password requirements:</p>
        <ul className="mt-2 space-y-1 text-[10px] text-neutral-500">
          <li className="flex items-center gap-2">
            <span className={newPassword.length >= 8 ? "text-emerald-400" : ""}>
              {newPassword.length >= 8 ? "✓" : "○"}
            </span>
            At least 8 characters
          </li>
          <li className="flex items-center gap-2">
            <span className={/[A-Z]/.test(newPassword) ? "text-emerald-400" : ""}>
              {/[A-Z]/.test(newPassword) ? "✓" : "○"}
            </span>
            One uppercase letter
          </li>
          <li className="flex items-center gap-2">
            <span className={/[a-z]/.test(newPassword) ? "text-emerald-400" : ""}>
              {/[a-z]/.test(newPassword) ? "✓" : "○"}
            </span>
            One lowercase letter
          </li>
          <li className="flex items-center gap-2">
            <span className={/[0-9]/.test(newPassword) ? "text-emerald-400" : ""}>
              {/[0-9]/.test(newPassword) ? "✓" : "○"}
            </span>
            One number
          </li>
        </ul>
      </div>

      {/* 老王注释：操作按钮 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setMessage("");
            setMessageType("");
          }}
          className="rounded-full border border-neutral-700 px-6 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={changing || !currentPassword || !newPassword || !confirmPassword}
          className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {changing ? "Changing..." : "Change Password"}
        </button>
      </div>
    </section>
  );
});

export default PasswordChangeSection;
