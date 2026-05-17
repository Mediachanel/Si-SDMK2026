import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";

const workflowPath = new URL("../docs/sisdmk-n8n-ai-agent.ready.workflow.json", import.meta.url);

function loadWorkflow() {
  return JSON.parse(fs.readFileSync(workflowPath, "utf8"));
}

describe("n8n import workflow export", () => {
  it("keeps all webhook paths available without env access in code nodes", () => {
    const workflow = loadWorkflow();
    const raw = fs.readFileSync(workflowPath, "utf8");
    const webhooks = workflow.nodes
      .filter((node) => node.type === "n8n-nodes-base.webhook")
      .map((node) => node.parameters.path)
      .sort();

    assert.deepEqual(webhooks, [
      "sisdmk-ai",
      "sisdmk-ai-pegawai-search",
      "sisdmk-public-chat"
    ]);
    assert.doesNotMatch(raw, /\$env|process\.env|N8N_API_SECRET|N8N_API_KEY/);
    assert.match(raw, /x-api-key/);
    assert.equal(
      workflow.nodes
        .filter((node) => node.type === "n8n-nodes-base.webhook")
        .every((node) => node.parameters.responseMode === "lastNode"),
      true
    );
    assert.equal(
      workflow.nodes
        .filter((node) => /^Call .* Tool$/.test(node.name))
        .every((node) => node.onError === "continueRegularOutput"),
      true
    );
  });

  it("has valid node names, ids, and connection targets", () => {
    const workflow = loadWorkflow();
    const names = new Set(workflow.nodes.map((node) => node.name));
    const ids = new Set(workflow.nodes.map((node) => node.id));

    assert.equal(names.size, workflow.nodes.length);
    assert.equal(ids.size, workflow.nodes.length);

    for (const [source, outputs] of Object.entries(workflow.connections || {})) {
      assert.equal(names.has(source), true, `Missing source node ${source}`);
      for (const branch of outputs.main || []) {
        for (const edge of branch) {
          assert.equal(names.has(edge.node), true, `Missing target node ${edge.node}`);
        }
      }
    }
  });
});
