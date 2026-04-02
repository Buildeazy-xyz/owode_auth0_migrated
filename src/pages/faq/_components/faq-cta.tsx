import { motion } from "motion/react";
import { Button } from "@/components/ui/button.tsx";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowRight } from "lucide-react";

export default function FaqCta() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-10 sm:p-14 text-center"
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 mb-6">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
              <span className="text-sm font-semibold text-primary-foreground">
                Still have questions?
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
              {"We're Here to Help"}
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
              {"Can't find what you're looking for? Our support team is ready to assist you with anything you need."}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                variant="secondary"
                className="font-semibold"
                asChild
              >
                <Link to="/contact">
                  Contact Support <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground font-semibold"
                asChild
              >
                <Link to="/about">Learn About OWODE</Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Closing assurance */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground text-base italic">
            OWODE is not just a savings platform — it is a movement for
            financial discipline and wealth creation.
          </p>
          <p className="mt-3 text-lg font-bold text-primary">
            Your Money is Safe.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
