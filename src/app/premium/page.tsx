"use client";

import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { PremiumPlan } from "@/types";

const plans: PremiumPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 4.99,
    period: "monthly",
    features: [
      "SD Quality (480p)",
      "Watch on 1 device",
      "Access to free content",
      "Ads supported",
      "Cancel anytime",
    ],
    recommended: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: 9.99,
    period: "monthly",
    features: [
      "HD Quality (720p-1080p)",
      "Watch on 2 devices",
      "Access to all premium movies",
      "Download for offline",
      "No ads on premium content",
      "Cancel anytime",
    ],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 14.99,
    period: "monthly",
    features: [
      "4K Ultra HD Quality",
      "Watch on 4 devices",
      "Access to all premium movies",
      "Download for offline",
      "No ads on any content",
      "Early access to new releases",
      "Cancel anytime",
    ],
    recommended: false,
  },
];

const annualPlans = {
  basic: 49.99,
  standard: 99.99,
  premium: 149.99,
};

export default function PremiumPage() {
  const { user, updateUser } = useUser();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const handleSubscribe = (planId: string) => {
    // Mock subscription - replace with actual payment gateway integration
    // const response = await fetch("/api/subscribe", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ planId }),
    // });

    if (user) {
      const updatedUser = {
        ...user,
        isPremium: true,
        premiumExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      updateUser(updatedUser);
      alert(`You have successfully subscribed to the ${planId} plan!`);
      router.push("/");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] pb-12">
      {/* Hero Section */}
      <div className="px-4 md:px-12 pt-20 pb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Watch Premium Movies Without Ads
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Get unlimited access to thousands of premium movies and TV shows.
          No ads, high quality, and download for offline viewing.
        </p>
      </div>

      {/* Pricing Plans */}
      <div className="px-4 md:px-12 pb-12">
        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-12">
          <span className={`mr-4 ${billingPeriod === "monthly" ? "text-white" : "text-gray-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
            className="relative w-14 h-8 bg-[#2a2a2a] rounded-full p-1 transition-colors"
          >
            <div
              className={`w-6 h-6 bg-[#E50914] rounded-full shadow-md transform transition-transform ${
                billingPeriod === "yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`ml-4 ${billingPeriod === "yearly" ? "text-white" : "text-gray-400"}`}>
            Yearly <span className="text-green-500 text-xs ml-1 font-bold">SAVE 20%</span>
          </span>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const price = billingPeriod === "monthly" ? plan.price : annualPlans[plan.id as keyof typeof annualPlans];

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-[#1f1f1f] overflow-hidden transition-all duration-300 ${
                  plan.recommended
                    ? "border-2 border-[#E50914] shadow-2xl scale-105 z-10"
                    : "border border-[#333333]"
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-bold text-white">
                      ${price.toFixed(2)}
                    </span>
                    <span className="text-gray-400 ml-2">
                      /{billingPeriod === "monthly" ? "month" : "year"}
                    </span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-3 rounded-lg font-bold transition-colors ${
                      user?.isPremium && user.id !== "1"
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-[#E50914] text-white hover:bg-[#F40612]"
                    }`}
                    disabled={user?.isPremium && user.id !== "1"}
                  >
                    {user?.isPremium ? "Current Plan" : "Subscribe Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="px-4 md:px-12 pb-12 border-t border-[#2a2a2a]">
        <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {[
            { q: "Can I watch on multiple devices?", a: "Yes! Basic allows 1 device, Standard allows 2 devices, and Premium allows up to 4 devices simultaneously." },
            { q: "Is there a free trial?", a: "Yes, we offer a 7-day free trial for new subscribers. No payment required to start." },
            { q: "Can I cancel anytime?", a: "Absolutely! There are no long-term contracts. You can cancel your subscription at any time." },
            { q: "What about downloads?", a: "Standard and Premium plans include download for offline viewing on mobile devices." },
            { q: "Is 4K content available?", a: "Yes! 4K Ultra HD content is available on the Premium plan for compatible devices." },
            { q: "Do premium plans have ads?", a: "Premium plans have no ads on premium content. Standard plan has no ads on premium content either." },
          ].map((faq, index) => (
            <div key={index} className="bg-[#1f1f1f] p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-2">{faq.q}</h3>
              <p className="text-gray-400 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
