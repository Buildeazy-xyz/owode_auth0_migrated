import { motion } from "motion/react";
import { X, Check } from "lucide-react";

const OLD_WAY = [
  "Agent marks paper card but skips the ledger",
  "No alert sent — contributor has no idea",
  "Fraud only discovered at month-end payout",
  "No proof of what was actually collected",
  "Office receives whatever the agent declares",
];

const OWODE_WAY = [
  "Agent records collection instantly on the app",
  "Contributor gets an immediate alert",
  "Discrepancies caught the same day",
  "Full digital receipt with reference number",
  "Office sees every transaction in real-time",
];

export default function ProblemSection() {
  return (
    <section id="why-digital" className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold font-serif tracking-tight">
            Why Go Digital?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Paper cards and manual ledgers leave room for fraud. One dishonest
            agent can cost your contributors their hard-earned savings.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* Old Way */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-semibold mb-6">
              <X className="w-4 h-4" />
              The Old Way
            </div>
            <ul className="space-y-4">
              {OLD_WAY.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-destructive" />
                  </div>
                  <span className="text-sm text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* OWODE Way */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Check className="w-4 h-4" />
              The OWODE Way
            </div>
            <ul className="space-y-4">
              {OWODE_WAY.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
