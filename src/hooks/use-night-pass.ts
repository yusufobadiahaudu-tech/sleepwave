import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCustomerInfo,
  connectPublicApiKey,
  disconnectPublicApiKey,
  envPublicApiKey,
  fetchCustomerInfo,
  fetchOfferings,
  formatBillingError,
  isPublicApiKey,
  isSandboxBilling,
  nightPassEntitlement,
  PREVIEW_PLANS,
  purchasePlan,
  resolvedPublicApiKey,
  trackPaywallOpen,
  type NightPassPlan,
} from "@/lib/sleepwave/revenuecat";
import {
  loadBillingEmail,
  loadEntitlement,
  saveBillingEmail,
} from "@/lib/sleepwave/storage";

export function useNightPass() {
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [plans, setPlans] = useState<NightPassPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>("annual");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmailState] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [renewsOn, setRenewsOn] = useState<string | null>(null);
  const [willRenew, setWillRenew] = useState(false);
  const impression = useRef(false);

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    saveBillingEmail(value);
  }, []);

  const hydrateFromCustomer = useCallback(async () => {
    const info = await fetchCustomerInfo();
    const entitled = applyCustomerInfo(info);
    const entitlement = nightPassEntitlement(info);
    setIsPremium(entitled);
    setManageUrl(info.managementURL);
    setWillRenew(entitlement?.willRenew ?? false);
    setRenewsOn(
      entitlement?.expirationDate
        ? entitlement.expirationDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : null,
    );
    return entitled;
  }, []);

  const refresh = useCallback(async () => {
    const key = resolvedPublicApiKey();
    if (!key) {
      setConnected(false);
      setIsPremium(false);
      setPlans([]);
      setSandbox(false);
      setManageUrl(null);
      setSelectedId("annual");
      return;
    }
    setConnected(true);
    setLoading(true);
    try {
      const [nextPlans, sandboxFlag] = await Promise.all([
        fetchOfferings(),
        isSandboxBilling(),
        hydrateFromCustomer(),
      ]);
      setPlans(nextPlans);
      setSandbox(sandboxFlag);
      setError(null);
      setSelectedId((current) => {
        if (current && nextPlans.some((plan) => plan.id === current)) return current;
        const annual = nextPlans.find((plan) => plan.title === "Yearly");
        return annual?.id ?? nextPlans[0]?.id ?? null;
      });
    } catch (cause) {
      const message = await formatBillingError(cause);
      setError(message);
      setPlans([]);
      setConnected(false);
      if (message?.includes("rejected that key")) {
        await disconnectPublicApiKey();
      }
    } finally {
      setLoading(false);
    }
  }, [hydrateFromCustomer]);

  useEffect(() => {
    setEmailState(loadBillingEmail());
    const key = resolvedPublicApiKey();
    if (key && isPublicApiKey(key)) {
      setConnected(true);
      setIsPremium(loadEntitlement());
    }
    setReady(true);
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await connectPublicApiKey(apiKeyInput);
      setApiKeyInput("");
      await refresh();
    } catch (cause) {
      const message = await formatBillingError(cause);
      setError(message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [apiKeyInput, refresh]);

  const disconnect = useCallback(() => {
    void disconnectPublicApiKey().then(() => {
      setConnected(Boolean(envPublicApiKey()));
      setIsPremium(false);
      setPlans([]);
      setSandbox(false);
      setManageUrl(null);
      setError(null);
      if (envPublicApiKey()) void refresh();
    });
  }, [refresh]);

  const purchase = useCallback(async () => {
    if (!selectedId) {
      setError("Choose a Night Pass plan.");
      return false;
    }
    setPurchasing(true);
    setError(null);
    try {
      const info = await purchasePlan(selectedId, email);
      const entitled = applyCustomerInfo(info);
      setIsPremium(entitled);
      const entitlement = nightPassEntitlement(info);
      setManageUrl(info.managementURL);
      setWillRenew(entitlement?.willRenew ?? false);
      setRenewsOn(
        entitlement?.expirationDate
          ? entitlement.expirationDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : null,
      );
      return entitled;
    } catch (cause) {
      const message = await formatBillingError(cause);
      if (message) setError(message);
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [email, selectedId]);

  const restore = useCallback(async () => {
    setRestoring(true);
    setError(null);
    try {
      const entitled = await hydrateFromCustomer();
      if (!entitled) {
        setError("No Night Pass found for this device yet.");
      }
      return entitled;
    } catch (cause) {
      const message = await formatBillingError(cause);
      setError(message);
      return false;
    } finally {
      setRestoring(false);
    }
  }, [hydrateFromCustomer]);

  const onPaywallOpen = useCallback(() => {
    if (impression.current || !connected) return;
    impression.current = true;
    void trackPaywallOpen();
  }, [connected]);

  const displayPlans = plans.length > 0 ? plans : PREVIEW_PLANS;
  const usingLivePlans = plans.length > 0;

  return {
    ready,
    connected,
    isPremium,
    sandbox,
    loading,
    purchasing,
    restoring,
    plans: displayPlans,
    usingLivePlans,
    selectedId,
    setSelectedId,
    error,
    email,
    setEmail,
    apiKeyInput,
    setApiKeyInput,
    manageUrl,
    renewsOn,
    willRenew,
    envLocked: Boolean(envPublicApiKey()),
    connect,
    disconnect,
    purchase,
    restore,
    refresh,
    onPaywallOpen,
  };
}

export type NightPass = ReturnType<typeof useNightPass>;
