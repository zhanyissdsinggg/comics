"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * 老王注释：用户主页组件
 * 功能：展示个人资料、关注列表、阅读历史、收藏、评论
 * 遵循KISS原则：简洁的Tab切换设计
 * 遵循DRY原则：统一的卡片样式复用
 */
const UserProfilePage = React.memo(({ userId }) => {
  // 老王注释：Tab状态管理
  const [activeTab, setActiveTab] = useState("following");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    following: 0,
    readChapters: 0,
    bookmarks: 0,
    comments: 0,
  });
  const [following, setFollowing] = useState([]);
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // 老王注释：加载用户资料
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        // 老王注释：从localStorage加载用户资料（实际项目应该从API获取）
        const savedProfile = localStorage.getItem("mn_user_profile");
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }

        // 老王注释：加载统计数据（模拟数据）
        setStats({
          following: 24,
          readChapters: 156,
          bookmarks: 12,
          comments: 38,
        });

        // 老王注释：加载关注列表（模拟数据）
        setFollowing([
          {
            id: 1,
            title: "Solo Leveling",
            cover: "/placeholder-cover.svg",
            latestChapter: "Chapter 180",
            updatedAt: "2 hours ago",
            genre: "Action",
          },
          {
            id: 2,
            title: "Tower of God",
            cover: "/placeholder-cover.svg",
            latestChapter: "Chapter 550",
            updatedAt: "1 day ago",
            genre: "Fantasy",
          },
          {
            id: 3,
            title: "The Beginning After The End",
            cover: "/placeholder-cover.svg",
            latestChapter: "Chapter 175",
            updatedAt: "3 days ago",
            genre: "Fantasy",
          },
        ]);

        // 老王注释：加载阅读历史（模拟数据）
        setHistory([
          {
            id: 1,
            seriesTitle: "Solo Leveling",
            episodeTitle: "Chapter 179",
            cover: "/placeholder-cover.svg",
            progress: 85,
            readAt: "2 hours ago",
          },
          {
            id: 2,
            seriesTitle: "Tower of God",
            episodeTitle: "Chapter 548",
            cover: "/placeholder-cover.svg",
            progress: 100,
            readAt: "1 day ago",
          },
        ]);

        // 老王注释：加载收藏（模拟数据）
        setBookmarks([
          {
            id: 1,
            title: "Omniscient Reader",
            cover: "/placeholder-cover.svg",
            genre: "Fantasy",
            bookmarkedAt: "1 week ago",
          },
        ]);

        // 老王注释：加载评论（模拟数据）
        setComments([
          {
            id: 1,
            seriesTitle: "Solo Leveling",
            episodeTitle: "Chapter 179",
            content: "This chapter was amazing! The art is incredible.",
            likes: 24,
            createdAt: "2 hours ago",
          },
        ]);
      } catch (error) {
        console.error("Failed to load user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // 老王注释：Tab配置
  const tabs = useMemo(
    () => [
      { id: "following", label: "Following", count: stats.following },
      { id: "history", label: "Reading History", count: stats.readChapters },
      { id: "bookmarks", label: "Bookmarks", count: stats.bookmarks },
      { id: "comments", label: "Comments", count: stats.comments },
    ],
    [stats]
  );

  // 老王注释：取消关注
  const handleUnfollow = (seriesId) => {
    setFollowing((prev) => prev.filter((item) => item.id !== seriesId));
    setStats((prev) => ({ ...prev, following: prev.following - 1 }));
  };

  // 老王注释：删除书签
  const handleRemoveBookmark = (bookmarkId) => {
    setBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
    setStats((prev) => ({ ...prev, bookmarks: prev.bookmarks - 1 }));
  };

  // 老王注释：删除评论
  const handleDeleteComment = (commentId) => {
    setComments((prev) => prev.filter((item) => item.id !== commentId));
    setStats((prev) => ({ ...prev, comments: prev.comments - 1 }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-neutral-700 border-t-emerald-500"></div>
          <p className="text-sm text-neutral-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* 老王注释：个人资料头部 */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <div className="flex items-start gap-6">
          {/* 老王注释：头像 */}
          <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-full border-2 border-emerald-500/20">
            <Image
              src={profile?.avatar || "/default-avatar.svg"}
              alt="User Avatar"
              width={96}
              height={96}
              className="object-cover"
            />
          </div>

          {/* 老王注释：用户信息 */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {profile?.nickname || "Anonymous User"}
              </h1>
              <Link
                href="/account"
                className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-700"
              >
                Edit Profile
              </Link>
            </div>
            {profile?.bio && (
              <p className="mb-3 text-sm text-neutral-400">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span>📅 Joined {profile?.joinedAt || "January 2024"}</span>
              {profile?.birthday && <span>🎂 {profile.birthday}</span>}
            </div>
          </div>
        </div>

        {/* 老王注释：统计数据 */}
        <div className="mt-6 grid grid-cols-4 gap-4 border-t border-neutral-800 pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.following}
            </div>
            <div className="text-xs text-neutral-500">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {stats.readChapters}
            </div>
            <div className="text-xs text-neutral-500">Chapters Read</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.bookmarks}
            </div>
            <div className="text-xs text-neutral-500">Bookmarks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {stats.comments}
            </div>
            <div className="text-xs text-neutral-500">Comments</div>
          </div>
        </div>
      </div>

      {/* 老王注释：Tab导航 */}
      <div className="mb-6 flex gap-2 border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-emerald-400"
                : "text-neutral-400 hover:text-neutral-300"
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-neutral-800 text-neutral-500"
              }`}
            >
              {tab.count}
            </span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"></div>
            )}
          </button>
        ))}
      </div>

      {/* 老王注释：Tab内容 */}
      <div className="min-h-[400px]">
        {/* 老王注释：关注列表 */}
        {activeTab === "following" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {following.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-neutral-500">No series followed yet</p>
              </div>
            ) : (
              following.map((series) => (
                <div
                  key={series.id}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="mb-3 flex gap-3">
                    <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={series.cover}
                        alt={series.title}
                        width={56}
                        height={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white">
                        {series.title}
                      </h3>
                      <p className="mb-1 text-xs text-emerald-400">
                        {series.latestChapter}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {series.updatedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/series/${series.id}`}
                      className="flex-1 rounded-lg bg-emerald-500/10 py-2 text-center text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                    >
                      View Series
                    </Link>
                    <button
                      onClick={() => handleUnfollow(series.id)}
                      className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      Unfollow
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 老王注释：阅读历史 */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-neutral-500">No reading history yet</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={item.cover}
                      alt={item.seriesTitle}
                      width={64}
                      height={96}
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm font-semibold text-white">
                      {item.seriesTitle}
                    </h3>
                    <p className="mb-2 text-xs text-neutral-400">
                      {item.episodeTitle}
                    </p>
                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-neutral-500">Progress</span>
                        <span className="text-emerald-400">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-500">{item.readAt}</p>
                  </div>
                  <Link
                    href={`/reader/${item.id}`}
                    className="flex h-10 items-center rounded-lg bg-emerald-500/10 px-4 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    Continue
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {/* 老王注释：书签 */}
        {activeTab === "bookmarks" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.length === 0 ? (
              <div className="col-span-full py-12 text-center">
                <p className="text-neutral-500">No bookmarks yet</p>
              </div>
            ) : (
              bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="group rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="mb-3 flex gap-3">
                    <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={bookmark.cover}
                        alt={bookmark.title}
                        width={56}
                        height={80}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white">
                        {bookmark.title}
                      </h3>
                      <p className="mb-1 text-xs text-purple-400">
                        {bookmark.genre}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {bookmark.bookmarkedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/series/${bookmark.id}`}
                      className="flex-1 rounded-lg bg-purple-500/10 py-2 text-center text-xs font-medium text-purple-400 transition-colors hover:bg-purple-500/20"
                    >
                      View Series
                    </Link>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="rounded-lg bg-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 老王注释：评论 */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-neutral-500">No comments yet</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-700"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="mb-1 text-sm font-semibold text-white">
                        {comment.seriesTitle}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {comment.episodeTitle}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="mb-3 text-sm text-neutral-300">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      ❤️ {comment.likes} likes
                    </span>
                    <span>{comment.createdAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

UserProfilePage.displayName = "UserProfilePage";

export default UserProfilePage;
