import { createContext, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import { IconClose, IconMenu, IconMoon, IconSun } from "@/components/common/icons";
import { useBackendStatus } from "@/hooks/useApi";
import { cx } from "@/utils/format";

export type Theme = "light" | "dark";

export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
}>({ theme: "dark", setTheme: () => {} });

export const useThemeContext = () => useContext(ThemeContext);

function useThemeState() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("hi-theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

export default function AppLayout() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, setTheme } = useThemeState();
  const status = useBackendStatus();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className="min-h-screen bg-canvas text-ink">
        <Sidebar />

        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                key="drawer-backdrop"
                className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                key="drawer"
                className="fixed inset-y-0 left-0 z-50 lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              >
                <div className="flex h-full w-64 flex-col bg-surface">
                  <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setDrawerOpen(false)}
                    className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink"
                  >
                    <IconClose />
                  </button>
                  <Sidebar
                    onNavigate={() => setDrawerOpen(false)}
                    className="flex h-full w-64 flex-col border-r border-line bg-surface"
                  />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex min-h-screen flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink lg:hidden"
            >
              <IconMenu />
            </button>
            <p className="text-sm font-semibold tracking-tight lg:hidden">Hospital Intelligence</p>
            <div className="ml-auto flex items-center gap-3">
              <span
                className={cx(
                  "badge",
                  status === "online"
                    ? "badge-emerald"
                    : status === "checking"
                      ? "badge-slate"
                      : "badge-red",
                )}
              >
                <span
                  className={cx(
                    "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                    status === "online"
                      ? "bg-emerald-500"
                      : status === "checking"
                        ? "bg-ink-faint"
                        : "bg-red-500",
                  )}
                />
                {status === "online"
                  ? "Backend online"
                  : status === "checking"
                    ? "Checking backend"
                    : "Backend offline"}
              </span>
              <motion.button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                whileTap={{ scale: 0.88, rotate: -12 }}
                className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={theme}
                    initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
                    transition={{ duration: 0.18 }}
                    className="grid place-items-center"
                  >
                    {theme === "dark" ? <IconSun /> : <IconMoon />}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="border-t border-line px-6 py-3">
            <p className="muted mx-auto max-w-[1600px] text-[11px] tracking-wide">
              Hospital Intelligence · synthetic demonstration data · not for clinical use
            </p>
          </footer>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}
