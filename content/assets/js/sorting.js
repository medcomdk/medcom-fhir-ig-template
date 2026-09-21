
function sortResults(results, sortType) {
  if (sortType === "relevance") {
    return results.sort((a, b) => b.score - a.score);
  }

  if (sortType === "alphabetical") {
    return results.sort((a, b) => a.title.localeCompare(b.title));
  }
  return results;
}