import { Outlet } from "react-router";
import Header from "./Header";
import Footer from "./Footer";
import OfflineBanner from "@/components/OfflineBanner";
import { useDeepLinks } from "@/hooks/useDeepLinks";

export default function Layout() {
  useDeepLinks();

  return (
    <div className="flex min-h-screen flex-col bg-keel-navy">
      <OfflineBanner />
      <Header />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
