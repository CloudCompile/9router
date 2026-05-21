"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCombos();
  }, []);

  async function fetchCombos() {
    try {
      const res = await fetch("/api/combos");
      const data = await res.json();
      setCombos(data);
    } catch (err) {
      console.error("Failed to fetch combos:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Combos</h1>
          <p className="text-gray-600 mt-2">Create fallback chains for models</p>
        </div>
        <Button>Create Combo</Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : combos.length === 0 ? (
        <Card className="p-12 text-center border border-gray-200">
          <div className="text-gray-500">
            <p className="text-lg mb-4">No combos yet</p>
            <p className="text-sm text-gray-400">
              Create a combo to set up fallback chains
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {combos.map((combo) => (
            <Card
              key={combo.id}
              className="p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{combo.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {combo.models?.length || 0} models
                  </p>
                </div>
                <Badge variant="outline">{combo.kind || "default"}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
