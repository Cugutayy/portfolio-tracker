"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import SmoothScroll from "@/components/SmoothScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function JoinPage() {
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
          setError(data.error || "Bir hata oluştu");
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
          setError("Email veya şifre hatalı");
        }
      }
    } catch {
      setError("Bir hata oluştu, lütfen tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  const handleStravaSignIn = () => {
    signIn("strava", { callbackUrl: "/dashboard" });
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
              {mode === "join" ? "ÜYE OL" : "HOŞ GELDİN"}
            </p>
            <h1 className="headline-xl mb-6">
              {mode === "join" ? (
                <>
                  KOŞUYA<br />
                  <span className="text-[#E6FF00]">KATIL</span>
                </>
              ) : (
                <>
                  GİRİŞ<br />
                  <span className="text-[#E6FF00]">YAP</span>
                </>
              )}
            </h1>
            <p className="body-text">
              {mode === "join"
                ? "Her seviyeye açık. Katılım ücretsiz. Sadece ayakkabılarını getir."
                : "Hesabına giriş yap ve koşmaya devam et."}
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
              className="w-full flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#E34402] text-white py-4 text-sm font-bold tracking-[0.1em] uppercase transition-colors duration-300"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              STRAVA İLE GİRİŞ YAP
            </button>

            <div className="flex items-center gap-4 mt-8">
              <div className="flex-1 h-px bg-[#222]" />
              <span className="text-[10px] tracking-[0.2em] text-[#555] uppercase">
                veya email ile
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
              KAYIT OL
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
              GİRİŞ YAP
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
                    İSİM
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
                    placeholder="Adınız"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="join-email"
                  className="label-text block mb-3"
                >
                  EMAIL
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
                  placeholder="your@email.com"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="join-password"
                  className="label-text block mb-3"
                >
                  {mode === "join" ? "ŞİFRE (MİN. 8 KARAKTER)" : "ŞİFRE"}
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
                    INSTAGRAM
                  </label>
                  <input
                    id="join-instagram"
                    type="text"
                    value={formData.instagram}
                    onChange={(e) =>
                      setFormData({ ...formData, instagram: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors"
                    placeholder="@kullaniciadi"
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
                    KOŞU TEMPOSU
                  </label>
                  <select
                    id="join-pace"
                    value={formData.pace}
                    onChange={(e) =>
                      setFormData({ ...formData, pace: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-[#333] focus:border-[#E6FF00] text-white py-3 text-lg outline-none transition-colors cursor-pointer [&>option]:bg-black"
                  >
                    <option value="">Temponuzu seçin</option>
                    <option value="beginner">
                      Başlangıç (&gt;7:00 min/km)
                    </option>
                    <option value="casual">Rahat (6:00-7:00 min/km)</option>
                    <option value="intermediate">
                      Orta (5:00-6:00 min/km)
                    </option>
                    <option value="advanced">
                      İleri (&lt;5:00 min/km)
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
                    ? "ALSANCAK RUNNERS'A KATIL"
                    : "GİRİŞ YAP"}
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
                HOŞ GELDİN<span className="text-[#E6FF00]">.</span>
              </h2>
              <p className="body-text">
                Hesabın oluşturuldu! Dashboard&apos;a yönlendiriliyorsun...
              </p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </SmoothScroll>
  );
}
