import { useGrowth } from "@/context/GrowthContext";
import { EntitlementKey } from "@/types/growth";

/**
 * Convenience hook for inline entitlement checks.
 *
 * Usage:
 *   const canRewind = useEntitlement("rewind");
 *   const canSeeWhoLiked = useEntitlement("see_who_liked");
 */
export function useEntitlement(key: EntitlementKey): boolean {
  const { isEntitled } = useGrowth();
  return isEntitled(key);
}
