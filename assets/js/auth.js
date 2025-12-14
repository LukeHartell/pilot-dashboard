const ACCESS_TOKEN_KEY = "jwtToken";
const LOGIN_PATH = "/login";
const REFRESH_URL = "https://n8n.e57.dk/webhook/pilot-dashboard/refresh";
let sessionNotified = false;

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function redirectToLogin() {
  window.location.href = LOGIN_PATH;
}

function notifySessionExpired() {
  if (!sessionNotified) {
    alert("Your session expired. Please log in again.");
    sessionNotified = true;
  }
}

async function refreshAccessToken() {
  try {
    const res = await fetch(REFRESH_URL, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) throw new Error("Refresh failed");
    const data = await res.json();
    if (!data.token) throw new Error("No access token returned");

    setAccessToken(data.token);
    return data.token;
  } catch (err) {
    clearAccessToken();
    notifySessionExpired();
    redirectToLogin();
    throw err;
  }
}

function buildAuthRequest(url, options, token) {
  const method = (options.method || "POST").toUpperCase();
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  const canSendBody = method !== "GET" && method !== "HEAD";

  let finalUrl = url;
  let finalBody;

  if (canSendBody) {
    if (isFormData) {
      finalBody = options.body;
    } else {
      const baseBody =
        options.body && typeof options.body === "object"
          ? { ...options.body }
          : {};

      if (token) baseBody.token = token;

      if (Object.keys(baseBody).length > 0) {
        headers["Content-Type"] =
          headers["Content-Type"] || "application/json";
        finalBody = JSON.stringify(baseBody);
      }
    }
  } else if (token) {
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  return {
    url: finalUrl,
    init: {
      ...options,
      method,
      headers,
      body: finalBody,
    },
  };
}

async function authFetch(url, options = {}) {
  const includeToken = options.includeToken !== false;
  const retryOnAuth = options.retryOnAuth !== false;

  const attempt = async () => {
    const token = includeToken ? getAccessToken() : null;

    if (includeToken && !token) {
      clearAccessToken();
      redirectToLogin();
      throw new Error("No access token available");
    }

    const { url: finalUrl, init } = buildAuthRequest(url, options, token);
    return fetch(finalUrl, init);
  };

  let response = await attempt();

  if (response.status === 401 && retryOnAuth) {
    try {
      await refreshAccessToken();
      response = await attempt();
    } catch (err) {
      return Promise.reject(err);
    }

    if (response.status === 401) {
      clearAccessToken();
      notifySessionExpired();
      redirectToLogin();
    }
  }

  return response;
}
