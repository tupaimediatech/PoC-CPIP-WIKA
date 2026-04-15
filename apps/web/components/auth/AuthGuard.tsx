"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, clearToken, setUser } from "@/lib/auth";
import { authApi } from "@/lib/api";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname);
    const authed = isAuthenticated();

    if (!isPublic && !authed) {
      router.replace("/login");
      return;
    }

    if (isPublic && authed) {
      router.replace("/");
      return;
    }

    if (!isPublic && authed) {
      // Validate token against backend
      authApi
        .me()
        .then((res) => {
          // Refresh stored user data
          if (res.data) {
            setUser(res.data);
          }
          setChecked(true);
        })
        .catch(() => {
          // Token is invalid/expired — clear and redirect
          clearToken();
          router.replace("/login");
        });
      return;
    }

    // Public path, not authed — just show the page
    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
