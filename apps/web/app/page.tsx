import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-sortyx flex items-center justify-center text-white font-bold">S</div>
            <span className="font-semibold">Sortyx Intelligence Platform</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
          Monitor smart waste bins in <span className="text-sortyx">real time</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          Sortyx Intelligence Platform connects your Raspberry Pi smart bins via MQTT,
          delivering live telemetry, alerts, maps, and reports for operators and customers.
        </p>
        <div className="mt-10 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/login">Open dashboard</Link>
          </Button>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl text-left">
          {[
            { title: "Live telemetry", desc: "Fill levels, weight, AI classification from every compartment." },
            { title: "Instant alerts", desc: "Full bin, offline, sensor and camera failures pushed to your team." },
            { title: "Customer portal", desc: "Customers see only their assigned bins with reports and maps." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-6 bg-card">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
