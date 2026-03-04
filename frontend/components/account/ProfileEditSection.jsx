"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { apiPost } from "../../lib/apiClient";

/**
 * 鑰佺帇娉ㄩ噴锛氫釜浜鸿祫鏂欑紪杈戠粍浠? * 鍖呮嫭澶村儚涓婁紶銆佹樀绉般€佺敓鏃ャ€佺畝浠嬬瓑淇℃伅缂栬緫
 */
const ProfileEditSection = memo(function ProfileEditSection({ user, onUpdate }) {
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [birthday, setBirthday] = useState(user?.birthday || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 鑰佺帇娉ㄩ噴锛氬鐞嗗ご鍍忔枃浠朵笂浼?
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // 鑰佺帇娉ㄩ噴锛氭鏌ユ枃浠跺ぇ灏忥紙鏈€澶?MB锛?
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Avatar file too large (max 2MB)");
      return;
    }

    // 鑰佺帇娉ㄩ噴锛氭鏌ユ枃浠剁被鍨?
    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // 鑰佺帇娉ㄩ噴锛氬皢鍥剧墖杞崲涓篵ase64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result;

        // 鑰佺帇娉ㄩ噴锛氫笂浼犲埌鏈嶅姟鍣?
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

  // 鑰佺帇娉ㄩ噴锛氫繚瀛樹釜浜鸿祫鏂?
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

      {/* 鑰佺帇娉ㄩ噴锛氬ご鍍忎笂浼犲尯鍩?*/}
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
                馃懁
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
          {/* 鑰佺帇娉ㄩ噴锛氭樀绉拌緭鍏?*/}
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

          {/* 鑰佺帇娉ㄩ噴锛氱敓鏃ヨ緭鍏?*/}
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

      {/* 鑰佺帇娉ㄩ噴锛氫釜浜虹畝浠?*/}
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

      {/* 鑰佺帇娉ㄩ噴锛氫繚瀛樻寜閽?*/}
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