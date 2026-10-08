"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Zap,
  CheckCircle2,
  Bot,
  BrainCircuit,
  Flame,
  Github,
} from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const login = useStudyStore((s) => s.login);
  const currentUser = useStudyStore((s) => s.user);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Quick Demo Login
  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      login({
        name: "Yash (Aspirant)",
        email: "yash@studytracker.ai",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      });
      toast.success("Welcome back, Yash! Logged in via Quick Demo.");
      router.push("/");
    }, 400);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const displayName =
        mode === "signup"
          ? name.trim()
          : email.split("@")[0].replace(/[._]/g, " ") || "Student";

      login({
        name: displayName,
        email: email.trim(),
      });

      toast.success(
        mode === "signup"
          ? `Account created! Welcome aboard, ${displayName}!`
          : `Signed in successfully. Welcome back, ${displayName}!`
      );
      router.push("/");
    }, 500);
  };

  // Social Login Mock
  const handleSocialLogin = (provider: "Google" | "GitHub") => {
    setIsLoading(true);
    setTimeout(() => {
      login({
        name: provider === "Google" ? "Google User" : "GitHub Developer",
        email: `dev@${provider.toLowerCase()}.com`,
      });
      toast.success(`Signed in with ${provider}!`);
      router.push("/");
    }, 500);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#07070c] overflow-hidden select-none">
      {/* Background Cyber Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#00f0ff]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#a855f7]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-[#ff2e97]/10 blur-[100px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group transition-transform hover:scale-105"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00f0ff] to-[#a855f7] p-[1.5px] shadow-[0_0_20px_rgba(0,240,255,0.4)]">
              <div className="w-full h-full bg-[#07070c] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#00f0ff]" />
              </div>
            </div>
            <div className="text-left">
              <span className="font-heading font-black text-xl tracking-wider text-white flex items-center gap-1">
                STUDY<span className="text-[#00f0ff]">TRACKER</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-gray-500 uppercase block">
                Command Center
              </span>
            </div>
          </Link>

          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Your personal study command center, AI doubts solver, and lab tracker
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="rounded-3xl glass-panel bg-[#0d0e1a]/80 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-6">
          {/* Glowing Top Accent Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ff2e97]" />

          {/* Quick Demo Login Option */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-[#00f0ff]/15 to-[#a855f7]/15 hover:from-[#00f0ff]/25 hover:to-[#a855f7]/25 border border-[#00f0ff]/40 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer group"
          >
            <Zap className="w-4 h-4 text-[#00f0ff] group-hover:scale-110 transition-transform fill-[#00f0ff]/20" />
            <span>⚡ 1-Click Quick Demo Login</span>
            <span className="ml-auto text-[10px] font-mono bg-[#00f0ff]/20 text-[#00f0ff] px-2 py-0.5 rounded-full border border-[#00f0ff]/40">
              Instant
            </span>
          </button>

          {/* Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-white/[0.1] text-white shadow-sm border border-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-white/[0.1] text-white shadow-sm border border-white/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Yash Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="aspirant@studytracker.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-300">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "Demo environment: Use Quick Demo Login or any password!"
                      )
                    }
                    className="text-[11px] text-[#00f0ff] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-[#00f0ff]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 accent-[#00f0ff] cursor-pointer"
                />
                <span>Remember me on this PC</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f0ff] to-[#a855f7] text-black font-bold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all cursor-pointer mt-2"
            >
              <span>
                {isLoading
                  ? "Verifying..."
                  : mode === "signin"
                  ? "Sign In to Command Center"
                  : "Create Your Account"}
              </span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <span className="relative px-3 bg-[#0d0e1a] text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Or continue with
            </span>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin("Google")}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.1 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.2C.6 9.2 0 10.5 0 12s.6 2.8 1.6 4.8l3.7-2.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5.1L1.6 16.1C3.5 20.4 7.4 23 12 23z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("GitHub")}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer"
            >
              <Github className="w-4 h-4 text-white" />
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* Feature Badges Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Bot className="w-3.5 h-3.5 text-[#00f0ff] shrink-0" />
            <span className="truncate">AI Study Mentor</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">1,057+ THM Labs</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Local Ollama Backup</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Streak & Analytics</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-gray-500 font-mono">
          🔒 Private & Encrypted Local Storage • No Trackers
        </div>
      </div>
    </div>
  );
}
