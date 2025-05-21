// Get elements
const editUserForm = document.getElementById("editUserForm");
const nameInput = document.getElementById("name");
const surnameInput = document.getElementById("surname");
const currentPasswordInput = document.getElementById("currentPassword");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const nameFields = document.getElementById("nameFields");
const passwordFields = document.getElementById("passwordFields");
const showPasswordBtn = document.getElementById("showPasswordBtn");
const showNameBtn = document.getElementById("showNameBtn");
let mode = "name"; // or "password"

const nameError = document.getElementById("nameError");
const surnameError = document.getElementById("surnameError");

const lengthCheck = document.getElementById("lengthCheck");
const caseCheck = document.getElementById("caseCheck");
const numberCheck = document.getElementById("numberCheck");
const specialCheck = document.getElementById("specialCheck");

// Validation Regexes
const nameRegex = /^[A-Za-zÆØÅæøå\s\-]{2,}$/;
const lengthRegex = /.{8,}/;
const caseRegex = /(?=.*[a-z])(?=.*[A-Z])/;
const numberRegex = /(?=.*\d)/;
const specialCharRegex = /(?=.*[@$!%*?&^#])/;

// Prefill current name
async function loadUserInfo() {
  const token = localStorage.getItem("jwtToken");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const res = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!res.ok) throw new Error("Failed to fetch user");

    const [data] = await res.json();
    if (data.success) {
      nameInput.value = data.name || "";
      surnameInput.value = data.surname || "";
    }
  } catch (err) {
    console.error("Error loading user info", err);
  }
}

// Toggle between name and password sections
showPasswordBtn?.addEventListener("click", () => {
  nameFields.style.display = "none";
  passwordFields.style.display = "flex";
  nameInput.disabled = true;
  surnameInput.disabled = true;
  currentPasswordInput.disabled = false;
  passwordInput.disabled = false;
  confirmPasswordInput.disabled = false;
  mode = "password";
});

showNameBtn?.addEventListener("click", () => {
  passwordFields.style.display = "none";
  nameFields.style.display = "flex";
  nameInput.disabled = false;
  surnameInput.disabled = false;
  currentPasswordInput.disabled = true;
  passwordInput.disabled = true;
  confirmPasswordInput.disabled = true;
  mode = "name";
});

// Initialize
loadUserInfo();
showNameBtn?.click(); // ensure correct disabled state

// Update password checklist
function updatePasswordChecklist() {
  const password = passwordInput.value;

  lengthCheck.textContent =
    (lengthRegex.test(password) ? "✅" : "☐") + " At least 8 characters";
  caseCheck.textContent =
    (caseRegex.test(password) ? "✅" : "☐") + " Upper and lowercase letters";
  numberCheck.textContent =
    (numberRegex.test(password) ? "✅" : "☐") + " Contains a number";
  specialCheck.textContent =
    (specialCharRegex.test(password) ? "✅" : "☐") +
    " Contains a special character";
}

// Validate confirm password
function validateConfirmPasswordField() {
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  if (confirmPassword && password !== confirmPassword) {
    confirmPasswordInput.setCustomValidity("Passwords do not match.");
  } else {
    confirmPasswordInput.setCustomValidity("");
  }
}

// Live validate name
nameInput?.addEventListener("input", () => {
  if (!nameRegex.test(nameInput.value)) {
    nameError.textContent = "Please enter a valid first name.";
  } else {
    nameError.textContent = "";
  }
});

// Live validate surname
surnameInput?.addEventListener("input", () => {
  if (!nameRegex.test(surnameInput.value)) {
    surnameError.textContent = "Please enter a valid surname.";
  } else {
    surnameError.textContent = "";
  }
});


// Live validate password and confirm password
passwordInput?.addEventListener("input", () => {
  updatePasswordChecklist();
  validateConfirmPasswordField();
});

confirmPasswordInput?.addEventListener("input", validateConfirmPasswordField);

// Submit form
editUserForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const updates = {};

  if (mode === "name") {
    const name = nameInput.value.trim();
    const surname = surnameInput.value.trim();

    if (!nameRegex.test(name)) {
      alert("Please enter a valid first name.");
      return;
    }

    if (!nameRegex.test(surname)) {
      alert("Please enter a valid surname.");
      return;
    }

    updates.name = name;
    updates.surname = surname;
  } else {
    const currentPassword = currentPasswordInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (
      !(
        lengthRegex.test(password) &&
        caseRegex.test(password) &&
        numberRegex.test(password) &&
        specialCharRegex.test(password)
      )
    ) {
      alert("Password does not meet all requirements.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (!currentPassword) {
      alert("Please enter your current password to set a new one.");
      return;
    }

    updates.currentPassword = currentPassword;
    updates.newPassword = password;
  }

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/update-user",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: localStorage.getItem("jwtToken"),
          updates,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Server returned an error");
    }

    // Redirect back to profile on success
    window.location.href = "/user";
  } catch (err) {
    console.error(err);
    alert("Failed to update profile. Please try again later.");
  }
});
