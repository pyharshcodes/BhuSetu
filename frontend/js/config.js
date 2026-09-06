// The backend now serves this frontend directly (see backend/app.py), so
// the API lives on the same origin the page was loaded from — no manual
// port editing needed. Only override this if you deliberately run the
// frontend and backend as two separate servers.
window.__CONFIG__ = {
  API_BASE:
    window.location.protocol === "http:" || window.location.protocol === "https:"
      ? window.location.origin
      : "http://localhost:8000",
};
