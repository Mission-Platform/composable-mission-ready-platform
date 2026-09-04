import { toReactComponent } from "@mission-platform/forge-adapters/react";
import { toVueComponent } from "@mission-platform/forge-adapters/vue";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createSSRApp, h as vueH } from "vue";
import { renderToString } from "vue/server-renderer";

import { ForgeResourcePlanner } from "./forge-resource-planner";

const ReactResourcePlanner = toReactComponent(
  ForgeResourcePlanner,
  "ResourcePlanner",
);
const VueResourcePlanner = toVueComponent(
  ForgeResourcePlanner,
  "ResourcePlanner",
);

const resources = [
  { id: "alex", label: "Alex Morgan" },
  { id: "sam", label: "Sam Rivera" },
];
const events = [
  {
    uid: "design",
    summary: "Design review",
    dtstamp: "2026-01-01T00:00:00Z",
    dtstart: "2026-01-05T09:00:00Z",
    dtend: "2026-01-05T10:00:00Z",
  },
];
const assignments = [{ eventId: "design", resourceId: "alex" }];
const properties = {
  resources,
  modelValue: events,
  assignments,
  availability: [
    {
      resourceId: "alex",
      intervals: [
        {
          start: "2026-01-05T09:00:00Z",
          end: "2026-01-05T17:00:00Z",
        },
      ],
    },
  ],
  anchor: new Date("2026-01-05T00:00:00Z"),
  defaultView: "day" as const,
};

async function renderBoth(): Promise<[string, string]> {
  const react = renderToStaticMarkup(
    createElement(ReactResourcePlanner, properties),
  );
  const vue = await renderToString(
    createSSRApp({ render: () => vueH(VueResourcePlanner, properties) }),
  );
  return [react, vue];
}

describe("ForgeResourcePlanner adapter parity", () => {
  it("renders resource labels, timeline labels, and booking content in React and Vue", async () => {
    for (const html of await renderBoth()) {
      expect(html).toContain("Alex Morgan");
      expect(html).toContain("Sam Rivera");
      expect(html).toContain("Design review");
      expect(html).toContain("Mon 5");
      expect(html).toContain("Hour");
      expect(html).toContain("Month");
    }
  });

  it("renders the empty-resource state on both adapters", async () => {
    const emptyProperties = { resources: [], defaultView: "day" as const };
    const react = renderToStaticMarkup(
      createElement(ReactResourcePlanner, emptyProperties),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () => vueH(VueResourcePlanner, emptyProperties),
      }),
    );
    expect(react).toContain("No resources available.");
    expect(vue).toContain("No resources available.");
  });
});
