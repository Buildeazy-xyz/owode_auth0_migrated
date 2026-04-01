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
      { label: "About Us", href: "/about" },
      { label: "Contact", href: "/contact" },
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
    <footer className="bg-[oklch(0.14_0.04_255)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="https://hercules-cdn.com/file_MvdcHn3Luis6KlyAOhCjHtE8"
                alt="OWODE Financial Group"
                className="h-10 w-auto brightness-0 invert"
              />
            </Link>
            <p className="mt-4 text-sm text-white/50 leading-relaxed max-w-xs">
              Trust + Structure + Intelligence. From grassroots savings to
              wealth advisory, OWODE is building Nigeria{"'"}s most trusted
              financial ecosystem.
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
                    {link.href.startsWith("/") ? (
                      <Link
                        to={link.href}
                        className="text-sm text-white/40 hover:text-white/80 transition-colors"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-white/40 hover:text-white/80 transition-colors"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            {"© "}
            {new Date().getFullYear()} OWODE Financial Group. All
            rights reserved.
          </p>
          <p className="text-sm text-white/30">Made in Nigeria with purpose.</p>
        </div>
      </div>
    </footer>
  );
}
