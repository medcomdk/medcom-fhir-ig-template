const {test} = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {runInNewContext} = require("node:vm");

const script = readFileSync(require.resolve("../content/assets/js/page-libraries.js"), "utf8");

class Element {
  constructor(tagName, className = "", parentElement = null, textContent = "") {
    Object.assign(this, {tagName, className, parentElement, textContent});
  }
  closest(selector) {
    for (let node = this; node; node = node.parentElement) {
      if (selector === "pre" && node.tagName === "PRE") return node;
      if (selector === ".mermaid" && node.className.split(/\s+/).includes("mermaid")) return node;
    }
    return null;
  }
  replaceWith(node) { this.replacement = node; }
}

function code(language = "", parentLanguage = "", text = '{"resourceType":"Patient"}') {
  return new Element("CODE", language, new Element("PRE", parentLanguage), text);
}

function load(codes = [], diagrams = [], options = {}) {
  const requests = [];
  const listeners = {};
  const window = {};
  runInNewContext(script, {
    URL, window, console,
    document: {
      currentScript: {src: options.src || "https://example.test/ig/assets/js/page-libraries.js?v=123"},
      readyState: options.readyState || "interactive",
      head: {appendChild: node => requests.push(node)},
      createElement: tag => new Element(tag.toUpperCase()),
      addEventListener: (name, callback) => { listeners[name] = callback; },
      querySelectorAll: selector => selector === "code" ? codes : diagrams.concat(
        codes.map(code => code.parentElement.replacement).filter(Boolean)
      )
    }
  });
  return {requests, window, listeners};
}

test("prose, unlabelled code, and plain text do not load rendering libraries", () => {
  for (const codes of [[], [code()], [code("language-none"), code("lang-plaintext"), code("language-text")]]) {
    assert.deepEqual(load(codes).requests, []);
  }
});

test("source pages load Prism once and highlight after it is available", () => {
  const codes = [code("language-json"), code("", "language-xml"), code("lang-turtle")];
  const plain = code("language-none", "language-json");
  const {requests, window} = load(codes.concat(plain));
  assert.equal(requests.length, 2);
  assert.equal(requests[0].href, "https://example.test/ig/assets/css/prism.css");
  assert.equal(requests[1].src, "https://example.test/ig/assets/js/prism.js");
  assert.equal(requests[1].async, true);
  assert.equal(window.Prism.manual, true);
  const highlighted = [];
  window.Prism.highlightElement = code => highlighted.push(code);
  requests[1].onload();
  assert.deepEqual(highlighted, codes);
});

test("fenced Mermaid diagrams render explicitly without loading Prism", () => {
  const codes = [code("language-mermaid", "", "graph TD; A-->B"), code("", "lang-mermaid", "graph LR; C-->D")];
  const {requests, window} = load(codes);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].src, "https://example.test/ig/assets/js/mermaid.js");
  assert.equal(window.Prism, undefined);
  const diagrams = codes.map(code => code.parentElement.replacement);
  assert.ok(diagrams.every(diagram => diagram.className === "mermaid"));
  assert.deepEqual(diagrams.map(diagram => diagram.textContent), codes.map(code => code.textContent));
  let rendered = false;
  window.mermaid = {
    initialize(options) {
      assert.equal(options.startOnLoad, false);
      assert.equal(options.securityLevel, "sandbox");
    },
    run(options) {
      assert.deepEqual(Array.from(options.nodes), diagrams);
      rendered = true;
      return Promise.resolve();
    }
  };
  requests[0].onload();
  assert.equal(rendered, true);
});

test("mixed pages load both libraries and retain existing Mermaid containers", () => {
  const diagram = new Element("PRE", "mermaid");
  const codes = [code("language-xml"), new Element("CODE", "language-xml", diagram)];
  const {requests, window} = load(codes, [diagram]);
  assert.deepEqual(requests.filter(node => node.src).map(node => new URL(node.src).pathname), [
    "/ig/assets/js/mermaid.js", "/ig/assets/js/prism.js"
  ]);
  window.mermaid = {
    initialize() {},
    run(options) {
      assert.deepEqual(Array.from(options.nodes), [diagram]);
      return Promise.resolve();
    }
  };
  requests[0].onload();
});

test("library URLs follow the loader's asset directory", () => {
  const {requests} = load([code("language-json")], [], {
    src: "https://example.test/ig/core/4.0.1/assets/js/page-libraries.js?v=456"
  });
  assert.equal(requests[0].href, "https://example.test/ig/core/4.0.1/assets/css/prism.css");
  assert.equal(requests[1].src, "https://example.test/ig/core/4.0.1/assets/js/prism.js");
});

test("execution before the DOM is ready waits for the page content", () => {
  const {requests, listeners} = load([code("language-json")], [], {readyState: "loading"});
  assert.equal(requests.length, 0);
  listeners.DOMContentLoaded();
  assert.equal(requests.length, 2);
});
