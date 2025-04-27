// Get elements
const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("name");
const surnameInput = document.getElementById("surname");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const nameError = document.getElementById("nameError");
const surnameError = document.getElementById("surnameError");
const emailError = document.getElementById("emailError");

const lengthCheck = document.getElementById("lengthCheck");
const caseCheck = document.getElementById("caseCheck");
const numberCheck = document.getElementById("numberCheck");
const specialCheck = document.getElementById("specialCheck");

// Validation Regexes
const nameRegex = /^[A-Za-zÆØÅæøå\s\-]{2,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

// Live validate email
emailInput?.addEventListener("input", () => {
  if (!emailRegex.test(emailInput.value)) {
    emailError.textContent = "Please enter a valid email address.";
  } else {
    emailError.textContent = "";
  }
});

// Live validate password and confirm password
passwordInput?.addEventListener("input", () => {
  updatePasswordChecklist();
  validateConfirmPasswordField();
});

confirmPasswordInput?.addEventListener("input", validateConfirmPasswordField);

// Submit form
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const surname = surnameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // Final blocking checks
  if (!nameRegex.test(name)) {
    alert("Please enter a valid first name.");
    return;
  }

  if (!nameRegex.test(surname)) {
    alert("Please enter a valid surname.");
    return;
  }

  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

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

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/sign-up",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          surname,
          email,
          password,
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Server returned an error");
    }

    // alert("Account created successfully! Redirecting to login...");
    window.location.href = "/login";
  } catch (err) {
    console.error(err);
    alert("Failed to create account. Please try again later.");
  }
});
