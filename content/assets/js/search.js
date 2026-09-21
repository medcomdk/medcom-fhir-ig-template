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
}

async function setupFullSearch(searchBox) {
  const filter = document.getElementById("search-type");
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

  if (filter) {
    filter.addEventListener("change", performSearch);
  }
  if (sort) {
    sort.addEventListener("change", performSearch);
  }
  if (initialQuery) {
    await performSearch();
  }


  async function performSearch() {
    const currentSearchId = ++searchId;
    const query = searchBox.value.toLowerCase().trim();
    const selectedFilter = filter ? filter.value : "all";
    const selectedSort = sort ? sort.value : "relevance";

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

    if (currentSearchId !== searchId) {
  return;
}
    const filteredResults = results.filter(result =>
      matchesFilter(result, selectedFilter)
    );

    const sortedResults = sortResults(filteredResults, selectedSort);

    if (status) {
      status.textContent =
        filteredResults.length +
        (filteredResults.length === 1 ? " result" : " results");
    }

    renderResults(
      sortedResults,
      resultsContainer
    );
  }
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

    const path =
  document.createElement("small");

path.textContent = result.path;

    const snippet =
      document.createElement("p");

    snippet.textContent = result.text;

    resultElement.appendChild(title);
    resultElement.appendChild(path);
    resultElement.appendChild(snippet);

    container.appendChild(resultElement);
  });
}