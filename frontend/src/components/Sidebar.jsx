import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Trophy, Calendar, Target, User, Brain, BookOpen, Shield, LogOut, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

const navItems = [
  { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
  { icon: Calendar, label: 'Contests', href: '/contests' },
  { icon: Target, label: 'Daily', href: '/daily' },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Brain, label: 'AI Report', href: '/ai-report' },
  { icon: BookOpen, label: 'Session Prep', href: '/session-prep' },
];

// Mobile bottom nav shows 5 key items
const mobileNavItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Trophy, label: 'Board', href: '/leaderboard' },
  { icon: Target, label: 'Daily', href: '/daily' },
  { icon: Calendar, label: 'Contests', href: '/contests' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = router.pathname;
  const { isAdmin, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="w-16 h-screen fixed left-0 top-0 bg-[#0c0c0c] border-r border-white/[0.06] flex-col py-5 items-center hidden md:flex z-50">
        <Link href="/dashboard" className="mb-8 flex items-center justify-center">
          <img src="/icons/logo.png" alt="DSA" className="w-8 h-8 object-contain opacity-90 hover:opacity-100 transition-opacity" />
        </Link>

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

        <div className="w-6 h-px bg-white/10 mb-4" />

        <nav className="flex-1 flex flex-col items-center gap-1.5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 ${
                  isActive ? 'text-white bg-white/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]'
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
                  pathname === '/admin' ? 'text-white bg-white/10' : 'text-zinc-600 hover:text-violet-400 hover:bg-violet-400/[0.06]'
                }`}
                title="Admin"
              >
                <Shield size={18} />
              </Link>
            </>
          )}
        </nav>

        <button
          onClick={() => { logout(); router.push('/'); }}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 mt-4"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </aside>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c] border-t border-white/[0.06] px-2 py-2">
        <div className="flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
                  isActive ? 'text-[#84cc16]' : 'text-zinc-600'
                }`}
              >
                <Icon size={20} />
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}

          {/* More menu */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${
              moreOpen ? 'text-[#84cc16]' : 'text-zinc-600'
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[9px] font-semibold">More</span>
          </button>
        </div>

        {/* More panel */}
        {moreOpen && (
          <div className="absolute bottom-full left-0 right-0 bg-[#0c0c0c] border-t border-white/[0.06] p-4 grid grid-cols-4 gap-3">
            {[
              { icon: User, label: 'Profile', href: '/profile' },
              { icon: Brain, label: 'AI Report', href: '/ai-report' },
              { icon: BookOpen, label: 'Session', href: '/session-prep' },
              ...(isAdmin() ? [{ icon: Shield, label: 'Admin', href: '/admin' }] : []),
              { icon: LogOut, label: 'Logout', href: '#', onClick: () => { logout(); router.push('/'); } },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return item.onClick ? (
                <button
                  key={item.label}
                  onClick={() => { setMoreOpen(false); item.onClick(); }}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                    isActive ? 'text-[#84cc16] bg-[#84cc16]/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </>
  );
}
