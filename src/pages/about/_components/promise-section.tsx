import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import {
  ShieldCheck,
  PiggyBank,
  MonitorSmartphone,
  HeartHandshake,
  Scale,
  ShieldAlert,
} from "lucide-react";

const DIFFERENTIATORS = [
  { icon: ShieldAlert, label: "No rushed or dangerous loans" },
  { icon: PiggyBank, label: "Structured savings system" },
  { icon: MonitorSmartphone, label: "Technology-backed accountability" },
  { icon: HeartHandshake, label: "Real human support" },
  { icon: Scale, label: "Strong compliance and licensing" },
];

export default function PromiseSection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 to-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            What Makes Us Different
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            We {"don't"} just talk — we protect.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-3 mt-10"
        >
          {DIFFERENTIATORS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2"
            >
              <item.icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-14 bg-card border border-border rounded-2xl p-10"
        >
          <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="text-xl sm:text-2xl font-bold font-serif text-foreground mb-3">
            Our Promise
          </h3>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
            We are not just another savings platform. We are building a trusted
            financial system for everyday Nigerians.
          </p>
          <p className="mt-4 text-lg font-bold font-serif text-primary">
            OWODE Alajo {"—"} Your Money Is Safe.
          </p>

          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/">Get Started</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
