import { motion } from "motion/react";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const INFO_ITEMS = [
  {
    icon: MapPin,
    title: "Office Address",
    lines: ["OWODE Digital Services Limited", "Lagos, Nigeria"],
  },
  {
    icon: Phone,
    title: "Phone",
    lines: ["+234 XXX XXX XXXX"],
  },
  {
    icon: Mail,
    title: "Email",
    lines: ["info@owodealajo.com"],
  },
  {
    icon: Clock,
    title: "Business Hours",
    lines: ["Monday - Friday: 8am - 6pm", "Saturday: 9am - 2pm"],
  },
];

export default function ContactInfo() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-serif text-foreground">
        Contact Information
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Reach out to us through any of these channels. We typically respond
        within 24 hours on business days.
      </p>

      <div className="space-y-5 pt-2">
        {INFO_ITEMS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex items-start gap-4"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {item.title}
              </h3>
              {item.lines.map((line) => (
                <p key={line} className="text-sm text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Social links */}
      <div className="pt-4 border-t border-border">
        <p className="text-sm font-semibold text-foreground mb-3">
          Follow Us
        </p>
        <div className="flex gap-3">
          {["WhatsApp", "Facebook", "Instagram"].map((platform) => (
            <span
              key={platform}
              className="px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
