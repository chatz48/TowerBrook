import assert from "node:assert/strict";
import test from "node:test";
import { inferIntent, resolveObjective } from "../lib/answer-focus.ts";

test("resolveObjective infers Prepare calls when filters still say Find experts", () => {
  assert.equal(
    resolveObjective("Find experts", "Prepare a call plan from the saved basket: call order and objectives."),
    "Prepare calls",
  );
});

test("resolveObjective keeps explicit non-default objective", () => {
  assert.equal(resolveObjective("Map companies", "Who should I call first?"), "Map companies");
});

test("inferIntent routes basket call plan to build_call_plan", () => {
  assert.equal(
    inferIntent("Prepare a call plan from the saved basket", "Prepare calls"),
    "build_call_plan",
  );
});

test("resolveObjective does not treat reduce conviction as red-team", () => {
  assert.equal(
    resolveObjective(
      "Find experts",
      "Prepare a call plan: objectives and what would raise or reduce conviction.",
    ),
    "Prepare calls",
  );
});
