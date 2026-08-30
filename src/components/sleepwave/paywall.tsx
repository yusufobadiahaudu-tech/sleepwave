import { useEffect } from "react";
import { Check, ExternalLink, LoaderCircle } from "lucide-react";
import { WaveMark } from "@/components/sleepwave/icons";
import { Sheet } from "@/components/sleepwave/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NightPass } from "@/hooks/use-night-pass";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "Every Night Pass sound, locally bundled",
  "Unlimited named mixes with saved volumes",
  "Restore premium layers from saved mixes",
];

export function Paywall({
  open,
  onClose,
  blocked,
  billing,
}: {
  open: boolean;
  onClose: () => void;
  blocked: string[];
  billing: NightPass;
}) {
  const {
    isPremium,
    connected,
    sandbox,
    loading,
    purchasing,
    restoring,
    plans,
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
    envLocked,
    connect,
    disconnect,
    purchase,
    restore,
    onPaywallOpen,
  } = billing;

  useEffect(() => {
    if (open) onPaywallOpen();
  }, [open, onPaywallOpen]);

  const busy = loading || purchasing || restoring;
  const canSubscribe = connected && usingLivePlans && Boolean(selectedId) && !isPremium;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isPremium ? "Night Pass is on" : "Sleep deeper tonight"}
      subtitle={
        isPremium
          ? willRenew && renewsOn
            ? `Renews ${renewsOn}. Every sound stays unlocked on this device.`
            : "Every sound and unlimited mixes are unlocked on this device."
          : connected
            ? "Night Pass is billed through RevenueCat. Choose a plan to unlock the rest of the library."
            : "Night Pass is sold with RevenueCat. Connect your Web Billing public key to start checkout."
      }
      labelledBy="paywall-title"
    >
      <div className="mb-5 flex justify-center">
        <span className="flex size-16 items-center justify-center rounded-[22px] bg-elevated">
          <WaveMark className="size-10" />
        </span>
      </div>

      {sandbox && connected ? (
        <p className="mb-4 rounded-[16px] bg-elevated px-3 py-2 text-center text-xs font-medium tracking-[0.08em] text-accent">
          SANDBOX BILLING
        </p>
      ) : null}

      {blocked.length > 0 && !isPremium ? (
        <p className="mb-4 rounded-[16px] bg-elevated px-3 py-2 text-sm text-muted">
          Waiting on Night Pass: {blocked.join(", ")}.
        </p>
      ) : null}

      <ul className="mb-5 space-y-3">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-sm text-fg">
            <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="size-3" />
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      {isPremium ? (
        <div className="space-y-3">
          {manageUrl ? (
            <a
              href={manageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-elevated text-sm font-medium text-fg hover:bg-elevated/80"
            >
              Manage billing
              <ExternalLink className="size-3.5" />
            </a>
          ) : null}
          <Button variant="primary" className="w-full" onClick={onClose}>
            Continue
          </Button>
        </div>
      ) : (
        <>
          <div role="radiogroup" aria-label="Night Pass plans" className="mb-4 space-y-2">
            {plans.map((plan) => {
              const selected = selectedId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!usingLivePlans}
                  onClick={() => setSelectedId(plan.id)}
                  className={cn(
                    "flex min-h-16 w-full items-center gap-3 rounded-[22px] bg-elevated px-4 py-3 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                    selected
                      ? "shadow-[var(--shadow-border-hover)]"
                      : "hover:shadow-[var(--shadow-border-hover)]",
                    !usingLivePlans && "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full",
                      selected
                        ? "bg-accent text-accent-foreground"
                        : "shadow-[var(--shadow-border)]",
                    )}
                  >
                    {selected ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg">{plan.title}</span>
                      {plan.badge ? (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-accent">
                          {plan.badge}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {plan.trial ?? plan.detail}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg leading-none tracking-[-0.03em] text-fg">
                      {plan.price}
                    </span>
                    <span className="mt-1 block text-[10px] text-muted">{plan.cadence}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {connected ? (
            <>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.14em] text-muted">
                  RECEIPT EMAIL
                </span>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@night.mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <Button
                variant="primary"
                className="w-full"
                disabled={!canSubscribe || busy}
                onClick={() => {
                  void purchase();
                }}
              >
                {purchasing ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Opening checkout
                  </>
                ) : loading ? (
                  "Loading plans"
                ) : usingLivePlans ? (
                  "Continue to RevenueCat"
                ) : (
                  "Waiting on offerings"
                )}
              </Button>
              <button
                type="button"
                className="mt-3 flex h-11 w-full items-center justify-center text-sm font-medium text-muted hover:text-fg"
                disabled={busy}
                onClick={() => {
                  void restore();
                }}
              >
                {restoring ? "Restoring…" : "Restore purchases"}
              </button>
            </>
          ) : (
            <>
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[10px] font-semibold tracking-[0.14em] text-muted">
                  REVENUECAT PUBLIC KEY
                </span>
                <Input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="rcb_ or rcb_sb_"
                  value={apiKeyInput}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                />
              </label>
              <Button
                variant="primary"
                className="w-full"
                disabled={busy || apiKeyInput.trim().length < 16}
                onClick={() => {
                  void connect();
                }}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Connecting
                  </>
                ) : (
                  "Connect RevenueCat"
                )}
              </Button>
              <p className="mt-3 text-center text-xs text-subtle">
                In RevenueCat, add a Web Billing app, an entitlement named night_pass,
                and a current offering with monthly and yearly packages.
              </p>
            </>
          )}
        </>
      )}

      {error ? (
        <p className="mt-3 rounded-[16px] bg-elevated px-3 py-2 text-center text-sm text-muted">
          {error}
        </p>
      ) : null}

      {connected && !envLocked && !isPremium ? (
        <button
          type="button"
          className="mt-2 flex h-11 w-full items-center justify-center text-xs text-subtle hover:text-muted"
          onClick={disconnect}
        >
          Use a different key
        </button>
      ) : null}

      <p className="mt-3 text-center text-xs text-subtle">
        {connected
          ? "Secure checkout by RevenueCat"
          : "Plans preview · live prices appear after connecting"}
      </p>
    </Sheet>
  );
}
