function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function updateUserMenu() {
  const token = getAccessToken();
  const userMenuLink = document.getElementById("userMenuLink");

  if (!userMenuLink) return;

  if (token) {
    const payload = parseJwt(token);
    if (payload && payload.name) {
      userMenuLink.textContent = payload.name; // 👈 Show first name
      userMenuLink.href = "/user"; // 👈 Go to user page
    } else {
      userMenuLink.textContent = "Login";
      userMenuLink.href = "/login";
    }
  } else {
    userMenuLink.textContent = "Login";
    userMenuLink.href = "/login";
  }
}

document.addEventListener("DOMContentLoaded", updateUserMenu);
