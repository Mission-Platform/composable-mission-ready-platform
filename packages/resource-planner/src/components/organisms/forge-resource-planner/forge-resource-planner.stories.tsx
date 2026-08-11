import { h } from "@mission-platform/forge";
import { useArgs } from "storybook/preview-api";

import { ForgeResourcePlanner } from "@mission-platform/resource-planner";

import type { ResourcePlannerProperties } from "./forge-resource-planner";
import type { PlannerAssignment, PlannerResource } from "../../../types";
import type { Meta, StoryObj } from "@mission-platform/storybook-framework";
import type { VEvent } from "@mission-platform/vcard";

const meta = {
  title: "Organisms/Planning/ForgeResourcePlanner",
  component: ForgeResourcePlanner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "A horizontally scrolling, capacity-aware workforce planner. It keeps resources and RFC 5545 bookings separate, supports hour/day/month scales, and emits controlled edit proposals to the host application.",
      },
    },
  },
  render: (arguments_: ResourcePlannerProperties) => {
    const [{ modelValue: events = [], assignments = [] }, updateArguments] =
      useArgs();
    return (
      <ForgeResourcePlanner
        {...arguments_}
        modelValue={events}
        assignments={assignments}
        onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        onAssignmentUpdate={(value) => {
          updateArguments({
            assignments: assignments.map((assignment: PlannerAssignment) =>
              assignment.eventId === value.eventId
                ? { ...assignment, resourceId: value.resourceId }
                : assignment,
            ),
          });
        }}
        onRangeSelect={(selection) => console.log("range-select", selection)}
      />
    );
  },
} satisfies Meta<typeof ForgeResourcePlanner>;

export default meta;
type Story = StoryObj<typeof meta>;

const anchor = new Date("2026-01-05T00:00:00Z");
const resources: PlannerResource[] = [
  { id: "alex", label: "Alex Morgan", subtitle: "Design", capacity: 1 },
  { id: "sam", label: "Sam Rivera", subtitle: "Engineering", capacity: 1 },
  { id: "lee", label: "Lee Chen", subtitle: "Product", capacity: 1 },
];

function event(
  uid: string,
  summary: string,
  start: string,
  end: string,
): VEvent {
  return {
    uid,
    summary,
    dtstamp: "2026-01-01T00:00:00Z",
    dtstart: start,
    dtend: end,
  };
}

const events: VEvent[] = [
  event(
    "design",
    "Design review",
    "2026-01-05T09:00:00Z",
    "2026-01-05T11:00:00Z",
  ),
  event(
    "planning",
    "Sprint planning",
    "2026-01-05T10:00:00Z",
    "2026-01-05T12:00:00Z",
  ),
  event(
    "research",
    "User research",
    "2026-01-06T13:00:00Z",
    "2026-01-06T14:30:00Z",
  ),
];

const assignments: PlannerAssignment[] = [
  { eventId: "design", resourceId: "alex" },
  { eventId: "planning", resourceId: "alex" },
  { eventId: "research", resourceId: "sam" },
];

const availability: ResourcePlannerProperties["availability"] = [
  {
    resourceId: "alex",
    workingHours: [{ weekday: 1, startTime: "09:00", endTime: "17:00" }],
  },
  {
    resourceId: "sam",
    intervals: [
      {
        start: "2026-01-05T09:00:00Z",
        end: "2026-01-05T12:00:00Z",
        capacity: 1,
      },
      {
        start: "2026-01-06T13:00:00Z",
        end: "2026-01-06T17:00:00Z",
        capacity: 1,
      },
    ],
  },
  {
    resourceId: "lee",
    workingHours: [{ weekday: 1, startTime: "09:00", endTime: "17:00" }],
    exceptions: [{ date: "2026-01-05", intervals: [] }],
  },
];

const baseArguments = {
  resources,
  anchor,
  modelValue: events,
  assignments,
  availability,
  height: 420,
};

export const HourTimeline: Story = {
  args: { ...baseArguments, defaultView: "hour" },
};

export const DayTimeline: Story = {
  args: { ...baseArguments, defaultView: "day" },
};

export const MonthTimeline: Story = {
  args: { ...baseArguments, defaultView: "month" },
};

export const OverlappingAndUnavailable: Story = {
  args: { ...baseArguments, defaultView: "day" },
  parameters: {
    docs: {
      description: {
        story:
          "Alex demonstrates conflicting overlapping bookings, while Lee has a dated exception that removes the recurring working hours.",
      },
    },
  },
};

export const EmptyResources: Story = {
  args: {
    ...baseArguments,
    resources: [],
    modelValue: [],
    assignments: [],
    availability: [],
  },
};

export const CustomRenderers: Story = {
  args: {
    ...baseArguments,
    resource: ({ resource }) => <strong>{resource.label} (custom)</strong>,
    booking: ({ event: booking }) => <em>{booking.summary}</em>,
    capacity: ({ state }) => <span>{state.status}</span>,
  },
};
