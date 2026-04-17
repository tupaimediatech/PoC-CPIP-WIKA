"use client";

import { useState, FormEvent, useEffect } from "react"; // Tambahkan useEffect
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setToken, setTokenExpiry, setUser } from "@/lib/auth";
import ilustration from "@/public/Ilustration.svg";
import wika from "@/public/WIKA.svg";
import wikaNew from "@/public/WIka-new.svg";
import Image from "next/image";
type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Fungsi untuk memuat email yang tersimpan saat pertama kali buka halaman
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let data: any;
      if (mode === "login") {
        data = await authApi.login(email, password, remember);

        if (remember) {
          localStorage.setItem("rememberedEmail", email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      } else {
        if (password !== passwordConfirm) {
          setError("Password konfirmasi tidak cocok.");
          setLoading(false);
          return;
        }
        data = await authApi.register(name, email, password, passwordConfirm);
      }

      setToken(data.token);
      setTokenExpiry(data.expires_at ?? null);
      setUser(data.user);
      router.push("/");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || (Object.values(err?.response?.data?.errors ?? {}) as string[][])?.[0]?.[0] || "Terjadi kesalahan. Coba lagi.";
      setError(msg as string);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans text-gray-900">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-blue flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="z-10">
          <Image src={wika} alt="Logo WIKA" className="object-contain brightness-0 invert" />
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10 my-8">
          <Image src={ilustration} alt="3D Illustration" className="w-full max-w-md object-contain" />
        </div>
        <div className="z-10">
          <h1 className="text-[40px] font-bold mb-3 tracking-tight">Welcome!</h1>
          <p className="text-blue-100 text-[17px] leading-relaxed max-w-md">
            Access project performance insights, monitor progress, and make data-driven decisions across all construction projects.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10">
            <Image src={wikaNew} alt="Logo WIKA" className="object-contain mb-8" />
            <h2 className="text-3xl font-bold mb-2">{mode === "login" ? "Welcome Back!" : "Create an Account"}</h2>
            <p className="text-gray-500 text-[15px]">
              {mode === "login"
                ? "Sign in to access your project dashboard and monitor performance."
                : "Sign up to access your project dashboard and monitor performance."}
            </p>
          </div>

          {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[15px] outline-none focus:border-[#2543b5] focus:ring-1 focus:ring-[#2543b5] transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@gmail.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[15px] outline-none focus:border-[#2543b5] focus:ring-1 focus:ring-[#2543b5] transition-all placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="At least 8 characters"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[15px] outline-none focus:border-[#2543b5] focus:ring-1 focus:ring-[#2543b5] transition-all placeholder-gray-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    {showPassword ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {/* SECTION: Remember Me & Forgot Password */}
              {mode === "login" && (
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-blue focus:ring-primary-blue cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-semibold text-[#2543b5] hover:underline">
                    Forgot Password?
                  </a>
                </div>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-[15px] outline-none focus:border-[#2543b5] focus:ring-1 focus:ring-[#2543b5] transition-all placeholder-gray-400 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      {showPasswordConfirm ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-blue hover:brightness-110 text-white font-medium py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Memproses..." : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500">Or</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z"
                fill="#4285F4"
              />
              <path
                d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.72 18.23 13.47 18.63 12 18.63C9.15 18.63 6.74 16.71 5.88 14.12H2.21V16.96C4.01 20.54 7.71 23 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.88 14.12C5.66 13.46 5.54 12.75 5.54 12C5.54 11.25 5.66 10.54 5.88 9.88V7.04H2.21C1.47 8.53 1.05 10.22 1.05 12C1.05 13.78 1.47 15.47 2.21 16.96L5.88 14.12Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38C13.62 5.38 15.06 5.93 16.21 7.02L19.35 3.88C17.45 2.11 14.97 1 12 1C7.71 1 4.01 3.46 2.21 7.04L5.88 9.88C6.74 7.29 9.15 5.38 12 5.38Z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="mt-8 text-center text-[15px] text-gray-600">
            {mode === "login" ? "Don't you have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="text-[#2543b5] font-semibold hover:underline"
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
