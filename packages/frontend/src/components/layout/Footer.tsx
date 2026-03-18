export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-keel-gray-800 bg-keel-navy">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/images/logo.png" alt="Keel" className="h-5 w-5" />
          <p className="text-sm text-keel-gray-400">
            &copy; {currentYear} Keel. All rights reserved.
          </p>
          <span className="text-keel-gray-400/30">|</span>
          <a
            href="https://www.codai.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-keel-gray-400/50 transition-colors hover:text-keel-gray-400"
          >
            <span>a</span>
            <img src="/images/codai-logo.png" alt="Codai" className="h-3" />
            <span>project</span>
          </a>
        </div>
        {/* [SAIL_FOOTER_LINKS] */}
      </div>
    </footer>
  );
}
