"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your router configuration</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card className="p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Authentication
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Login Required
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.requireLogin}
                  readOnly
                  className="w-4 h-4 text-gray-600"
                />
                <span className="text-sm text-gray-600">
                  {settings?.requireLogin
                    ? "Dashboard login is required"
                    : "Dashboard is public"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Tunneling
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Access router from outside network
                </p>
              </div>
              <Badge variant="outline">
                {settings?.tunnelEnabled ? "Active" : "Disabled"}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Observability
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Track requests and usage
                </p>
              </div>
              <Badge variant="outline">
                {settings?.enableObservability ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Danger Zone
          </h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Export all data from the router for backup or migration.
            </p>
            <a href="/api/settings/database">
              <Button variant="outline">Download Database Export</Button>
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
