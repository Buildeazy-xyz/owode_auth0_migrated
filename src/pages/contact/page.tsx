import Header from "@/components/Header.tsx";
import Footer from "@/components/Footer.tsx";
import ContactHero from "./_components/contact-hero.tsx";
import ContactForm from "./_components/contact-form.tsx";
import ContactInfo from "./_components/contact-info.tsx";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <ContactHero />

        <section className="py-12 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-14">
              {/* Form - takes more space */}
              <div className="lg:col-span-3">
                <ContactForm />
              </div>

              {/* Info sidebar */}
              <div className="lg:col-span-2">
                <ContactInfo />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
