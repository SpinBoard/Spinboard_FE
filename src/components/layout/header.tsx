"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/freebiz-button";
import { LogoMark, Wordmark } from "@/components/shell/logo-mark";
import { User, Menu, LogOut, X, Settings, Wallet, Gift } from "lucide-react";
import { routes } from "@/app/_utils/routes";
import { useAtomValue, useSetAtom } from "jotai/react";
import { userAtom } from "@/atom/user";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavLink {
  href: string;
  label: string;
}

// Public-site chrome only. The signed-in app has its own shell
// (src/components/shell/app-shell.tsx) with the sidebar/tab-bar nav — this
// Header is what wraps the marketing pages (/, /about) and the public
// Brands directory. Restyled onto tokens.css + the Freebiz wordmark as the
// Phase E follow-up; "Marketplace" renamed to "Brands" to match the
// §Marketplace ruling in design/DECISIONS.md.
const VIEWER_LINKS: NavLink[] = [
  { href: routes.WATCH, label: "Billboard" },
  { href: routes.USER.CLAIMS, label: "My freebies" },
  { href: routes.USER.WALLET, label: "Wallet" },
  { href: routes.MARKETPLACE, label: "Brands" },
  { href: routes.USER.PROMOTE, label: "Promote & earn" },
  { href: routes.FORUM, label: "Forum" },
];

const BRAND_LINKS: NavLink[] = [
  { href: routes.BRAND.DASHBOARD, label: "Dashboard" },
  { href: routes.BRAND.CAMPAIGNS, label: "Campaigns" },
  { href: routes.BRAND.PRODUCTS, label: "Products" },
  { href: routes.MARKETPLACE, label: "Brands" },
];

const ADMIN_LINKS: NavLink[] = [{ href: routes.ADMIN.CAMPAIGNS, label: "Live monitor" }];

const GUEST_LINKS: NavLink[] = [
  { href: routes.WATCH, label: "Billboard" },
  { href: routes.HOME, label: "Home" },
  { href: routes.MARKETPLACE, label: "Brands" },
];

export function Header() {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(userAtom);
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const userType = user?.userType;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    setUser(null);
    router.push(routes.HOME);
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Until mounted, render the guest set so the server and first client
  // render agree — userAtom reads localStorage synchronously on the client
  // (same hydration guard used in ProtectedRoute and /watch).
  const links = !isMounted
    ? GUEST_LINKS
    : userType === "viewer"
      ? VIEWER_LINKS
      : userType === "brand"
        ? BRAND_LINKS
        : userType === "admin"
          ? ADMIN_LINKS
          : GUEST_LINKS;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{ background: "color-mix(in srgb, var(--ink-900) 95%, transparent)" }}>
      <div className="px-[5%]">
        <div className="flex h-20 items-center justify-between">
          <Link href={routes.HOME} className="flex items-center gap-2">
            <LogoMark />
            <Wordmark />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:opacity-80"
                style={{ color: "var(--muted)", fontSize: 13.5, fontWeight: 600 }}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isMounted && userType ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account"
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ border: "1px solid var(--line-2)", color: "var(--txt)" }}>
                    {user?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.fullName || user?.email || "Account"}</span>
                      {user?.username && (
                        <span className="text-sm text-muted-foreground font-normal">@{user.username}</span>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userType === "viewer" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={routes.USER.PROFILE}>Profile</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={routes.USER.WALLET}>
                          <Wallet className="h-4 w-4 mr-2" />
                          Wallet
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={routes.USER.CLAIMS}>
                          <Gift className="h-4 w-4 mr-2" />
                          My freebies
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={routes.USER.SETTINGS}>
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleLogout} style={{ color: "var(--spent)" }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden lg:flex items-center gap-2">
                <Link href={routes.LOGIN}>
                  <Button variant="ghost">Log in</Button>
                </Link>
                <Link href={`${routes.REGISTER}?type=user`}>
                  <Button variant="primary">Start watching</Button>
                </Link>
                <Link href={`${routes.REGISTER}?type=brand`}>
                  <Button>Create campaign</Button>
                </Link>
              </div>
            )}

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="lg:hidden p-2"
              style={{ color: "var(--txt)" }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden backdrop-blur-sm"
          style={{
            background: "color-mix(in srgb, var(--ink-900) 95%, transparent)",
            borderBottom: "1px solid var(--line)",
          }}>
          <div className="px-[5%] py-4">
            <nav className="space-y-1">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block py-3 px-2 rounded-md transition-colors"
                  style={{ color: "var(--txt)", fontSize: 14 }}
                  onClick={closeMobileMenu}>
                  {link.label}
                </Link>
              ))}

              {isMounted && userType === "viewer" && (
                <>
                  <Link
                    href={routes.USER.PROFILE}
                    className="block py-3 px-2 rounded-md transition-colors"
                    style={{ color: "var(--txt)", fontSize: 14 }}
                    onClick={closeMobileMenu}>
                    Profile
                  </Link>
                  <Link
                    href={routes.USER.SETTINGS}
                    className="block py-3 px-2 rounded-md transition-colors"
                    style={{ color: "var(--txt)", fontSize: 14 }}
                    onClick={closeMobileMenu}>
                    Settings
                  </Link>
                </>
              )}

              {isMounted && userType ? (
                <div className="pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full py-3 px-2 rounded-md transition-colors"
                    style={{ color: "var(--spent)", fontSize: 14 }}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </button>
                </div>
              ) : (
                <div className="pt-3 flex flex-col gap-2" style={{ borderTop: "1px solid var(--line)" }}>
                  <Link href={routes.LOGIN} onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-center">Log in</Button>
                  </Link>
                  <Link href={`${routes.REGISTER}?type=user`} onClick={closeMobileMenu}>
                    <Button variant="primary" className="w-full justify-center">Start watching</Button>
                  </Link>
                  <Link href={`${routes.REGISTER}?type=brand`} onClick={closeMobileMenu}>
                    <Button className="w-full justify-center">Create campaign</Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
