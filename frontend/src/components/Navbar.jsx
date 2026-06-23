import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Navbar component — sticky, glassmorphism, auth-aware.
 * Shows different links based on login state and role.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const active = router.pathname;
  const { user, logout, isAuthenticated, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Build nav links based on auth state
  const getNavLinks = () => {
    if (isAuthenticated()) {
      const links = [
        { name: 'Home', href: '/' },
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Leaderboard', href: '/leaderboard' },
        { name: 'Contests', href: '/contests' },
        { name: 'Daily', href: '/daily' },
      ];

      if (isAdmin()) {
        links.push({ name: 'Admin', href: '/admin' });
      }

      links.push({ name: 'Logout', href: '#', onClick: handleLogout });

      return links;
    }

    // Not logged in
    return [
      { name: 'Home', href: '/' },
      { name: 'Leaderboard', href: '/leaderboard' },
      { name: 'Contests', href: '/contests' },
      { name: 'Login', href: '/login' },
    ];
  };

  const navLinks = getNavLinks();

  const linkStyle =
    'relative px-2 py-1 text-gray-300 hover:text-white after:block after:scale-x-0 after:bg-indigo-400 after:h-[2px] after:rounded-full after:transition-transform hover:after:scale-x-100 transition-all duration-200';
  const activeStyle = 'text-white font-semibold scale-105';

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/icons/logo.png"
            alt="IEEE DTU DSA Tracker Logo"
            className="h-12 w-auto object-contain"
          />
          <span className="text-white font-bold text-xl tracking-tight hidden sm:inline">
            IEEE DTU DSA
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8 text-lg">
          {navLinks.map(({ name, href, onClick }) =>
            onClick ? (
              <button
                key={name}
                onClick={onClick}
                className={`${linkStyle} cursor-pointer bg-transparent border-none`}
              >
                {name}
              </button>
            ) : (
              <Link
                key={name}
                href={href}
                className={`${linkStyle} ${active === href ? activeStyle : ''}`}
              >
                {name}
              </Link>
            )
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="text-white"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-gray-900/95 text-white px-6 pb-4 space-y-3 border-t border-gray-800">
          {navLinks.map(({ name, href, onClick }) =>
            onClick ? (
              <button
                key={name}
                onClick={() => {
                  setMobileOpen(false);
                  onClick();
                }}
                className="block transition-all duration-200 hover:text-indigo-400 bg-transparent border-none text-white cursor-pointer text-left"
              >
                {name}
              </button>
            ) : (
              <Link
                key={name}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block transition-all duration-200 ${
                  active === href
                    ? 'scale-105 font-bold text-indigo-400'
                    : 'hover:text-indigo-400'
                }`}
              >
                {name}
              </Link>
            )
          )}
        </div>
      )}
    </nav>
  );
}
