const {test} = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {runInNewContext} = require("node:vm");

const script = readFileSync(require.resolve("../content/assets/js/ig-search.js"), "utf8");

// Only the DOM operations used to display results are needed for these behavior tests.
class Node {
  constructor(tag, text = "") { this.tag = tag; this.text = text; this.children = []; this.attributes = {}; }
  set textContent(text) { this.text = text; this.children = []; }
  get textContent() { return this.text + this.children.map(child => child.textContent).join(""); }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
}

async function search(query, entries, failure) {
  const nodes = {
    "medcom-local-search": {dataset: {index: "search-index.json"}},
    "medcom-search-status": new Node("p"),
    "medcom-search-results": new Node("ol"),
    "medcom-search-query": new Node("input"),
    "medcom-search-help": new Node("p")
  };
  const requests = [];
  runInNewContext(script, {
    URL,
    document: {
      getElementById: id => nodes[id],
      createElement: tag => new Node(tag),
      createTextNode: text => new Node("#text", text)
    },
    // Fixtures use plain text; this stub supplies the browser's text-decoding API.
    DOMParser: class { parseFromString(text) { return {body: {textContent: text}}; } },
    window: {location: {href: "https://example.test/ig/core/4.0.1/searchform.html?q=" + encodeURIComponent(query)}},
    fetch: async url => {
      requests.push(url);
      if (failure === "network") throw new Error("offline");
      return {ok: failure !== "http", json: async () => entries};
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  return {
    status: nodes["medcom-search-status"].textContent,
    items: nodes["medcom-search-results"].children,
    busy: nodes["medcom-search-results"].attributes["aria-busy"],
    input: nodes["medcom-search-query"].value,
    helpHidden: nodes["medcom-search-help"].hidden,
    requests
  };
}

const entries = [
  {url: "general-governance.html", title: "General governance", text: "Rules for patient narrative text."},
  {url: "StructureDefinition-medcom-core-patient.html", title: "MedComCorePatient", text: "Patient identifier requirements."},
  {url: "Patient-example.html", title: "Cæcar Test Østergård", text: "A patient example."}
];

test("search stays within the current version and ranks matching titles first", async () => {
  const result = await search("patient", entries);
  assert.match(result.status, /^3 results/);
  assert.equal(result.items[0].children[0].textContent, "MedComCorePatient");
  assert.equal(result.items[0].children[0].children[0].href, "https://example.test/ig/core/4.0.1/StructureDefinition-medcom-core-patient.html");
  assert.deepEqual(result.requests, ["https://example.test/ig/core/4.0.1/search-index.json"]);
  assert.equal(result.busy, undefined);
  assert.equal(result.helpHidden, true);
});

test("multiple words must all match, regardless of case or punctuation", async () => {
  const result = await search("PATIENT, narrative", entries);
  assert.match(result.status, /^1 result /);
  assert.equal(result.items[0].children[0].textContent, "General governance");
});

test("Danish letters and accent-insensitive matching preserve highlighted text", async () => {
  const result = await search("østergard", entries);
  assert.match(result.status, /^1 result /);
  const link = result.items[0].children[0].children[0];
  assert.equal(link.textContent, "Cæcar Test Østergård");
  assert.equal(link.children.find(child => child.tag === "mark").textContent, "Østergård");
});

test("snippets show matches deep within profile element definitions", async () => {
  const result = await search("obligation", [{url: "profile.html", title: "Profile", text: "Other text. ".repeat(100) + "The obligation requires narrative text."}]);
  const excerpt = result.items[0].children[1];
  assert.match(excerpt.textContent, /^…/);
  assert.match(excerpt.textContent, /obligation/);
  assert.ok(excerpt.textContent.length <= 282);
});

test("results cannot lead outside this guide and version", async () => {
  const outside = ["https://other.test/page.html", "../other-version/page.html", "/ig/messaging/page.html", "javascript:alert(1)"];
  const result = await search("patient", entries.concat(outside.map(url => ({url, title: "Patient", text: "patient"}))));
  assert.equal(result.items.length, 3);
});

test("queries and result text are displayed as text", async () => {
  const query = '<img src=x onerror="alert(1)">';
  const result = await search(query, [{url: "example.html", title: query, text: query}]);
  assert.equal(result.input, query);
  assert.match(result.status, /^1 result /);
  assert.equal(result.items[0].children[0].textContent, query);
  const tags = node => [node.tag, ...node.children.flatMap(tags)];
  assert.ok(!tags(result.items[0]).includes("img"));
});

test("empty and punctuation-only queries do not load the index", async () => {
  for (const query of ["", "   ", "???"]) {
    const result = await search(query, entries);
    assert.equal(result.requests.length, 0);
  }
});

test("no matches, HTTP failures, and network failures give useful feedback", async () => {
  assert.match((await search("unmatched", entries)).status, /^No results/);
  for (const failure of ["http", "network"]) {
    const result = await search("patient", entries, failure);
    assert.match(result.status, /Search could not load/);
    assert.equal(result.busy, undefined);
  }
});

test("large result sets report the total and limit the displayed results", async () => {
  const many = Array.from({length: 60}, (_, i) => ({url: "example-" + i + ".html", title: "Patient " + i, text: "patient"}));
  const result = await search("patient", many);
  assert.equal(result.items.length, 50);
  assert.match(result.status, /^60 results.*Showing the first 50/);
});
