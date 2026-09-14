import { test } from "node:test";
import assert from "node:assert/strict";
import { extractFields } from "./extract";

test("extracts price, currency, frequency, and trial flag from a typical renewal email", () => {
  const result = extractFields(
    "Your subscription renews soon",
    "Your Netflix Premium plan will renew on October 18, 2026 for $649.00 per month.",
    "Netflix",
  );
  assert.equal(result.priceGuess, 649);
  assert.equal(result.currencyGuess, "USD");
  assert.equal(result.frequencyGuess, "monthly");
  assert.equal(result.isTrial, false);
  assert.ok(result.nextBillingDateGuess);
});

test("extracts INR pricing and annual frequency", () => {
  const result = extractFields(
    "Your Canva Pro annual plan",
    "You were charged ₹3,999.00 for your annual plan.",
    "Canva",
  );
  assert.equal(result.priceGuess, 3999);
  assert.equal(result.currencyGuess, "INR");
  assert.equal(result.frequencyGuess, "annual");
});

test("flags trial emails", () => {
  const result = extractFields(
    "Your free trial ends soon",
    "Your trial ends in 3 days. You'll then be charged $9.99 per month.",
    "SomeApp",
  );
  assert.equal(result.isTrial, true);
  assert.equal(result.frequencyGuess, "monthly");
});

test("returns nulls gracefully when nothing extractable is present", () => {
  const result = extractFields("Hello", "Just checking in.", "A Friend");
  assert.equal(result.priceGuess, null);
  assert.equal(result.currencyGuess, null);
  assert.equal(result.frequencyGuess, null);
});
