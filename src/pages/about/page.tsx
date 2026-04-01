import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";
import AboutHero from "./_components/about-hero.tsx";
import CredentialsSection from "./_components/credentials-section.tsx";
import MissionSection from "./_components/mission-section.tsx";
import FoundingStorySection from "./_components/founding-story-section.tsx";
import ValuesSection from "./_components/values-section.tsx";
import LeadershipSection from "./_components/leadership-section.tsx";
import PartnershipSection from "./_components/partnership-section.tsx";
import PromiseSection from "./_components/promise-section.tsx";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <AboutHero />
        <CredentialsSection />
        <MissionSection />
        <FoundingStorySection />
        <ValuesSection />
        <LeadershipSection />
        <PartnershipSection />
        <PromiseSection />
      </main>
      <Footer />
    </div>
  );
}
