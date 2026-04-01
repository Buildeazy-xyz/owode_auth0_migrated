import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";
import HeroSection from "./_components/hero-section.tsx";
import ProblemSection from "./_components/problem-section.tsx";
import EcosystemSection from "./_components/ecosystem-section.tsx";
import HowItWorksSection from "./_components/how-it-works-section.tsx";
import FeaturesSection from "./_components/features-section.tsx";
import StatsSection from "./_components/stats-section.tsx";
import CtaSection from "./_components/cta-section.tsx";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <EcosystemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <StatsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
