
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
function detectIGFromDocument(doc) {
  if (!doc) {
    return null;
  }

  // 1. Find IG-navnet fra publish-box
  const publishLink = doc.querySelector("#publish-box a[href]");

  if (publishLink) {
    const match = publishLink.getAttribute("href").match(/\/ig\/([^/]+)\//);

    if (match) {
      return match[1].toLowerCase();
    }
  }

  // 2. Find IG-navnet fra URL
  const canonical = doc.querySelector('link[rel="canonical"]');

  if (canonical) {
    const canonicalMatch = canonical
      .getAttribute("href")
      .match(/\/ig\/([^/]+)\//);

    if (canonicalMatch) {
      return canonicalMatch[1].toLowerCase();
    }
  }

  return null;
}

// IG-id udtrukket fra et andet dokument end det aktuelle, se rememberIGFromDocument().
let rememberedIG = null;

function getCurrentIG() {
  // 1. Find IG-navnet fra det aktuelle dokument (publish-box/canonical URL)
  const fromDocument = detectIGFromDocument(document);

  if (fromDocument) {
    return fromDocument;
  }

  // 2. Find IG-navnet fra sidens URL (virker når IG'en er publiceret online,
  // fx ".../ig/homecareobservation/...")
  const match = window.location.pathname.match(/\/ig\/([^/]+)\//);

  if (match) {
    return match[1].toLowerCase();
  }

  // 3. Find IG-navnet fra et tidligere analyseret dokument, fx IG'ens eget
  // index.html hentet under lokal udvikling, se rememberIGFromDocument().
  return rememberedIG;
}

// Kaldes med et separat hentet dokument (fx IG'ens index.html) for at
// identificere og huske IG-id'et, så getCurrentIG() kan bruge det senere,
// selvom det aktuelle dokument (fx search.html) ikke selv indeholder
// publish-box/canonical-link og URL'en ikke indeholder "/ig/<id>/" (lokal udvikling).
function rememberIGFromDocument(doc) {
  const ig = detectIGFromDocument(doc);

  if (ig) {
    rememberedIG = ig;
  }

  return ig;
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
