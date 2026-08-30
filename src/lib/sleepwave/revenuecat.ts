import type {
  CustomerInfo,
  Offering,
  Package,
  Period,
  Purchases as PurchasesClient,
} from "@revenuecat/purchases-js";
import { NIGHT_PASS_ENTITLEMENT } from "@/lib/sleepwave/library";
import {
  loadAppUserId,
  loadPublicApiKey,
  saveAppUserId,
  saveEntitlement,
  savePublicApiKey,
} from "@/lib/sleepwave/storage";

export type NightPassPlan = {
  id: string;
  title: string;
  price: string;
  cadence: string;
  detail: string;
  badge?: string;
  trial?: string;
};

export const PREVIEW_PLANS: NightPassPlan[] = [
  {
    id: "monthly",
    title: "Monthly",
    price: "$4.99",
    cadence: "/ month",
    detail: "Cancel any night",
  },
  {
    id: "annual",
    title: "Yearly",
    price: "$29.99",
    cadence: "/ year",
    detail: "Two months free",
    badge: "Most restful",
  },
];

const BRANDING = {
  color_buttons_primary: "#8eb4c4",
  color_buttons_primary_text: "#0a1014",
  color_accent: "#8eb4c4",
  color_error: "#c4896a",
  color_product_info_bg: "#10141b",
  color_form_bg: "#07090d",
  color_page_bg: "#07090d",
  font: "default" as const,
  shapes: "rounded" as const,
  show_product_description: true,
};

const ENTITLEMENT_ALIASES = [
  NIGHT_PASS_ENTITLEMENT,
  "premium",
  "pro",
  "Night Pass",
];

let lastApiKey: string | null = null;
let boot: Promise<PurchasesClient> | null = null;
let packageStore = new Map<string, Package>();
let currentOffering: Offering | null = null;

type PurchasesSdk = typeof import("@revenuecat/purchases-js");

async function loadSdk(): Promise<PurchasesSdk> {
  if (typeof window === "undefined") {
    throw new Error("RevenueCat runs in the browser.");
  }
  return import("@revenuecat/purchases-js");
}

export function envPublicApiKey(): string {
  const value = (import.meta.env.VITE_REVENUECAT_API_KEY as string | undefined)?.trim();
  return value ?? "";
}

export function envEntitlementId(): string {
  const value = (
    import.meta.env.VITE_REVENUECAT_ENTITLEMENT as string | undefined
  )?.trim();
  return value || NIGHT_PASS_ENTITLEMENT;
}

export function resolvedPublicApiKey(): string {
  return loadPublicApiKey() || envPublicApiKey();
}

export function isSecretApiKey(value: string): boolean {
  return /^(sk_|sk_rc)/i.test(value.trim());
}

export function isPublicApiKey(value: string): boolean {
  const key = value.trim();
  if (!key || isSecretApiKey(key)) return false;
  return /^(rcb_|rcb_sb_|test_|strp_)/i.test(key) && key.length >= 16;
}

export function readAppUserId(): string {
  const existing = loadAppUserId();
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `$RCAnonymousID:${crypto.randomUUID().replaceAll("-", "")}`
      : `$RCAnonymousID:${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  saveAppUserId(generated);
  return generated;
}

export async function ensurePurchases(): Promise<PurchasesClient> {
  const apiKey = resolvedPublicApiKey();
  if (!apiKey) {
    throw new Error("Connect a RevenueCat Web Billing public key first.");
  }
  if (boot && lastApiKey === apiKey) return boot;
  lastApiKey = apiKey;

  boot = (async () => {
    const { Purchases } = await loadSdk();
    const appUserId = readAppUserId();

    if (Purchases.isConfigured()) {
      const instance = Purchases.getSharedInstance();
      if (lastApiKey === apiKey) {
        if (instance.getAppUserId() !== appUserId) {
          await instance.changeUser(appUserId);
        }
        return instance;
      }
      instance.close();
    }

    lastApiKey = apiKey;
    try {
      const purchases = Purchases.configure({
        apiKey,
        appUserId,
        brandingAppearanceOverride: BRANDING,
        flags: {
          autoCollectUTMAsMetadata: true,
        },
      });
      void purchases.preload();
      return purchases;
    } catch {
      if (Purchases.isConfigured()) return Purchases.getSharedInstance();
      throw new Error("Could not start RevenueCat. Check the public API key.");
    }
  })();

  try {
    return await boot;
  } catch (error) {
    boot = null;
    lastApiKey = null;
    throw error;
  }
}

export async function closePurchases() {
  try {
    const { Purchases } = await loadSdk();
    if (Purchases.isConfigured()) {
      Purchases.getSharedInstance().close();
    }
  } catch {
    /* ignore */
  }
  lastApiKey = null;
  boot = null;
  packageStore = new Map();
  currentOffering = null;
}

export function hasNightPass(info: CustomerInfo): boolean {
  const active = info.entitlements.active;
  const preferred = envEntitlementId();
  const ids = [preferred, ...ENTITLEMENT_ALIASES];
  if (ids.some((id) => active[id]?.isActive)) return true;
  return Object.values(active).some((item) => item.isActive);
}

export function nightPassEntitlement(info: CustomerInfo) {
  const active = info.entitlements.active;
  const preferred = envEntitlementId();
  return (
    active[preferred] ??
    ENTITLEMENT_ALIASES.map((id) => active[id]).find(Boolean) ??
    Object.values(active).find((item) => item.isActive) ??
    null
  );
}

export function applyCustomerInfo(info: CustomerInfo): boolean {
  const entitled = hasNightPass(info);
  saveEntitlement(entitled);
  return entitled;
}

function periodCadence(period: Period | null, lifetime: boolean): string {
  if (lifetime || !period) return "one-time";
  if (period.number === 1) return `/ ${period.unit}`;
  return `/ ${period.number} ${period.unit}s`;
}

function packageTitle(pkg: Package): string {
  switch (pkg.packageType) {
    case "$rc_weekly":
      return "Weekly";
    case "$rc_monthly":
      return "Monthly";
    case "$rc_two_month":
      return "Two months";
    case "$rc_three_month":
      return "3 months";
    case "$rc_six_month":
      return "6 months";
    case "$rc_annual":
      return "Yearly";
    case "$rc_lifetime":
      return "Lifetime";
    default:
      return pkg.webBillingProduct.title || "Night Pass";
  }
}

function packageRank(pkg: Package): number {
  switch (pkg.packageType) {
    case "$rc_weekly":
      return 1;
    case "$rc_monthly":
      return 2;
    case "$rc_two_month":
      return 3;
    case "$rc_three_month":
      return 4;
    case "$rc_six_month":
      return 5;
    case "$rc_annual":
      return 6;
    case "$rc_lifetime":
      return 7;
    default:
      return 8;
  }
}

export function plansFromOffering(offering: Offering | null): NightPassPlan[] {
  packageStore = new Map();
  currentOffering = offering;
  if (!offering) return [];

  const packages = [...offering.availablePackages].sort(
    (a, b) => packageRank(a) - packageRank(b),
  );
  const monthly = packages.find((pkg) => pkg.packageType === "$rc_monthly");
  const annual = packages.find((pkg) => pkg.packageType === "$rc_annual");
  let annualBadge: string | undefined;
  if (monthly && annual) {
    const yearOfMonths = monthly.webBillingProduct.price.amountMicros * 12;
    const yearPrice = annual.webBillingProduct.price.amountMicros;
    if (yearOfMonths > 0 && yearPrice < yearOfMonths) {
      annualBadge = `Save ${Math.round((1 - yearPrice / yearOfMonths) * 100)}%`;
    } else {
      annualBadge = "Most restful";
    }
  }

  return packages.map((pkg) => {
    packageStore.set(pkg.identifier, pkg);
    const product = pkg.webBillingProduct;
    const lifetime = pkg.packageType === "$rc_lifetime" || !product.period;
    const trial = product.freeTrialPhase?.period;
    const monthlyEquivalent =
      product.defaultSubscriptionOption?.base.pricePerMonth?.formattedPrice;
    const detail = lifetime
      ? "Keep every sound"
      : monthlyEquivalent && pkg.packageType === "$rc_annual"
        ? `${monthlyEquivalent} / month`
        : product.description || "Unlock the full library";
    return {
      id: pkg.identifier,
      title: packageTitle(pkg),
      price: product.price.formattedPrice,
      cadence: periodCadence(product.period, lifetime),
      detail,
      badge: pkg.packageType === "$rc_annual" ? annualBadge : undefined,
      trial: trial ? `${trial.number}-${trial.unit} trial` : undefined,
    };
  });
}

export function getStoredPackage(id: string): Package | undefined {
  return packageStore.get(id);
}

export function getCurrentOffering(): Offering | null {
  return currentOffering;
}

export async function fetchOfferings(): Promise<NightPassPlan[]> {
  const purchases = await ensurePurchases();
  const offerings = await purchases.getOfferings();
  const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
  return plansFromOffering(offering);
}

export async function fetchCustomerInfo(): Promise<CustomerInfo> {
  const purchases = await ensurePurchases();
  return purchases.getCustomerInfo();
}

export async function purchasePlan(
  planId: string,
  customerEmail?: string,
): Promise<CustomerInfo> {
  const rcPackage = getStoredPackage(planId);
  if (!rcPackage) {
    throw new Error("That plan is no longer available. Refresh Night Pass.");
  }
  const purchases = await ensurePurchases();
  const email = customerEmail?.trim();
  const result = await purchases.purchase({
    rcPackage,
    customerEmail: email || undefined,
    selectedLocale: navigator.language,
    brandingAppearanceOverride: BRANDING,
    skipSuccessPage: true,
  });
  return result.customerInfo;
}

export async function trackPaywallOpen() {
  try {
    const purchases = await ensurePurchases();
    purchases.trackCustomPaywallImpression({
      paywallId: "sleepwave-night-pass",
      offering: getCurrentOffering() ?? undefined,
    });
  } catch {
    /* analytics should never block the sheet */
  }
}

export async function isSandboxBilling(): Promise<boolean> {
  try {
    const purchases = await ensurePurchases();
    return purchases.isSandbox();
  } catch {
    return false;
  }
}

export async function connectPublicApiKey(key: string) {
  const trimmed = key.trim();
  if (isSecretApiKey(trimmed)) {
    throw new Error("Use the public Web Billing key (starts with rcb_), not the secret key.");
  }
  if (!isPublicApiKey(trimmed)) {
    throw new Error("That does not look like a RevenueCat public key.");
  }
  const { Purchases } = await loadSdk();
  if (!loadAppUserId()) {
    saveAppUserId(Purchases.generateRevenueCatAnonymousAppUserId());
  }
  const previous = loadPublicApiKey();
  savePublicApiKey(trimmed);
  await closePurchases();
  try {
    const purchases = await ensurePurchases();
    const offerings = await purchases.getOfferings();
    const offering = offerings.current ?? Object.values(offerings.all)[0] ?? null;
    if (!offering || offering.availablePackages.length === 0) {
      throw new Error(
        "No current offering. Mark one as current in RevenueCat and add Night Pass packages.",
      );
    }
    plansFromOffering(offering);
  } catch (error) {
    savePublicApiKey(previous);
    await closePurchases();
    throw error;
  }
}

export async function disconnectPublicApiKey() {
  savePublicApiKey(null);
  saveEntitlement(false);
  await closePurchases();
}

export async function formatBillingError(error: unknown): Promise<string | null> {
  const { PurchasesError, ErrorCode } = await loadSdk();
  if (error instanceof PurchasesError && error.errorCode === ErrorCode.UserCancelledError) {
    return null;
  }
  if (error instanceof PurchasesError) {
    if (error.errorCode === ErrorCode.InvalidCredentialsError) {
      return "RevenueCat rejected that key. Check the Web Billing public key.";
    }
    if (error.errorCode === ErrorCode.NetworkError) {
      return "Could not reach RevenueCat. Try again in a moment.";
    }
    if (error.errorCode === ErrorCode.ProductAlreadyPurchasedError) {
      return "Night Pass is already on this account. Restore purchases.";
    }
    return error.message || "RevenueCat could not complete that.";
  }
  if (error instanceof Error) return error.message;
  return "RevenueCat could not complete that.";
}
