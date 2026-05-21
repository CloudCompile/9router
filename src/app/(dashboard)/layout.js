"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardRootLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard/providers", label: "Providers", icon: "⚡" },
    { href: "/dashboard/usage", label: "Usage", icon: "📊" },
    { href: "/dashboard/combos", label: "Combos", icon: "🎯" },
    { href: "/dashboard/keys", label: "API Keys", icon: "🔑" },
    { href: "/dashboard/profile", label: "Settings", icon: "⚙️" },
  ];

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">9Router</h1>
          <p className="text-xs text-gray-500 mt-1">AI Model Router</p>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-6">
          <p className="text-xs text-gray-500 mb-3">v0.5.0</p>
          <a
            href="https://github.com/cloudcompile/9router"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

