import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankDecision } from "../src/lib/n8n-ai/fuzzy.js";
import { normalizeJenisDokumen, normalizeStatus, normalizeWilayah } from "../src/lib/n8n-ai/hrisDictionary.js";
import { normalizeWorkflowResponse } from "../src/lib/n8n-ai/response.js";

describe("n8n AI HRIS dictionary", () => {
  it("normalizes limited HRIS synonyms without manual typo lists per name", () => {
    assert.equal(normalizeStatus("pnss"), "PNS");
    assert.equal(normalizeStatus("p3k"), "PPPK");
    assert.equal(normalizeWilayah("jaktim"), "Jakarta Timur");
    assert.equal(normalizeJenisDokumen("dokumn sip"), "SIP");
  });
});

describe("n8n AI fuzzy confidence gates", () => {
  it("selects, clarifies, or rejects candidates by configured score bands", () => {
    assert.equal(rankDecision([{ value: "Seftian", score: 0.45 }]).action, "selected");
    assert.equal(rankDecision([{ value: "Seftian", score: 0.35 }]).action, "clarification_required");
    assert.equal(rankDecision([{ value: "Seftian", score: 0.24 }]).action, "not_found");
  });
});

describe("n8n AI workflow response normalization", () => {
  it("reads direct and wrapped n8n response items", () => {
    assert.equal(normalizeWorkflowResponse({ answer: "ok langsung" }).answer, "ok langsung");
    assert.equal(normalizeWorkflowResponse([{ json: { answer: "ok wrapped" } }]).answer, "ok wrapped");
  });
});
