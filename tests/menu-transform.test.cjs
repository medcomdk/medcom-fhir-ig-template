const {test} = require("node:test");
const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");
const {join} = require("node:path");
const {mkdtempSync, writeFileSync, rmSync} = require("node:fs");
const {tmpdir} = require("node:os");

for (const namespace of [' xmlns="http://www.w3.org/1999/xhtml"', ""]) {
  test("menu transform preserves HTML closing tags " + (namespace ? "with XHTML namespace" : "without a namespace"), () => {
    const input = `<ul${namespace} class="nav navbar-nav">
      <li class="dropdown"><a href="#">Governance<b class="caret"></b></a><ul class="dropdown-menu"><li><a href="governance.html">Governance</a></li></ul></li>
      <li><a href="profiles.html">Profiles</a></li>
      <li class="dropdown"><a href="#">More<b class="caret"></b></a><ul class="dropdown-menu"><li><a href="downloads.html">Downloads</a></li></ul></li>
    </ul>`;
    const directory = mkdtempSync(join(tmpdir(), "medcom-menu-test-"));
    try {
      const source = join(directory, "menu.xml");
      writeFileSync(source, input);
      const html = execFileSync("java", [join(__dirname, "fixtures/TransformMenu.java"), join(__dirname, "../scripts/medcom-menu.xslt"), source], {encoding: "utf8", timeout: 15000});
      assert.equal((html.match(/<b class="caret"><\/b>/g) || []).length, 2);
      assert.doesNotMatch(html, /<(?:b|a|li|ul)\b[^>]*\/>/);
      assert.match(html, /{% include medcom-profile-menu.html %}/);
      assert.doesNotMatch(html, /href="profiles.html"/);
      assert.match(html, /href="governance.html"/);
      assert.match(html, /href="downloads.html"/);
    } finally {
      rmSync(directory, {recursive: true, force: true});
    }
  });
}
