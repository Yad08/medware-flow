import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Boxes,
  Package,
  Layers,
  Container as ContainerIcon,
  FileBarChart,
  AlertTriangle,
  ShieldCheck,
  HeartHandshake,
  Globe2,
  ArrowRight,
  LogIn,
  Users,
} from "lucide-react";
import heroImg from "@/assets/medware-pallets-loaded.jpg";
import containerImg from "@/assets/medware-container-loading.jpg";
import sortingImg from "@/assets/medware-volunteers-loading.jpg";
import equipmentImg from "@/assets/medware-equipment-van.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MedWare Logistics — Humanitarian Medical Supply Operations" },
      { name: "description", content: "MedWare Logistics powers Medical Supplies Network Inc. (MSNI) — a Tulsa-based nonprofit shipping donated medical supplies to people in need worldwide." },
      { property: "og:title", content: "MedWare Logistics — Humanitarian Medical Supply Operations" },
      { property: "og:description", content: "Digital inventory and shipment management for MSNI's nonprofit medical supply warehouse." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <Hero />
      <StatsBar />
      <About />
      <WhyBuilt />
      <Features />
      <Volunteers />
      <FinalCta />
      <Footer />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold">MedWare</div>
            <div className="text-[11px] text-muted-foreground -mt-0.5">Logistics</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
          <a href="#volunteers" className="text-muted-foreground hover:text-foreground transition-colors">Volunteers</a>
        </nav>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Enter System
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-soft/60 via-background to-background pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-medium border border-primary/15">
            <HeartHandshake className="h-3.5 w-3.5" />
            Medical Supplies Network Inc. · Tulsa, OK
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] text-foreground">
            Moving medical supplies to where they’re needed most.
          </h1>
          <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl">
            MedWare Logistics is the digital backbone of MSNI — a Tulsa-based nonprofit that
            collects donated medical supplies, organizes them into pallets and shipping containers,
            and sends them free of charge to communities around the world.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 h-12 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-card"
            >
              Enter System
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 h-12 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <Users className="h-4 w-4" />
              Volunteer Login
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            For staff and volunteers · PIN access only
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-elevated">
            <img
              src={heroImg}
              alt="Volunteers organizing medical supply boxes onto pallets in a warehouse"
              width={1536}
              height={1024}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:flex absolute -bottom-5 -left-5 bg-card border border-border rounded-xl shadow-card p-4 items-center gap-3 max-w-[260px]">
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Globe2 className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">Hundreds of containers shipped</div>
              <div className="text-muted-foreground">to dozens of countries worldwide</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "100s", label: "Containers shipped" },
    { value: "Dozens", label: "Countries served" },
    { value: "Free", label: "of charge to recipients" },
    { value: "1 / 42", label: "Pallets per container" },
  ];
  return (
    <section className="border-y border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-2xl md:text-3xl font-semibold text-primary">{s.value}</div>
            <div className="text-xs md:text-sm text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
      <div className="aspect-[5/4] rounded-2xl overflow-hidden border border-border shadow-card order-2 lg:order-1">
        <img
          src={sortingImg}
          alt="Gloved hands sorting medical supplies into a labeled box"
          loading="lazy"
          width={1280}
          height={896}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="order-1 lg:order-2">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">About MSNI</div>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
          A Tulsa nonprofit with a global reach.
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Medical Supplies Network Inc. (MSNI) accepts donated medical supplies and equipment from
          hospitals, clinics, and partners — then sorts, organizes, and ships them to people in need
          around the world, free of charge. Over the years MSNI has sent hundreds of shipping
          containers of essential supplies to dozens of countries.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          The work happens in a single warehouse, run by one employee and powered by a dedicated
          team of volunteers. Every pallet built and every container shipped represents real care
          delivered somewhere it’s needed.
        </p>
      </div>
    </section>
  );
}

function WhyBuilt() {
  return (
    <section className="bg-primary-soft/40 border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Why MedWare exists</div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            From paper logs to a clean digital system.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            For years, MSNI tracked inventory and shipments on paper. That meant lost records,
            duplicated work, and time spent recreating information that should have just been
            available. MedWare Logistics replaces that workflow with a single, accurate, organized
            platform built around the way the warehouse actually operates.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {[
              "Track incoming inventory with weights and quantities",
              "Group supplies into pallets ready for shipment",
              "Prepare containers up to a 42-pallet limit",
              "Flag hazardous materials clearly and consistently",
              "Generate printable manifests for every shipment",
              "Reduce data errors and improve accountability",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-border shadow-elevated">
          <img
            src={containerImg}
            alt="Shipping container loaded with neatly stacked pallets of medical supply boxes"
            loading="lazy"
            width={1280}
            height={896}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Package, title: "Inventory tracking", desc: "Log every donated item with type, quantity, weight and special handling flags." },
    { icon: Layers, title: "Pallet building", desc: "Group items into pallets. Total weight is calculated automatically as items move." },
    { icon: ContainerIcon, title: "Container preparation", desc: "Assign up to 42 pallets per container and confirm readiness before shipment." },
    { icon: AlertTriangle, title: "Hazmat visibility", desc: "Hazardous materials are flagged at the item, pallet and container level." },
    { icon: FileBarChart, title: "Printable manifests", desc: "Generate clean reports for each pallet and container — ready for shipping and audits." },
    { icon: ShieldCheck, title: "Accountability", desc: "A single source of truth replaces scattered paper records and manual lookups." },
  ];
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">Platform capabilities</div>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
          Built around the warehouse workflow.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Items become pallets. Pallets become containers. Containers become shipments. Every step
          is captured cleanly so staff and volunteers always know what’s on hand.
        </p>
      </div>
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            className="bg-card border border-border rounded-xl p-5 shadow-card hover:shadow-elevated transition-shadow"
          >
            <div className="h-10 w-10 rounded-lg bg-primary-soft text-primary flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="font-semibold">{f.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Volunteers() {
  return (
    <section id="volunteers" className="bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-5 gap-12 items-center">
        <div className="lg:col-span-2">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold">Volunteer-powered</div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            None of this happens without volunteers.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            MSNI’s warehouse runs on volunteer time. From sorting incoming donations to building
            pallets, volunteers are at the center of every shipment. MedWare gives them simple,
            focused tools to contribute confidently — without the overhead of paperwork.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 px-5 h-11 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Users className="h-4 w-4" />
            Volunteer Login
          </Link>
        </div>
        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
          {[
            { title: "Add inventory", desc: "Log what comes in the door, with weight and type." },
            { title: "Assign to pallets", desc: "Help group items so they’re shipment-ready." },
            { title: "View shipments", desc: "See what’s being prepared and what’s already gone." },
            { title: "Read reports", desc: "Browse pallet and container manifests anytime." },
          ].map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-background p-5">
              <div className="font-semibold">{c.title}</div>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 text-center">
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
        Ready to get to work?
      </h2>
      <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
        Sign in with your PIN to start managing inventory, building pallets and preparing
        humanitarian shipments.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-6 h-12 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-card"
        >
          Enter System
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <div className="font-semibold">MedWare Logistics</div>
            <div className="text-xs text-muted-foreground">Medical Supplies Network Inc. · Tulsa, OK</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} MedWare Logistics. Built to support humanitarian medical supply operations.
        </div>
      </div>
    </footer>
  );
}
