import { UsageProviderKind } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

type Hidden = ReadonlySet<UsageProviderKind>;

const isUsageProviderKind = Schema.is(UsageProviderKind);

/** Keep every known provider, so an id from a newer build does not discard the rest. */
export function sanitizeHiddenProviders(value: unknown): UsageProviderKind[] {
  return Array.isArray(value) ? value.filter(isUsageProviderKind) : [];
}

export function withoutHiddenProviders<
  E extends {
    readonly isPending: boolean;
    readonly summary: {
      readonly buckets: readonly { readonly provider: UsageProviderKind }[];
      readonly sources: readonly {
        readonly fingerprint: { readonly provider: UsageProviderKind };
        readonly refreshing?: true;
      }[];
    } | null;
  },
>(environments: readonly E[], hidden: Hidden): readonly E[] {
  if (hidden.size === 0) return environments;
  return environments.map((environment) => {
    const { summary } = environment;
    if (summary === null) return environment;
    const sources = summary.sources.filter((source) => !hidden.has(source.fingerprint.provider));
    // Only hidden providers were refreshing: nothing visible is still updating.
    const onlyHiddenRefreshing =
      summary.sources.some((source) => source.refreshing) &&
      !sources.some((source) => source.refreshing);
    return {
      ...environment,
      isPending: environment.isPending && !onlyHiddenRefreshing,
      summary: {
        ...summary,
        buckets: summary.buckets.filter((bucket) => !hidden.has(bucket.provider)),
        sources,
      },
    };
  });
}

type LimitDriver = { readonly driver: string };

export function withoutHiddenLimitProviders<
  K,
  P extends {
    readonly serverConfig: {
      readonly providers: readonly LimitDriver[];
      readonly usageLimitSources?:
        | readonly { readonly accounts: readonly LimitDriver[] }[]
        | undefined;
    } | null;
  },
>(presentations: ReadonlyMap<K, P>, hidden: Hidden): ReadonlyMap<K, P> {
  if (hidden.size === 0) return presentations;
  const hiddenKinds: ReadonlySet<string> = hidden;
  const isVisible = ({ driver }: LimitDriver) =>
    !hiddenKinds.has(driver === "claudeAgent" ? "claude" : driver);
  return new Map(
    [...presentations].map(([id, presentation]) => {
      const config = presentation.serverConfig;
      if (config === null) return [id, presentation];
      return [
        id,
        {
          ...presentation,
          serverConfig: {
            ...config,
            providers: config.providers.filter(isVisible),
            usageLimitSources: config.usageLimitSources?.flatMap((source) => {
              const accounts = source.accounts.filter(isVisible);
              return accounts.length === 0 && source.accounts.length > 0
                ? []
                : [{ ...source, accounts }];
            }),
          },
        },
      ];
    }),
  );
}
