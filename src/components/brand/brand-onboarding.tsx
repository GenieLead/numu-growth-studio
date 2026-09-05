"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BrandOnboarding() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [positioning, setPositioning] = useState("");
  const [personality, setPersonality] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [values, setValues] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("brand_onboarding_skip")) return;
    fetch("/api/brands", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (!d.brands?.length) setOpen(true); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: name.trim(), positioning: positioning.trim() || null, personality: personality.trim() || null, toneOfVoice: toneOfVoice.trim() || null, values: values.trim() || null }),
    });
    localStorage.setItem("brand_onboarding_skip", "1");
    setOpen(false);
    setLoading(false);
  };

  const handleSkip = () => {
    localStorage.setItem("brand_onboarding_skip", "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-neutral-900 border-neutral-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Set up your brand</DialogTitle>
          <DialogDescription className="text-neutral-400">
            Give me your brand once and I&apos;ll stop asking for it. You can always add more later in Settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Brand name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LOCAL 971" className="bg-neutral-800 border-neutral-700" autoFocus />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Positioning</label>
            <textarea value={positioning} onChange={(e) => setPositioning(e.target.value)} placeholder="How do you want people to feel about your brand?" rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 resize-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Personality</label>
            <textarea value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="If your brand were a person, how would they speak?" rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 resize-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Tone of voice</label>
            <textarea value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} placeholder="Calm and confident? Bold and loud? Warm and friendly?" rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 resize-none" />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">Values</label>
            <textarea value={values} onChange={(e) => setValues(e.target.value)} placeholder="What does your brand stand for?" rows={2} className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-600 resize-none" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={handleSkip} className="text-neutral-400 hover:text-neutral-200">Skip for now</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading} className="bg-accent-lime text-black hover:bg-accent-lime/90">{loading ? "Creating..." : "Create Brand"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
