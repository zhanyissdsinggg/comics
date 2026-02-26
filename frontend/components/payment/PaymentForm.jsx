"use client";

import { useState, useCallback } from "react";
import { track } from "../../lib/analytics";

/**
 * 老王注释：支付表单组件 - 集成Stripe支付
 * 职责单一：显示支付表单，处理支付流程
 * 这个SB组件把支付逻辑集中在一起，方便维护和扩展
 */
export default function PaymentForm({
  amount,
  currency = "USD",
  onSuccess,
  onError,
  packages = []
}) {
  const [selectedPackage, setSelectedPackage] = useState(packages[0]?.id || null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const handlePayment = useCallback(async () => {
    if (!selectedPackage) {
      setCardError("Please select a package");
      return;
    }

    setLoading(true);
    setCardError("");

    try {
      track("payment_attempt", {
        package: selectedPackage,
        method: paymentMethod,
        amount
      });

      // 创建支付意图
      const response = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage,
          paymentMethod,
          amount,
          currency,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Payment failed");
      }

      const data = await response.json();

      // 根据支付方式处理
      if (paymentMethod === "card") {
        // 使用Stripe处理卡支付
        await handleCardPayment(data.clientSecret);
      } else if (paymentMethod === "apple_pay") {
        // 使用Apple Pay
        await handleApplePayment(data.clientSecret);
      } else if (paymentMethod === "google_pay") {
        // 使用Google Pay
        await handleGooglePayment(data.clientSecret);
      }

      track("payment_success", { package: selectedPackage });
      onSuccess(data);
    } catch (error) {
      console.error("Payment error:", error);
      track("payment_error", { error: error.message });
      setCardError(error.message);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPackage, paymentMethod, amount, currency, onSuccess, onError]);

  const handleCardPayment = useCallback(async (clientSecret) => {
    // 这里应该集成Stripe.js库来处理卡支付
    // 示例代码（实际需要引入@stripe/react-stripe-js）
    if (typeof window === "undefined") return;

    if (!window.Stripe) {
      throw new Error("Stripe not loaded");
    }

    const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
    const elements = stripe.elements();
    const cardElement = elements.create("card");

    // 这里应该挂载cardElement到DOM
    // cardElement.mount("#card-element");

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentIntent;
  }, []);

  const handleApplePayment = useCallback(async (clientSecret) => {
    // Apple Pay支付处理
    if (typeof window === "undefined") return;

    if (!window.ApplePaySession) {
      throw new Error("Apple Pay not available");
    }

    const paymentRequest = {
      countryCode: "US",
      currencyCode: currency,
      supportedNetworks: ["visa", "mastercard", "amex"],
      supportedCountries: ["US", "GB", "CA", "AU"],
      total: {
        label: "Gush Comics",
        amount: (amount / 100).toString(),
      },
    };

    const session = new window.ApplePaySession(3, paymentRequest);
    session.onpaymentauthorized = async (event) => {
      // 处理Apple Pay授权
      const response = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSecret,
          paymentToken: event.payment.token,
        }),
      });

      if (response.ok) {
        session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
      } else {
        session.completePayment(window.ApplePaySession.STATUS_FAILURE);
      }
    };

    session.begin();
  }, [currency, amount]);

  const handleGooglePayment = useCallback(async (clientSecret) => {
    // Google Pay支付处理
    if (typeof window === "undefined") return;

    if (!window.google?.payments?.api) {
      throw new Error("Google Pay not available");
    }

    const paymentsClient = new window.google.payments.api.PaymentsClient({
      environment: "PRODUCTION",
    });

    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [
        {
          type: "CARD",
          parameters: {
            allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX"],
            allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
          },
        },
      ],
      transactionInfo: {
        totalPriceStatus: "FINAL",
        totalPrice: (amount / 100).toString(),
        currencyCode: currency,
      },
    };

    const response = await paymentsClient.loadPaymentData(paymentDataRequest);

    if (response.paymentMethodData) {
      const confirmResponse = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSecret,
          paymentToken: response.paymentMethodData.tokenizationData.token,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error("Payment confirmation failed");
      }
    }
  }, [currency, amount]);

  return (
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-lg font-semibold text-white">Select Package</h3>

      {/* 套餐选择 */}
      <div className="mb-6 space-y-2">
        {packages.map((pkg) => (
          <label
            key={pkg.id}
            className="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition-colors"
          >
            <input
              type="radio"
              name="package"
              value={pkg.id}
              checked={selectedPackage === pkg.id}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="h-4 w-4"
            />
            <div className="flex-1">
              <div className="font-medium text-white">{pkg.name}</div>
              <div className="text-sm text-neutral-400">{pkg.points} points</div>
            </div>
            <div className="font-semibold text-emerald-400">
              ${(pkg.price / 100).toFixed(2)}
            </div>
          </label>
        ))}
      </div>

      {/* 支付方式选择 */}
      <h3 className="mb-4 text-lg font-semibold text-white">Payment Method</h3>
      <div className="mb-6 space-y-2">
        <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition-colors">
          <input
            type="radio"
            name="method"
            value="card"
            checked={paymentMethod === "card"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Credit/Debit Card</span>
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition-colors">
          <input
            type="radio"
            name="method"
            value="apple_pay"
            checked={paymentMethod === "apple_pay"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Apple Pay</span>
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-white/10 p-3 cursor-pointer hover:bg-white/5 transition-colors">
          <input
            type="radio"
            name="method"
            value="google_pay"
            checked={paymentMethod === "google_pay"}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Google Pay</span>
        </label>
      </div>

      {/* 错误提示 */}
      {cardError && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {cardError}
        </div>
      )}

      {/* 支付按钮 */}
      <button
        onClick={handlePayment}
        disabled={loading || !selectedPackage}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
      >
        {loading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
      </button>

      {/* 安全提示 */}
      <div className="mt-4 text-center text-xs text-neutral-400">
        <p>🔒 Your payment is secure and encrypted</p>
      </div>
    </div>
  );
}
