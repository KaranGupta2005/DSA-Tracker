import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

/**
 * Boilerplate HOC — layout wrapper for pages.
 * - Landing page (/): no wrapper (renders its own Navbar)
 * - Authenticated pages: Sidebar (fixed left) + content with md:pl-[90px]
 * - Unauthenticated pages: Navbar + content (no sidebar)
 */
export default function Boilerplate(WrappedComponent) {
  function LayoutWrapper(props) {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const isHome = router.pathname === '/';

    // Landing page handles its own layout
    if (isHome) {
      return <WrappedComponent {...props} />;
    }

    // Authenticated pages get sidebar layout
    if (isAuthenticated()) {
      return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans">
          <Sidebar />
          <main className="min-h-screen md:pl-[64px] transition-all duration-300">
            <div className="w-full px-4 md:px-6 py-6 pb-24 md:pb-8">
              <WrappedComponent {...props} />
            </div>
          </main>
        </div>
      );
    }

    // Unauthenticated pages get navbar
    return (
      <div className="min-h-screen bg-[#09090b] text-white">
        <Navbar />
        <main className="pt-4">
          <WrappedComponent {...props} />
        </main>
      </div>
    );
  }

  LayoutWrapper.displayName = `Boilerplate(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return LayoutWrapper;
}
