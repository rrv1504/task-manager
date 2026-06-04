const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getStoredAuth = () => {
  const raw = localStorage.getItem("task_manager_auth");
  if (!raw) {
    return null;
  }

  try {
    const auth = JSON.parse(raw);
    return auth?.token && auth?.user ? auth : null;
  } catch (error) {
    localStorage.removeItem("task_manager_auth");
    return null;
  }
};

export const storeAuth = (auth) => {
  localStorage.setItem("task_manager_auth", JSON.stringify(auth));
};

export const clearAuth = () => {
  localStorage.removeItem("task_manager_auth");
};

export const request = async (path, options = {}) => {
  const auth = getStoredAuth();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};
