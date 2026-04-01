import { motion } from "motion/react";
import { FileCheck, Building, Landmark, Receipt } from "lucide-react";

const CREDENTIALS = [
  {
    icon: Building,
    label: "CAC Registration",
    detail: "RC: 8569061",
    date: "June 20, 2025",
  },
  {
    icon: FileCheck,
    label: "SCUML Certification",
    detail: "RN: SC281001711",
    date: "August 7, 2025",
  },
  {
    icon: Receipt,
    label: "Tax Identification",
    detail: "TIN: 1092721305",
    date: "",
  },
  {
    icon: Landmark,
    label: "Money Lenders License",
    detail: "Fully Licensed",
    date: "February 5, 2026",
  },
];

export default function CredentialsSection() {
  return (
    <section className="py-16 sm:py-24 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            Who We Are
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            Fully Registered {"&"} Licensed
          </p>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            We operate with full transparency and compliance under Nigerian law.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CREDENTIALS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-6 text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">
                {item.label}
              </h3>
              <p className="text-primary font-mono text-xs mt-1">
                {item.detail}
              </p>
              {item.date && (
                <p className="text-muted-foreground text-xs mt-1">
                  {item.date}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
