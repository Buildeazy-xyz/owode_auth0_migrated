import { motion } from "motion/react";
import {
  PiggyBank,
  TrendingUp,
  CreditCard,
  Wallet,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Division = {
  icon: LucideIcon;
  name: string;
  tagline: string;
  description: string;
  status: "live" | "coming";
};

const DIVISIONS: Division[] = [
  {
    icon: PiggyBank,
    name: "OWODE Alajo",
    tagline: "Trusted Community Savings",
    description:
      "Grassroots daily, weekly, and monthly thrift savings for traders, artisans, and the informal sector. Powered by Providus Bank virtual accounts for digital collection and real-time tracking.",
    status: "live",
  },
  {
    icon: TrendingUp,
    name: "OWODE Wealth & Advisory",
    tagline: "Guiding Smarter Wealth",
    description:
      "Fixed deposits, investment advisory, and structured savings for salaried professionals and high-net-worth individuals.",
    status: "coming",
  },
  {
    icon: CreditCard,
    name: "OWODE Credit",
    tagline: "Responsible Lending",
    description:
      "Salary-backed loans, business working capital, inventory financing, and bridge finance — all collateralized and short-tenor.",
    status: "coming",
  },
  {
    icon: Wallet,
    name: "OWODE Pay",
    tagline: "Simple Financial Transactions",
    description:
      "Virtual accounts, automated collections, payment reconciliation, and wallet infrastructure powered by Providus Bank DCS API. Pay via transfer, POS, or USSD.",
    status: "coming",
  },
  {
    icon: Building2,
    name: "OWODE Capital Projects",
    tagline: "Strategic Investments",
    description:
      "Co-investment opportunities in real estate, agro-projects, and energy for diaspora investors and family offices.",
    status: "coming",
  },
];

export default function EcosystemSection() {
  return (
    <section id="ecosystem" className="py-20 lg:py-28 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            The Ecosystem
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight">
            One Institution, Multiple Services
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            OWODE Financial Group is a unified financial ecosystem — from
            grassroots savings powered by Providus Bank virtual accounts, to
            wealth advisory and structured credit. Customers grow with us.
          </p>
        </motion.div>

        {/* Customer journey callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 rounded-2xl bg-primary/5 border border-primary/10 p-6 lg:p-8"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            Customer Journey
          </p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Join OWODE Alajo
            </span>
            <span className="text-primary">{"→"}</span>
            <span>Build savings history</span>
            <span className="text-primary">{"→"}</span>
            <span>Qualify for credit</span>
            <span className="text-primary">{"→"}</span>
            <span>Business grows</span>
            <span className="text-primary">{"→"}</span>
            <span className="font-medium text-foreground">
              Wealth Advisory client
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Creating Valuable Lifetime Customers (VLC)
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DIVISIONS.map((division, i) => (
            <motion.div
              key={division.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative rounded-2xl border border-border bg-card p-6 lg:p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              {division.status === "live" && (
                <span className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Live
                </span>
              )}
              {division.status === "coming" && (
                <span className="absolute top-4 right-4 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  Coming Soon
                </span>
              )}
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <division.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">{division.name}</h3>
              <p className="text-sm font-medium text-primary mt-0.5">
                {division.tagline}
              </p>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {division.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
