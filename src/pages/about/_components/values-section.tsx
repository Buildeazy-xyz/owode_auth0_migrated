import { motion } from "motion/react";
import { SunMedium, ShieldCheck } from "lucide-react";

const VALUES = [
  {
    icon: SunMedium,
    title: "Transparency",
    description:
      "We are open and clear in all dealings. Every contribution, every transaction, every decision is visible to you.",
  },
  {
    icon: ShieldCheck,
    title: "Vigilance",
    description:
      "We actively protect every contributor's money. Our systems monitor, verify, and safeguard at every step.",
  },
];

export default function ValuesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            What We Stand For
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            Our Core Values
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {VALUES.map((value, i) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-card border border-border rounded-2xl p-8 text-center"
            >
              <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold font-serif text-foreground mb-2">
                {value.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
