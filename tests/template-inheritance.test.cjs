const {test} = require("node:test");
const assert = require("node:assert/strict");
const {execFileSync} = require("node:child_process");
const {cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} = require("node:fs");
const {join, resolve} = require("node:path");
const {tmpdir} = require("node:os");

// Set PUBLISHER_JAR when the Publisher is not installed beside this repository.
const publisherJar = process.env.PUBLISHER_JAR || resolve(__dirname, "../../publisher.jar");

test("GitHub and local templates preserve inherited resource defaults", {
  skip: !process.env.PUBLISHER_JAR && !existsSync(publisherJar) && "Set PUBLISHER_JAR to run the Publisher integration test"
}, () => {
  const directory = mkdtempSync(join(tmpdir(), "medcom-template-inheritance-"));
  try {
    const source = join(directory, "source");
    mkdirSync(source);
    for (const name of ["config.json", "package", "includes", "content", "scripts"]) {
      cpSync(join(__dirname, "..", name), join(source, name), {
        recursive: true,
        filter: path => !/[/\\]\.index\./.test(path)
      });
    }

    // Use a small cached base so the real Publisher loader can run without network access.
    const base = join(directory, "cache/fhir.base.template#current");
    mkdirSync(join(base, "package"), {recursive: true});
    mkdirSync(join(base, "scripts"));
    writeFileSync(join(base, "package/package.json"), JSON.stringify({
      name: "fhir.base.template", version: "current", type: "fhir.template"
    }));
    writeFileSync(join(base, "config.json"), JSON.stringify({
      script: "scripts/ant.xml",
      otherScripts: [],
      targets: {onLoad: "onLoad", onGenerate: "onGenerate", onCheck: "onCheck"},
      defaults: {Any: {base: "{{[type]}}-{{[id]}}.html"}},
      formats: ["xml", "json", "ttl"],
      extraTemplates: [{name: "testing"}]
    }));
    writeFileSync(join(base, "scripts/ant.xml"), `<project name="BaseTemplate">
      <target name="onLoad.updateIg"/>
      <extension-point name="onLoad.extend" depends="onLoad.updateIg"/>
      <target name="onLoad" depends="onLoad.extend"/>
      <target name="onGenerate.processIncludes"/>
      <extension-point name="onGenerate.extend" depends="onGenerate.processIncludes"/>
      <target name="onGenerate" depends="onGenerate.extend"/>
      <target name="onCheck"/>
    </project>`);

    const output = execFileSync("java", [
      "-cp", publisherJar, join(__dirname, "fixtures/LoadTemplate.java"), source, directory
    ], {encoding: "utf8", timeout: 30000});
    assert.match(output, /Local and GitHub template configurations match/);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
