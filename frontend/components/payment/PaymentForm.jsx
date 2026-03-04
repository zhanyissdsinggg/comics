"use client";

import { useState, useCallback } from "react";
import { trackEvent } from "../../lib/trackEvent";

export default function PaymentForm({
  amount,
  currency = "USD",
  onSuccess,
  onError,
  packages = [],
}) {
  const [selectedPackage, setSelectedPackage] = useState(packages[0]?.id || null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  const handleCardPayment = useCallback(async (clientSecret) => {
    if (typeof window === "undefined") {
      return;
    }
    if (!window.Stripe) {
      throw new Error("Stripe not loaded");
    }

    const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
    const elements = stripe.elements();
    const cardElement = elements.create("card");
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
    return result.paymentIntent;
  }, []);

  const handleApplePayment = useCallback(
    async (clientSecret) => {
      if (typeof window === "undefined") {
        return;
      }
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
    },
    [amount, currency],
  );

  const handleGooglePayment = useCallback(
    async (clientSecret) => {
      if (typeof window === "undefined") {
        return;
      }
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
    },
    [amount, currency],
  );

  const handlePayment = useCallback(async () => {
    if (!selectedPackage) {
      setCardError("Please select a package");
      return;
    }

    setLoading(true);
    setCardError("");

    try {
      trackEvent("payment_attempt", {
        package: selectedPackage,
        method: paymentMethod,
        amount,
      });

      const response = await fetch("/api/payments/create", {
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
      if (paymentMethod === "card") {
        await handleCardPayment(data.clientSecret);
      } else if (paymentMethod === "apple_pay") {
        await handleApplePayment(data.clientSecret);
      } else if (paymentMethod === "google_pay") {
        await handleGooglePayment(data.clientSecret);
      }

      trackEvent("payment_success", { package: selectedPackage });
      onSuccess(data);
    } catch (error) {
      console.error("Payment error:", error);
      trackEvent("payment_error", { error: error.message });
      setCardError(error.message);
      onError(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    currency,
    handleApplePayment,
    handleCardPayment,
    handleGooglePayment,
    onError,
    onSuccess,
    paymentMethod,
    selectedPackage,
  ]);

  return (
    <div className="w-full max-w-md rounded-lg border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-lg font-semibold text-white">Select Package</h3>

      <div className="mb-6 space-y-2">
        {packages.map((pkg) => (
          <label
            key={pkg.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5"
          >
            <input
              type="radio"
              name="package"
              value={pkg.id}
              checked={selectedPackage === pkg.id}
              onChange={(event) => setSelectedPackage(event.target.value)}
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

      <h3 className="mb-4 text-lg font-semibold text-white">Payment Method</h3>
      <div className="mb-6 space-y-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
          <input
            type="radio"
            name="method"
            value="card"
            checked={paymentMethod === "card"}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Credit/Debit Card</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
          <input
            type="radio"
            name="method"
            value="apple_pay"
            checked={paymentMethod === "apple_pay"}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Apple Pay</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 p-3 transition-colors hover:bg-white/5">
          <input
            type="radio"
            name="method"
            value="google_pay"
            checked={paymentMethod === "google_pay"}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="h-4 w-4"
          />
          <span className="text-white">Google Pay</span>
        </label>
      </div>

      {cardError ? (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {cardError}
        </div>
      ) : null}

      <button
        onClick={handlePayment}
        disabled={loading || !selectedPackage}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
      >
        {loading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
      </button>

      <div className="mt-4 text-center text-xs text-neutral-400">
        <p>Your payment is secure and encrypted</p>
      </div>
    </div>
  );
}
