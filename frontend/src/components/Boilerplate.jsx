import Navbar from './Navbar';
import { useRouter } from 'next/router';

/**
 * Boilerplate HOC — replicates Model_NextJs-project layout/Boilerplate.
 * Wraps pages with Navbar. Does not show Navbar on the landing page (/)
 * since the landing page renders its own Navbar inline.
 * Adds consistent dark background and padding for inner pages.
 */
export default function Boilerplate(WrappedComponent) {
  function LayoutWrapper(props) {
    const router = useRouter();
    const isHome = router.pathname === '/';

    // Landing page handles its own Navbar, so skip wrapping
    if (isHome) {
      return <WrappedComponent {...props} />;
    }

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
