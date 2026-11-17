
async function searchCurrentIG(query, currentIg, version) {
  let url = "http://localhost:3000/search?q=" + encodeURIComponent(query);

  if (currentIg) {
    url += "&ig=" + encodeURIComponent(currentIg);
  }
  
  if (version) {
    url += "&version=" + encodeURIComponent(version);
  }

  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  return await response.json();
}

function getCurrentIG() {
  const candidateUrls = [
    document.querySelector("#publish-box a[href]")?.href,
    document.querySelector('link[rel="canonical"]')?.href,
    window.location.href
  ];

  for (const url of candidateUrls) {
    const match = url?.match(/\/ig\/([^/]+)\//);

    if (match) {
      return match[1];
    }
  }

  return null;
}

function getSelectedScope(scopeInputs) {
  const checked = Array.from(scopeInputs).find(input => input.checked);

  return checked ? checked.value : "current";
}

function groupResultsByIG(results, currentIG) {
  return {
    currentIG: results.filter(result => result.ig === currentIG),
    otherIGs: results.filter(result => result.ig !== currentIG)
  };
}
