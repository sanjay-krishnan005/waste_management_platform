import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-14 items-center justify-between px-6 max-w-7xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              S
            </div>
            <span className="text-sm font-semibold">Sortyx</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/login">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b">
          <div className="container mx-auto px-6 py-20 max-w-7xl text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance max-w-4xl mx-auto leading-[1.1]">
              Monitor smart waste bins in{" "}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">real time</span>
          </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
              Sortyx connects your Raspberry Pi smart bins via MQTT, delivering live telemetry, alerts, maps, and reports for operators and customers.
            </p>
            <div className="mt-10 flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/login">Open dashboard</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Learn more</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-20 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Live telemetry", desc: "Fill levels, weight, and AI classification from every compartment, updated in real time." },
              { title: "Instant alerts", desc: "Full bin, offline, sensor and camera failures pushed to your team via dashboard and push notifications." },
              { title: "Customer portal", desc: "Customers see only their assigned bins with reports and maps, scoped by row-level security." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6 card-shadow">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-6 py-6 max-w-7xl flex items-center justify-between">
          <span className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Sortyx. All rights reserved.</span>
          <span className="text-sm text-muted-foreground">Intelligence Platform</span>
        </div>
      </footer>
    </div>
  );
}
