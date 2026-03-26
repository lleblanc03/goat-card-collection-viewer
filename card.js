function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function goSearch() {
  const query = document.getElementById("searchBox").value.trim();
  if (!query) return;
  window.location.href = `index.html?search=${encodeURIComponent(query)}`;
}

async function updateCount(delta) {
  const cardName = getQueryParam("name");
  const countEl = document.getElementById("ownedCount");
  const increaseBtn = document.getElementById("increaseBtn");
  const decreaseBtn = document.getElementById("decreaseBtn");
  const statusEl = document.getElementById("updateStatus");

  if (increaseBtn) increaseBtn.disabled = true;
  if (decreaseBtn) decreaseBtn.disabled = true;
  if (statusEl) statusEl.textContent = "Updating...";

  try {
    const params = new URLSearchParams({
      name: cardName,
      delta: delta,
      token: "my-secret-goat-token-2026"
    });

    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbzlCrYSyD72xh2X1qjGFx7AW2pIsRFFox2FZKhbi4TSUGNy8G_6T4k_oTbdkzQbpcjD/exec?" + params.toString()
    );

    const result = await response.json();

    if (!result.ok) {
      alert(result.error || "Update failed");
      return;
    }

    if (countEl) {
      countEl.textContent = result.count;
    }

    if (statusEl) {
      statusEl.textContent = "Updated!";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 1200);
    }
  } catch (error) {
    console.error("updateCount error:", error);
    alert("Update failed");
    if (statusEl) statusEl.textContent = "";
  } finally {
    if (increaseBtn) increaseBtn.disabled = false;
    if (decreaseBtn) decreaseBtn.disabled = false;
  }
}

async function loadCard() {
  const cardName = getQueryParam("name");
  const container = document.getElementById("cardDetail");

  if (!container) {
    console.error('Missing element with id="cardDetail"');
    return;
  }

  if (!cardName) {
    container.innerHTML = "<p>No card selected.</p>";
    return;
  }

  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.value = cardName;
  }

  try {
    const sheetURL =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTWt86xWBvPc5hgePRfBhgsLT8EP98JP32QUg1Yz-l-ZR0ZC7Y56HfnaMZc2tt8KeOVH5bkgwQC0YKl/pub?output=csv&t=" + new Date().getTime();

    const sheetResponse = await fetch(sheetURL);
    const sheetText = await sheetResponse.text();
    const rows = sheetText.split("\n").slice(1);

    let ownedCount = 0;

    rows.forEach(row => {
      const cols = row.split(",");
      if (cols.length < 2) return;

      const name = cols[0].trim().replace(/^"|"$/g, "");
      const count = Number(cols[1].trim().replace(/^"|"$/g, "")) || 0;

      if (name.toLowerCase() === cardName.toLowerCase()) {
        ownedCount = count;
      }
    });

    const apiURL = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`;
    const response = await fetch(apiURL);
    const data = await response.json();

    if (!data.data || !data.data[0]) {
      container.innerHTML = "<p>Card data not found.</p>";
      return;
    }

    const info = data.data[0];

    container.innerHTML = `
      <div class="detail-card">
        <h1>${info.name}</h1>
        <img class="detail-image" src="${info.card_images?.[0]?.image_url || ""}" alt="${info.name}">

        <p><strong>You own:</strong> <span id="ownedCount">${ownedCount}</span></p>
        <p><strong>Card Type:</strong> ${info.type || ""}</p>
        ${info.humanReadableCardType ? `<p><strong>Card Sub-Type:</strong> ${info.humanReadableCardType}</p>` : ""}
        ${info.attribute ? `<p><strong>Attribute:</strong> ${info.attribute}</p>` : ""}
        ${info.race ? `<p><strong>Monster Type / Class:</strong> ${info.race}</p>` : ""}
        ${info.level ? `<p><strong>Level:</strong> ${info.level}</p>` : ""}
        ${info.atk !== undefined ? `<p><strong>Attack:</strong> ${info.atk}</p>` : ""}
        ${info.def !== undefined ? `<p><strong>Defense:</strong> ${info.def}</p>` : ""}
        <p><strong>Card Text:</strong> ${info.desc || ""}</p>

        <div class="count-actions">
          <button id="decreaseBtn" onclick="updateCount(-1)">-1</button>
          <button id="increaseBtn" onclick="updateCount(1)">+1</button>
        </div>

        <p id="updateStatus"></p>
      </div>
    `;
  } catch (error) {
    console.error("loadCard error:", error);
    container.innerHTML = "<p>There was a problem loading this card.</p>";
  }
}

loadCard();
