import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await logout();
  };

  return (
    <header className="border-b border-keel-gray-800 bg-keel-navy">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="Keel" className="h-8 w-8" />
          <span className="text-lg font-bold text-white">keel</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/"
            className="text-sm font-medium text-keel-gray-400 transition-colors hover:text-white"
          >
            Home
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full border border-keel-gray-800 py-1.5 pl-1.5 pr-3 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-keel-blue/20 text-xs font-semibold text-keel-blue">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span>{user?.name || "User"}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-keel-gray-800 bg-keel-gray-900 py-1 shadow-lg">
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-keel-gray-100 hover:bg-keel-gray-800"
                    >
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-keel-gray-100 hover:bg-keel-gray-800"
                    >
                      Settings
                    </Link>
                    <hr className="my-1 border-keel-gray-800" />
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-keel-gray-400 transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-keel-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-keel-blue/90"
              >
                Sign up
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-keel-gray-400 hover:text-white md:hidden"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-keel-gray-800 bg-keel-navy px-4 pb-4 pt-2 md:hidden">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-keel-gray-400 hover:text-white"
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-keel-gray-400 hover:text-white"
              >
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-keel-gray-400 hover:text-white"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                Log out
              </button>
            </>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/login");
                }}
                className="rounded-lg border border-keel-gray-800 px-4 py-2 text-center text-sm font-medium text-keel-gray-100 hover:border-keel-gray-400"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/signup");
                }}
                className="rounded-lg bg-keel-blue px-4 py-2 text-center text-sm font-medium text-white hover:bg-keel-blue/90"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
