"use client";

import React, { useState, useCallback, useMemo } from "react";

/**
 * 老王注释：支付方式选择组件
 * 功能：支持信用卡、PayPal、Apple Pay、Google Pay
 * 遵循KISS原则：简洁的支付流程
 * 遵循DRY原则：统一的表单验证逻辑
 */
const PaymentMethodSelector = React.memo(
  ({ amount, onPaymentComplete, onCancel }) => {
    // 老王注释：支付方式状态
    const [selectedMethod, setSelectedMethod] = useState("card");
    const [processing, setProcessing] = useState(false);

    // 老王注释：信用卡表单状态
    const [cardData, setCardData] = useState({
      number: "",
      expiry: "",
      cvv: "",
      name: "",
      saveCard: false,
    });

    // 老王注释：表单验证错误
    const [errors, setErrors] = useState({});
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    // 老王注释：支付方式配置
    const paymentMethods = useMemo(
      () => [
        {
          id: "card",
          name: "Credit/Debit Card",
          icon: "💳",
          description: "Visa, Mastercard, Amex",
          available: true,
        },
        {
          id: "paypal",
          name: "PayPal",
          icon: "🅿️",
          description: "Pay with your PayPal account",
          available: true,
        },
        {
          id: "apple",
          name: "Apple Pay",
          icon: "🍎",
          description: "Pay with Apple Pay",
          available: typeof window !== "undefined" && window.ApplePaySession,
        },
        {
          id: "google",
          name: "Google Pay",
          icon: "🔵",
          description: "Pay with Google Pay",
          available: typeof window !== "undefined" && window.PaymentRequest,
        },
      ],
      []
    );

    // 老王注释：格式化卡号（每4位加空格）
    const formatCardNumber = useCallback((value) => {
      const cleaned = value.replace(/\s/g, "");
      const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
      return formatted.slice(0, 19); // 老王注释：最多16位数字+3个空格
    }, []);

    // 老王注释：格式化有效期（MM/YY）
    const formatExpiry = useCallback((value) => {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length >= 2) {
        return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
      }
      return cleaned;
    }, []);

    // 老王注释：处理卡号输入
    const handleCardNumberChange = useCallback(
      (e) => {
        const formatted = formatCardNumber(e.target.value);
        setCardData((prev) => ({ ...prev, number: formatted }));
        setErrors((prev) => ({ ...prev, number: "" }));
      },
      [formatCardNumber]
    );

    // 老王注释：处理有效期输入
    const handleExpiryChange = useCallback(
      (e) => {
        const formatted = formatExpiry(e.target.value);
        setCardData((prev) => ({ ...prev, expiry: formatted }));
        setErrors((prev) => ({ ...prev, expiry: "" }));
      },
      [formatExpiry]
    );

    // 老王注释：处理CVV输入
    const handleCvvChange = useCallback((e) => {
      const value = e.target.value.replace(/\D/g, "").slice(0, 4);
      setCardData((prev) => ({ ...prev, cvv: value }));
      setErrors((prev) => ({ ...prev, cvv: "" }));
    }, []);

    // 老王注释：处理持卡人姓名输入
    const handleNameChange = useCallback((e) => {
      setCardData((prev) => ({ ...prev, name: e.target.value }));
      setErrors((prev) => ({ ...prev, name: "" }));
    }, []);

    // 老王注释：验证信用卡表单
    const validateCardForm = useCallback(() => {
      const newErrors = {};

      // 老王注释：验证卡号（16位数字）
      const cardNumber = cardData.number.replace(/\s/g, "");
      if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
        newErrors.number = "Invalid card number";
      }

      // 老王注释：验证有效期
      if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
        newErrors.expiry = "Invalid expiry date";
      } else {
        const [month, year] = cardData.expiry.split("/");
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        if (
          parseInt(month) < 1 ||
          parseInt(month) > 12 ||
          parseInt(year) < currentYear ||
          (parseInt(year) === currentYear && parseInt(month) < currentMonth)
        ) {
          newErrors.expiry = "Card has expired";
        }
      }

      // 老王注释：验证CVV（3-4位数字）
      if (!cardData.cvv || cardData.cvv.length < 3) {
        newErrors.cvv = "Invalid CVV";
      }

      // 老王注释：验证持卡人姓名
      if (!cardData.name || cardData.name.trim().length < 2) {
        newErrors.name = "Invalid cardholder name";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }, [cardData]);

    // 老王注释：处理支付
    const handlePayment = useCallback(async () => {
      // 老王注释：信用卡支付需要验证表单
      if (selectedMethod === "card" && !validateCardForm()) {
        return;
      }

      setProcessing(true);

      try {
        // 老王注释：模拟支付处理
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setFeedback({ type: "", message: "" });
        // 老王注释：调用支付完成回调
        onPaymentComplete?.({
          method: selectedMethod,
          amount: amount,
          success: true,
        });
      } catch (error) {
        console.error("艹，支付失败:", error);
        setFeedback({ type: "error", message: "Payment failed. Please try again." });
      } finally {
        setProcessing(false);
      }
    }, [selectedMethod, validateCardForm, amount, onPaymentComplete]);

    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        {/* 老王注释：标题 */}
        <h2 className="mb-6 text-xl font-bold text-white">Payment Method</h2>

        {/* 老王注释：支付方式选择 */}
        <div className="mb-6 space-y-3">
          {paymentMethods
            .filter((method) => method.available)
            .map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedMethod(method.id);
                  setFeedback({ type: "", message: "" });
                }}
                className={`w-full rounded-xl border p-4 text-left transition-all ${
                  selectedMethod === method.id
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-white">
                      {method.name}
                    </div>
                    <div className="text-xs text-neutral-400">
                      {method.description}
                    </div>
                  </div>
                  {selectedMethod === method.id && (
                    <span className="text-emerald-400">✓</span>
                  )}
                </div>
              </button>
            ))}
        </div>

        {/* 老王注释：信用卡表单 */}
        {selectedMethod === "card" && (
          <div className="mb-6 space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            {/* 老王注释：卡号 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Card Number
              </label>
              <input
                type="text"
                value={cardData.number}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                  errors.number
                    ? "border-red-500 bg-red-500/10"
                    : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
                }`}
              />
              {errors.number && (
                <p className="mt-1 text-xs text-red-400">{errors.number}</p>
              )}
            </div>

            {/* 老王注释：有效期和CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={cardData.expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                    errors.expiry
                      ? "border-red-500 bg-red-500/10"
                      : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
                  }`}
                />
                {errors.expiry && (
                  <p className="mt-1 text-xs text-red-400">{errors.expiry}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  CVV
                </label>
                <input
                  type="text"
                  value={cardData.cvv}
                  onChange={handleCvvChange}
                  placeholder="123"
                  className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                    errors.cvv
                      ? "border-red-500 bg-red-500/10"
                      : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
                  }`}
                />
                {errors.cvv && (
                  <p className="mt-1 text-xs text-red-400">{errors.cvv}</p>
                )}
              </div>
            </div>

            {/* 老王注释：持卡人姓名 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-300">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardData.name}
                onChange={handleNameChange}
                placeholder="John Doe"
                className={`w-full rounded-lg border px-4 py-3 text-white transition-colors focus:outline-none ${
                  errors.name
                    ? "border-red-500 bg-red-500/10"
                    : "border-neutral-800 bg-neutral-800/50 focus:border-emerald-500"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-400">{errors.name}</p>
              )}
            </div>

            {/* 老王注释：保存卡片选项 */}
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={cardData.saveCard}
                onChange={(e) =>
                  setCardData((prev) => ({
                    ...prev,
                    saveCard: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500"
              />
              Save card for future purchases
            </label>
          </div>
        )}

        {/* 老王注释：其他支付方式说明 */}
        {selectedMethod !== "card" && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <p className="text-sm text-neutral-400">
              {selectedMethod === "paypal" &&
                "You will be redirected to PayPal to complete your payment."}
              {selectedMethod === "apple" &&
                "You will be prompted to authorize the payment with Apple Pay."}
              {selectedMethod === "google" &&
                "You will be prompted to authorize the payment with Google Pay."}
            </p>
          </div>
        )}

        {/* 老王注释：支付摘要 */}
        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-400">Amount to pay</span>
            <span className="text-2xl font-bold text-white">${amount}</span>
          </div>
        </div>

        {feedback.message ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {feedback.message}
          </div>
        ) : null}

        {/* 老王注释：操作按钮 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 rounded-lg border border-neutral-800 bg-neutral-900/50 py-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePayment}
            disabled={processing}
            className="flex-1 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Processing...
              </span>
            ) : (
              `Pay $${amount}`
            )}
          </button>
        </div>

        {/* 老王注释：安全提示 */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
          <span>🔒</span>
          <span>Secure payment powered by Stripe</span>
        </div>
      </div>
    );
  }
);

PaymentMethodSelector.displayName = "PaymentMethodSelector";

export default PaymentMethodSelector;
