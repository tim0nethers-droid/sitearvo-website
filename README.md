# SiteArvo Website + Node.js Service Store

SiteArvo is a React + Vite website with a Node.js backend, JSON-backed storage, a fixed-price service catalog, live chat, checkout flow, visitor analytics, and a protected admin panel.

## What runs where

- Frontend: React + Vite
- Backend: `server.mjs`
- Development API port: `5176`
- Persistent data: `server-data/sitearvo-store.json`
- Uploaded images: `server-data/uploads/`

The frontend talks to the backend through `/api/...`, so the same app works in local development and after deployment.

## Business configuration

Official public details stay centralized in `src/config/company.js`:

- Website: `https://sitearvo.site`
- Email: `info@sitearvo.site`
- Phone: `+91 7987591456`
- WhatsApp: `917987591456`

The logo is `public/sitearvo-logo.png`. Portfolio concepts remain editable in `src/data/portfolio.js`.

## Development

1. Run `npm install`.
2. Run `npm run dev`.
3. Open the local URL shown in the terminal.

`npm run dev` starts:

- the Node API server on `http://127.0.0.1:5176`
- the Vite frontend with API proxying enabled

## Production

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm start` to serve the built app with the Node backend.

`npm run build` creates `dist/` and prepares the static frontend output.

## Backend features

The Node backend provides:

- public catalog and service data
- checkout/order creation
- visitor pageview tracking
- live chat start, message and admin reply endpoints
- admin login, session handling and CSRF protection
- dashboard metrics, categories, services, add-ons, orders and settings APIs
- image uploads for catalog content

The backend stores data in JSON files so the project stays lightweight and easy to run without a database server.

## Admin access

The local admin account is:

- Email: `info@sitearvo.site`
- Password: `Sunil@#199000`

For a real deployment, set `SITEARVO_ADMIN_EMAIL` and `SITEARVO_ADMIN_PASSWORD` in the environment before starting the server if you want different credentials.

## Visitor analytics

The admin dashboard includes a first-party Visitor Analytics panel that shows:

- pageviews
- unique visitors
- daily trends
- top pages
- top referrers

Analytics data is stored locally by the Node backend.

## Live chat

Visitors can open Live Chat from any public page without creating an account. Conversations and messages are stored in the local JSON store, while the visitor keeps only a random conversation token in browser storage. Admin users can read, reply, close and reopen conversations from Admin → Live Chats.

## Deployment on Hostinger

This project is ready to deploy as a static React build plus a Node.js backend.

If you are hosting the frontend only:

1. Run `npm install`.
2. Run `npm run build`.
3. Upload the contents of `dist/` to `public_html`.
4. Upload the `.htaccess` file so React Router refreshes work.

If you are running the Node backend on your own server or VPS:

1. Run `npm install`.
2. Run `npm run build`.
3. Start the app with `npm start`.
4. Point your reverse proxy or hosting service to the Node process.

For shared hosting environments that only serve static files, keep the frontend in `dist/` and use the static deployment flow.

## Notes

- The project keeps SEO helpers, sitemap generation and route-specific prebuilt pages.
- The backend is JavaScript only; no PHP runtime is required for the active Node setup.
- Legacy PHP assets may still exist in the repository, but the Node server is the current active backend.
