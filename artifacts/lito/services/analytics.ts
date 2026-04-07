/**
 * Analytics service — lightweight event tracking facade.
 *
 * Currently logs to console in development. Designed so a real provider
 * (PostHog, Amplitude, Mixpanel) can be swapped in by replacing the
 * `send` function without touching call sites.
 */

import { AnalyticsEvent } from "@/types/growth";

export interface TrackPayload {
  event: AnalyticsEvent;
  props?: Record<string, string | number | boolean>;
}

/** Replace this function to connect a real analytics provider. */
function send(payload: TrackPayload): void {
  if (__DEV__) {
    console.log(
      `[analytics] ${payload.event}`,
      payload.props ?? ""
    );
  }
  // TODO: PostHog.capture(payload.event, payload.props);
  // TODO: Amplitude.logEvent(payload.event, payload.props);
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  send({ event, props });
}
