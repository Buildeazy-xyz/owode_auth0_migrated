import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { ArrowRight, Shield, Bell, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";

const HERO_IMAGE = "/images/hero.png";

const MINI_STATS = [
  { label: "Contributors", value: "700+" },
  { label: "Funds Managed", value: "₦50M+" },
  { label: "Active Agents", value: "20+" },
];

export default function HeroSection() {
  const { signinRedirect } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
            >
              <Shield className="w-4 h-4" />
              OWODE Alajo — Your Money Is Safe
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold font-serif tracking-tight leading-[1.1] text-balance"
            >
              Your Money Is{" "}
              <span className="text-primary">Safe.</span> Always.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              OWODE Alajo replaces risky paper cards and manual ledgers with
              real-time digital tracking. Every collection recorded, every
              contributor alerted, every naira accounted for. Safety is not
              a promise — it{"'"}s our system.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="gap-2"
                onClick={() => signinRedirect()}
              >
                {"I'm a Contributor"} <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                className="gap-2 bg-red-600 text-white hover:bg-red-700"
                onClick={() => signinRedirect()}
              >
                {"I'm an Agent"} <Smartphone className="w-4 h-4" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-10 grid grid-cols-3 gap-4 sm:gap-8 max-w-md"
            >
              {MINI_STATS.map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold font-serif text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={HERO_IMAGE}
                alt="OWODE agent using smartphone for digital collection"
                className="w-full h-auto object-cover aspect-[4/3]"
              />
              {/* Floating notification card */}
              <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:bottom-6 sm:right-auto bg-background/95 backdrop-blur-md rounded-xl p-4 shadow-lg max-w-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Collection Alert</p>
                    <p className="text-xs text-muted-foreground">
                      {"₦5,000 received from Agent Bola"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
