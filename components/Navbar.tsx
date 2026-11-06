"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LogOut, LogIn, Search, Loader2, X,
  Newspaper, Tag, ReceiptText, UserCircle, Menu
} from "lucide-react";
import TransactionHistoryModal from "@/components/TransactionHistoryModal";
import { supabase, clearSupabaseLocalAuth } from "@/utils/supabaseClient";
import { Turnstile } from "@marsidev/react-turnstile";
import SandboxSessionControl from "@/components/sandbox/SandboxSessionControl";
import { useI18n } from "@/lib/i18n/context";
import { localizeHref, stripLocaleFromPathname } from "@/lib/i18n/config";

interface NavbarProps {
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (val: boolean) => void;
}

interface SearchBrandResult {
  name: string;
  slug: string;
  image_url?: string | null;
  active?: boolean;
}

export default function Navbar({ isSidebarOpen = false, setIsSidebarOpen }: NavbarProps) {
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // --- STATE PENCARIAN & MODAL ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchBrandResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { locale, t } = useI18n();

  const isAdminPage = pathname.startsWith("/admin");
  const normalizedAuthPath = stripLocaleFromPathname(pathname || "");
  const isLoginPage = normalizedAuthPath === "/login";

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== "undefined") {
        const normPath = stripLocaleFromPathname(pathname || "");
        if (normPath === "/login" || normPath === "/setup-2fa" || normPath === "/register") {
          setIsCheckingAuth(false);
          return;
        }

        const hasCookie = document.cookie.includes("sb-access-token");
        if (!hasCookie) {
          await clearSupabaseLocalAuth();
          setRole(null);
          setIsCheckingAuth(false);
          return;
        }

        const { data: { user }, error } = await supabase.auth.getUser();

        if (!user || error) {
          await clearSupabaseLocalAuth();
          setRole(null);
          setIsCheckingAuth(false);
          return;
        }

        const isAdmin = localStorage.getItem("isAdmin") === "true";
        const isUser = localStorage.getItem("isUser") === "true";
        if (isAdmin) setRole("admin");
        else if (isUser) setRole("user");
        else setRole(null);

        setIsCheckingAuth(false);
      }
    };
    void checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        void clearSupabaseLocalAuth();
        setRole(null);
      } else if (event === "TOKEN_REFRESHED" && session) {
        const refreshExpiresIn = session.expires_in;
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${refreshExpiresIn}; Secure; SameSite=Lax`;
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname]);

  // Listener untuk membuka modal dari BottomNav
  useEffect(() => {
    const handleOpenHistory = () => setIsHistoryOpen(true);
    window.addEventListener("openHistoryModal", handleOpenHistory);
    return () => window.removeEventListener("openHistoryModal", handleOpenHistory);
  }, []);

  // Klik luar tutup dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logika Pencarian
  useEffect(() => {
    const fetchSearch = async () => {
      const keyword = searchQuery.trim();
      if (!keyword) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      setShowDropdown(true);

      try {
        const { data } = await supabase
          .from("brands")
          .select("name, slug, image_url, active")
          .or(`name.ilike.%${keyword}%,slug.ilike.%${keyword}%`)
          .eq("active", true)
          .limit(8);
        if (data) setSearchResults(data as SearchBrandResult[]);
      } catch (err) {
        console.error("Gagal cari:", err);
      } finally {
        setIsSearching(false);
      }
    };
    const timer = setTimeout(fetchSearch, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    if (confirm(t("auth.confirmSignOut"))) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      await clearSupabaseLocalAuth();
      window.location.href = locale === "en" ? "/en" : "/";
    }
  };

  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";

  const handleSendSuggestion = async () => {
    if (!suggestionText.trim() || (!captchaToken && !isLocal)) return alert(t("search.suggestionCaptchaRequired"));
    setIsSending(true);
    try {
      const { error } = await supabase.from("product_suggestions").insert([{ content: suggestionText.trim() }]);
      if (error) throw error;
      alert(t("search.suggestionSuccess"));
      setSuggestionText("");
      setCaptchaToken(null);
      setIsSuggestionOpen(false);
    } catch {
      alert(t("search.suggestionFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  };

  const currentNormalizedPath = stripLocaleFromPathname(pathname);
  const isNewsActive = currentNormalizedPath === "/news";
  const isPromoActive = currentNormalizedPath === "/promo";

  const handleToggleLanguage = () => {
    const targetLocale = locale === "id" ? "en" : "id";
    const searchStr = typeof window !== "undefined" ? window.location.search : "";
    const targetPath = localizeHref(pathname, targetLocale);
    router.push(`${targetPath}${searchStr}`);
  };

  return (
    <>
      <nav className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/10 transition-colors duration-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-20 py-3 flex items-center justify-between gap-3 sm:gap-4">

          {/* SISI KIRI: Mobile Menu (Admin) & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {isAdminPage && setIsSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={t("common.toggleAdminMenuAria")}
                className="md:hidden p-2 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <Menu size={18} />
              </button>
            )}

            <Link href={locale === "en" ? "/en" : "/"} className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-lg">
              <Image
                src="/images/DaPay.svg"
                alt="DanisPay Logo"
                width={1269}
                height={313}
                priority
                className="h-7 sm:h-8 w-auto"
              />
            </Link>
          </div>

          {/* SISI TENGAH: Search Bar */}
          <div ref={searchRef} className="flex-1 max-w-xs sm:max-w-sm md:max-w-xs lg:max-w-sm xl:max-w-md mx-2 sm:mx-3 md:mx-3 lg:mx-4 xl:mx-6 relative">
            <div className="relative w-full group">
              <label htmlFor="navbar-product-search" className="sr-only">
                {t("search.inputLabel")}
              </label>
              <Search
                className="pointer-events-none absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
                size={15}
              />
              <input
                id="navbar-product-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery && setShowDropdown(true)}
                placeholder={t("search.placeholder")}
                aria-label={t("search.placeholder")}
                className="h-10 w-full bg-slate-950/60 border border-slate-700/80 text-white text-xs font-medium pl-9 sm:pl-10 pr-9 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all"
              />

              {/* Action Buttons inside Search Bar */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearching && (
                  <Loader2 className="animate-spin text-blue-400" size={14} />
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    aria-label={t("common.clear")}
                    className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* DROPDOWN HASIL */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/90 overflow-hidden z-50">
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {isSearching ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                      <span>{t("search.searching")}</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            router.push(locale === "en" ? `/en/${item.slug}` : `/${item.slug}`);
                            setShowDropdown(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors border-b border-slate-800/50 last:border-0"
                        >
                          <div className="w-10 h-10 relative rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                priority={idx < 4}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-blue-950 text-blue-400 font-bold text-xs">
                                {item.name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-200 hover:text-white truncate">
                            {item.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                        {t("search.notFound")}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSuggestionOpen(true);
                          setShowDropdown(false);
                        }}
                        className="text-blue-400 text-xs font-semibold hover:text-blue-300 hover:underline mt-2 inline-block transition-colors"
                      >
                        {t("search.suggestProduct")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SISI KANAN: Navigasi Desktop & Auth/Sandbox */}
          <div className="flex items-center gap-2 sm:gap-2.5 md:gap-2 lg:gap-3 shrink-0">
            {/* Language Switcher Button (Single-Click Direct Toggle with Flag) */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              aria-label={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
              title={locale === "id" ? t("language.switchToEnglish") : t("language.switchToIndonesian")}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-semibold px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-800/90 bg-slate-950/40 hover:bg-slate-800/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer shrink-0"
            >
              {locale === "id" ? (
                <svg className="w-4 h-3 rounded-xs shrink-0 overflow-hidden shadow-xs" viewBox="0 0 3 2" aria-hidden="true">
                  <rect width="3" height="1" fill="#e70011" />
                  <rect width="3" height="1" y="1" fill="#ffffff" />
                </svg>
              ) : (
                <svg className="w-4 h-3 rounded-xs shrink-0 overflow-hidden shadow-xs" viewBox="0 0 60 30" aria-hidden="true">
                  <clipPath id="uk-flag-clip-1">
                    <path d="M0,0 v30 h60 v-30 z"/>
                  </clipPath>
                  <g clipPath="url(#uk-flag-clip-1)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-flag-clip-1)" stroke="#C8102E" strokeWidth="4"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
                  </g>
                </svg>
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                {locale.toUpperCase()}
              </span>
            </button>

            {/* Menu Navigasi Desktop & Tablet */}
            <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5 xl:gap-3 border-l border-slate-800 pl-2 md:pl-2.5 lg:pl-3.5">
              <Link
                href={locale === "en" ? "/en/news" : "/news"}
                title={t("navigation.news")}
                aria-label={t("navigation.news")}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isNewsActive
                    ? "font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20"
                    : "font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Newspaper size={14} className="shrink-0" />
                <span className="hidden lg:inline">{t("navigation.news")}</span>
              </Link>

              <Link
                href={locale === "en" ? "/en/promo" : "/promo"}
                title={t("navigation.promo")}
                aria-label={t("navigation.promo")}
                className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isPromoActive
                    ? "font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20"
                    : "font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Tag size={14} className="shrink-0" />
                <span className="hidden lg:inline">{t("navigation.promo")}</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                title={t("navigation.trackOrder")}
                aria-label={t("navigation.trackOrder")}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 cursor-pointer"
              >
                 <ReceiptText size={14} className="shrink-0" />
                 <span className="hidden lg:inline">{t("navigation.trackOrder")}</span>
              </button>

              {/* State Autentikasi / Sandbox */}
              {isCheckingAuth ? (
                <div className="flex items-center gap-2 ml-1 pl-2.5 lg:pl-3 border-l border-slate-800">
                  <div className="h-9 w-20 bg-slate-800/70 animate-pulse rounded-xl" />
                </div>
              ) : role && !isLoginPage ? (
                <div className="flex items-center gap-1.5 lg:gap-2 ml-1 pl-2 md:pl-2.5 lg:pl-3 border-l border-slate-800">
                  <SandboxSessionControl variant="navbar" />

                  <Link
                    href={role === "admin" ? "/admin" : localizeHref("/user", locale)}
                    title={t("navigation.account")}
                    aria-label={t("navigation.account")}
                    className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2.5 lg:px-3.5 py-2 rounded-xl text-xs font-semibold border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <UserCircle size={15} className="shrink-0" />
                    <span className="hidden lg:inline">{t("navigation.account")}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label={t("navigation.signOut")}
                    title={t("navigation.signOut")}
                    className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
                  >
                    <LogOut size={15} className="shrink-0" />
                  </button>
                </div>
              ) : (
                <div className="ml-1 pl-2 md:pl-2.5 lg:pl-3 border-l border-slate-800">
                  <Link
                    href={localizeHref("/login", locale)}
                    title={t("navigation.signIn")}
                    aria-label={t("navigation.signIn")}
                    className="flex items-center gap-1.5 bg-blue-600 text-white px-3 lg:px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  >
                    <LogIn size={15} className="lg:hidden shrink-0" />
                    <span className="hidden lg:inline">{t("navigation.signIn")}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </nav>

      {/* --- MODAL SARAN PRODUK --- */}
      {isSuggestionOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ zIndex: 1000 }}
        >
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-base font-bold text-white">{t("search.suggestionTitle")}</h3>
              <button
                type="button"
                onClick={() => setIsSuggestionOpen(false)}
                aria-label={t("search.closeSuggestionAria")}
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={suggestionText}
                onChange={(e) => setSuggestionText(e.target.value)}
                placeholder={t("search.suggestionPlaceholder")}
                className="w-full h-32 p-3.5 bg-slate-950/80 border border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none text-white text-xs placeholder:text-slate-500"
              />
              <div className="mt-4 flex justify-center">
                <Turnstile
                  siteKey={isLocal ? "1x00000000000000000000AA" : "0x4AAAAAACkQAA6L_WPQSSms"}
                  onSuccess={(t) => setCaptchaToken(t)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: "dark" }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendSuggestion}
                disabled={isSending || !suggestionText.trim() || (!captchaToken && !isLocal)}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />
                    <span>{t("search.suggestionSending")}</span>
                  </>
                ) : (!captchaToken && !isLocal) ? (
                  t("search.suggestionSecurityFirst")
                ) : (
                  t("search.suggestionSubmit")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT / LACAK PESANAN */}
      <TransactionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </>
  );
}
