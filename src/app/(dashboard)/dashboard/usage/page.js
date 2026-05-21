"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UsagePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/usage/stats");
      const data = await res.json();
      setStats(data.stats || data);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-600 mt-2">Track your API usage and costs</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.requests || 0}
            </p>
          </Card>
          <Card className="p-6 border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Tokens Used</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.promptTokens + stats.completionTokens}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.promptTokens} prompt · {stats.completionTokens} completion
            </p>
          </Card>
          <Card className="p-6 border border-gray-200">
            <p className="text-sm text-gray-600 font-medium">Estimated Cost</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${(stats.cost || 0).toFixed(3)}
            </p>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center border border-gray-200">
          <p className="text-gray-500">No usage data yet</p>
        </Card>
      )}

      <div className="mt-8">
        <Card className="p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            By Provider
          </h2>
          <p className="text-sm text-gray-600">
            Detailed breakdown coming soon
          </p>
        </Card>
      </div>
    </div>
  );
}
