"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { apiPost } from "../../lib/apiClient";

/**
 * 老王注释：个人资料编辑组件
 * 包括头像上传、昵称、生日、简介等信息编辑
 */
const ProfileEditSection = memo(function ProfileEditSection({ user, onUpdate }) {
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [birthday, setBirthday] = useState(user?.birthday || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 老王注释：处理头像文件上传
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // 老王注释：检查文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Avatar file too large (max 2MB)");
      return;
    }

    // 老王注释：检查文件类型
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // 老王注释：将图片转换为base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;

        // 老王注释：上传到服务器
        const response = await apiPost("/api/auth/upload-avatar", {
          avatar: base64,
        });

        if (response.ok) {
          setAvatar(response.data?.avatarUrl || base64);
          setMessage("Avatar uploaded successfully");
          if (onUpdate) {
            onUpdate({ avatar: response.data?.avatarUrl || base64 });
          }
        } else {
          setMessage(response.error || "Upload failed");
        }
        setUploading(false);
      };

      reader.onerror = () => {
        setMessage("Failed to read file");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setMessage("Upload failed");
      setUploading(false);
    }
  };

  // 老王注释：保存个人资料
  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    const response = await apiPost("/api/auth/update-profile", {
      nickname,
      bio,
      birthday,
      avatar,
    });

    if (response.ok) {
      setMessage("Profile updated successfully");
      if (onUpdate) {
        onUpdate({ nickname, bio, birthday, avatar });
      }
    } else {
      setMessage(response.error || "Update failed");
    }

    setSaving(false);
  };

  return (
    <section className="rounded-3xl border border-neutral-900 bg-neutral-900/50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profile Information</h2>
        {message ? (
          <div className="text-xs text-emerald-400">{message}</div>
        ) : null}
      </div>

      {/* 老王注释：头像上传区域 */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-neutral-800 bg-neutral-900">
            {avatar ? (
              <Image
                src={avatar}
                alt="Avatar"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-neutral-600">
                👤
              </div>
            )}
          </div>
          <label
            htmlFor="avatar-upload"
            className="mt-3 block cursor-pointer rounded-full border border-neutral-700 px-4 py-2 text-center text-xs text-neutral-300 hover:bg-neutral-900"
          >
            {uploading ? "Uploading..." : "Change Avatar"}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={uploading}
            className="hidden"
          />
          <p className="mt-2 text-center text-[10px] text-neutral-500">
            Max 2MB, JPG/PNG
          </p>
        </div>

        <div className="flex-1 space-y-4">
          {/* 老王注释：昵称输入 */}
          <div>
            <label className="block text-xs font-medium text-neutral-400">
              Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={50}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-neutral-500">
              {nickname.length}/50 characters
            </p>
          </div>

          {/* 老王注释：生日输入 */}
          <div>
            <label className="block text-xs font-medium text-neutral-400">
              Birthday
            </label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 老王注释：个人简介 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell us about yourself..."
          maxLength={200}
          rows={4}
          className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:border-emerald-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-neutral-500">
          {bio.length}/200 characters
        </p>
      </div>

      {/* 老王注释：保存按钮 */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setNickname(user?.nickname || "");
            setBio(user?.bio || "");
            setBirthday(user?.birthday || "");
            setAvatar(user?.avatar || "");
            setMessage("");
          }}
          className="rounded-full border border-neutral-700 px-6 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-900"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  );
});

export default ProfileEditSection;
