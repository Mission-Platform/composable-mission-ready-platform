import assert from "node:assert/strict";
import { test } from "node:test";

import {
  listOverridableTokenVariables,
  readTokens,
} from "./tokens.ts";

test("reads an individual nested component source by normalized source ID", () => {
  const source = readTokens("component/atoms/button") as {
    component: Record<string, unknown>;
  };

  assert.deepEqual(Object.keys(source.component), ["button"]);
});

test("aggregates component sources selected by an atomic-level directory", () => {
  const source = readTokens("component/atoms") as {
    component: Record<string, unknown>;
  };

  assert.ok(source.component.button);
  assert.ok(source.component.input);
  assert.ok(Object.keys(source.component).length > 1);
});

test("lists split component variables with stable paths and projected CSS names", () => {
  const variables = listOverridableTokenVariables("component/atoms/button");
  const background = variables.find(
    ({ path }) => path === "component.button.primary.background.default",
  );

  assert.equal(background?.name, "--mp-button-primary-background-default");
  assert.equal(background?.source, "component/atoms/button");
  assert.equal(background?.group, "button");
  assert.ok(
    variables.every(
      ({ name }) => !name.startsWith(["--mp", "component"].join("-") + "-"),
    ),
  );
});

test("deduplicates projected names when listing all token sources", () => {
  const variables = listOverridableTokenVariables();
  const names = variables.map(({ name }) => name);

  assert.equal(new Set(names).size, names.length);
  assert.ok(
    variables.some(
      ({ path, name }) =>
        path === "component.button.primary.background.default" &&
        name === "--mp-button-primary-background-default",
    ),
  );
});

test("does not resurrect pruned leaves or the removed inherited source", () => {
  const variables = listOverridableTokenVariables();
  const paths = new Set(variables.map(({ path }) => path));

  assert.equal(paths.has("color.black"), false);
  assert.equal(paths.has("typography.code.font-size"), false);
  assert.equal(paths.has("component.inherited.color"), false);
  assert.ok(
    variables.some(
      ({ path, name }) =>
        path === "component.button.primary.background.hover" &&
        name === "--mp-button-primary-background-hover",
    ),
  );
  assert.throws(() => readTokens("component/templates/inherited"), /not found/);
});