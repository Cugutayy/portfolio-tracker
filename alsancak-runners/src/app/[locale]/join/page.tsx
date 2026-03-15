"use client";

import { Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AUTH_ERROR_KEYS: Record<string, string> = {
  AccessDenied: "errors.accessDenied",
  Configuration: "errors.configuration",
  OAuthSignin: "errors.oauthSignin",
  OAuthCallback: "errors.oauthCallback",
  OAuthAccountNotLinked: "errors.oauthAccountNotLinked",
  CredentialsSignin: "errors.credentialsSignin",
  Default: "errors.default",
};

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E6FF00] border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("join");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    instagram: "",
    pace: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"join" | "login">("join");

  // Display Auth.js error from URL params (e.g., ?error=AccessDenied)
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      const errorKey = AUTH_ERROR_KEYS[authError] || AUTH_ERROR_KEYS.Default;
      setError(t(errorKey));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "join") {
        // Register
        const res = await fetch("/api/members/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            instagram: formData.instagram,
            pace: formData.pace,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || t("errors.somethingWentWrong"));
          setLoading(false);
          return;
        }

        // Auto sign-in after registration
        const signInResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          setSubmitted(true);
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        } else {
          setSubmitted(true);
        }
      } else {
        // Login
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          window.location.href = "/dashboard";
        } else {
          setError(t("errors.invalidCredentials"));
        }
      }
    } catch {
      setError(t("errors.somethingWentWrongRetry"));
    } finally {
      setLoading(false);
    }
  };

  const handleStravaSignIn = async () => {
    try {
      setError("");
      setLoading(true);
      await signIn("strava", { callbackUrl: "/dashboard" });
    } catch {
      setError(t("errors.stravaSignInFailed"));
      setLoading(false);
    }
  };

  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#0A0A0A] pt-32 pb-32">
        <div className="max-w-[600px] mx-auto px-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <p className="label-text text-white/60 mb-4">
              {mode === "join" ? t("becomeAMember") : t("welcomeBack")}
            </p>
            <h1 className="headline-xl mb-6">
              {(() => {
                const title = mode === "join" ? t("joinTheRun") : t("signInTitle");
                const lines = title.split("\n");
                return lines.length > 1 ? (
                  <>
                    {lines[0]}<br />
                    <span className="text-[#E6FF00]">{lines[1]}</span>
                  </>
                ) : (
                  <span className="text-[#E6FF00]">{lines[0]}</span>
                );
              })()}
            </h1>
            <p className="body-text">
              {mode === "join"
                ? t("joinSubtitle")
                : t("signInSubtitle")}
            </p>
          </motion.div>

          {/* Strava Sign-In */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="mb-10"
          >
            <button
              onClick={handleStravaSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#E34402] text-white py-4 text-sm font-bold tracking-[0.1em] uppercase transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              {t("signInWithStrava")}
            </button>

            <div className="flex items-center gap-4 mt-8">
              <div className="flex-1 h-px bg-[#222]" />
              <span className="text-[10px] tracking-[0.2em] text-[#555] uppercase">
                {t("orWithEmail")}
              </span>
              <div className="flex-1 h-px bg-[#222]" />
            </div>
          </motion.div>

          {/* Toggle between join/login */}
          <div className="flex gap-4 mb-12">
            <button
              onClick={() => {
                setMode("join");
                setError("");
              }}
              className={`text-[11px] tracking-[0.15em] uppercase pb-1 border-b transition-all duration-300 ${
                mode === "join"
                  ? "text-[#E6FF00] border-[#E6FF00]"
                  : "text-[#666] border-transparent hover:text-white"
              }`}
            >
              {t("register")}
            </button>
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`text-[11px] tracking-[0.15em] uppercase pb-1 border-b transition-all duration-300 ${
                mode === "login"
                  ? "text-[#E6FF00] border-[#E6FF00]"
                  : "text-[#666] border-transparent hover:text-white"
              }`}
            >
              {t("signIn")}
            </button>
          </div>

          {!submitted ? (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-8"
            >
              {/* Error message */}
              {error && (
                <div className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-4 py-3">
                  {error}
                </div>
              )}

              {/* Name — only for join */}
              {mode === "join" && (
                <div>
                  <label
                    htmlFor="join-name"
                    className="label-text block mb-3"
                  >
                    {t("name")}
                  </label>
                  <input
                    id="join-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
                    placeholder={t("namePlaceholder")}
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="join-email"
                  className="label-text block mb-3"
                >
                  {t("email")}
                </label>
                <input
                  id="join-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
                  placeholder={t("emailPlaceholder")}
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="join-password"
                  className="label-text block mb-3"
                >
                  {mode === "join" ? t("passwordMinChars") : t("password")}
                </label>
                <input
                  id="join-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={mode === "join" ? 8 : 1}
                  className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {/* Instagram — only for join */}
              {mode === "join" && (
                <div>
                  <label
                    htmlFor="join-instagram"
                    className="label-text block mb-3"
                  >
                    {t("instagram")}
                  </label>
                  <input
                    id="join-instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
                    placeholder={t("instagramPlaceholder")}
                  />
                </div>
              )}

              {/* Running pace — only for join */}
              {mode === "join" && (
                <div>
                  <label
                    htmlFor="join-pace"
                    className="label-text block mb-3"
                  >
                    {t("runningPace")}
                  </label>
                  <select
                    id="join-pace"
                    value={formData.pace}
                    onChange={(e) =>
                      setFormData({ ...formData, pace: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors cursor-pointer [&>option]:bg-black"
                  >
                    <option value="">{t("paceOptions.selectPace")}</option>
                    <option value="beginner">
                      {t("paceOptions.beginner")}
                    </option>
                    <option value="casual">{t("paceOptions.casual")}</option>
                    <option value="intermediate">
                      {t("paceOptions.intermediate")}
                    </option>
                    <option value="advanced">
                      {t("paceOptions.advanced")}
                    </option>
                  </select>
                </div>
              )}

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-[#E6FF00] text-black py-5 text-sm font-bold tracking-[0.15em] uppercase hover:bg-white transition-colors duration-300 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "..."
                  : mode === "join"
                    ? t("joinButton")
                    : t("signInButton")}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-20 border border-[#222] px-8"
            >
              <div className="w-16 h-16 mx-auto mb-8 border-2 border-[#E6FF00] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#E6FF00]"
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
              </div>
              <h2 className="headline-md mb-4">
                {t("welcomeMessage").replace(".", "")}<span className="text-[#E6FF00]">.</span>
              </h2>
              <p className="body-text">
                {t("accountCreated")}
              </p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </SmoothScroll>
  );
}
