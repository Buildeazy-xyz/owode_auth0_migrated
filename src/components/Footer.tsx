import { Link } from "react-router-dom";

const FOOTER_LINKS = [
  {
    title: "Product",
    links: [
      { label: "For Contributors", href: "#for-contributors" },
      { label: "For Agents", href: "#for-agents" },
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "https://owodealajo.com" },
      { label: "Contact", href: "https://owodealajo.com/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-[oklch(0.14_0.02_162)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-serif">
                  O
                </span>
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                OWODE
              </span>
            </Link>
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
              Powering the 954-year tradition of Ajo with modern technology.
              Your money is safe, your trust is earned.
            </p>
          </div>

          {FOOTER_LINKS.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/70 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            {"© "}
            {new Date().getFullYear()} OWODE Digital Services Limited. All
            rights reserved.
          </p>
          <p className="text-sm text-white/30">Made in Nigeria with purpose.</p>
        </div>
      </div>
    </footer>
  );
}
