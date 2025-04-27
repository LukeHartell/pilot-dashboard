// ICAO form (normal mode only)
document.getElementById("icaoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const container = form.closest(".widget");
  const icao = form.querySelector("#icao")?.value.trim().toUpperCase();

  const airbaseInfo = container.querySelector("#airbaseInfo");
  const mapContainer = container.querySelector("#mapContainer");
  const metarResult = document.getElementById("metarResult");
  const metarWidget = document.getElementById("metarWidget");

  if (!icao) return;

  airbaseInfo.innerHTML = "Loading...";
  mapContainer.innerHTML = "";
  metarResult.innerHTML = "";
  metarWidget.style.display = "none";

  try {
    const response = await fetch(
      `https://n8n.e57.dk/webhook/pilot-dashboard/metar?icao_id=${icao}`
    );
    if (!response.ok) throw new Error("Server returned error");

    const data = await response.json();
    const info = data[0]; // now everything is inside here

    // Show airbase info
    airbaseInfo.innerHTML = `
  <p><strong>${info.fullName}</strong> (${info.icao})</p>
  <p>${info.municipalityName}, ${info.country.name}</p>
`;

    // Show map
    mapContainer.innerHTML = `
  <iframe
    width="100%"
    height="250"
    frameborder="0"
    scrolling="no"
    style="border:0; border-radius: 6px;"
    src="https://www.openstreetmap.org/export/embed.html?bbox=${
      info.location.lon - 0.02
    },${info.location.lat - 0.01},${info.location.lon + 0.02},${
      info.location.lat + 0.01
    }&layer=mapnik&marker=${info.location.lat},${info.location.lon}">
  </iframe>
`;

    // Show METAR / TAF
    metarResult.innerHTML = `
  <p><strong>METAR:</strong> ${info.rawOb}</p>
  <p><strong>TAF:</strong> ${info.rawTaf}</p>
`;

    metarWidget.style.display = "block";
  } catch (err) {
    airbaseInfo.innerHTML = `<p style="color: red;">Failed to fetch data for ICAO: ${icao}</p>`;
    console.error(err);
  }
});

// Fullscreen handler
document.querySelectorAll(".fullscreen-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const widget = e.target.closest(".widget");
    const modal = document.getElementById("widgetModal");
    const modalContent = document.getElementById("modalContent");

    modalContent.innerHTML = widget.innerHTML;
    modalContent.querySelector(".fullscreen-btn")?.remove();
    modal.style.display = "flex";

    // Disable ICAO form in fullscreen
    const icaoInput = modalContent.querySelector("#icao");
    const submitBtn = modalContent.querySelector('button[type="submit"]');
    if (icaoInput) icaoInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
  });
});

// Close modal on button or background click
document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("widgetModal").style.display = "none";
});
document.getElementById("widgetModal").addEventListener("click", (e) => {
  if (e.target.id === "widgetModal") {
    document.getElementById("widgetModal").style.display = "none";
  }
});

// ESC key closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("widgetModal").style.display = "none";
  }
});

let activeIcao = null;

// Hook into the METAR fetch to store the current ICAO
document.getElementById("icaoForm")?.addEventListener("submit", (e) => {
  const icaoInput = document.getElementById("icao");
  if (icaoInput) {
    activeIcao = icaoInput.value.trim().toUpperCase();
    document.getElementById("getFlightAssistantBtn").disabled = !activeIcao;
  }
});

// Update active ICAO and show button again
document.getElementById("icaoForm")?.addEventListener("submit", (e) => {
  const icaoInput = document.getElementById("icao");
  if (icaoInput) {
    activeIcao = icaoInput.value.trim().toUpperCase();
    const btn = document.getElementById("getFlightAssistantBtn");
    if (btn) {
      btn.disabled = false;
      btn.style.display = "inline-block";
    }

    // Clear previous summary
    document.getElementById("assistantOutput").innerHTML = "";
  }
});

// Fetch AI summary and render markdown
document
  .getElementById("getFlightAssistantBtn")
  ?.addEventListener("click", async () => {
    const btn = document.getElementById("getFlightAssistantBtn");
    const output = document.getElementById("assistantOutput");

    if (!activeIcao || !btn || !output) return;

    btn.style.display = "none";
    output.innerHTML = "Loading...";

    try {
      const response = await fetch(
        `https://n8n.e57.dk/webhook/pilot-dashboard/flight-assiatant?icao_id=${activeIcao}`
      );
      if (!response.ok) throw new Error("Failed to fetch summary");

      const text = await response.text();

      // Simple markdown to HTML rendering
      const html = text
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/gim, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br />");

      output.innerHTML = html;
    } catch (err) {
      output.innerHTML = `<p style="color: red;">Error fetching summary</p>`;
      console.error(err);
    }
  });
