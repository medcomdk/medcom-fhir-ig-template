
# Search

<div id="search-page">

  <div class="search-page-input">
    <input
      id="full-search-box"
      type="text"
      placeholder="Search the documentation..."
      autocomplete="off"
    />
  </div>

  <div class="search-scope">
    <strong>Search in:</strong>

    <label>
      <input type="radio" name="search-scope" value="current">
      This IG
    </label>

    <label>
      <input type="radio" name="search-scope" value="all" checked>
      All IGs
    </label>
  </div>

  <div class="search-filters">

    <div class="search-filter">
      <strong>Filter</strong>

      <label class="filter-chip">
        <input type="checkbox" value="profiles">
        <span>Profiles</span>
      </label>

      <label class="filter-chip">
        <input type="checkbox" value="extensions">
        <span>Extensions</span>
      </label>

      <label class="filter-chip">
        <input type="checkbox" value="examples">
        <span>Examples</span>
      </label>
    </div>

  </div>

  <div id="search-status"></div>

  <div id="search-results"></div>

</div>
