import test from "node:test";
import assert from "node:assert/strict";
import { isAdultContent, isNormalContent } from "../../lib/contentFilters.js";

function expectMode(item, expectedMode) {
  if (expectedMode === "adult") {
    assert.equal(isAdultContent(item), true);
    assert.equal(isNormalContent(item), false);
    return;
  }

  assert.equal(isAdultContent(item), false);
  assert.equal(isNormalContent(item), true);
}

test("Young Adult => normal", () => {
  expectMode({ genres: ["Young Adult"] }, "normal");
});

test("YA Fantasy => normal", () => {
  expectMode({ tags: ["YA Fantasy"] }, "normal");
});

test("Teen Romance => normal", () => {
  expectMode({ category: "Teen Romance" }, "normal");
});

test("Adults Only => adult", () => {
  expectMode({ badges: ["Adults Only"] }, "adult");
});

test("18+ => adult", () => {
  expectMode({ rating: "18+" }, "adult");
});

test("Mature => adult", () => {
  expectMode({ ageRating: "Mature" }, "adult");
});

test("NSFW => adult", () => {
  expectMode({ tags: ["NSFW"] }, "adult");
});
