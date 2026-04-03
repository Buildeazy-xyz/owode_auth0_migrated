import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);

    // Simulate sending (no backend action needed for contact form)
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      toast.success("Message sent successfully!");
    }, 1200);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 sm:p-10 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold font-serif text-foreground mb-2">
          Thank You!
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
          Your message has been received. Our team will get back to you within
          24 hours.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setSubmitted(false)}>
          Send Another Message
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-5"
    >
      <h2 className="text-xl font-bold font-serif text-foreground">
        Send Us a Message
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" placeholder="John Smith" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input id="email" type="email" placeholder="example@gmail.com" required />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" placeholder="+234 800 000 0000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Select required>
            <SelectTrigger>
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General Inquiry</SelectItem>
              <SelectItem value="become-agent">Become an Agent</SelectItem>
              <SelectItem value="contributions">Contributions</SelectItem>
              <SelectItem value="support">Technical Support</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Tell us how we can help you..."
          rows={5}
          required
        />
      </div>

      <Button type="submit" disabled={sending} className="w-full sm:w-auto gap-2">
        <Send className="w-4 h-4" />
        {sending ? "Sending..." : "Send Message"}
      </Button>
    </motion.form>
  );
}
