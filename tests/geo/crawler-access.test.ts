import assert from "node:assert/strict";

export function assertCrawlerAccess(robotsTxt: string) {
  assert.ok(robotsTxt.includes("User-agent: GPTBot"), "GPTBot should be allowed");
  assert.ok(robotsTxt.includes("User-agent: ClaudeBot"), "ClaudeBot should be allowed");
}
