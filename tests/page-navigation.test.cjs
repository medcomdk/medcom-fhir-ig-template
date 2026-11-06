const {test} = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {runInNewContext} = require("node:vm");

const script = readFileSync(require.resolve("../content/assets/js/page-navigation.js"), "utf8");

function location(page, heading = "Resource Profile: Patient") {
  const base = "https://example.test/ig/core/4.0.1/";
  const toggle = {classList: new Set()};
  const dropdown = {querySelector: () => toggle};
  const links = ["index.html", "StructureDefinition-medcom-core-patient.html", "extensions.html"].map(href => {
    const url = new URL(href, base);
    const profile = href.startsWith("StructureDefinition-");
    return {
      href: url.href, pathname: url.pathname, origin: url.origin,
      classList: new Set(), attributes: {},
      getAttribute: () => href,
      setAttribute(name, value) { this.attributes[name] = value; },
      closest: () => profile ? dropdown : null
    };
  });
  runInNewContext(script, {
    URL,
    document: {
      readyState: "complete",
      getElementById: id => id === "segment-content" ? {setAttribute() {}, querySelectorAll: () => []} : {querySelectorAll: () => links},
      querySelectorAll: () => [],
      querySelector: () => ({textContent: heading})
    },
    window: {location: new URL(page, base), scrollY: 0, addEventListener() {}}
  });
  return {links, toggle};
}

test("the profile menu marks the main profile page as current", () => {
  const {links, toggle} = location("StructureDefinition-medcom-core-patient.html");
  assert.equal(links[1].attributes["aria-current"], "page");
  assert.ok(toggle.classList.has("medcom-menu-current"));
});

test("profile tabs keep their parent profile selected", () => {
  for (const suffix of ["-definitions", "-examples", "-mappings", "-testing", ".profile.xml", ".profile.json", ".profile.ttl", ".profile.history"]) {
    const {links, toggle} = location("StructureDefinition-medcom-core-patient" + suffix + ".html");
    assert.equal(links[1].attributes["aria-current"], "location", suffix);
    assert.ok(toggle.classList.has("medcom-menu-current"), suffix);
  }
});

test("an extension sharing a profile name prefix selects Extensions", () => {
  const {links, toggle} = location("StructureDefinition-medcom-core-patient-extension.html", "Extension: Patient extension");
  assert.equal(links[2].attributes["aria-current"], "location");
  assert.equal(links[1].attributes["aria-current"], undefined);
  assert.ok(!toggle.classList.has("medcom-menu-current"));
});
