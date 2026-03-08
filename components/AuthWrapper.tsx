"use client";

import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/app/landing/page"; // your promo page

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <span className="text-white opacity-50 text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <>{children}</>;
}