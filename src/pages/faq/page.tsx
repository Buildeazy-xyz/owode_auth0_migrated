import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";
import FaqHero from "./_components/faq-hero.tsx";
import FaqAccordion from "./_components/faq-accordion.tsx";
import FaqCta from "./_components/faq-cta.tsx";

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <FaqHero />
        <FaqAccordion />
        <FaqCta />
      </main>
      <Footer />
    </div>
  );
}
