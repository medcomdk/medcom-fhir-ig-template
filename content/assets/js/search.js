document.addEventListener("DOMContentLoaded", function () {
  const quickSearch = document.getElementById("search-box");
  const fullSearch = document.getElementById("full-search-box");

  const navbar = document.querySelector("#segment-navbar .nav-collapse");

  if (quickSearch && navbar) {
    navbar.appendChild(quickSearch);
  }

  if (quickSearch) {
    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    if (currentPage !== "index.html") {
      quickSearch.style.display = "none";
    } else {
      setupQuickSearch(quickSearch);
    }
  }



  if (fullSearch) {
    setupFullSearch(fullSearch);
  }
});

function setupQuickSearch(searchBox) {


  let searchTimeout;
  
  searchBox.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    const query = this.value.toLowerCase().trim();

    let resultBox = document.getElementById("quick-search-results");

    if (!resultBox) {
      resultBox = document.createElement("div");
      resultBox.id = "quick-search-results";

      document.body.appendChild(resultBox);

      resultBox.style.position = "fixed";
      resultBox.style.background = "white";
      resultBox.style.border = "1px solid #ccc";
      resultBox.style.padding = "8px";
      resultBox.style.zIndex = "9999";
      resultBox.style.width = "300px";
      resultBox.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    }

    if (!query) {
      resultBox.style.display = "none";
      resultBox.innerHTML = "";
      return;
    }

    searchTimeout = setTimeout(async () => {
    const results = await searchCurrentIG(query);
    
    const topResults = results.slice(0, 5);

    resultBox.innerHTML = "";

    if (topResults.length === 0) {
      resultBox.innerHTML = "<div>No results found</div>";
    } else {
      topResults.forEach(result => {
        const item = document.createElement("div");
        item.style.padding = "5px 0";

        const link = document.createElement("a");
        link.href = result.url;
        link.textContent = result.title;

        item.appendChild(link);
        resultBox.appendChild(item);
      });

      const searchPage = document.createElement("div");
      searchPage.style.marginTop = "8px";
      searchPage.style.borderTop = "1px solid #ddd";
      searchPage.style.paddingTop = "8px";

      const searchLink = document.createElement("a");
      searchLink.href = "search.html?query=" + encodeURIComponent(query);
      searchLink.textContent = "View all results →";

      searchPage.appendChild(searchLink);
      resultBox.appendChild(searchPage);
    }

    const rect = searchBox.getBoundingClientRect();

    resultBox.style.left = rect.left + "px";
    resultBox.style.top = rect.bottom + "px";
    resultBox.style.display = "block";
  }, 300);
});


async function setupFullSearch(searchBox) {
  const filter = document.getElementById("search-type");
  let resultsContainer = document.getElementById("search-results");
  const status = document.getElementById("search-status");

  if (!resultsContainer) {
    resultsContainer = document.createElement("div");
    resultsContainer.id = "search-results";
    searchBox.insertAdjacentElement("afterend", resultsContainer);
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("query");

  if (initialQuery) {
    searchBox.value = initialQuery;
  }

  searchBox.addEventListener("input", performSearch);
  if (filter) {
    filter.addEventListener("change", performSearch);
  }

  if (initialQuery) {
    await performSearch();
  }


  async function performSearch() {
    const query = searchBox.value.toLowerCase().trim();
    const selectedFilter = filter ? filter.value : "all";

    resultsContainer.innerHTML = "";
    if (status) {
      status.textContent = "";
    }

    if (!query) {
      return;
    }

    if (status) {
      status.textContent = "Searching...";
    }

    const results = await searchCurrentIG(query);

    const filteredResults = results.filter(result =>
      matchesFilter(result, selectedFilter)
    );

    if (status) {
      status.textContent =
        filteredResults.length +
        (filteredResults.length === 1 ? " result" : " results");
    }

    renderResults(
      filteredResults,
      resultsContainer
    );
  }
}

async function searchCurrentIG(query) {
  const pages = getPagesToSearch();

  const results = [];

  for (const page of pages) {
    try {
      const response = await fetch(page.url);

      if (!response.ok) {
        continue;
      }

      const html = await response.text();

      const parser = new DOMParser();
      const document = parser.parseFromString(html, "text/html");

      const content = document.querySelector("#segment-content");

      if (!content) {
        continue;
      }

      const text = content.textContent
        .replace(/\s+/g, " ")
        .trim();

      const titleElement =
        content.querySelector("h1, h2");

      const title =
        titleElement
          ? titleElement.textContent.trim()
          : page.title;

      const lowerText = text.toLowerCase();

      if (lowerText.includes(query)) {
        results.push({
          title: title,
          url: page.url,
          text: createSnippet(text, query),
          type: page.type
        });
      }

    } catch (error) {
      console.warn("Could not search:", page.url, error);
    }
  }

  return results;
}

function getPagesToSearch() {
  return [
    {
      title: "Home",
      url: "index.html",
      type: "pages"
    },
    {
      title: "Profiles",
      url: "profiles.html",
      type: "profiles"
    },
    {
      title: "Extensions",
      url: "extensions.html",
      type: "extensions"
    },
    {
      title: "Artifacts",
      url: "artifacts.html",
      type: "artifacts"
    },
    {
      title: "Test Examples",
      url: "testProtocolTestExample.html",
      type: "examples"
    }
  ];
}

function matchesFilter(result, filter) {
  if (filter === "all") {
    return true;
  }

  return result.type === filter;
}

function createSnippet(text, query) {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(query.toLowerCase());

  if (index === -1) {
    return text.substring(0, 180) + "...";
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

function renderResults(results, container) {
  if (results.length === 0) {
    container.innerHTML =
      "<p>No results found.</p>";
    return;
  }

  const heading = document.createElement("h3");
  heading.textContent = "This IG";
  container.appendChild(heading);

  results.forEach(result => {
    const resultElement =
      document.createElement("div");

    resultElement.className =
      "search-result";

    const title =
      document.createElement("h4");

    const link =
      document.createElement("a");

    link.href = result.url;
    link.textContent = result.title;

    title.appendChild(link);

    const snippet =
      document.createElement("p");

    snippet.textContent = result.text;

    resultElement.appendChild(title);
    resultElement.appendChild(snippet);

    container.appendChild(resultElement);
  });
}
}

async function testFetch() {
  const response = await fetch("profiles.html");
  const html = await response.text();

  console.log(html);
}