async function getArtifactTypes() {
  const response = await fetch("artifacts.html");
  const html = await response.text();

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  const types = new Map();

  const headings = Array.from(
    document.querySelectorAll("#segment-content h3, #segment-content h4")
  );

  for (const heading of headings) {
    const headingText = heading.textContent.trim().toLowerCase();

    let type = null;

    if (headingText.includes("resource profiles")) {
      type = "profiles";
    } else if (headingText.includes("example instances")) {
      type = "examples";
    }

    if (!type) {
      continue;
    }

    let element = heading.nextElementSibling;

    while (element) {
      if (element.matches("h3, h4")) {
        break;
      }

      element.querySelectorAll("a[href]").forEach(link => {
        const url = link.getAttribute("href");

        if (url) {
          types.set(url, type);
        }
      });

      element = element.nextElementSibling;
    }
  }

  return types;
}