export default function Footer() {
  const footerLinks = {
    "Help": [
      { name: "FAQ", href: "/help/faq" },
      { name: "Help Center", href: "/help" },
      { name: "Terms of Use", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
    ],
    "Account": [
      { name: "Media Center", href: "/media" },
      { name: "Investor Relations", href: "/investors" },
      { name: "Jobs", href: "/jobs" },
    ],
    "Connect": [
      { name: "Facebook", href: "https://facebook.com" },
      { name: "Twitter", href: "https://twitter.com" },
      { name: "Instagram", href: "https://instagram.com" },
    ],
  };

  return (
    <footer className="bg-[#141414] py-12 px-4 md:px-12 text-gray-500">
      <div className="max-w-7xl mx-auto">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-2xl font-bold text-[#E50914]">
            OTT<span className="text-white">PLAY</span>
          </span>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-bold text-white mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-gray-300 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="border-t border-[#2a2a2a] pt-8 text-sm">
          <p className="mb-2">© 2026 OTT Platform. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-gray-600">
              Device Privacy Settings
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
