import React from 'react';
import { LayoutDashboard, Package, Users, Search, Menu, X, ArrowLeft, Settings as SettingsIcon, Cloud, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { iconSize } from '../lib/icons';
import { getSettings } from '../data/settings';
import { getStorageMode, subscribeSyncStatus } from '../data/cloudSync';
import { isCloudSyncEnabled, APP_VERSION } from '../config';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Fleet overview & insights' },
  assets: { title: 'Assets', subtitle: 'Hardware inventory & lifecycle' },
  employees: { title: 'Employees', subtitle: 'Team directory & assignments' },
  settings: { title: 'Settings', subtitle: 'Organization & data management' },
};

export default function Layout({
  children,
  activeTab,
  setActiveTab,
  headerSearch,
  onHeaderSearchChange,
  searchPlaceholder,
  showHeaderSearch = true,
}: {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerSearch: string;
  onHeaderSearchChange: (value: string) => void;
  searchPlaceholder: string;
  showHeaderSearch?: boolean;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [storageMode, setStorageMode] = React.useState(getStorageMode());
  const orgName = getSettings().organizationName;
  const page = PAGE_META[activeTab] ?? PAGE_META.dashboard;

  React.useEffect(() => subscribeSyncStatus(() => setStorageMode(getStorageMode())), []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen min-w-0 bg-canvas">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 p-6 fixed h-full">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Package className={iconSize.hero} />
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">{orgName}</span>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mt-0.5">
              Asset Management
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={iconSize.nav} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-700">
              {isCloudSyncEnabled() && storageMode === 'cloud' ? (
                <Cloud className={iconSize.sm} aria-hidden />
              ) : (
                <HardDrive className={iconSize.sm} aria-hidden />
              )}
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Storage</p>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {isCloudSyncEnabled() && storageMode === 'cloud' ? 'Team cloud sync' : 'This browser only'}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Manage storage →
            </button>
            <p className="mt-3 text-[10px] text-gray-400">v{APP_VERSION}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-64" id="main">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-lg focus:ring-2 focus:ring-indigo-500"
        >
          Skip to content
        </a>
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
          <div className="flex h-14 sm:h-16 md:h-20 items-center gap-2 px-3 sm:gap-3 sm:px-4 md:px-6">
            <button
              type="button"
              className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className={iconSize.lg} />
            </button>

            {activeTab !== 'dashboard' && (
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:gap-2 sm:px-3"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className={iconSize.lg} aria-hidden />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            <div className="relative min-w-0 flex-1 sm:max-w-md">
              {showHeaderSearch ? (
                <>
                  <Search
                    className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400', iconSize.md)}
                    aria-hidden
                  />
                  <input
                    type="search"
                    value={headerSearch}
                    onChange={(e) => onHeaderSearchChange(e.target.value)}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    aria-label={searchPlaceholder}
                    className="w-full rounded-xl border border-transparent bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-inner shadow-gray-100/50 transition-all placeholder:text-gray-400 focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/30"
                  />
                </>
              ) : activeTab === 'settings' ? (
                <p className="truncate rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500">
                  Organization settings &amp; data management
                </p>
              ) : (
                <p className="truncate rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-500">
                  {page.title} — {page.subtitle}
                </p>
              )}
            </div>

            <div className="icon-toolbar shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="rounded-xl p-1.5 text-gray-500 hover:bg-gray-50 sm:p-2"
                title="Settings"
                aria-label="Open settings"
              >
                <SettingsIcon className={iconSize.md} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div id="main-content" className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6 lg:p-10" tabIndex={-1}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-auto border-t border-gray-100 bg-white/80 px-6 py-4 text-center lg:px-10">
          <p className="text-xs font-medium text-gray-500">
            {orgName} · Asset Management · v{APP_VERSION}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {isCloudSyncEnabled() && storageMode === 'cloud'
              ? 'Team cloud sync enabled'
              : 'Data stored in this browser only'}
          </p>
        </footer>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-6 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Package className={iconSize.hero} />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">{orgName}</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
                  <X className={iconSize.hero} />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                      activeTab === item.id 
                        ? "bg-indigo-50 text-indigo-600" 
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className={iconSize.nav} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-gray-100">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    {isCloudSyncEnabled() && storageMode === 'cloud' ? (
                      <Cloud className={iconSize.sm} aria-hidden />
                    ) : (
                      <HardDrive className={iconSize.sm} aria-hidden />
                    )}
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Storage</p>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {isCloudSyncEnabled() && storageMode === 'cloud' ? 'Team cloud sync' : 'This browser only'}
                  </p>
                  <p className="mt-3 text-[10px] text-gray-400">v{APP_VERSION}</p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
