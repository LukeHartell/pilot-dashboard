// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

// Get elements
const editUserForm = document.getElementById("editUserForm");
const nameInput = document.getElementById("name");
const surnameInput = document.getElementById("surname");
let originalName = "";
let originalSurname = "";
const currentPasswordInput = document.getElementById("currentPassword");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const nameFields = document.getElementById("nameFields");
const passwordFields = document.getElementById("passwordFields");
const showPasswordBtn = document.getElementById("showPasswordFields");
const backToNameBtn = document.getElementById("backToNameFields");

const nameError = document.getElementById("nameError");
const surnameError = document.getElementById("surnameError");

const lengthCheck = document.getElementById("lengthCheck");
const caseCheck = document.getElementById("caseCheck");
const numberCheck = document.getElementById("numberCheck");
const specialCheck = document.getElementById("specialCheck");

// Fetch current user info to pre-fill fields
async function loadUserInfo() {
  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch user info");

    const [data] = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to load user");

    nameInput.value = data.name;
    surnameInput.value = data.surname;
    originalName = data.name;
    originalSurname = data.surname;
  } catch (err) {
    console.error(err);
  }
}

loadUserInfo();

// Toggle sections
showPasswordBtn?.addEventListener("click", () => {
  nameFields.style.display = "none";
  passwordFields.style.display = "block";
});

backToNameBtn?.addEventListener("click", () => {
  passwordFields.style.display = "none";
  nameFields.style.display = "block";
});

// Validation Regexes
const nameRegex = /^[A-Za-zÆØÅæøå\s\-]{2,}$/;
const lengthRegex = /.{8,}/;
const caseRegex = /(?=.*[a-z])(?=.*[A-Z])/;
const numberRegex = /(?=.*\d)/;
const specialCharRegex = /(?=.*[@$!%*?&^#])/;

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

  const name = nameInput.value.trim();
  const surname = surnameInput.value.trim();
  const currentPassword = currentPasswordInput.value;
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  const updates = {};
  if (name !== originalName) updates.name = name;
  if (surname !== originalSurname) updates.surname = surname;

  // Final blocking checks
  if (!nameRegex.test(name)) {
    alert("Please enter a valid first name.");
    return;
  }

  if (!nameRegex.test(surname)) {
    alert("Please enter a valid surname.");
    return;
  }

  const wantsPasswordChange =
    currentPassword || password || confirmPassword ? true : false;

  if (wantsPasswordChange) {
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
  }

  try {
    if (Object.keys(updates).length > 0) {
      const respUser = await fetch(
        "https://n8n.e57.dk/webhook/pilot-dashboard/update-user",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, updates }),
        }
      );

      const userData = await respUser.json();
      if (!respUser.ok || !userData.success) {
        alert(userData.message || "Failed to update profile.");
        return;
      }
    }

    if (wantsPasswordChange) {
      const respPass = await fetch(
        "https://n8n.e57.dk/webhook/pilot-dashboard/update-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, currentPassword, password }),
        }
      );

      const passData = await respPass.json();
      if (!respPass.ok || !passData.success) {
        alert(passData.message || "Failed to update password.");
        return;
      }
    }

    // Redirect back to profile on success
    window.location.href = "/user";
  } catch (err) {
    console.error(err);
    alert("Failed to update profile. Please try again later.");
  }
});
