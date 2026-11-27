import { describe, expect, it } from "vite-plus/test";

import {
  sanitizeHiddenProviders,
  withoutHiddenLimitProviders,
  withoutHiddenProviders,
} from "./usageProviderFilter";

const source = (provider: "codex" | "claude" | "opencode", refreshing = false) => ({
  fingerprint: { provider },
  ...(refreshing ? { refreshing: true as const } : {}),
});
const environment = (isPending: boolean, providers: ReadonlyArray<ReturnType<typeof source>>) => ({
  isPending,
  summary: {
    buckets: providers.map(({ fingerprint }) => ({ provider: fingerprint.provider })),
    sources: providers,
  },
});

describe("sanitizeHiddenProviders", () => {
  it("keeps known providers and drops ids from a newer build", () => {
    expect(sanitizeHiddenProviders(["opencode", "future-provider", 3, "codex"])).toEqual([
      "opencode",
      "codex",
    ]);
    expect(sanitizeHiddenProviders("opencode")).toEqual([]);
  });
});

describe("withoutHiddenProviders", () => {
  it("returns the same environments when nothing is hidden", () => {
    const environments = [environment(false, [source("codex")])];
    expect(withoutHiddenProviders(environments, new Set())).toBe(environments);
  });

  it("drops hidden providers' buckets and sources", () => {
    const [filtered] = withoutHiddenProviders(
      [environment(false, [source("codex"), source("opencode")])],
      new Set(["opencode"] as const),
    );
    expect(filtered?.summary?.buckets).toEqual([{ provider: "codex" }]);
    expect(filtered?.summary?.sources).toEqual([source("codex")]);
  });

  it("stops reporting a pending update when only hidden providers were refreshing", () => {
    const hidden = new Set(["codex"] as const);
    const [onlyHidden] = withoutHiddenProviders(
      [environment(true, [source("codex", true), source("claude")])],
      hidden,
    );
    expect(onlyHidden?.isPending).toBe(false);
    const [visibleToo] = withoutHiddenProviders(
      [environment(true, [source("codex", true), source("claude", true)])],
      hidden,
    );
    expect(visibleToo?.isPending).toBe(true);
  });

  it("leaves environments without a summary alone", () => {
    const pending = { isPending: true, summary: null };
    expect(withoutHiddenProviders([pending], new Set(["codex"] as const))).toEqual([pending]);
  });
});

describe("withoutHiddenLimitProviders", () => {
  const presentations = new Map([
    [
      "env",
      {
        serverConfig: {
          providers: [{ driver: "claudeAgent" }, { driver: "opencode" }],
          usageLimitSources: [
            { accounts: [{ driver: "opencode" }] },
            { accounts: [{ driver: "opencode" }, { driver: "codex" }] },
            { accounts: [] },
          ],
        },
      },
    ],
    ["offline", { serverConfig: null }],
  ]);

  it("hides providers, mapping the claudeAgent driver to claude", () => {
    const hidden = withoutHiddenLimitProviders(presentations, new Set(["claude"] as const));
    expect(hidden.get("env")?.serverConfig?.providers).toEqual([{ driver: "opencode" }]);
  });

  it("drops limit sources emptied by the filter but keeps ones that never had accounts", () => {
    const hidden = withoutHiddenLimitProviders(presentations, new Set(["opencode"] as const));
    expect(hidden.get("env")?.serverConfig?.usageLimitSources).toEqual([
      { accounts: [{ driver: "codex" }] },
      { accounts: [] },
    ]);
    expect(hidden.get("offline")?.serverConfig).toBeNull();
  });
});
