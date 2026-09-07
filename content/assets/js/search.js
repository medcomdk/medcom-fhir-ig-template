document.addEventListener("DOMContentLoaded", function () {
  const searchBox = document.getElementById("search-box");
  const navbar = document.querySelector("#segment-navbar .nav-collapse");

  if (!searchBox) {
    return;
  }

  if (navbar) {
    navbar.appendChild(searchBox);
  }

  searchBox.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();

    let resultBox = document.getElementById("search-results");

    if (!resultBox) {
      resultBox = document.createElement("div");
      resultBox.id = "search-results";

      document.body.appendChild(resultBox);

      resultBox.style.position = "fixed";
      resultBox.style.background = "white";
      resultBox.style.border = "1px solid #ccc";
      resultBox.style.padding = "5px";
      resultBox.style.zIndex = "9999";
      resultBox.style.width = "250px";
      resultBox.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    }

    if (!query) {
      resultBox.innerHTML = "";
      resultBox.style.display = "none";
      return;
    }

    const links = Array.from(
      document.querySelectorAll("#segment-content a")
    );

    const results = links
      .map(link => ({
        title: link.textContent.trim(),
        url: link.href
      }))
      .filter(result =>
        result.title.toLowerCase().includes(query)
      )
      .slice(0, 5);

    resultBox.innerHTML = results.length
      ? results
          .map(result =>
            `<div><a href="${result.url}">${result.title}</a></div>`
          )
          .join("")
      : "<div>No results found</div>";

    const rect = searchBox.getBoundingClientRect();

    resultBox.style.left = rect.left + "px";
    resultBox.style.top = rect.bottom + "px";
    resultBox.style.display = "block";
  });
});