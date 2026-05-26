"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type CustomerRecord = {
  id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export function CustomerForm({
  organizationId,
  initial,
}: {
  organizationId: string;
  initial?: CustomerRecord;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isEdit && initial?.id) {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("customers")
        .update({ organization_id: organizationId, name, email: email || null, phone: phone || null, address: address || null })
        .eq("id", initial.id);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
      router.push("/admin/customers");
      router.refresh();
    } else {
      const res = await fetch("/api/admin/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, phone, address }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create customer");
        setLoading(false);
        return;
      }
      router.push("/admin/customers");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required={!isEdit} />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : isEdit ? "Save changes" : "Create customer"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
