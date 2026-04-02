import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";

export default function FaqHero() {
  return (
    <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Frequently Asked Questions
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Got Questions?{" "}
            <span className="text-primary">We Have Answers.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Everything you need to know about OWODE Alajo-Àgbáiye — your
            trusted digital savings and thrift platform.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/80 border border-border">
            <span className="text-base font-semibold text-foreground">
              {"\"Your Money is Safe.\""}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
