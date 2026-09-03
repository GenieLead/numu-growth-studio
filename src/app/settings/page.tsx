"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { Key, DollarSign, Check, X, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [last4, setLast4] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      fetchSettings();
    }
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected || false);
        setLast4(data.last4 || "");
        setBudget(data.budget?.toString() || "");
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const connectKey = async () => {
    if (!openrouterKey) return;
    setTesting(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openrouterKey }),
      });

      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setLast4(data.last4);
        setOpenrouterKey("");
      }
    } catch (error) {
      console.error("Failed to connect key:", error);
    } finally {
      setTesting(false);
    }
  };

  const disconnectKey = async () => {
    try {
      await fetch("/api/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "openrouter" }),
      });
      setConnected(false);
      setLast4("");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const saveBudget = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: budget ? parseFloat(budget) : null }),
      });
    } catch (error) {
      console.error("Failed to save budget:", error);
    } finally {
      setSaving(false);
    }
  };

  if (isPending || !session) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-neutral-400 text-sm">Loading...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 max-w-2xl">
          <div className="space-y-6">
            {/* OpenRouter Key */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  OpenRouter API Key
                </CardTitle>
                <CardDescription>
                  Connect your OpenRouter key to use AI models for generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        Connected ••••{last4}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-neutral-700"
                        onClick={() => window.open("https://openrouter.ai/keys", "_blank")}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-700 text-red-400 hover:bg-red-500/10"
                        onClick={disconnectKey}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      type="password"
                      placeholder="sk-or-v1-..."
                      value={openrouterKey}
                      onChange={(e) => setOpenrouterKey(e.target.value)}
                      className="bg-neutral-800 border-neutral-700"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={connectKey}
                        disabled={!openrouterKey || testing}
                        className="bg-accent-lime text-black hover:bg-accent-lime/90 font-medium"
                        size="sm"
                      >
                        {testing ? "Testing..." : "Connect"}
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-neutral-400"
                        onClick={() => window.open("https://openrouter.ai/keys", "_blank")}
                      >
                        Get a key →
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Budget Limit
                </CardTitle>
                <CardDescription>
                  Set a maximum spend per project. 1 credit = $1 USD.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="budget" className="text-neutral-300 text-sm">
                      Maximum credits per project
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="e.g. 10"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      min="0"
                      step="0.5"
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <Button
                    onClick={saveBudget}
                    disabled={saving}
                    variant="outline"
                    size="default"
                    className="border-neutral-700"
                  >
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Separator className="bg-neutral-800" />

            {/* Account */}
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-neutral-400">
                  {session?.user?.email}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
