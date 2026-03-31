import { motion } from "motion/react";
import {
  Bell,
  CreditCard,
  Shield,
  BarChart3,
  Clock,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Bell,
    title: "Real-Time Alerts",
    description:
      "Contributors receive instant notifications the moment their payment is recorded. No alert means no collection happened.",
  },
  {
    icon: CreditCard,
    title: "Virtual Contribution Card",
    description:
      "A digital card that auto-marks each payment date. See your complete contribution history at a glance.",
  },
  {
    icon: Shield,
    title: "Dual Confirmation",
    description:
      "Agent records the collection, contributor confirms receipt. Double verification closes every loophole.",
  },
  {
    icon: BarChart3,
    title: "Auto-Reconciliation",
    description:
      "The system calculates exactly how much each agent should return. Mismatches are flagged instantly.",
  },
  {
    icon: Clock,
    title: "Complete Audit Trail",
    description:
      "Every transaction has a unique reference, timestamp, and agent ID. Full accountability, always.",
  },
  {
    icon: Users,
    title: "Management Dashboard",
    description:
      "Office staff see all collections in real-time. No waiting for end-of-day ledgers or monthly reconciliation.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight">
            Built for Trust {"&"} Transparency
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Every feature is designed to protect contributors and keep agents
            accountable.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-2xl border border-border bg-card p-6 lg:p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
