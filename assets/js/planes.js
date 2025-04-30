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
    if (!data.success)
      throw new Error(data.message || "Failed to load planes.");

    const planesGrid = document.getElementById("planesGrid");
    planesGrid.innerHTML = "";

    if (Array.isArray(data.planes) && data.planes.length > 0) {
      data.planes.forEach((plane) => {
        const widget = document.createElement("div");
        widget.className = "widget plane-widget";

        const imgUrl = plane.photoUrl || "";

        widget.innerHTML = `
          <div class="widget-buttons">
            <button class="edit-btn" title="Edit Plane">✏️</button>
            <button class="fullscreen-btn" title="Fullscreen">⛶</button>
          </div>
          <div class="plane-photo">
            ${
              imgUrl
                ? `<img src="${imgUrl}" alt="Plane Photo" />`
                : `<span>No Image</span>`
            }
          </div>
          <div class="plane-info" data-id="${plane._id}">
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
      "<p style='color: red;'>Could not load planes. Check console for details.</p>";
  }
}

// Fullscreen modal
const modal = document.getElementById("widgetModal");
const modalContent = document.getElementById("modalContent");

document.addEventListener("click", (e) => {
  // Handle fullscreen
  if (e.target.classList.contains("fullscreen-btn")) {
    const widget = e.target.closest(".widget");
    modal.classList.add("fullscreen-mode");

    const planeName =
      widget.querySelector(".plane-title")?.innerText || "Unknown Plane";
    const img = widget.querySelector(".plane-photo img")?.src;
    const detailLines = Array.from(
      widget.querySelectorAll(".plane-info p")
    ).map((p) => p.innerText);

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

  // Handle edit
  const editButton = e.target.closest(".edit-btn");
  if (editButton) {
    const widget = editButton.closest(".widget");
    const info = widget.querySelector(".plane-info");
    if (!info) return;

    const planeId = info.dataset.id;
    const planeName = info.querySelector(".plane-title")?.innerText || "";
    const registration =
      info.querySelector("p:nth-child(2)")?.innerText.split(": ")[1] || "";
    const compNo =
      info.querySelector("p:nth-child(3)")?.innerText?.split(": ")[1] || "";
    const type =
      info.querySelector("p:nth-child(4)")?.innerText?.split(": ")[1] || "";
    const seats =
      info.querySelector("p:nth-child(5)")?.innerText?.split(": ")[1] || "";

    modal.classList.add("fullscreen-mode");
    modal.style.display = "flex";

    modalContent.innerHTML = `
  <form id="editPlaneForm" class="edit-form">
    <h2 style="text-align:center;">Edit Plane</h2>
    <input type="hidden" id="editPlaneId" value="${planeId}" />

    <label>Display Name
      <input type="text" id="editPlaneName" value="${planeName}" required />
    </label>

    <label>Registration
      <input type="text" id="editPlaneReg" value="${registration}" required />
    </label>

    <label>Competition Number
      <input type="text" id="editPlaneComp" value="${compNo}" />
    </label>

    <label>Type
      <input type="text" id="editPlaneType" value="${type}" />
    </label>

    <label>Seats
      <input type="number" id="editPlaneSeats" value="${seats}" />
    </label>

    <button type="submit">Save Changes</button>
  </form>
`;

    // Hook into the newly injected form
    document
      .getElementById("editPlaneForm")
      .addEventListener("submit", async (e) => {
        e.preventDefault();

        const updates = {
          displayName: document.getElementById("editPlaneName").value,
          registration: document.getElementById("editPlaneReg").value,
          competitionNumber: document.getElementById("editPlaneComp").value,
          type: document.getElementById("editPlaneType").value,
          seats: Number(document.getElementById("editPlaneSeats").value),
        };

        try {
          const res = await fetch(
            "https://n8n.e57.dk/webhook/pilot-dashboard/update-plane",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, plane_id: planeId, updates }),
            }
          );

          if (!res.ok) throw new Error(`Server error: ${res.status}`);

          const text = await res.text();
          if (text) {
            const result = JSON.parse(text);
            if (!result.success)
              throw new Error(result.message || "Update failed");
          }

          modal.classList.remove("fullscreen-mode");
          modal.style.display = "none";
          await loadPlanes();
        } catch (err) {
          console.error(err);
          alert("Failed to update plane: " + err.message);
        }
      });
  }
});

// Close modal
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
