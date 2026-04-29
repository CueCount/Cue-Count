"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/user");
      } else {
        // Update this if your sign-in route is named differently.
        router.replace("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-zinc-400 text-sm">
      Loading...
    </div>
  );
}