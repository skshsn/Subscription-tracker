import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyEmail } from "./classifier";

const KNOWN_DOMAINS = ["netflix.com", "spotify.com"];

test("high-confidence renewal email from a known domain scores >= 90", () => {
  const result = classifyEmail({
    subject: "Your subscription confirmed - auto-renewal",
    snippet: "Your payment successful. Next billing date: Oct 18. $649.00 renews on Oct 18.",
    senderDomain: "netflix.com",
    knownProviderDomains: KNOWN_DOMAINS,
  });
  assert.ok(result.confidence >= 90, `expected >=90, got ${result.confidence}`);
  assert.ok(result.domainMatched);
});

test("moderate-signal email without a known domain lands in 60-89 band", () => {
  const result = classifyEmail({
    subject: "Your receipt and invoice",
    snippet: "Your monthly plan payment successful. Next billing date: Nov 3.",
    senderDomain: "acme-billing.example",
    knownProviderDomains: KNOWN_DOMAINS,
  });
  assert.ok(result.confidence >= 60 && result.confidence < 90, `got ${result.confidence}`);
});

test("unrelated email scores below the 60 discard threshold", () => {
  const result = classifyEmail({
    subject: "Let's catch up next week",
    snippet: "Are you free for coffee sometime?",
    senderDomain: "friend.example",
    knownProviderDomains: KNOWN_DOMAINS,
  });
  assert.ok(result.confidence < 60, `expected <60, got ${result.confidence}`);
});

test("confidence never exceeds 100 even with every signal present", () => {
  const result = classifyEmail({
    subject: "subscription confirmed auto-renewal recurring payment trial ends",
    snippet: "your membership renewal payment successful monthly plan annual plan invoice receipt $99.00 renews on Jan 1",
    senderDomain: "netflix.com",
    knownProviderDomains: KNOWN_DOMAINS,
  });
  assert.equal(result.confidence, 100);
});
