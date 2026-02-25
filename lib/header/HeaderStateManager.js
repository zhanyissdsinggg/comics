/**
 * 老王注释：Header状态管理器 - 集中管理所有Header相关的状态逻辑
 * 这个SB文件把所有状态管理逻辑从组件里抽出来，让组件更清爽
 * 职责：
 * - 管理模态框状态
 * - 管理认证错误状态
 * - 管理地区设置
 * - 提供统一的状态操作接口
 */

import { useState, useCallback, useEffect } from "react";

/**
 * 老王注释：Header状态Hook - 统一管理Header的所有状态
 * 这样做的好处：
 * 1. 状态逻辑集中，易于维护
 * 2. 组件只需要调用这个Hook，不用管理一堆state
 * 3. 状态变化逻辑可以复用
 */
export function useHeaderState() {
  // 模态框状态
  const [activeModal, setActiveModal] = useState(null);
  const [authError, setAuthError] = useState("");
  const [pendingAdultToggle, setPendingAdultToggle] = useState(false);
  const [region, setRegion] = useState("global");

  // 初始化地区设置
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("mn_region");
    const { getCookie } = require("../../lib/cookies");
    const cookieRegion = getCookie("mn_region");
    setRegion(stored || cookieRegion || "global");
  }, []);

  // 打开模态框
  const openModal = useCallback((modalName) => {
    setActiveModal(modalName);
  }, []);

  // 关闭模态框
  const closeModal = useCallback((modalName) => {
    setActiveModal(null);
  }, []);

  // 设置认证错误
  const setError = useCallback((error) => {
    setAuthError(error);
  }, []);

  // 清除认证错误
  const clearError = useCallback(() => {
    setAuthError("");
  }, []);

  // 设置待处理的18+切换
  const setPending = useCallback((pending) => {
    setPendingAdultToggle(pending);
  }, []);

  // 重置所有状态
  const reset = useCallback(() => {
    setActiveModal(null);
    setAuthError("");
    setPendingAdultToggle(false);
  }, []);

  return {
    // 状态
    activeModal,
    authError,
    pendingAdultToggle,
    region,

    // 操作
    openModal,
    closeModal,
    setError,
    clearError,
    setPending,
    reset,
  };
}

/**
 * 老王注释：模态框状态管理器 - 专门处理模态框的打开/关闭逻辑
 * 这个SB类把模态框逻辑集中在一起，方便扩展
 */
export class ModalStateManager {
  constructor() {
    this.modals = new Map();
  }

  // 注册模态框
  register(name, initialState = false) {
    this.modals.set(name, initialState);
  }

  // 打开模态框
  open(name) {
    if (!this.modals.has(name)) {
      console.warn(`Modal "${name}" not registered`);
      return;
    }
    this.modals.set(name, true);
  }

  // 关闭模态框
  close(name) {
    if (!this.modals.has(name)) {
      console.warn(`Modal "${name}" not registered`);
      return;
    }
    this.modals.set(name, false);
  }

  // 切换模态框
  toggle(name) {
    if (!this.modals.has(name)) {
      console.warn(`Modal "${name}" not registered`);
      return;
    }
    const current = this.modals.get(name);
    this.modals.set(name, !current);
  }

  // 获取模态框状态
  isOpen(name) {
    return this.modals.get(name) || false;
  }

  // 获取所有模态框状态
  getAll() {
    return Object.fromEntries(this.modals);
  }

  // 关闭所有模态框
  closeAll() {
    for (const [name] of this.modals) {
      this.modals.set(name, false);
    }
  }
}
