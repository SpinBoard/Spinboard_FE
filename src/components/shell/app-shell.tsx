"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { LogOut, User as UserIcon } from "lucide-react";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoMark, Wordmark } from "./logo-mark";
import { NAV_ITEMS, SIDE_LABEL, type AppRoute } from "./nav-config";
import "./app-shell.css";

interface AppShellProps {
  route: AppRoute;
  children: React.ReactNode;
}

// design/freebiz-mockup.html's app shell (.chrome/.app/.side/.nav-item) +
// design/freebiz-mobile.html's bottom .tabbar, wired to real, existing
// routes only — see nav-config.tsx for which screens are actually built.
// `data-route` on the outer wrapper is what remaps --accent/--accent-soft
// per src/styles/tokens.css; every child here reads --accent, none of them
// know which route they're in.
export function AppShell({ route, children }: AppShellProps) {
  const pathname = usePathname();
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const router = useRouter();

  const navItems = NAV_ITEMS[route];
  const primaryItems = navItems.filter((item) => item.primary);
  const homeHref = primaryItems[0]?.href ?? routes.HOME;

  const profileHref =
    route === "viewer" ? routes.USER.PROFILE : route === "brands" ? routes.BRAND.PROFILE : undefined;
  const settingsHref =
    route === "viewer" ? routes.USER.SETTINGS : route === "brands" ? routes.BRAND.SETTINGS : undefined;

  const handleLogout = () => {
    setUser(null);
    router.push(routes.HOME);
  };

  return (
    <div data-route={route}>
      <header className="fb-chrome">
        <Link href={homeHref} className="fb-chrome__logo">
          <LogoMark />
          <Wordmark />
        </Link>
        <div className="fb-chrome__spacer" />
        <div className="fb-chrome__account">
          {user?.email && <span className="fb-chrome__email">{user.email}</span>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--ink-700)",
                  border: "1px solid var(--line-2)",
                  color: "var(--txt)",
                  cursor: "pointer",
                }}>
                {user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt=""
                    style={{ width: "100%", height: "100%", borderRadius: 9, objectFit: "cover" }}
                  />
                ) : (
                  <UserIcon size={16} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {user?.companyName || user?.fullName || "Account"}
                  </span>
                  {user?.email && (
                    <span className="text-sm text-muted-foreground font-normal">{user.email}</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profileHref && (
                <DropdownMenuItem asChild>
                  <Link href={profileHref}>Profile</Link>
                </DropdownMenuItem>
              )}
              {settingsHref && (
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>Settings</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="fb-app">
        <aside className="fb-side">
          <p className="fb-side-label">{SIDE_LABEL[route]}</p>
          <nav className="fb-nav">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="fb-nav-item"
                  aria-current={active ? "true" : undefined}>
                  <item.icon className="fb-ic" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="fb-stage">{children}</main>
      </div>

      {primaryItems.length > 1 && (
        <nav
          className="fb-tabbar"
          style={{ gridTemplateColumns: `repeat(${primaryItems.length}, 1fr)` }}>
          {primaryItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "fb-tab fb-tab--on" : "fb-tab"}
                aria-current={active ? "true" : undefined}>
                <item.icon />
                {item.label === "My freebies" ? "Freebies" : item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
