import { motion } from "motion/react";
import { User } from "lucide-react";

const TEAM = [
  {
    name: "Olusegun Oyero Olurin",
    role: "Chief Vision Officer / Chief Technology Officer",
    description: "Provides direction, strategy, and long-term vision.",
  },
  {
    name: "Itunu-Oluwa Olurin",
    role: "Chief Executive Officer",
    description: "Leads operations and ensures excellent service delivery.",
  },
  {
    name: "Mary Oladuni Abiona",
    role: "Operations Manager",
    description: "Oversees daily activities and customer experience.",
  },
  {
    name: "Aminat Tolani Iyiola",
    role: "Assistant Administration Manager",
    description: "Supports coordination and administrative systems.",
  },
  {
    name: "Adewale Qozeem",
    role: "Assistant Technology Officer",
    description: "Supports digital systems and platform development.",
  },
];

export default function LeadershipSection() {
  return (
    <section className="py-16 sm:py-24 bg-secondary/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
            The People Behind OWODE
          </h2>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            Leadership Team
          </p>
        </motion.div>

        {/* First row: 2 leaders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-6">
          {TEAM.slice(0, 2).map((member, i) => (
            <TeamCard key={member.name} member={member} delay={i * 0.1} />
          ))}
        </div>

        {/* Second row: 3 members */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {TEAM.slice(2).map((member, i) => (
            <TeamCard key={member.name} member={member} delay={(i + 2) * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamCard({
  member,
  delay,
}: {
  member: (typeof TEAM)[number];
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Photo placeholder */}
      <div className="aspect-[4/3] bg-gradient-to-br from-primary/5 to-primary/15 flex items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
          <User className="w-8 h-8 text-primary/40" />
        </div>
      </div>

      <div className="p-5 text-center">
        <h3 className="font-bold font-serif text-foreground">
          {member.name}
        </h3>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-1">
          {member.role}
        </p>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {member.description}
        </p>
      </div>
    </motion.div>
  );
}
