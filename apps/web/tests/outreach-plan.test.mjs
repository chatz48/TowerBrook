import assert from "node:assert/strict";
import test from "node:test";

function installFakeWindow() {
  const store = new Map();
  const listeners = new Map();
  global.window = {
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
    addEventListener(name, callback) {
      const current = listeners.get(name) ?? new Set();
      current.add(callback);
      listeners.set(name, current);
    },
    removeEventListener(name, callback) {
      listeners.get(name)?.delete(callback);
    },
    dispatchEvent(event) {
      for (const callback of listeners.get(event.type) ?? []) callback(event);
      return true;
    },
  };
  global.queueMicrotask = (callback) => Promise.resolve().then(callback);
  return { store };
}

const { store } = installFakeWindow();
const outreach = await import("../lib/outreach-plan.ts");

test("writeOutreachState defers subscription callbacks until after the current turn", async () => {
  store.clear();
  const storageKey = "towerbrook-campaign-v1:all:false";
  let syncFired = false;

  outreach.subscribeOutreach(storageKey, () => {
    syncFired = true;
  });

  outreach.writeOutreachState(storageKey, {
    "expert:james-knight": {
      owner: "Arun",
      status: "Owner assigned",
      note: "",
      objective: "",
    },
  });

  assert.equal(syncFired, false, "subscriber should not run synchronously during write");
  await Promise.resolve();
  assert.equal(syncFired, true, "subscriber should run after the deferred dispatch");
  assert.equal(
    outreach.readOutreachState(storageKey)["expert:james-knight"]?.owner,
    "Arun",
  );
});
