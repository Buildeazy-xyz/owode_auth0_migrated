import { motion } from "motion/react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion.tsx";

type FaqCategory = {
  title: string;
  icon: string;
  items: { q: string; a: string }[];
};

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "Getting Started",
    icon: "🚀",
    items: [
      {
        q: "What is OWODE ALAJO-ÀGBÁIYE?",
        a: "OWODE ALAJO-ÀGBÁIYE is a digital savings and thrift (Ajo/Esusu) platform that helps individuals save consistently, access loans, and build long-term wealth with transparency and security.",
      },
      {
        q: "What is Ajo or Esusu?",
        a: "Ajo (also known as Esusu) is a traditional savings system where individuals contribute money regularly (daily, weekly, or monthly) and receive payouts at agreed intervals. OWODE modernizes this system using technology to ensure safety of funds, accurate record keeping, and easy access to savings and loans.",
      },
      {
        q: "How do I start saving?",
        a: "To begin: Download the OWODE App, create an account, complete your KYC (Know Your Customer), choose your contribution plan (daily, weekly, monthly, or yearly), and start saving immediately.",
      },
      {
        q: "What documents are required for registration?",
        a: "You will need a valid ID (e.g., NIN, Voter's Card, Driver's License), your phone number, and basic personal details.",
      },
      {
        q: "Who can use OWODE?",
        a: "OWODE is designed for traders, artisans, small business owners, salary earners — anyone serious about saving and building wealth.",
      },
    ],
  },
  {
    title: "Savings & Contributions",
    icon: "💰",
    items: [
      {
        q: "What types of contributions can I choose?",
        a: "You can select daily contributions, weekly contributions, monthly contributions, or yearly contributions. You choose what works best for your income flow.",
      },
      {
        q: "Can I save without an agent?",
        a: "Yes. OWODE allows you to save directly through your virtual account and transfer funds anytime without meeting an agent.",
      },
      {
        q: "What is a virtual account?",
        a: "A virtual account is a unique bank account number assigned to you. You can send your contributions directly to it, receive payments easily, and track all transactions in real time.",
      },
      {
        q: "Can I join group Ajo?",
        a: "Yes. You can join an existing group, create your own group, and set contribution amount and frequency.",
      },
      {
        q: "How do I track my savings?",
        a: "You can monitor everything in your dashboard: total contributions, withdrawal history, current balance, and contribution calendar.",
      },
    ],
  },
  {
    title: "Payouts & Withdrawals",
    icon: "🏦",
    items: [
      {
        q: "Can I withdraw my money anytime?",
        a: "Yes, you can request withdrawals at your payout period, or earlier in case of emergencies (terms may apply).",
      },
      {
        q: "How does payout work?",
        a: "Your payout depends on your plan: Daily contributors receive weekly payouts, weekly contributors receive monthly payouts, and monthly contributors receive 6-month payouts. You can also choose to roll over your savings.",
      },
    ],
  },
  {
    title: "Loans",
    icon: "📋",
    items: [
      {
        q: "Can I access loans?",
        a: "Yes. You can access loans after meeting KYC requirements and after consistent savings (typically up to 6 months).",
      },
      {
        q: "What is the interest rate on loans?",
        a: "OWODE offers low and fair interest rates (around 10%), significantly lower than many informal lenders.",
      },
    ],
  },
  {
    title: "Agents & Security",
    icon: "🛡️",
    items: [
      {
        q: "What is the role of an agent?",
        a: "Agents help register new users, collect contributions (for those who prefer physical interaction), and provide support and reminders. All agents are verified and monitored by OWODE.",
      },
      {
        q: "What happens if an agent runs away with money?",
        a: "OWODE is designed to prevent this risk. All contributions are digitally tracked, funds are linked to secure accounts, and agents are verified and accountable. Your money is protected.",
      },
      {
        q: "Is my money safe with OWODE?",
        a: "Yes. Your money is safe. OWODE ensures secure digital records of all transactions, partnership with regulated financial institutions (Providus Bank integration), strict agent monitoring and verification, and transparent tracking via your personal dashboard.",
      },
    ],
  },
  {
    title: "Trust & Transparency",
    icon: "✅",
    items: [
      {
        q: "Are there any hidden charges?",
        a: "No. OWODE operates with full transparency. All charges (if any) are clearly stated.",
      },
      {
        q: "What makes OWODE different from traditional Ajo?",
        a: "OWODE offers digital security, no risk of fund loss, easy tracking and reporting, access to loans, and flexibility in contributions.",
      },
      {
        q: "Why should I trust OWODE?",
        a: "Because we combine tradition (Ajo/Esusu), technology (secure digital platform), transparency (clear records), and discipline (structured savings culture). OWODE is built on one promise: Your Money is Safe.",
      },
      {
        q: "What is OWODE's mission?",
        a: "To move millions of Nigerians into the middle class through financial discipline, savings, and access to reliable financial services.",
      },
      {
        q: "How can I contact OWODE?",
        a: "You can reach us through in-app support, official WhatsApp channels, or customer care lines.",
      },
    ],
  },
];

export default function FaqAccordion() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-12">
          {FAQ_CATEGORIES.map((category, catIdx) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: catIdx * 0.08 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {category.title}
                </h2>
              </div>

              <Accordion type="single" collapsible className="space-y-3">
                {category.items.map((item, idx) => (
                  <AccordionItem
                    key={idx}
                    value={`${catIdx}-${idx}`}
                    className="border border-border rounded-xl px-5 bg-card/50 hover:bg-card transition-colors data-[state=open]:bg-card data-[state=open]:shadow-sm"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold hover:no-underline py-4">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
