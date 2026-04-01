export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appName = import.meta.env["VITE_APP_NAME"] || "Keel";

  return (
    <footer className="border-t border-keel-gray-800 bg-keel-navy">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-keel-gray-400">
          &copy; {currentYear} {appName}
        </p>

        <div className="flex items-center gap-4">
          {/* [SAIL_FOOTER_LINKS] */}
          <a
            href="https://keel.codai.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-keel-gray-800 px-2.5 py-1 text-xs text-keel-gray-400/60 transition-colors hover:border-keel-gray-600 hover:text-keel-gray-400"
          >
            Built with
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
            <span className="font-medium">Keel</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
