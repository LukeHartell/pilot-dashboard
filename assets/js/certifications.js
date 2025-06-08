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

function determineStatus(cert) {
  const now = new Date();
  const issue = cert.issueDate ? new Date(cert.issueDate) : null;
  const valid = cert.validUntilDate ? new Date(cert.validUntilDate) : null;

  if (cert.revoked) return "revoked";
  if (issue && issue > now) return "pending";
  if (valid && valid < now) return "expired";

  let status = "active";
  if (valid) {
    const soon = new Date(now);
    soon.setMonth(soon.getMonth() + 1);
    if (valid <= soon && valid > now) {
      status += ", expires soon";
    }
  }
  return status;
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
      div.dataset.name = c.name || "";
      div.dataset.revoked = !!c.revoked;
      div.dataset.issueDate = c.issueDate || "";
      div.dataset.validUntilDate = c.validUntilDate || "";

      const status = determineStatus(c);
      const base = status.split(",")[0].trim();
      let cls = base;
      if (status.includes("expires soon")) {
        cls += " expires-soon";
      }

      div.innerHTML = `
        <strong>${c.name}</strong> <em class="cert-status ${cls}">(${status})</em><br/>
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
  const revoked = !!opts.revoked;
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
      <label class="checkbox-field"><input type="checkbox" id="certRevoked" ${revoked ? "checked" : ""}> Revoked</label>
      <label>Issue Date
        <input type="date" id="certIssue" value="${formatDate(opts.issueDate) !== "-" ? formatDate(opts.issueDate) : ""}" required>
      </label>
      <label class="checkbox-field"><input type="checkbox" id="certExpires" ${expires ? "checked" : ""}> Expires</label>
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
    const updates = {
      name: document.getElementById("certName").value.trim(),
      revoked: document.getElementById("certRevoked").checked,
      issueDate: document.getElementById("certIssue").value,
    };
    const expires = document.getElementById("certExpires").checked;
    if (expires) {
      updates.validUntilDate = document.getElementById("certValid").value;
    } else if (isEdit) {
      updates.validUntilDate = null;
    }
    try {
      let url;
      let body;
      if (isEdit) {
        url = "https://n8n.e57.dk/webhook/pilot-dashboard/update-certification";
        body = JSON.stringify({ token, certification_id: opts._id, updates });
      } else {
        url = "https://n8n.e57.dk/webhook/pilot-dashboard/add-certification";
        const payload = { token, ...updates };
        if (!expires) delete payload.validUntilDate;
        body = JSON.stringify(payload);
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
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
    showCertForm({
      _id: item.dataset.id,
      name: item.dataset.name,
      revoked: item.dataset.revoked === "true",
      issueDate: item.dataset.issueDate,
      validUntilDate: item.dataset.validUntilDate,
    });
  });
});

  // Immediately load certifications when the script executes
  loadCertifications();
})();
