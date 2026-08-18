import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveCareerSkillMap, rankCareerPaths } from "../constants/career-intake";
import { findUniversities } from "../constants/universities";
import { AUTHENTICATED_TAB_ROUTES } from "../constants/navigation";

describe("unified product logic", () => {
  it("ranks preparation and strategy toward consulting", () => {
    const paths = rankCareerPaths({
      role: "The strategist",
      favorite: "The preparation",
      reliedOn: "Film study",
    });
    assert.equal(paths[0].id, "consulting");
  });

  it("turns an athlete's role and sport into explainable skills", () => {
    const skills = deriveCareerSkillMap(
      {
        role: "Captain / leader",
        favorite: "The team",
        reliedOn: "Communication",
      },
      "football",
    );
    assert.deepEqual(
      skills.slice(0, 3).map(({ skill }) => skill),
      ["Captain", "Teammate", "Film study"],
    );
  });

  it("finds schools by alias, name fragment, and location", () => {
    assert.equal(findUniversities("cleveland state")[0][0], "Cleveland State University");
    assert.equal(findUniversities("university los angeles")[0][0], "University of California, Los Angeles");
    assert.ok(findUniversities("Madison WI").some(([name]) => name === "University of Wisconsin-Madison"));
  });

  it("respects university result limits and empty queries", () => {
    assert.deepEqual(findUniversities(""), []);
    assert.equal(findUniversities("university", 3).length, 3);
  });

  it("keeps Coach as the fifth authenticated tab", () => {
    assert.deepEqual(AUTHENTICATED_TAB_ROUTES, [
      "index",
      "community",
      "check-in",
      "game-plan",
      "clipboard",
    ]);
    assert.equal(new Set(AUTHENTICATED_TAB_ROUTES).size, AUTHENTICATED_TAB_ROUTES.length);
  });

  it("returns stable IDs for supported universities", () => {
    assert.equal(findUniversities("Cleveland State University")[0][3], "tm:cleveland-state");
  });
});
