/**
 * Unit tests for consumer-oriented shared repo utilities:
 * icons discovery, package discovery, routing guides, and component story extraction.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getGuide } from "../knowledge/guides.ts";
import { extractStoryNames, getComponentStories } from "./components.ts";
import { getIconUsage, listIcons } from "./icons.ts";
import { getConsumerPackageInfo, listConsumerPackages } from "./packages.ts";
import { getRouterSetup } from "./routing.ts";

describe("Shared Consumer Capabilities", () => {
  it("returns Svelte and routing best practices guides", () => {
    const svelteGuide = getGuide("framework-svelte");
    assert.ok(svelteGuide);
    assert.match(svelteGuide.body, /Svelte Best Practices/);
    assert.match(svelteGuide.body, /mp:svelte/);

    const routingGuide = getGuide("routing-setup");
    assert.ok(routingGuide);
    assert.match(routingGuide.body, /Framework-Neutral Routing/);
    assert.match(routingGuide.body, /forge-router-outlet/);
  });

  it("discovers icons and filters by category", () => {
    const all = listIcons({ limit: 500 });
    assert.ok(all.total > 50, `Expected > 50 icons, got ${all.total}`);
    assert.ok(all.categories.length > 5);

    const bell = all.icons.find((i) => i.name === "forge-icon-bell");
    assert.ok(bell);
    assert.equal(bell.componentName, "ForgeIconBell");
    assert.equal(bell.category, "communication");
    assert.equal(bell.subcategory, "messaging");

    const feedback = listIcons({ category: "status/feedback" });
    assert.ok(feedback.icons.length > 0);
    assert.ok(
      feedback.icons.every(
        (i) => i.category === "status" || i.fullCategory === "status/feedback",
      ),
    );
  });

  it("provides icon usage with framework snippets", () => {
    const bellUsage = getIconUsage("forge-icon-bell", "vue");
    assert.ok(bellUsage);
    assert.equal(bellUsage.componentName, "ForgeIconBell");
    assert.match(bellUsage.importStatement, /@mission-platform\/icons/);
    assert.ok(bellUsage.examples.vue);
    assert.match(bellUsage.examples.vue, /<ForgeIconBell size="md"/);

    const reactUsage = getIconUsage("ForgeIconCheck", "react");
    assert.ok(reactUsage);
    assert.ok(reactUsage.examples.react);
    assert.match(reactUsage.examples.react, /ForgeIconCheck/);
  });

  it("lists consumer publishable packages and retrieves details", () => {
    const packages = listConsumerPackages();
    assert.ok(packages.length > 5);

    const componentsPkg = packages.find(
      (p) => p.name === "@mission-platform/components",
    );
    assert.ok(componentsPkg);
    assert.equal(componentsPkg.category, "ui");
    assert.ok(componentsPkg.exportConditions.includes("mp:vue"));
    assert.ok(componentsPkg.exportConditions.includes("mp:react"));

    const tokensPkg = packages.find(
      (p) => p.name === "@mission-platform/tokens",
    );
    assert.ok(tokensPkg);
    assert.equal(tokensPkg.category, "ui");

    const info = getConsumerPackageInfo(
      "@mission-platform/components",
      "react",
    );
    assert.ok(info);
    assert.equal(
      info.installCommands.pnpm,
      "pnpm add @mission-platform/components",
    );
    assert.ok(info.quickStartSnippet.includes("ForgeButton"));
  });

  it("generates framework-specific routing setup guidance", () => {
    const vueRouting = getRouterSetup("vue", "browser");
    assert.equal(vueRouting.framework, "vue");
    assert.ok(vueRouting.packages.includes("@mission-platform/router"));
    assert.ok(
      vueRouting.packages.includes("@mission-platform/forge-router-vue"),
    );
    assert.match(vueRouting.setupSnippet, /createVueRouter/);
    assert.match(vueRouting.setupSnippet, /MpBrowserHistory/);
    assert.match(vueRouting.outletUsageSnippet, /<ForgeRouterOutlet \/>/);

    const svelteRouting = getRouterSetup("svelte", "memory");
    assert.equal(svelteRouting.framework, "svelte");
    assert.match(svelteRouting.setupSnippet, /MpMemoryHistory/);
    assert.match(svelteRouting.setupSnippet, /createSvelteRouter/);

    const wcRouting = getRouterSetup("web-components");
    assert.match(wcRouting.setupSnippet, /registerRouterElements/);
    assert.match(wcRouting.outletUsageSnippet, /<forge-router-outlet>/);
  });

  it("extracts story details and variants for components", () => {
    const stories = getComponentStories("forge-button");
    assert.ok(stories);
    assert.equal(stories.componentName, "ForgeButton");
    assert.ok(stories.storyNames.includes("Primary"));
    assert.ok(stories.storyNames.includes("Secondary"));
    assert.ok(stories.variants.includes("primary"));
    assert.ok(stories.variants.includes("secondary"));
    assert.ok(stories.sizes.includes("md"));
  });

  it("extracts story names across CSF formats including StoryObj and satisfies Story", () => {
    const sample = `
      export const Primary: Story = { args: { variant: "primary" } };
      export const Secondary: StoryObj<typeof meta> = { args: { variant: "secondary" } };
      export const Outline = {
        args: { variant: "outline" }
      } satisfies Story;
      export const Destructive = {
        args: { variant: "destructive" }
      } satisfies StoryObj<typeof meta>;
      export const nonStoryHelper = () => ({});
      export const ConfigValues = { timeout: 1000 };
    `;

    const names = extractStoryNames(sample);
    assert.ok(names.includes("Primary"));
    assert.ok(names.includes("Secondary"));
    assert.ok(names.includes("Outline"));
    assert.ok(names.includes("Destructive"));
    assert.equal(names.includes("nonStoryHelper"), false);
    assert.equal(names.includes("ConfigValues"), false);
  });
});
