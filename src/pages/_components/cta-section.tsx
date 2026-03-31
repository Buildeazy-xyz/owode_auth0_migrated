import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CtaSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl bg-primary/5 border border-primary/10 px-8 py-16 lg:px-16 lg:py-20 text-center overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif tracking-tight text-balance">
              Ready to Secure Your Contributions?
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join thousands of Nigerians who have already moved from risky
              paper cards to OWODE{"'"}s transparent digital system. Your money
              deserves better protection.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="gap-2"
                onClick={() =>
                  toast.info("Coming soon in a future milestone!")
                }
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() =>
                  toast.info("Coming soon in a future milestone!")
                }
              >
                Talk to Our Team
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              No fees to join. No minimum balance. Start in 2 minutes.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
