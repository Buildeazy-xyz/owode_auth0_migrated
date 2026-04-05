import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";

export default function CtaSection() {
  const { signinRedirect } = useAuth();

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
              Your Money Deserves to Be Safe
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join 700+ contributors who have already moved from risky paper
              cards to OWODE{"'"}s transparent digital system. Whether you{"'"}re
              a trader, artisan, or rider — your money is safe with OWODE.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="gap-2"
                onClick={() => signinRedirect()}
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => signinRedirect()}
              >
                {"I'm an Agent"}
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
