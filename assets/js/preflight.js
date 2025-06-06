let activeIcao = null;

// Auto-load saved ICAO from localStorage (run only once per load)
let alreadyAutoSubmitted = false;
document.addEventListener("DOMContentLoaded", () => {
  const savedIcao = localStorage.getItem("selectedIcao");
  const icaoInput = document.getElementById("icao");
  if (
    savedIcao &&
    icaoInput &&
    icaoInput.value !== savedIcao &&
    !alreadyAutoSubmitted
  ) {
    alreadyAutoSubmitted = true;
    icaoInput.value = savedIcao;
    document.getElementById("icaoForm").dispatchEvent(new Event("submit"));
  }
});

// Unified ICAO form handler
document.getElementById("icaoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const icaoInput = form.querySelector("#icao");
  const icao = icaoInput?.value.trim().toUpperCase();
  if (!icao) return;

  activeIcao = icao;
  localStorage.setItem("selectedIcao", icao);

  const container = form.closest(".widget");
  const airbaseInfo = container.querySelector("#airbaseInfo");
  const mapContainer = container.querySelector("#mapContainer");
  const metarResult = document.getElementById("metarResult");
  const metarWidget = document.getElementById("metarWidget");
  const flightBtn = document.getElementById("getFlightAssistantBtn");

  if (flightBtn) {
    flightBtn.disabled = false;
    flightBtn.style.display = "inline-block";
  }
  document.getElementById("assistantOutput").innerHTML = "";

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
    const info = data[0];

    airbaseInfo.innerHTML = `
      <p><strong>${info.fullName}</strong> (${info.icao})</p>
      <p>${info.municipalityName}, ${info.country.name}</p>
    `;

    mapContainer.innerHTML = `
      <div class="map-lock">
        <iframe
          id="airbaseMap"
          width="100%"
          height="100%"
          frameborder="0"
          scrolling="no"
          style="border-radius: 6px;"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${
            info.location.lon - 0.02
          },${info.location.lat - 0.01},${info.location.lon + 0.02},${
      info.location.lat + 0.01
    }&layer=mapnik&marker=${info.location.lat},${info.location.lon}">
        </iframe>
      </div>
    `;

    setupMapLocks();

    metarResult.innerHTML = `
      <p><strong>METAR:</strong> ${info.rawOb}</p>
      <p><strong>TAF:</strong> ${info.rawTaf}</p>
    `;

    metarWidget.style.display = "block";

    // Update METAR/TAF embed anchor
    const metarEmbedAnchor = document.getElementById("metartaf-v7exxgfd");
    if (metarEmbedAnchor) {
      metarEmbedAnchor.href = `https://metar-taf.com/${icao}`;
      metarEmbedAnchor.textContent = `METAR ${icao}`;
    }

    // Remove existing metar-taf script, if any
    const existingScript = document.querySelector(
      'script[src*="metar-taf.com/embed-js/"]'
    );
    if (existingScript) existingScript.remove();

    // Add new metar-taf script
    const newScript = document.createElement("script");
    newScript.async = true;
    newScript.defer = true;
    newScript.crossOrigin = "anonymous";
    newScript.src = `https://metar-taf.com/embed-js/${icao}?layout=landscape&qnh=hPa&rh=rh&target=v7exxgfd`;
    document.body.appendChild(newScript);
  } catch (err) {
    airbaseInfo.innerHTML = `<p style="color: red;">Failed to fetch data for ICAO: ${icao}</p>`;
    console.error(err);
  }
});

// Toggle between raw METAR and visual panel
document.querySelectorAll(".metar-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;

    document.getElementById("metarRawSection").style.display =
      target === "raw" ? "block" : "none";
    document.getElementById("metarVisualSection").style.display =
      target === "visual" ? "block" : "none";

    document.querySelectorAll(".metar-toggle").forEach((b) => {
      b.disabled = b.dataset.target === target;
    });
  });
});

// Fullscreen handler with METAR iframe swap
document.querySelectorAll(".fullscreen-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const widget = e.target.closest(".widget");
    const modal = document.getElementById("widgetModal");
    const modalContent = document.getElementById("modalContent");

    // Inject widget content
    modalContent.innerHTML = widget.innerHTML;
    modalContent.querySelector(".fullscreen-btn")?.remove();

    // Apply fullscreen mode to both modal AND modalContent
    modal.classList.add("fullscreen-mode");
    modalContent.classList.add("fullscreen-mode");

    // Display modal
    modal.style.display = "flex";

    // Re-apply dark mode inside modalContent
    if (document.body.classList.contains("dark-mode")) {
      modalContent.classList.add("dark-mode");
    }

    // Disable ICAO form in fullscreen
    const icaoInput = modalContent.querySelector("#icao");
    const submitBtn = modalContent.querySelector('button[type="submit"]');
    if (icaoInput) icaoInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    // Show METAR iframe if this is the metar widget
    const isMetarWidget = widget.id === "metarWidget";
    if (isMetarWidget) {
      const modalICAO = activeIcao || "EKSP";
      const iframeWrapper = modalContent.querySelector(
        "#metarIframeFullscreen"
      );
      const iframe = modalContent.querySelector("#metarIframe");

      if (iframeWrapper && iframe) {
        iframeWrapper.style.display = "block";
        iframe.src = `https://metar-taf.com/${modalICAO}`;
      }

      const embedSection = modalContent.querySelector("#metarVisualSection");
      if (embedSection) {
        embedSection.style.display = "none";
      }
    }
  });
});

// Modal close behavior
document.getElementById("closeModalBtn").addEventListener("click", () => {
  document.getElementById("widgetModal").style.display = "none";
  modal.classList.remove("fullscreen-mode");
});
document.getElementById("widgetModal").addEventListener("click", (e) => {
  if (e.target.id === "widgetModal") {
    document.getElementById("widgetModal").style.display = "none";
    modal.classList.remove("fullscreen-mode");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("widgetModal").style.display = "none";
    modal.classList.remove("fullscreen-mode");
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
        `https://n8n.e57.dk/webhook/pilot-dashboard/flight-assistant?icao_id=${activeIcao}`
      );
      if (!response.ok) throw new Error("Failed to fetch summary");

      const text = await response.text();
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

// Wait for dark mode button injected via header
document.addEventListener("DOMContentLoaded", () => {
  const maxAttempts = 50;
  let attempts = 0;

  const intervalId = setInterval(() => {
    const toggleBtn = document.getElementById("toggleDarkMode");
    if (toggleBtn) {
      const isDark = document.body.classList.contains("dark-mode");
      toggleBtn.textContent = isDark ? "☀️" : "🌙";

      toggleBtn.addEventListener("click", () => {
        document.body.classList.add("transition");
        document.body.classList.toggle("dark-mode");

        const nowDark = document.body.classList.contains("dark-mode");
        toggleBtn.textContent = nowDark ? "☀️" : "🌙";
        localStorage.setItem("darkMode", nowDark ? "enabled" : "disabled");
      });

      clearInterval(intervalId);
    }

    if (++attempts >= maxAttempts) {
      clearInterval(intervalId);
      console.warn("Dark mode toggle not found after timeout.");
    }
  }, 100);
});

// Mobile iframe locking using map-lock strategy
function setupMapLocks() {
  const isTouch = matchMedia("(hover:none) and (pointer:coarse)").matches;
  if (!isTouch) return;

  const locks = document.querySelectorAll(".map-lock");

  locks.forEach((lock) => {
    lock.addEventListener(
      "click",
      (e) => {
        if (!lock.classList.contains("active")) {
          document
            .querySelectorAll(".map-lock.active")
            .forEach((l) => l.classList.remove("active"));
          lock.classList.add("active");
          e.stopPropagation();
        }
      },
      true
    );
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".map-lock")) {
      document
        .querySelectorAll(".map-lock.active")
        .forEach((l) => l.classList.remove("active"));
    }
  });
}

document.addEventListener("DOMContentLoaded", setupMapLocks);
