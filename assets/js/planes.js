// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

// Fetch and display user's planes
async function loadPlanes() {
  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch planes");

    const [data] = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to load planes.");
    }

    const planesGrid = document.getElementById("planesGrid");
    planesGrid.innerHTML = "";

    if (Array.isArray(data.planes) && data.planes.length > 0) {
      data.planes.forEach((plane) => {
        const widget = document.createElement("div");
        widget.className = "widget plane-widget";

        const imgUrl = plane.photoUrl || "";

        widget.innerHTML = `
          <button class="fullscreen-btn" title="Fullscreen">⛶</button>
          <div class="plane-photo">
            ${
              imgUrl
                ? `<img src="${imgUrl}" alt="Plane Photo" />`
                : `<span>No Image</span>`
            }
          </div>
          <div class="plane-info">
            <h3 class="plane-title">${plane.displayName}</h3>
            <p><strong>Registration:</strong> ${
              plane.registration || "Unknown"
            }</p>
            ${
              plane.competitionNumber
                ? `<p><strong>Comp No:</strong> ${plane.competitionNumber}</p>`
                : ""
            }
            ${plane.type ? `<p><strong>Type:</strong> ${plane.type}</p>` : ""}
            ${
              plane.seats ? `<p><strong>Seats:</strong> ${plane.seats}</p>` : ""
            }
          </div>
        `;

        planesGrid.appendChild(widget);
      });
    } else {
      planesGrid.innerHTML = "<p>No planes added yet.</p>";
    }
  } catch (err) {
    console.error("Error fetching planes:", err);
    document.getElementById("planesGrid").innerHTML =
      "<p>Could not load planes.</p>";
  }
}

// Fullscreen widget modal
const modal = document.getElementById("widgetModal");
const modalContent = document.getElementById("modalContent");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("fullscreen-btn")) {
    const widget = e.target.closest(".widget");
    modal.classList.add("fullscreen-mode");

    // Extract info from widget
    const planeName =
      widget.querySelector(".plane-title")?.innerText || "Unknown Plane";
    const img = widget.querySelector(".plane-photo img")?.src;
    const detailLines = Array.from(
      widget.querySelectorAll(".plane-info p")
    ).map((p) => p.innerText);

    // Build fullscreen layout
    modalContent.innerHTML = `
      <div class="plane-widget-content fullscreen-layout">
        <h2 class="plane-title">${planeName}</h2>
        <div class="plane-photo">
          ${
            img
              ? `<img src="${img}" alt="Plane Photo" />`
              : `<span>No Image</span>`
          }
        </div>
        <div class="plane-details">
          <table>
            <tbody>
              ${detailLines
                .map((line) => {
                  const parts = line.split(":");
                  if (parts.length >= 2) {
                    const label = parts[0].trim();
                    const value = parts.slice(1).join(":").trim();
                    return `<tr><td>${label}</td><td>${value}</td></tr>`;
                  }
                  return "";
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    modal.style.display = "flex";
  }
});

// Close modal handlers
document.getElementById("closeModalBtn").addEventListener("click", () => {
  modal.classList.remove("fullscreen-mode");
  modal.style.display = "none";
});

modal.addEventListener("click", (e) => {
  if (e.target.id === "widgetModal") {
    modal.classList.remove("fullscreen-mode");
    modal.style.display = "none";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modal.classList.remove("fullscreen-mode");
    modal.style.display = "none";
  }
});

// Initialize
loadPlanes();
