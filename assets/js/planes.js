// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

// Store loaded planes for later lookups
let planesList = [];
// Temp storage for uploaded image in edit form
let uploadedImageBase64 = null;
let removeImage = false;

// Helper to crop and resize an image to 1000x500 (2:1) and return base64
async function processPlaneImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetW = 1000;
      const targetH = 500;
      const aspect = targetW / targetH; // 2
      let sx = 0,
        sy = 0,
        sWidth = img.width,
        sHeight = img.height;
      const imgAspect = img.width / img.height;
      if (imgAspect > aspect) {
        sWidth = img.height * aspect;
        sx = (img.width - sWidth) / 2;
      } else {
        sHeight = img.width / aspect;
        sy = (img.height - sHeight) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetW, targetH);
      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
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

  planesList = Array.isArray(data.planes)
    ? data.planes.filter((p) => p.status !== "deleted")
    : [];

  const planesGrid = document.getElementById("planesGrid");
  planesGrid.innerHTML = "";

    if (planesList.length > 0) {
      planesList.forEach((plane) => {
        const widget = document.createElement("div");
        widget.className = "widget plane-widget";

        const rawImg = plane.photo || plane.photoUrl || "";
        const imgUrl = rawImg
          ? rawImg.startsWith("data:")
            ? rawImg
            : `data:image/jpeg;base64,${rawImg}`
          : "";

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
          <div class="plane-info" data-id="${plane._id}" data-note="${plane.note ? encodeURIComponent(plane.note) : ''}">
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
    const planeInfo = widget.querySelector(".plane-info");
    const detailLines = Array.from(planeInfo.querySelectorAll("p")).map((p) =>
      p.innerText
    );
    const planeNote = planeInfo.dataset.note
      ? decodeURIComponent(planeInfo.dataset.note)
      : "";

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
          ${planeNote ? '<p class="plane-note"></p>' : ''}
        </div>
      </div>
    `;
    if (planeNote) {
      modalContent.querySelector(".plane-note").textContent = planeNote;
    }

    modal.style.display = "flex";
  }

  // Handle edit
  const editButton = e.target.closest(".edit-btn");
  if (editButton) {
    const widget = editButton.closest(".widget");
    const info = widget.querySelector(".plane-info");
    if (!info) return;

    const planeId = info.dataset.id;
    const plane = planesList.find((p) => p._id === planeId);

    const planeName = plane?.displayName || "";
    const registration = plane?.registration || "";
    const compNo = plane?.competitionNumber || "";
    const type = plane?.type || "";
    const seats = plane?.seats || "";
    const rawImgData = plane?.photo || plane?.photoUrl || "";
    const hasImage = !!rawImgData;

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

    <div id="imageControls">
      ${hasImage
        ? `<button type="button" id="updateImgBtn">Update Image</button>
           <button type="button" id="removeImgBtn">Remove Image</button>`
        : `<button type="button" id="uploadImgBtn">Upload Image</button>`}
      <input type="file" id="planeImgInput" accept="image/*" style="display:none;" />
    </div>
    <div id="imgPreview">
      ${hasImage
        ? `<img src="${
            rawImgData.startsWith('data:')
              ? rawImgData
              : `data:image/jpeg;base64,${rawImgData}`
          }" alt="Current Image" />
           <span>Current Image</span>`
        : ''}
    </div>

    <button type="submit">Save Changes</button>
    <button type="button" id="deletePlaneBtn" class="delete-btn" title="Delete Plane">🗑 Delete Plane</button>
  </form>
`;

    // Hook into the newly injected form
    const imgInput = document.getElementById("planeImgInput");
    document.getElementById("uploadImgBtn")?.addEventListener("click", () => {
      removeImage = false;
      imgInput.click();
    });
    document.getElementById("updateImgBtn")?.addEventListener("click", () => {
      removeImage = false;
      imgInput.click();
    });
    document.getElementById("removeImgBtn")?.addEventListener("click", () => {
      uploadedImageBase64 = null;
      removeImage = true;
      document.getElementById("imgPreview").innerHTML = "";
    });
    imgInput?.addEventListener("change", async (ev) => {
      const file = ev.target.files[0];
      if (file) {
        try {
          uploadedImageBase64 = await processPlaneImage(file);
          document.getElementById(
            "imgPreview"
          ).innerHTML = `<img src="${uploadedImageBase64}" alt="Preview" /><span>${file.name}</span>`;
        } catch (err) {
          console.error(err);
        }
      }
    });

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
        if (uploadedImageBase64) {
          updates.photo = uploadedImageBase64;
        } else if (removeImage) {
          updates.photo = null;
        }

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
          uploadedImageBase64 = null;
          removeImage = false;
          const prev = document.getElementById("imgPreview");
          if (prev) prev.innerHTML = "";
          await loadPlanes();
        } catch (err) {
          console.error(err);
          alert("Failed to update plane: " + err.message);
        }
      });

      document
        .getElementById("deletePlaneBtn")
        ?.addEventListener("click", async () => {
          const confirmed = confirm(
            "Are you sure you want to permanently delete this plane?"
          );
          if (!confirmed) return;

          try {
            const res = await fetch(
              "https://n8n.e57.dk/webhook/pilot-dashboard/update-plane",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  plane_id: planeId,
                  updates: {
                    status: "deleted",
                    type: null,
                    competitionNumber: null,
                    category: null,
                    seats: null,
                    note: null,
                    creation_date: null,
                    last_flight: null,
                    photo: null,
                  },
                }),
              }
            );

            if (!res.ok) throw new Error(`Server error: ${res.status}`);

            const text = await res.text();
            if (text) {
              const result = JSON.parse(text);
              if (!result.success)
                throw new Error(result.message || "Delete failed");
            }

            modal.classList.remove("fullscreen-mode");
            modal.style.display = "none";
            uploadedImageBase64 = null;
            removeImage = false;
            const prev = document.getElementById("imgPreview");
            if (prev) prev.innerHTML = "";
            await loadPlanes();
          } catch (err) {
            console.error(err);
            alert("Failed to delete plane: " + err.message);
          }
        });
  }
});

// Close modal
document.getElementById("closeModalBtn").addEventListener("click", () => {
  modal.classList.remove("fullscreen-mode");
  modal.style.display = "none";
  uploadedImageBase64 = null;
  removeImage = false;
  const prev = document.getElementById("imgPreview");
  if (prev) prev.innerHTML = "";
});

modal.addEventListener("click", (e) => {
  if (e.target.id === "widgetModal") {
    modal.classList.remove("fullscreen-mode");
    modal.style.display = "none";
    uploadedImageBase64 = null;
    removeImage = false;
    const prev = document.getElementById("imgPreview");
    if (prev) prev.innerHTML = "";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modal.classList.remove("fullscreen-mode");
    modal.style.display = "none";
    uploadedImageBase64 = null;
    removeImage = false;
    const prev = document.getElementById("imgPreview");
    if (prev) prev.innerHTML = "";
  }
});

// Initialize
loadPlanes();
