export type SabilyticsTrackProps = Record<
  string,
  string | number | boolean | undefined
>;

export interface SabilyticsClient {
  track: (event: string, props?: SabilyticsTrackProps) => void;
}

declare global {
  interface Window {
    sabilytics?: SabilyticsClient;
  }
}

/**
 * Safe Sabilytics custom-event helper. No-ops on SSR or when the script is absent.
 */
export function useSabilytics() {
  function track(event: string, props?: SabilyticsTrackProps) {
    if (!import.meta.client) return;
    const name = event.trim();
    if (!name) return;

    const cleaned: Record<string, string | number | boolean> = {};
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === undefined) continue;
        cleaned[key] = value;
      }
    }

    try {
      window.sabilytics?.track(
        name,
        Object.keys(cleaned).length ? cleaned : undefined,
      );
    } catch {
      // Analytics must never break product flows.
    }
  }

  return { track };
}
