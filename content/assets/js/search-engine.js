async function searchCurrentIG(query) {
  const response = await fetch(
    "http://localhost:3000/search?q=" + encodeURIComponent(query)
  );

  if (!response.ok) {
    return [];
  }

  return await response.json();
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