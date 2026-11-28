const assert = require("node:assert/strict");
const test = require("node:test");
const { parse } = require("./fork-release-notes.cjs");

test("groups trailers by section and ignores unknown ones", () => {
  const out = parse("Mobile: A\n\nServer: B\nMobile: C\nOther: D\nnot a note\n");
  assert.equal(out, "### Mobile\n- A\n- C\n\n### Server\n- B");
});
