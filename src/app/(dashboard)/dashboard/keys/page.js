"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function KeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      console.error("Failed to fetch keys:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-600 mt-2">Manage access tokens</p>
        </div>
        <Button>Create Key</Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : keys.length === 0 ? (
        <Card className="p-12 text-center border border-gray-200">
          <div className="text-gray-500">
            <p className="text-lg mb-4">No API keys yet</p>
            <p className="text-sm text-gray-400">
              Create your first API key to start using the router
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <Card
              key={key.id}
              className="p-4 border border-gray-200 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{key.name || "Unnamed"}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Created {new Date(key.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">
                  {key.isActive ? "Active" : "Revoked"}
                </Badge>
                <Button variant="outline" size="sm">
                  Revoke
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
