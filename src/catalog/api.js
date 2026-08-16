export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch(path, options = {}) {
  const csrf = sessionStorage.getItem('sitearvo-admin-csrf');
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem('sitearvo-admin-csrf');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sitearvo-admin-session-expired', { detail: { path } }));
      }
    }
    const message = response.status === 401
      ? (body.message || 'Your admin session expired. Please sign in again.')
      : (body.message || 'The request could not be completed.');
    throw new ApiError(message, response.status, body.errors);
  }
  const data = body.data ?? body;
  if (data?.csrf) sessionStorage.setItem('sitearvo-admin-csrf', data.csrf);
  if (path === '/auth/logout') sessionStorage.removeItem('sitearvo-admin-csrf');
  return data;
}
