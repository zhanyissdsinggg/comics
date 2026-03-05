"use client";

import React, { useState, useCallback } from "react";

/**
 * 老王注释：反馈表单组件
 * 功能：支持Bug报告、功能请求、一般反馈
 * 遵循KISS原则：简洁的表单设计
 * 遵循DRY原则：统一的表单验证逻辑
 */
const FeedbackForm = React.memo(({ onClose, onSubmit }) => {
  // 老王注释：表单状态
  const [formData, setFormData] = useState({
    type: "bug",
    title: "",
    description: "",
    email: "",
    attachments: [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // 老王注释：反馈类型配置
  const feedbackTypes = [
    {
      id: "bug",
      name: "Bug Report",
      icon: "🐛",
      description: "Report a technical issue",
    },
    {
      id: "feature",
      name: "Feature Request",
      icon: "💡",
      description: "Suggest a new feature",
    },
    {
      id: "general",
      name: "General Feedback",
      icon: "💬",
      description: "Share your thoughts",
    },
  ];

  // 老王注释：处理类型选择
  const handleTypeChange = useCallback((type) => {
    setFormData((prev) => ({ ...prev, type }));
    setErrors((prev) => ({ ...prev, type: "" }));
    setFeedback({ type: "", message: "" });
  }, []);

  // 老王注释：处理输入变化
  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setFeedback({ type: "", message: "" });
  }, []);

  // 老王注释：处理文件上传
  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const invalidMessages = [];
    const validFiles = files.filter((file) => {
      // 老王注释：限制文件大小为5MB
      if (file.size > 5 * 1024 * 1024) {
        invalidMessages.push(`"${file.name}" is too large (max 5MB).`);
        return false;
      }
      // 老王注释：只允许图片文件
      if (!file.type.startsWith("image/")) {
        invalidMessages.push(`"${file.name}" is not an image file.`);
        return false;
      }
      return true;
    });

    setFormData((prev) => {
      const mergedAttachments = [...prev.attachments, ...validFiles];
      const nextAttachments = mergedAttachments.slice(0, 3); // 老王注释：最多3个文件

      if (mergedAttachments.length > 3) {
        invalidMessages.push("Maximum 3 attachments are allowed; extra files were ignored.");
      }

      return {
        ...prev,
        attachments: nextAttachments,
      };
    });

    if (invalidMessages.length > 0) {
      setFeedback({ type: "error", message: invalidMessages.join(" ") });
      return;
    }

    setFeedback({ type: "", message: "" });
  }, []);

  // 老王注释：删除附件
  const handleRemoveAttachment = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
    setFeedback({ type: "", message: "" });
  }, []);

  // 老王注释：验证表单
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // 老王注释：提交表单
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setSubmitting(true);

      try {
        // 老王注释：模拟提交延迟
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 老王注释：调用提交回调
        onSubmit?.(formData);

        // 老王注释：显示成功状态
        setSubmitted(true);

        // 老王注释：3秒后关闭
        setTimeout(() => {
          onClose?.();
        }, 3000);
      } catch (error) {
        console.error("艹，提交反馈失败:", error);
        setFeedback({ type: "error", message: "Failed to submit feedback. Please try again." });
      } finally {
        setSubmitting(false);
      }
    },
    [formData, validateForm, onSubmit, onClose]
  );

  // 老王注释：成功提交后的视图
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h3 className="mb-2 text-2xl font-bold text-white">
            Thank You!
          </h3>
          <p className="text-neutral-400">
            Your feedback has been submitted successfully. We&apos;ll review it and
            get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 老王注释：标题 */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Send Feedback</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {feedback.message ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {feedback.message}
            </div>
          ) : null}

          {/* 老王注释：反馈类型选择 */}
          <div>
            <label className="mb-3 block text-sm font-medium text-neutral-300">
              Feedback Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeChange(type.id)}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    formData.type === type.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                  }`}
                >
                  <div className="mb-2 text-2xl">{type.icon}</div>
                  <div className="text-sm font-semibold text-white">
                    {type.name}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 老王注释：标题输入 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Brief summary of your feedback"
              className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                errors.title
                  ? "border-red-500 bg-red-500/10"
                  : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">{errors.title}</p>
            )}
          </div>

          {/* 老王注释：详细描述输入 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Please provide as much detail as possible..."
              rows={6}
              className={`w-full resize-none rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                errors.description
                  ? "border-red-500 bg-red-500/10"
                  : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              {formData.description.length} / 1000 characters
            </p>
          </div>

          {/* 老王注释：文件上传 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Attachments (Optional)
            </label>
            <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-800/50 p-4">
              <input
                type="file"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="flex cursor-pointer flex-col items-center gap-2 text-center"
              >
                <span className="text-2xl">📎</span>
                <span className="text-sm text-neutral-400">
                  Click to upload screenshots (Max 3 files, 5MB each)
                </span>
              </label>

              {/* 老王注释：已上传文件列表 */}
              {formData.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">📄</span>
                        <span className="text-sm text-neutral-300">
                          {file.name}
                        </span>
                        <span className="text-xs text-neutral-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 老王注释：联系方式输入 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="your@email.com"
              className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                errors.email
                  ? "border-red-500 bg-red-500/10"
                  : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">{errors.email}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              We&apos;ll use this to follow up on your feedback
            </p>
          </div>

          {/* 老王注释：提交按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Submitting...
                </span>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

FeedbackForm.displayName = "FeedbackForm";

export default FeedbackForm;
