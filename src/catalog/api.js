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
  if (!response.ok) throw new ApiError(body.message || 'The request could not be completed.', response.status, body.errors);
  const data = body.data ?? body;
  if (data?.csrf) sessionStorage.setItem('sitearvo-admin-csrf', data.csrf);
  if (path === '/auth/logout') sessionStorage.removeItem('sitearvo-admin-csrf');
  return data;
}
