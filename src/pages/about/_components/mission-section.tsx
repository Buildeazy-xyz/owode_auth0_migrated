import { motion } from "motion/react";
import { Target, Eye, Compass } from "lucide-react";

const PILLARS = [
  {
    icon: Compass,
    title: "Our Purpose",
    description:
      "To move millions of Nigerians into the middle class through financial education, discipline, and access to trusted financial services.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Eye,
    title: "Our Vision",
    description:
      "To create a world where saving money becomes a strong habit — like an oath to wealth.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Target,
    title: "Our Mission",
    description:
      "To provide simple and reliable ways for people to save consistently, access fair loans, and use trusted financial services — all designed to build lasting wealth.",
    color: "bg-primary/10 text-primary",
  },
];

export default function MissionSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            Why We Exist
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            Purpose. Vision. Mission.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative bg-card border border-border rounded-2xl p-8 text-center"
            >
              <div
                className={`mx-auto w-14 h-14 rounded-xl ${pillar.color} flex items-center justify-center mb-5`}
              >
                <pillar.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-serif text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
