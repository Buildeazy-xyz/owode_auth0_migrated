import { motion } from "motion/react";
import {
  ClipboardCheck,
  BellRing,
  BarChart3,
  UserPlus,
  Eye,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const AGENT_STEPS: Step[] = [
  {
    icon: ClipboardCheck,
    title: "Record Collection",
    description:
      "Agent enters the contribution amount and contributor details on their phone immediately after collecting.",
  },
  {
    icon: BellRing,
    title: "Automatic Alert",
    description:
      "The system instantly sends a confirmation alert to the contributor with amount, date, and reference number.",
  },
  {
    icon: BarChart3,
    title: "Daily Reconciliation",
    description:
      "Office automatically knows exactly how much each agent should bring back. No more guesswork.",
  },
];

const CONTRIBUTOR_STEPS: Step[] = [
  {
    icon: UserPlus,
    title: "Join Your Circle",
    description:
      "Sign up with OWODE, get your digital contributor account, and receive your unique Providus virtual account for direct deposits.",
  },
  {
    icon: Eye,
    title: "Get Instant Alerts",
    description:
      "Receive a notification every time your agent records a collection. No alert? Report immediately.",
  },
  {
    icon: ShieldCheck,
    title: "Track Your Card",
    description:
      "See your virtual contribution card with every payment date marked. Complete peace of mind.",
  },
];

function StepCards({
  steps,
  accentClass,
}: {
  steps: Step[];
  accentClass: string;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {steps.map((step, i) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="relative bg-card rounded-xl p-6 shadow-sm border border-border"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${accentClass}`}
            >
              <step.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Step {i + 1}
            </span>
          </div>
          <h4 className="font-semibold text-lg mb-2">{step.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-secondary/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight">
            How OWODE Keeps Your Money Safe
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            A simple, transparent process for both agents and contributors.
          </p>
        </motion.div>

        {/* For Agents */}
        <div id="for-agents" className="mb-16">
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
            className="text-xl font-bold font-serif mb-8 flex items-center gap-3"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              A
            </span>
            For Agents
          </motion.h3>
          <StepCards
            steps={AGENT_STEPS}
            accentClass="bg-primary/10 text-primary"
          />
        </div>

        {/* For Contributors */}
        <div id="for-contributors">
          <motion.h3
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
            className="text-xl font-bold font-serif mb-8 flex items-center gap-3"
          >
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-accent-foreground text-sm font-bold">
              C
            </span>
            For Contributors
          </motion.h3>
          <StepCards
            steps={CONTRIBUTOR_STEPS}
            accentClass="bg-accent/20 text-accent-foreground"
          />
        </div>
      </div>
    </section>
  );
}
