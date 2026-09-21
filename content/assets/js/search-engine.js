async function searchCurrentIG(query) {
  const pages = await getSearchablePages();

  const results = new Map();

  const pagePromises = pages.map(async page => ({
  page: page,
  content: await fetchPage(page)
}));

const contents = await Promise.all(pagePromises);

for (const result of contents) {
  const page = result.page;
  const pageContent = result.content;

  if (!pageContent) {
    continue;
  }

  const content = pageContent.content;
  const breadcrumb = pageContent.breadcrumb;
  const description = pageContent.description;

  const path = breadcrumb 
    ? Array.from(breadcrumb.querySelectorAll("li"))
        .map(li => li.textContent.trim())
        .join(" > ")
    : "";

      const text = content.textContent
        .replace(/\s+/g, " ")
        .trim();

      const titleElement =
        content.querySelector("h1, h2");

      const title =
        titleElement
          ? titleElement.textContent.trim()
          : page.title;

      const headingStyle = Array.from(document.querySelectorAll("style"))
  .find(style => style.textContent.includes("--heading-prefix"));

const sectionPrefix =
  headingStyle?.textContent.match(/--heading-prefix:"([^"]+)"/)?.[1] || "";

const sectionNumber =
  sectionPrefix && titleElement
    ? sectionPrefix + "1"
    : "";

      const lowerText = text.toLowerCase();

      const matchCount = (lowerText.split(query).length - 1);

      if (lowerText.includes(query)) {
        results.set(page.url, {
          title: title,
          sectionNumber : sectionNumber,
          url: page.url,
          text: description
            ? description.textContent.trim()
            : createSnippet(text, query),
          type: page.type,
          path: path,
          matchCount: matchCount,
          score: calculateSearchScore({
            title: title,
            path: path,
            text: text
          }, query)
        });
      }
    }

  return Array.from(results.values())
  .sort((a, b) => b.score - a.score); ;
}

async function getLinksFromPage(pageUrl) {
    const response = await fetch(pageUrl);
    const html = await response.text();

    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    return Array.from(
      document.querySelectorAll("#segment-content a[href]")
    ).map(link => link.getAttribute("href"));
}


async function getSearchablePages() {
  const artifactTypes = await getArtifactTypes();
  const response = await fetch("toc.html");


  const html = await response.text();

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  const links = Array.from(
    document.querySelectorAll("a[href]")
  );

  return links
  .map(link => {
    const url = link.getAttribute("href");

    return {
      title: link.textContent.trim(),
      url: url,
      type: artifactTypes.get(url) || "pages"
    };
  })
    .filter(page =>
      page.url &&
      page.url.endsWith(".html") &&
      !page.url.startsWith("http")
    );
}


function matchesFilter(result, selectedFilters) {
  // Ingen filtre valgt = All
  if (selectedFilters.length === 0) {
    return true;
  }

  return selectedFilters.includes(result.type);
}

  function createSnippet(text, query) {
  const lowerText = text.toLowerCase();
  const searchQuery = query.toLowerCase();

  const firstIndex = lowerText.indexOf(searchQuery);

  let index = lowerText.indexOf(
    searchQuery,
    firstIndex + searchQuery.length
  );

  if (index === -1) {
    index = firstIndex;
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + query.length + 100);

  let snippet = text.substring(start, end);

  if (start > 0) {
    snippet = "..." + snippet;
  }

  if (end < text.length) {
    snippet += "...";
  }

  return snippet;
}

async function fetchPage(page) {
  try {
    const response = await fetch(page.url);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    const content = document.querySelector("#segment-content");

     if (!content) {
      return null;
    }

    const description = Array.from(content.querySelectorAll("p"))
  .find(p => p.textContent.includes("This profile is intended"));

    content.querySelector(".releaseHeader")?.remove();
    content.querySelector(".nav-tabs")?.remove();
    content.querySelector("#publish-box")?.remove();


    const breadcrumb = document.querySelector("#segment-breadcrumb .breadcrumb");

    return {
        content: content,
        breadcrumb: breadcrumb,
        description: description 
    };

  } catch (error) {
    console.warn("Could not fetch:", page.url, error);
    return null;
  }
}

getLinksFromPage("profiles.html").then(links => {
  console.log(links);
});