import test from "node:test";
import assert from "node:assert/strict";
import { groupMessages, formatTimestamp } from "../src/lib/messages.js";

const message = (author, timestamp) => ({
  author,
  timestamp,
  message: "hello",
});
test("same-author messages share a sequence until the one-hour boundary", () => {
  const grouped = groupMessages([
    message("apple", 0),
    message("apple", 1000),
    message("apple", 3601000),
  ]);
  assert.equal(grouped[0].isMine, true);
  assert.equal(grouped[0].startsSequence, true);
  assert.equal(grouped[0].endsSequence, false);
  assert.equal(grouped[1].startsSequence, false);
  assert.equal(grouped[1].endsSequence, true);
  assert.equal(grouped[1].showTimestamp, false);
  assert.equal(grouped[2].startsSequence, true);
  assert.equal(grouped[2].showTimestamp, true);
});
test("switching authors breaks bubbles without adding an unnecessary timestamp", () => {
  const grouped = groupMessages([message("apple", 0), message("orange", 500)]);
  assert.equal(grouped[0].endsSequence, true);
  assert.equal(grouped[1].startsSequence, true);
  assert.equal(grouped[1].isMine, false);
  assert.equal(grouped[1].showTimestamp, false);
});
test("empty and single-message histories render correctly", () => {
  assert.deepEqual(groupMessages([]), []);
  assert.equal(groupMessages([message("orange", 0)])[0].endsSequence, true);
});
test("timestamps are deterministic across server and client timezones", () => {
  assert.match(
    formatTimestamp(Date.UTC(2026, 9, 3, 10)),
    /October 3, 2026.*10:00 AM UTC/,
  );
});
