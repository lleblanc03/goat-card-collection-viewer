const sheetURL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTWt86xWBvPc5hgePRfBhgsLT8EP98JP32QUg1Yz-l-ZR0ZC7Y56HfnaMZc2tt8KeOVH5bkgwQC0YKl/pub?output=csv&t=" + new Date().getTime();

let cards = [];
let loaded = false;
let metadataCache = JSON.parse(localStorage.getItem("cardMetadataCache") || "{}");

async function loadSheet() {
  const response = await fetch(sheetURL);
  const text = await response.text();

  const rows = text.split("\n").slice(1);

  cards = [];

  rows.forEach(row => {
    const cols = row.split(",");

    if (cols.length < 2) return;

    const name = cols[0].trim().replace(/^"|"$/g, "");
    const count = cols[1].trim().replace(/^"|"$/g, "");

    if (!name) return;

    cards.push({
      name,
      count: Number(count) || 0
    });
  });

  loaded = true;
  renderAllCards();
}

function normalize(str) {
  return (str || "").toString().toLowerCase().trim();
}

function detectQueryType(query) {
  const q = normalize(query);

  const knownAttributes = ["dark", "light", "earth", "water", "fire", "wind", "divine"];
  const knownTypes = [
    "monster", "spell", "trap",
    "spell card", "trap card",
    "effect monster", "normal monster", "fusion monster", "ritual monster", "toon monster",
    "flip effect monster", "union effect monster", "spirit monster", "gemini monster"
  ];

  if (knownAttributes.includes(q)) {
    return { kind: "attribute", label: `Attribute: ${q.toUpperCase()}` };
  }

  if (/^\d+$/.test(q) || q.startsWith("level:")) {
    const levelValue = q.startsWith("level:") ? q.replace("level:", "").trim() : q;
    return { kind: "level", value: levelValue, label: `Level: ${levelValue}` };
  }

  if (knownTypes.includes(q)) {
    const pretty = q
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return { kind: "type", label: `Type: ${pretty}` };
  }

  return { kind: "text", label: `Search: ${query}` };
}

function renderFilterChips(query) {
  const chipBox = document.getElementById("filterChips");

  if (!query || !query.trim()) {
    chipBox.innerHTML = "";
    return;
  }

  const info = detectQueryType(query);

  chipBox.innerHTML = `
    <button class="chip active-chip" onclick="clearSearch()">${info.label} ✕</button>
  `;
}

function clearSearch() {
  document.getElementById("searchBox").value = "";
  document.getElementById("filterChips").innerHTML = "";
  renderAllCards();
}

function renderCards(list, title = "") {
  const result = document.getElementById("result");

  let html = "";

  if (title) {
    html += `<h2>${title}</h2>`;
  }

  if (list.length === 0) {
    html += "<p>No cards found.</p>";
    result.innerHTML = html;
    return;
  }

  list.forEach(card => {
    const cached = metadataCache[card.name];
    const thumb = cached?.image || "";

    html += `
      <div class="card-row">
        <a class="thumb-link" href="card.html?name=${encodeURIComponent(card.name)}">
          ${thumb ? `<img class="thumb" src="${thumb}" alt="${card.name}">` : `<div class="thumb placeholder">No Image</div>`}
        </a>

        <div class="card-info">
          <h3>
            <a href="card.html?name=${encodeURIComponent(card.name)}">${card.name}</a>
          </h3>
          <p><strong>You own:</strong> ${card.count}</p>
          ${cached?.type ? `<p><strong>Type:</strong> ${cached.type}</p>` : ""}
          ${cached?.attribute ? `<p><strong>Attribute:</strong> ${cached.attribute}</p>` : ""}
          ${cached?.level ? `<p><strong>Level:</strong> ${cached.level}</p>` : ""}
        </div>
      </div>
    `;
  });

  result.innerHTML = html;
}

function renderAllCards() {
  if (!loaded) {
    document.getElementById("result").innerHTML = "<p>Loading cards...</p>";
    return;
  }

  const sorted = [...cards].sort((a, b) => a.name.localeCompare(b.name));
  renderCards(sorted, "Full Collection");
}

async function getCardDetails(cardName) {
  if (metadataCache[cardName]) {
    return metadataCache[cardName];
  }

  try {
    const apiURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`;
    const response = await fetch(apiURL);
    const data = await response.json();

    if (!data.data || !data.data[0]) return null;

    const info = data.data[0];

    const mapped = {
      name: info.name,
      type: info.type || "",
      subType: info.humanReadableCardType || "",
      attribute: info.attribute || "",
      race: info.race || "",
      level: info.level || "",
      atk: info.atk ?? "",
      def: info.def ?? "",
      desc: info.desc || "",
      image: info.card_images?.[0]?.image_url_small || info.card_images?.[0]?.image_url || ""
    };

    metadataCache[cardName] = mapped;
    localStorage.setItem("cardMetadataCache", JSON.stringify(metadataCache));

    return mapped;
  } catch (error) {
    console.error("API error for", cardName, error);
    return null;
  }
}

async function buildMetadataIndex() {
  if (!loaded) return;

  const status = document.getElementById("status");
  status.innerHTML = "<p>Building search index...</p>";

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];

    if (!metadataCache[card.name]) {
      status.innerHTML = `<p>Indexing ${i + 1} / ${cards.length}: ${card.name}</p>`;
      await getCardDetails(card.name);

      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  status.innerHTML = "<p>Search index complete.</p>";
  renderAllCards();
}

async function searchCards() {
  if (!loaded) {
    document.getElementById("result").innerHTML = "<p>Loading data...</p>";
    return;
  }

  const rawQuery = document.getElementById("searchBox").value.trim();
  const query = normalize(rawQuery);

  renderFilterChips(rawQuery);

  if (!query) {
    renderAllCards();
    return;
  }

  const queryInfo = detectQueryType(rawQuery);
  const basicMatches = cards.filter(card => normalize(card.name).includes(query));

  if (
    queryInfo.kind === "attribute" ||
    queryInfo.kind === "level" ||
    queryInfo.kind === "type" ||
    basicMatches.length === 0
  ) {
    const enriched = [];

    for (const card of cards) {
      const details = await getCardDetails(card.name);
      enriched.push({ ...card, details });
    }

    const filtered = enriched.filter(card => {
      const d = card.details;
      if (!d) return false;

      const byName = normalize(card.name).includes(query);
      const byAttribute = queryInfo.kind === "attribute" && normalize(d.attribute) === query;
      const byType =
        queryInfo.kind === "type" &&
        (
          normalize(d.type).includes(query) ||
          normalize(d.subType).includes(query) ||
          normalize(d.race).includes(query)
        );
      const byLevel =
        queryInfo.kind === "level" &&
        String(d.level) === queryInfo.value;

      return byName || byAttribute || byType || byLevel;
    }).map(card => ({
      name: card.name,
      count: card.count
    }));

    renderCards(filtered, `Results for "${rawQuery}"`);
    return;
  }

  renderCards(basicMatches, `Results for "${rawQuery}"`);
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");

  searchBox.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchCards();
    }
  });
});

loadSheet();
