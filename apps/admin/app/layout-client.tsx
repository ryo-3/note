"use client";

import React from "react";
import { Refine } from "@refinedev/core";
import { ThemedLayoutV2, notificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/nextjs-router";
import { customDataProvider } from "../lib/data-provider";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@refinedev/antd/dist/reset.css";

// 開発環境でのAnt Design警告を無効化
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = (...args) => {
    const message = args[0]?.toString() || "";
    if (
      message.includes("[antd: Menu] `children` is deprecated") ||
      message.includes("[antd: Drawer] `bodyStyle` is deprecated") ||
      message.includes("[antd: Card] `bordered` is deprecated") ||
      message.includes("antd v5 support React is 16 ~ 18") ||
      message.includes("Download the React DevTools")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args[0]?.toString() || "";
    if (
      message.includes("[antd: Menu] `children` is deprecated") ||
      message.includes("[antd: Drawer] `bodyStyle` is deprecated") ||
      message.includes("[antd: Card] `bordered` is deprecated") ||
      message.includes("antd v5 support React is 16 ~ 18")
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  
  // QueryClientをmemoで管理
  const queryClient = React.useMemo(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          retry: false,
          staleTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    []
  );

  React.useEffect(() => {
    setIsMounted(true);
    const authenticated = sessionStorage.getItem("admin_authenticated") === "true";
    setIsAuthenticated(authenticated);
  }, []);

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  // ログイン画面の場合はQueryClientProviderのみ
  if (typeof window !== "undefined" && window.location.pathname === "/login") {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          {children}
        </ConfigProvider>
      </QueryClientProvider>
    );
  }

  // 認証されていない場合はログインページにリダイレクト
  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <div>Redirecting...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <Refine
          routerProvider={routerProvider}
          dataProvider={customDataProvider}
          notificationProvider={notificationProvider}
          resources={[
            {
              name: "dashboard",
              list: "/dashboard",
              meta: {
                label: "ダッシュボード",
                icon: "📊",
              },
            },
            {
              name: "users",
              list: "/users",
              show: "/users/show/:id",
              edit: "/users/edit/:id",
              meta: {
                label: "ユーザー管理",
                icon: "👥",
              },
            },
          ]}
          options={{
            sideNavigation: {
              collapsed: false,
            },
          }}
        >
          <ThemedLayoutV2>
            {children}
          </ThemedLayoutV2>
        </Refine>
      </ConfigProvider>
    </QueryClientProvider>
  );
}