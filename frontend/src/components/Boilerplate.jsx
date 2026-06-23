import Navbar from './Navbar';

/**
 * Boilerplate HOC for consistent page layout wrapping.
 * Wraps the page content with the Navbar and a main content area.
 *
 * @param {React.ComponentType} WrappedComponent - The page component to wrap
 * @returns {React.ComponentType} - The wrapped page component with layout
 */
export default function Boilerplate(WrappedComponent) {
  function LayoutWrapper(props) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <Navbar />
        <main className="pt-20">
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
