"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KnowledgeUpload } from "./knowledge-upload";

interface Brand {
  id: string;
  name: string;
  positioning: string | null;
  personality: string | null;
  toneOfVoice: string | null;
  values: string | null;
}

export function BrandSettings({ brandId }: { brandId: string }) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [positioning, setPositioning] = useState("");
  const [personality, setPersonality] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [values, setValues] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/brands", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const found = d.brands?.find((b: Brand) => b.id === brandId);
        if (found) {
          setBrand(found);
          setName(found.name);
          setPositioning(found.positioning ?? "");
          setPersonality(found.personality ?? "");
          setToneOfVoice(found.toneOfVoice ?? "");
          setValues(found.values ?? "");
        }
      })
      .catch(() => {});
  }, [brandId]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setSaved(false);
    try {
      await fetch("/api/brands", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: brandId,
          name: name.trim(),
          positioning: positioning.trim() || null,
          personality: personality.trim() || null,
          toneOfVoice: toneOfVoice.trim() || null,
          values: values.trim() || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!brand) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 p-12">
        <p className="text-sm text-neutral-500">Loading brand...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand form */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 space-y-4">
        <h3 className="text-sm font-medium text-neutral-100">Brand Details</h3>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Brand name *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LOCAL 971"
            className="bg-neutral-800 border-neutral-700"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Positioning</label>
          <textarea
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            placeholder="How do you want people to feel about your brand?"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Personality</label>
          <textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="If your brand were a person, how would they speak?"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Tone of voice</label>
          <textarea
            value={toneOfVoice}
            onChange={(e) => setToneOfVoice(e.target.value)}
            placeholder="Calm and confident? Bold and loud? Warm and friendly?"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">Values</label>
          <textarea
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="What does your brand stand for?"
            rows={2}
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            className="bg-accent-lime text-black hover:bg-accent-lime/90"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
          {saved && (
            <span className="text-xs text-accent-lime">Saved successfully</span>
          )}
        </div>
      </div>

      {/* Knowledge upload */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
        <KnowledgeUpload brandId={brandId} />
      </div>
    </div>
  );
}
