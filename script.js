const sheetURL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vTWt86xWBvPc5hgePRfBhgsLT8EP98JP32QUg1Yz-l-ZR0ZC7Y56HfnaMZc2tt8KeOVH5bkgwQC0YKl/pub?output=csv&t=" + new Date().getTime();

let cards = [];
let loaded = false;
let metadataCache = JSON.parse(localStorage.getItem("cardMetadataCache") || "{}");
let activeFilters = [];

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

function titleCase(str) {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseSingleFilter(input) {
  const q = normalize(input);

  const knownAttributes = ["dark", "light", "earth", "water", "fire", "wind", "divine"];
  const knownTypes = [
    "monster", "spell", "trap",
    "spell card", "trap card",
    "effect monster", "normal monster", "fusion monster", "ritual monster", "toon monster",
    "flip effect monster", "union effect monster", "spirit monster", "gemini monster"
  ];

  if (!q) return null;

  if (knownAttributes.includes(q)) {
    return {
      kind: "attribute",
      value: q,
      label: `Attribute: ${q.toUpperCase()}`
    };
  }

  if (/^\d+$/.test(q)) {
    return {
      kind: "level",
      value: q,
      label: `Level: ${q}`
    };
  }

  if (q.startsWith("level:")) {
    const levelValue = q.replace("level:", "").trim();
    if (levelValue) {
      return {
        kind: "level",
        value: levelValue,
        label: `Level: ${levelValue}`
      };
    }
  }

  if (knownTypes.includes(q)) {
    return {
      kind: "type",
      value: q,
      label: `Type: ${titleCase(q)}`
    };
  }

  return {
    kind: "text",
    value: q,
    label: `Search: ${input.trim()}`
  };
}

function isDuplicateFilter(newFilter) {
  return activeFilters.some(filter =>
    filter.kind === newFilter.kind && filter.value === newFilter.value
  );
}

function renderFilterChips() {
  const chipBox = document.getElementById("filterChips");

  if (activeFilters.length === 0) {
    chipBox.innerHTML = "";
    return;
  }

  chipBox.innerHTML = activeFilters.map((filter, index) => `
    <button class="chip active-chip" onclick="removeFilter(${index})">
      ${filter.label} ✕
    </button>
  `).join("");
}

function removeFilter(index) {
  activeFilters.splice(index, 1);
  renderFilterChips();
  applyFilters();
}

function clearSearch() {
  document.getElementById("searchBox").value = "";
  activeFilters = [];
  renderFilterChips();
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

async function applyFilters() {
  if (activeFilters.length === 0) {
    renderAllCards();
    return;
  }

  const enriched = [];

  for (const card of cards) {
    const details = await getCardDetails(card.name);
    enriched.push({ ...card, details });
  }

  const filtered = enriched.filter(card => {
    const d = card.details;
    if (!d) return false;

    return activeFilters.every(filter => {
      if (filter.kind === "text") {
        return normalize(card.name).includes(filter.value);
      }

      if (filter.kind === "attribute") {
        return normalize(d.attribute) === filter.value;
      }

      if (filter.kind === "level") {
        return String(d.level) === filter.value;
      }

      if (filter.kind === "type") {
        const typeText = normalize(d.type);
        const subTypeText = normalize(d.subType);
        const raceText = normalize(d.race);

        if (filter.value === "monster") {
          return typeText.includes("monster");
        }

        if (filter.value === "spell") {
          return typeText.includes("spell");
        }

        if (filter.value === "trap") {
          return typeText.includes("trap");
        }

        return (
          typeText.includes(filter.value) ||
          subTypeText.includes(filter.value) ||
          raceText.includes(filter.value)
        );
      }

      return true;
    });
  }).map(card => ({
    name: card.name,
    count: card.count
  }));

  const title = activeFilters.map(f => f.label).join(" | ");
  renderCards(filtered, title);
}

async function searchCards() {
  if (!loaded) {
    document.getElementById("result").innerHTML = "<p>Loading data...</p>";
    return;
  }

  const rawInput = document.getElementById("searchBox").value.trim();
  if (!rawInput) return;

  const newFilter = parseSingleFilter(rawInput);
  if (!newFilter) return;

  if (!isDuplicateFilter(newFilter)) {
    activeFilters.push(newFilter);
  }

  document.getElementById("searchBox").value = "";
  renderFilterChips();
  await applyFilters();
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
