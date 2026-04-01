import { motion } from "motion/react";
import { BookOpen, AlertTriangle, ArrowRight } from "lucide-react";

export default function FoundingStorySection() {
  return (
    <section className="py-16 sm:py-24 bg-secondary/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            Our Story
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            The Origin of OWODE
          </p>
        </motion.div>

        <div className="space-y-10">
          {/* The tradition */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex gap-5"
          >
            <div className="shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mt-1">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-foreground text-lg mb-2">
                A 900-Year Tradition
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Ajo (also called Esusu) has been part of Yoruba culture for over
                900 years. It helped many people grow their money through
                collective savings managed by trusted community members.
              </p>
            </div>
          </motion.div>

          {/* The problem */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex gap-5"
          >
            <div className="shrink-0 w-11 h-11 rounded-full bg-destructive/10 flex items-center justify-center mt-1">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-foreground text-lg mb-2">
                Trust Was Broken
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                In recent years, things changed. Many people lost their savings
                because some Alajo disappeared with money, others misused or
                wrongly invested funds, and some got into illegal activities.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                In one painful case, someone close to our founder lost money
                alongside 58 other people. Our research showed that police
                stations across the South West are full of similar cases.
              </p>
            </div>
          </motion.div>

          {/* The solution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex gap-5"
          >
            <div className="shrink-0 w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center mt-1">
              <ArrowRight className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-bold font-serif text-foreground text-lg mb-2">
                OWODE Was Born
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                That was the turning point. We decided to build something
                different — a structured, transparent, and technology-driven
                system that protects contributors and restores trust. That is how
                OWODE was born.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Guiding principle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 bg-primary/5 border border-primary/15 rounded-2xl p-8 text-center"
        >
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
            Our Guiding Principle
          </p>
          <p className="text-xl sm:text-2xl font-bold font-serif text-foreground">
            {'"'}Many-Sided Protection for Your Money{'"'}
          </p>
          <p className="mt-4 text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            We use technology, monitoring systems, structured operations, and
            strong accountability to ensure your money is always safe.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
