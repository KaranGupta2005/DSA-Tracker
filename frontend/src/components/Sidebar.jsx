import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Trophy, Calendar, Target, User, Brain, BookOpen, Shield, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
  { icon: Calendar, label: 'Contests', href: '/contests' },
  { icon: Target, label: 'Daily', href: '/daily' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Brain, label: 'AI Report', href: '/ai-report' },
  { icon: BookOpen, label: 'Session Prep', href: '/session-prep' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = router.pathname;
  const { isAdmin, logout } = useAuth();

  return (
    <aside className="w-16 h-screen fixed left-0 top-0 bg-[#0c0c0c] border-r border-white/[0.06] flex-col py-5 items-center hidden md:flex z-50">
      {/* Logo */}
      <Link href="/dashboard" className="mb-8 flex items-center justify-center">
        <img src="/icons/logo.png" alt="DSA" className="w-8 h-8 object-contain opacity-90 hover:opacity-100 transition-opacity" />
      </Link>

      {/* Dashboard — primary CTA */}
      <Link
        href="/dashboard"
        className={`flex items-center justify-center w-10 h-10 rounded-xl mb-6 transition-all duration-200 ${
          pathname === '/dashboard'
            ? 'bg-[#84cc16] text-black shadow-[0_0_12px_rgba(132,204,22,0.3)]'
            : 'border border-[#84cc16]/40 text-[#84cc16] hover:bg-[#84cc16]/10'
        }`}
        title="Dashboard"
      >
        <Home size={18} />
      </Link>

      {/* Divider */}
      <div className="w-6 h-px bg-white/10 mb-4" />

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-white bg-white/10'
                  : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
              title={item.label}
            >
              <Icon size={18} />
            </Link>
          );
        })}

        {isAdmin() && (
          <>
            <div className="w-6 h-px bg-white/10 my-2" />
            <Link
              href="/admin"
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                pathname === '/admin'
                  ? 'text-white bg-white/10'
                  : 'text-zinc-600 hover:text-violet-400 hover:bg-violet-400/[0.06]'
              }`}
              title="Admin"
            >
              <Shield size={18} />
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <button
        onClick={() => { logout(); router.push('/'); }}
        className="flex items-center justify-center w-10 h-10 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 mt-4"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </aside>
  );
}
