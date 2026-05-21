"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProvidersPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setConnections(data);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setLoading(false);
    }
  }

  const groupedByProvider = connections.reduce((acc, conn) => {
    if (!acc[conn.provider]) acc[conn.provider] = [];
    acc[conn.provider].push(conn);
    return acc;
  }, {});

  const providers = [
    "openai",
    "anthropic",
    "google",
    "mistral",
    "llama",
    "cohere",
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Providers</h1>
        <p className="text-gray-600 mt-2">
          Connect AI models from different providers
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {providers.map((provider) => {
            const conns = groupedByProvider[provider] || [];
            return (
              <Card
                key={provider}
                className="p-6 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {provider}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {conns.length > 0
                        ? `${conns.length} connection${conns.length !== 1 ? "s" : ""}`
                        : "No connections"}
                    </p>
                  </div>
                  <div className="text-right">
                    {conns.length > 0 && (
                      <Badge variant="secondary">
                        {conns.filter((c) => c.isActive).length} active
                      </Badge>
                    )}
                  </div>
                </div>

                {conns.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                    {conns.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between py-2"
                      >
                        <span className="text-sm text-gray-700">
                          {conn.name || conn.email || "Unnamed"}
                        </span>
                        <div className="flex gap-2 items-center">
                          {conn.isActive ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Button
                    className="w-full"
                    variant={conns.length > 0 ? "outline" : "default"}
                  >
                    {conns.length > 0 ? "Add Another" : "Connect"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
