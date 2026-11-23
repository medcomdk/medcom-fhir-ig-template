function matchesFilter(result, selectedFilters) {
    if (selectedFilters.length === 0) {
        return true;
    }

    return selectedFilters.includes(result.type);
}

function sortResults(results, sortBy) {
  if (sortBy === "title") {
    return [...results].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }

  return results;
}

document.addEventListener("DOMContentLoaded", async function () {
  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  if (currentPage === "search.html") {
    await applyPageChrome();
  }

  const quickSearch = document.getElementById("search-box");
  const fullSearch = document.getElementById("full-search-box");

  const navbar = document.querySelector("#segment-navbar .nav-collapse");

  if (quickSearch && navbar) {
    navbar.appendChild(quickSearch);
  }

  if (quickSearch) {
    if (currentPage === "search.html") {
  quickSearch.style.display = "none";
} else {
  setupQuickSearch(quickSearch);
}
  }

  if (fullSearch) {
    setupFullSearch(fullSearch);
  }
});

/*
 * search.html is copied as-is by the template into every IG, so (unlike
 * every other page) it isn't rendered through the normal page template and
 * doesn't automatically get the IG's real header/navbar/footer. To make it
 * look like the rest of the site for whichever IG is using this template,
 * fetch that IG's own index.html and clone its header/navbar/footer markup
 * into this page. If that fails (e.g. offline, or opened as a standalone
 * file), the page keeps its minimal built-in fallback markup.
 */
async function applyPageChrome() {
  try {
    const response = await fetch("index.html");

    if (!response.ok) {
      return;
    }

    const doc = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );

    // index.html is rendered through the normal page template, so (unlike
    // search.html) it has a real publish-box/canonical link we can use to
    // identify the current IG, even during local development where the
    // page's own URL doesn't contain "/ig/<id>/" (see getCurrentIG()).
    rememberIGFromDocument(doc);

    copySegment(doc, "segment-header");
    copySegment(doc, "segment-navbar");
    copySegment(doc, "segment-footer");

    const titleParts = doc.title.split(" - ");

    if (titleParts.length > 1) {
      document.title = "Search - " + titleParts.slice(1).join(" - ");
    }
  } catch (e) {
    // Keep the fallback markup already in the page.
  }
}

function copySegment(doc, id) {
  const source = doc.getElementById(id);
  const target = document.getElementById(id);

  if (source && target) {
    target.innerHTML = source.innerHTML;
  }
}

function createQuickResultItem(result, igLabel) {
  const item = document.createElement("div");
  item.style.padding = "5px 0";

  const link = document.createElement("a");
  link.href = result.url;
  link.textContent = igLabel ? result.title + " (" + igLabel + ")" : result.title;

  item.appendChild(link);
  return item;
}

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
    const currentIG = getCurrentIG();
    const results = await searchCurrentIG(query, currentIG);
    const { currentIG: currentIGResults, otherIGs } = groupResultsByIG(results, currentIG);

    const topResults = currentIGResults.slice(0, 5);
    const topOtherResults = otherIGs.slice(0, 3);

    resultBox.innerHTML = "";

    if (topResults.length === 0 && topOtherResults.length === 0) {
      resultBox.innerHTML = "<div>No results found</div>";
    } else {
      topResults.forEach(result => {
        resultBox.appendChild(createQuickResultItem(result));
      });

      if (topOtherResults.length > 0) {
  
        const divider = document.createElement("div");
        divider.style.marginTop = "6px";
        divider.style.paddingTop = "6px";
        divider.style.borderTop = "1px solid #ddd";
        resultBox.appendChild(divider);

        topOtherResults.forEach(result => {
          resultBox.appendChild(createQuickResultItem(result, result.igName));
        });
      }

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
}

async function setupFullSearch(searchBox) {

  const filters = document.querySelectorAll(
  '.search-filter input[type="checkbox"]'
);

  const scopeInputs = document.querySelectorAll(
  'input[name="search-scope"]'
);

  let resultsContainer = document.getElementById("search-results");
  const status = document.getElementById("search-status");
  const sort = document.getElementById("search-sort");

  let searchId = 0;

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

filters.forEach(filter => {
  filter.addEventListener("change", performSearch);
});

  scopeInputs.forEach(scopeInput => {
  scopeInput.addEventListener("change", performSearch);
});

  if (sort) {
    sort.addEventListener("change", performSearch);
  }
  if (initialQuery) {
    await performSearch();
  }


  async function performSearch() {
    const currentSearchId = ++searchId;
    const query = searchBox.value.toLowerCase().trim();
    const selectedFilters = Array.from(filters)
      .filter(filter => filter.checked)
      .map(filter => filter.value);
    const selectedSort = sort ? sort.value : "relevance";
    const selectedScope = getSelectedScope(scopeInputs);

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

    const currentIG = getCurrentIG();

if (selectedScope === "current" && !currentIG) {
  if (status) {
    status.textContent = "Could not identify current IG.";
  }
  return;
}

const results = await searchCurrentIG(
  query,
  selectedScope === "current" ? currentIG : null
);

const scopedResults = selectedScope === "current"
  ? results.filter(result =>
      result.ig?.toLowerCase() === currentIG.toLowerCase()
    )
  : results;

if (currentSearchId !== searchId) {
  return;
}


   const filteredResults = scopedResults.filter(result =>
  matchesFilter(result, selectedFilters)
);

   const sortedResults = sortResults(filteredResults, selectedSort);

const grouped = selectedScope === "current"
  ? { currentIG: sortedResults, otherIGs: [] }
  : groupResultsByIG(sortedResults, currentIG);

    if (status) {
      status.textContent =
        filteredResults.length +
        (filteredResults.length === 1 ? " result" : " results");
    }

    renderResults(
      grouped,
      resultsContainer
    );
  }
}

function renderResults(groupedResults, container) {
  const { currentIG, otherIGs } = groupedResults;

  container.innerHTML = "";

  if (currentIG.length === 0 && otherIGs.length === 0) {
    container.innerHTML =
      "<p>No results found.</p>";
    return;
  }

  renderResultSection("This IG", currentIG, container);

  if (otherIGs.length > 0) {
    renderResultSection("Other IGs", otherIGs, container, { showIGBadge: true });
  }
}

function renderResultSection(headingText, results, container, { showIGBadge = false } = {}) {
  if (results.length === 0) {
    return;
  }

  const heading = document.createElement("div");
  heading.className = "search-results-heading";
  heading.textContent = headingText;
  container.appendChild(heading);

  results.forEach(result => {
    container.appendChild(createResultElement(result, { showIGBadge }));
  });
}

function createResultElement(result, { showIGBadge = false } = {}) {
  const resultElement =
    document.createElement("div");

  resultElement.className =
    "search-result";

  const breadcrumb =
  document.createElement("small");
  breadcrumb.className = "search-result-breadcrumb";
  breadcrumb.textContent = (result.breadcrumb || []).join(" > ");
  resultElement.appendChild(breadcrumb);

  const title =
    document.createElement("div");
    title.className = "search-result-title";


  const link =
    document.createElement("a");

  link.href = result.url;
  link.textContent = result.title;

  const typeBadge = document.createElement("span");

typeBadge.className =
"search-result-type type-" + result.type;

const typeNames = {
profiles: "Profile",
extensions: "Extension",
examples: "Example",
pages: "Documentation"
};

typeBadge.textContent =
typeNames[result.type] || "Documentation";

  title.appendChild(typeBadge);

  if (showIGBadge && result.igName) {
    const igBadge = document.createElement("span");
    igBadge.className = "search-result-ig";
    igBadge.textContent = result.igName;
    title.appendChild(igBadge);
  }

  title.appendChild(link);

  const path =
document.createElement("small");

path.className = "search-result-path";
path.textContent = result.path;

  const snippet =
    document.createElement("p");

  snippet.textContent = result.text.substring(0, 300);

  resultElement.appendChild(title);
  resultElement.appendChild(path);
  resultElement.appendChild(snippet);

  return resultElement;
}