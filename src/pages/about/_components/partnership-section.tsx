import { motion } from "motion/react";
import {
  CreditCard,
  ShieldCheck,
  Activity,
  Landmark,
} from "lucide-react";

const PARTNERSHIP_FEATURES = [
  {
    icon: CreditCard,
    title: "Virtual Accounts",
    description: "Dedicated virtual accounts for each user.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "Secure and direct payment processing.",
  },
  {
    icon: Activity,
    title: "Real-Time Tracking",
    description: "Real-time transaction tracking and monitoring.",
  },
  {
    icon: Landmark,
    title: "Bank-Grade Security",
    description: "Strong banking-level protection for all funds.",
  },
];

export default function PartnershipSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
              Banking Partnership
            </h2>
            <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
              Powered by Providus Bank
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              OWODE is powered by a strong partnership with Providus Bank.
              Through their Digital Collection System (DCS) and API, we deliver
              secure, seamless, and transparent financial services.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              This means your money is handled with bank-grade security at
              every step.
            </p>
          </motion.div>

          {/* Right - feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PARTNERSHIP_FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
