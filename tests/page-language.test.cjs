const {test} = require("node:test");
const assert = require("node:assert/strict");
const {execFileSync, spawnSync} = require("node:child_process");
const {copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} = require("node:fs");
const {join} = require("node:path");
const {tmpdir} = require("node:os");

// JEKYLL can select a particular executable; skip when it is not installed.
const jekyll = process.env.JEKYLL || "jekyll";
test("custom pages and search use the page language and localized includes", {
  skip: spawnSync(jekyll, ["--version"]).status !== 0 && "Install Jekyll to run the language integration test"
}, () => {
  const directory = mkdtempSync(join(tmpdir(), "medcom-page-language-"));
  try {
    const site = join(directory, "site");
    const output = join(directory, "output");
    const includes = join(site, "_includes");
    mkdirSync(includes, {recursive: true});
    mkdirSync(join(site, "_data"));
    writeFileSync(join(site, "_config.yml"), "url: https://example.test\n");
    writeFileSync(join(site, "_data/languages.json"), JSON.stringify({defLang: "en", langs: [{code: "en"}, {code: "da"}]}));
    writeFileSync(join(site, "_data/pages.json"), JSON.stringify({
      "guidance.html": {title: "Guidance", titlelang: {en: "Guidance", da: "Vejledning"}},
      "profiles.html": {titlelang: {en: "Profiles", da: "Profiler"}}
    }));
    for (const file of ["medcom-page-language.html", "medcom-search-config.html"]) {
      copyFileSync(join(__dirname, "../includes", file), join(includes, file));
    }
    writeFileSync(join(includes, "medcom-search-files.txt"), "guidance.md");
    writeFileSync(join(includes, "fragment-pagebegin.html"), '<html lang="{{include.lang}}"><title>{{site.data.pages[localPage].titlelang[include.lang]}}</title><body>');
    writeFileSync(join(includes, "fragment-pageend.html"), "</body></html>");
    for (const [language, text] of [["en", "English guidance"], ["da", "Dansk vejledning"]]) {
      mkdirSync(join(includes, language));
      writeFileSync(join(includes, language, "guidance.md"), text);
      mkdirSync(join(site, language));
    }
    // Deliberately provide no root guidance.md: fhir2 generates language folders.
    for (const language of ["", "en", "da"]) {
      for (const file of ["search-index.json", "profiles.html", "downloads.html"]) {
        copyFileSync(join(__dirname, "../content", file), join(site, language, file));
      }
    }
    execFileSync(jekyll, ["build", "--source", site, "--destination", output], {encoding: "utf8", timeout: 30000});
    for (const [language, code, title, text] of [
      ["", "en", "Guidance", "English guidance"],
      ["en", "en", "Guidance", "English guidance"],
      ["da", "da", "Vejledning", "Dansk vejledning"]
    ]) {
      const entries = JSON.parse(readFileSync(join(output, language, "search-index.json"), "utf8"));
      assert.deepEqual(entries, [{url: "guidance.html", title, text}]);
      const html = readFileSync(join(output, language, "profiles.html"), "utf8");
      assert.match(html, new RegExp(`<html lang="${code}">`));
      assert.ok(html.includes(`<title>${code === "da" ? "Profiler" : "Profiles"}</title>`));
      const downloads = readFileSync(join(output, language, "downloads.html"), "utf8");
      for (const file of ["package.tgz", "examples.xml.zip", "examples.json.zip"]) {
        assert.ok(downloads.includes(`href="${language ? "../" : ""}${file}"`));
      }
    }
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
