import { motion } from "motion/react";

const STATS = [
  { value: "400+", label: "Active Contributors" },
  { value: "₦50M+", label: "Funds Managed" },
  { value: "Dec 2024", label: "Founded" },
  { value: "99.9%", label: "System Uptime" },
];

export default function StatsSection() {
  return (
    <section className="py-20 lg:py-24 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-4xl sm:text-5xl font-bold font-serif">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/70">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
