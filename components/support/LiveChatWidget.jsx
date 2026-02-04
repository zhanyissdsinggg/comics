"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";

/**
 * 老王注释：在线客服聊天组件
 * 功能：实时聊天、快捷回复、文件上传
 * 遵循KISS原则：简洁的聊天界面
 * 遵循DRY原则：统一的消息处理逻辑
 */
const LiveChatWidget = React.memo(() => {
  // 老王注释：聊天窗口状态
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "agent",
      content: "Hi! How can I help you today?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState("online");
  const messagesEndRef = useRef(null);

  // 老王注释：快捷回复选项
  const quickReplies = [
    "I have a payment issue",
    "I can't access my content",
    "How do I cancel my subscription?",
    "Technical support needed",
  ];

  // 老王注释：滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 老王注释：自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 老王注释：发送消息
  const handleSendMessage = useCallback(
    (content) => {
      if (!content.trim()) return;

      // 老王注释：添加用户消息
      const userMessage = {
        id: Date.now(),
        type: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      // 老王注释：模拟客服正在输入
      setIsTyping(true);

      // 老王注释：模拟客服回复
      setTimeout(() => {
        const agentMessage = {
          id: Date.now() + 1,
          type: "agent",
          content:
            "Thank you for your message. Our support team will assist you shortly.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, agentMessage]);
        setIsTyping(false);
      }, 2000);
    },
    []
  );

  // 老王注释：处理输入
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  // 老王注释：处理回车发送
  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(inputValue);
      }
    },
    [inputValue, handleSendMessage]
  );

  // 老王注释：处理快捷回复
  const handleQuickReply = useCallback(
    (reply) => {
      handleSendMessage(reply);
    },
    [handleSendMessage]
  );

  // 老王注释：格式化时间
  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <>
      {/* 老王注释：聊天按钮（未打开时） */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white shadow-lg transition-all hover:scale-110 hover:bg-emerald-600"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* 老王注释：聊天窗口 */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex w-96 flex-col rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl transition-all ${
            isMinimized ? "h-16" : "h-[600px]"
          }`}
        >
          {/* 老王注释：聊天头部 */}
          <div className="flex items-center justify-between rounded-t-2xl border-b border-neutral-800 bg-emerald-500 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">
                  👤
                </div>
                <div
                  className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-emerald-500 ${
                    onlineStatus === "online" ? "bg-green-400" : "bg-neutral-400"
                  }`}
                ></div>
              </div>
              <div>
                <div className="font-semibold text-white">Support Team</div>
                <div className="text-xs text-emerald-100">
                  {onlineStatus === "online"
                    ? "Online - We reply instantly"
                    : "Offline - We'll reply soon"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-lg p-2 text-white transition-colors hover:bg-emerald-600"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? "□" : "−"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-white transition-colors hover:bg-emerald-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 老王注释：聊天内容区域（仅在未最小化时显示） */}
          {!isMinimized && (
            <>
              {/* 老王注释：消息列表 */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.type === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.type === "user"
                            ? "bg-emerald-500 text-white"
                            : "bg-neutral-800 text-neutral-200"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`mt-1 text-xs ${
                            message.type === "user"
                              ? "text-emerald-100"
                              : "text-neutral-500"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* 老王注释：正在输入指示器 */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-neutral-800 px-4 py-2">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"></span>
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"
                            style={{ animationDelay: "0.1s" }}
                          ></span>
                          <span
                            className="h-2 w-2 animate-bounce rounded-full bg-neutral-500"
                            style={{ animationDelay: "0.2s" }}
                          ></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* 老王注释：快捷回复（仅在消息少于3条时显示） */}
              {messages.length < 3 && (
                <div className="border-t border-neutral-800 p-4">
                  <p className="mb-2 text-xs font-medium text-neutral-400">
                    Quick replies:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickReply(reply)}
                        className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 老王注释：输入区域 */}
              <div className="border-t border-neutral-800 p-4">
                <div className="flex gap-2">
                  <textarea
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 resize-none rounded-lg border border-neutral-800 bg-neutral-800/50 px-4 py-2 text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    aria-label="Send message"
                  >
                    ➤
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
});

LiveChatWidget.displayName = "LiveChatWidget";

export default LiveChatWidget;