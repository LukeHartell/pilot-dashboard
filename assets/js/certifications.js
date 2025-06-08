// Manage pilot certifications on the user page
(function () {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    window.location.href = "/login";
  }

  const certListEl = document.getElementById("certList");
  const modal = document.getElementById("widgetModal");
  const modalContent = document.getElementById("modalContent");

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d)) return "-";
  return d.toISOString().split("T")[0];
}

async function loadCertifications() {
  if (!certListEl) return;
  certListEl.innerHTML = "<p>Loading...</p>";
  try {
    const url =
      "https://n8n.e57.dk/webhook/pilot-dashboard/get-certification?token=" +
      encodeURIComponent(token);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    const [data] = await res.json();
    if (!data.success) throw new Error(data.message || "Failed to load");
    const certs = Array.isArray(data.certifications)
      ? data.certifications
      : [];
    const noCerts =
      certs.length === 0 ||
      (certs.length === 1 && Object.keys(certs[0] || {}).length === 0);
    if (noCerts) {
      certListEl.innerHTML = "<p>No certifications added yet.</p>";
      return;
    }
    certListEl.innerHTML = "";
    certs.forEach((c) => {
      const div = document.createElement("div");
      div.className = "cert-item";
      div.dataset.id = c._id;
      div.innerHTML = `
        <strong>${c.name}</strong> <em>(${c.status})</em><br/>
        <small>${formatDate(c.issueDate)} - ${formatDate(c.validUntilDate)}</small>
        <div class="cert-actions">
          <button class="edit-cert-btn" title="Edit">✏️</button>
        </div>`;
      certListEl.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    certListEl.innerHTML = "<p style='color:red;'>Could not load certifications.</p>";
  }
}

function showCertForm(opts = {}) {
  const isEdit = !!opts._id;
  const revoked = opts.status === "revoked";
  const expires = !!opts.validUntilDate;
  modalContent.innerHTML = `
    <form id="certForm" class="edit-form">
      <div class="widget-buttons">
        ${
          isEdit
            ? '<button type="button" id="deleteCertBtn" class="delete-btn" title="Delete">🗑 Delete</button>'
            : ''
        }
      </div>
      <h2 style="text-align:center;">${isEdit ? "Edit" : "Add"} Certification</h2>
      ${isEdit ? `<input type="hidden" id="certId" value="${opts._id}">` : ""}
      <label>Name
        <input type="text" id="certName" value="${opts.name || ""}" required>
      </label>
      <label><input type="checkbox" id="certRevoked" ${revoked ? "checked" : ""}> Revoked</label>
      <label>Issue Date
        <input type="date" id="certIssue" value="${formatDate(opts.issueDate) !== "-" ? formatDate(opts.issueDate) : ""}" required>
      </label>
      <label><input type="checkbox" id="certExpires" ${expires ? "checked" : ""}> Expires</label>
      <label id="validUntilWrap" ${expires ? "" : "class='hidden'"}>Valid Until
        <input type="date" id="certValid" value="${formatDate(opts.validUntilDate) !== "-" ? formatDate(opts.validUntilDate) : ""}">
      </label>
      <button type="submit">${isEdit ? "Save" : "Add"}</button>
    </form>`;
  modal.style.display = "flex";

  document.getElementById("certExpires")?.addEventListener("change", (e) => {
    const wrap = document.getElementById("validUntilWrap");
    if (e.target.checked) {
      wrap.classList.remove("hidden");
    } else {
      wrap.classList.add("hidden");
      document.getElementById("certValid").value = "";
    }
  });

  document.getElementById("deleteCertBtn")?.addEventListener("click", () => {
    if (opts._id) deleteCertification(opts._id);
  });

  document.getElementById("certForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      token,
      name: document.getElementById("certName").value.trim(),
      revoked: document.getElementById("certRevoked").checked,
      issueDate: document.getElementById("certIssue").value,
    };
    const expires = document.getElementById("certExpires").checked;
    if (expires) {
      payload.validUntilDate = document.getElementById("certValid").value;
    }
    try {
      let url = "https://n8n.e57.dk/webhook/pilot-dashboard/add-certification";
      if (isEdit) {
        url = "https://n8n.e57.dk/webhook/pilot-dashboard/edit-certification";
        payload.certification_id = opts._id;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      const result = text ? JSON.parse(text) : {};
      if (!res.ok || result.success === false) {
        throw new Error(result.message || "Request failed");
      }
      modal.style.display = "none";
      await loadCertifications();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed");
    }
  });
}

async function deleteCertification(id) {
  if (!confirm("Delete this certification?")) return;
  try {
    const res = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/delete-certification",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, certification_id: id }),
      }
    );
    const text = await res.text();
    const result = text ? JSON.parse(text) : {};
    if (!res.ok || result.success === false) {
      throw new Error(result.message || "Delete failed");
    }
    await loadCertifications();
  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to delete");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addCertBtn")?.addEventListener("click", () => {
    showCertForm();
  });

  certListEl?.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-cert-btn");
    const item = e.target.closest(".cert-item");
    if (!item || !editBtn) return;
    const id = item.dataset.id;
    if (editBtn) {
      const name = item.querySelector("strong")?.textContent || "";
      const status =
        item.querySelector("em")?.textContent.replace(/[()]/g, "") || "";
      const [issue, valid] =
        item.querySelector("small")?.textContent.split(" - ") || ["", ""];
      showCertForm({
        _id: id,
        name,
        status,
        issueDate: issue,
        validUntilDate: valid,
      });
    }
  });
});

  // Immediately load certifications when the script executes
  loadCertifications();
})();
