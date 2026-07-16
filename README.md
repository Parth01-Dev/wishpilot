# WishPilot

Production-ready Shopify embedded wishlist app for merchants and customers.

## Features

- **Admin dashboard** — totals, top product, low stock, growth, recently added
- **Wishlist management** — search, pagination, remove, view product
- **Customers** — wishlist counts, detail view, bulk remove
- **Analytics** — Chart.js growth, top products, active customers
- **Settings** — enable wishlist, guests, button style, colors
- **Theme App Extension** — Add to Wishlist block, header icon, wishlist page
- **App Proxy APIs** — storefront add / remove / list

## Tech stack

React Router · Polaris web components · App Bridge · Prisma · PostgreSQL · Admin GraphQL · Theme App Extension

## Setup

1. Copy `.env` / configure `DATABASE_URL` (PostgreSQL) and Shopify credentials.
2. Install and migrate:

```bash
npm install
npx prisma migrate deploy
npx prisma generate
```

3. Start the app:

```bash
npm run dev
```

4. In the theme editor:
   - Add **Add to Wishlist** on the product template
   - Add **Wishlist Icon** to the header
   - Create a page and add **Wishlist Page**

## API routes

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/wishlist/add` | Admin or App Proxy |
| POST | `/api/wishlist/remove` | Admin or App Proxy |
| GET | `/api/wishlist` | Admin or App Proxy |
| GET | `/api/wishlist/settings` | Admin or App Proxy |
| GET | `/api/dashboard` | Admin |
| GET | `/api/analytics` | Admin |
| GET | `/api/customer/:id` | Admin |

Storefront proxy base: `/apps/wish-pilot`

## Future architecture

Scaffolded under Settings → Coming soon: shared lists, email wishlist, reminders, back-in-stock, price drops, multiple lists, collections, recently viewed, AI recommendations.
