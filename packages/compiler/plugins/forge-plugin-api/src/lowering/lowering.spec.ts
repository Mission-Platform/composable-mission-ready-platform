import { describe, expect, it } from "vitest";

import {
  EMPTY_SEMANTIC_INTENTIONS,
  EMPTY_SPAN,
  sourceBacked,
  type GenericRenderNode,
  type SemanticModule,
  type SetupContract,
} from "../ir.js";

import {
  canonicalEventName,
  formatTargetEventName,
  isEventHandlerProp,
  lowerEventIntentions,
} from "./events.js";
import {
  createBaseLoweredModule,
  validateLoweredInvariants,
} from "./pipeline.js";
import { canonicalizePropsContract } from "./props.js";
import { validateSetupContract } from "./setup.js";
import { isDefaultSlotName, synthesizeSlotPlans } from "./slots.js";

import type { TargetLoweredModule } from "../framework.js";

describe("Shared Target Lowering Engine", () => {
  const dummyAst = {
    kind: "module-ast" as const,
    statements: [],
    span: EMPTY_SPAN,
  };

  const createDummyModule = (
    intentions = EMPTY_SEMANTIC_INTENTIONS,
  ): SemanticModule => ({
    kind: "semantic-module",
    moduleKind: "component",
    fileName: "TestComponent.tsx",
    ast: dummyAst,
    imports: [],
    intentions,
  });

  describe("Props Normalization", () => {
    it("resolves prop types and default values", () => {
      const module = createDummyModule({
        ...EMPTY_SEMANTIC_INTENTIONS,
        propsParameterName: "customProps",
        props: [
          {
            name: "title",
            optional: false,
            type: sourceBacked("string"),
          },
          {
            name: "count",
            optional: true,
            type: sourceBacked("number"),
            defaultValue: sourceBacked("0"),
          },
          {
            name: "untyped",
            optional: true,
          },
        ],
      });

      const contract = canonicalizePropsContract(module);
      expect(contract.parameterName).toBe("customProps");
      expect(contract.hasDefaults).toBe(true);
      expect(contract.props.length).toBe(3);

      expect(contract.props[0]).toEqual({
        name: "title",
        optional: false,
        typeText: "string",
        defaultValue: undefined,
        bindingKind: undefined,
      });

      expect(contract.props[1]).toEqual({
        name: "count",
        optional: true,
        typeText: "number",
        defaultValue: "0",
        bindingKind: undefined,
      });

      expect(contract.props[2]?.typeText).toBe("unknown");
    });
  });

  describe("Slots Synthesis", () => {
    it("recognizes default slot names", () => {
      expect(isDefaultSlotName("default")).toBe(true);
      expect(isDefaultSlotName("children")).toBe(true);
      expect(isDefaultSlotName("")).toBe(true);
      expect(isDefaultSlotName("header")).toBe(false);
    });

    it("synthesizes slot intentions and render tree <Slot> nodes", () => {
      const slotNode: GenericRenderNode = {
        kind: "render-node",
        tag: "Slot",
        attributes: [
          {
            kind: "jsx-attribute",
            name: "name",
            value: { kind: "string", value: "header", span: EMPTY_SPAN },
            span: EMPTY_SPAN,
          },
          {
            kind: "jsx-attribute",
            name: "fallback",
            value: {
              kind: "expression",
              expression: sourceBacked('"Default Header"'),
              nested: [],
              span: EMPTY_SPAN,
            },
            span: EMPTY_SPAN,
          },
        ],
        children: [],
        selfClosing: true,
        span: EMPTY_SPAN,
      };

      const module = createDummyModule({
        ...EMPTY_SEMANTIC_INTENTIONS,
        slots: [
          {
            name: "children",
            fallback: sourceBacked('"Default Body"'),
          },
        ],
        renderTree: [slotNode],
      });

      const slotsContract = synthesizeSlotPlans(module);
      expect(slotsContract.hasDefaultSlot).toBe(true);
      expect(slotsContract.hasNamedSlots).toBe(true);
      expect(slotsContract.slotNames).toEqual(["default", "header"]);
      expect(slotsContract.slots.length).toBe(2);
      expect(slotsContract.slots[1]?.fallbackText).toBe('"Default Header"');
    });
  });

  describe("Event Handler Mapping", () => {
    it("identifies event handler props and extracts canonical names", () => {
      expect(isEventHandlerProp("onClick")).toBe(true);
      expect(isEventHandlerProp("onKeyDown")).toBe(true);
      expect(isEventHandlerProp("online")).toBe(false);
      expect(isEventHandlerProp("on")).toBe(false);

      expect(canonicalEventName("onClick")).toBe("click");
      expect(canonicalEventName("onKeyDown")).toBe("keyDown");
    });

    it("formats event names according to framework conventions", () => {
      expect(formatTargetEventName("onClick", "react")).toBe("onClick");
      expect(formatTargetEventName("onClick", "solid")).toBe("onClick");
      expect(formatTargetEventName("onClick", "vue")).toBe("onClick");
      expect(formatTargetEventName("onClick", "svelte")).toBe("onclick");
      expect(formatTargetEventName("onClick", "web-components")).toBe("click");
    });

    it("lowers event intentions", () => {
      const module = createDummyModule({
        ...EMPTY_SEMANTIC_INTENTIONS,
        events: [
          {
            name: "onClick",
            handler: sourceBacked("handleClick"),
          },
        ],
      });

      const events = lowerEventIntentions(module);
      expect(events).toEqual([
        {
          propName: "onClick",
          canonicalName: "click",
          handlerText: "handleClick",
        },
      ]);
    });
  });

  describe("Pipeline & Base Module", () => {
    it("creates base lowered module with all normalized contracts", () => {
      const module = createDummyModule();
      const lowered = createBaseLoweredModule(module, "react");

      expect(lowered.framework).toBe("react");
      expect(lowered.propsContract).toBeDefined();
      expect(lowered.slotsContract).toBeDefined();
      expect(lowered.events).toEqual([]);

      expect(() => validateLoweredInvariants(lowered)).not.toThrow();
      expect(() =>
        validateLoweredInvariants({} as unknown as TargetLoweredModule),
      ).toThrow();
    });

    it("carries and validates the neutral setup contract", () => {
      const setupContract: SetupContract = {
        setupName: "setup",
        parameters: [],
        properties: [],
        computedValues: [
          {
            name: "label",
            typeText: "string",
            dependencies: ["missing"],
            expression: sourceBacked("missing"),
            exposeToTemplate: true,
            exposeToStyle: false,
            span: EMPTY_SPAN,
          },
        ],
        handlers: [],
        emitters: [],
        models: [],
        templateReferences: ["label"],
        styleReferences: [],
      };
      const module = createDummyModule();
      const lowered = createBaseLoweredModule(
        { ...module, setupContract },
        "react",
      );

      expect(lowered.setupContract).toEqual(setupContract);
      expect(validateSetupContract(setupContract, "setup.flint")).toEqual([
        expect.objectContaining({
          code: "FORGE-SETUP-003",
          message: expect.stringContaining("unknown name 'missing'"),
        }),
      ]);
    });
  });
});
