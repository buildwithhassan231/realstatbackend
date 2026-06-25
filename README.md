# 🏠 RealState API — Backend

Hey! Welcome to the backend of this Real Estate Listing Platform. This is a fully working REST API built with Node.js and Express, connected to MongoDB Atlas, with image uploads going to Cloudinary. If you're reading this, you're probably trying to understand how everything works — so let me walk you through it properly.

---

## What does this project actually do?

Think of it like a mini version of Zameen.com or Bayut. Agents can post properties, buyers can browse and save their favorites, send inquiries to agents, and an admin sits on top managing everything. The whole backend is built and ready — you just need to connect a frontend to it.

---

## Tech used

| What | Why |
|------|-----|
| Node.js + Express | The core server and routing |
| MongoDB + Mongoose | Database and schema management |
| JWT (jsonwebtoken) | Login sessions / authentication |
| bcrypt | Hashing passwords securely |
| Cloudinary + Multer | Storing property and profile images in the cloud |
| cookie-parser | Reading HTTP-only cookies for auth |
| dotenv | Managing environment variables |
| nodemailer | Email sending (set up, ready to use) |

---

## Getting started

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Create your `.env` file

```env
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster.mongodb.net/realstate
PORT=3000
JWT_SECRET=some_long_random_secret_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

> For Gmail, you need an **App Password** — not your real Gmail password. Go to Google Account → Security → 2-Step Verification → App Passwords.

### 3. Create the first admin account

Run this once to seed an admin user into the database:

```bash
node utils/createAdmin.js
```

This creates:
- Email: `admin@realstate.com`
- Password: `Admin@123`

After that, log in as admin and you're in full control.

### 4. Start the server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## Project structure

```
server/
├── config/
│   ├── db.js               → MongoDB connection
│   └── cloudnary.js        → Cloudinary setup
│
├── controllers/
│   ├── authController.js   → Register, Login, Logout
│   ├── propertyController.js → All property logic + admin actions
│   ├── adminController.js  → User management, stats, categories
│   ├── inquiryController.js → Sending and managing inquiries
│   ├── favoriteController.js → Save/unsave properties
│   └── userController.js   → Agent profile + public listings
│
├── middleware/
│   ├── authMiddleware.js   → Verifies JWT from header or cookie
│   ├── roleMiddleware.js   → Checks user role (admin, agent, etc.)
│   ├── uploadMiddleware.js → Multer config for image uploads
│   └── errorMiddleware.js  → Centralized error handling + 404
│
├── models/
│   ├── register.js         → User schema
│   ├── Property.js         → Property schema
│   ├── Inquiry.js          → Inquiry schema
│   └── Category.js         → Category schema
│
├── routes/
│   ├── authRoutes.js
│   ├── propertyRoutes.js
│   ├── adminRoutes.js
│   ├── inquiryRoutes.js
│   ├── favoriteRoutes.js
│   └── userRoutes.js
│
├── utils/
│   ├── generateToken.js    → JWT token creation helper
│   ├── apiFeatures.js      → Reusable filter/sort/pagination class
│   └── createAdmin.js      → One-time admin seed script
│
├── .env
├── server.js               → App entry point
└── RealState_API.postman_collection.json
```

---

## User roles explained

There are 3 types of users in this system:

**Buyer** — the default role when someone registers. They can browse properties, save favorites, and send inquiries.

**Agent** — can do everything a Buyer can, plus post properties, manage their own listings, and see inquiries they've received. Buyers can be promoted to Agent by an Admin.

**Admin** — full control. Approves/rejects listings, manages all users, views platform stats, manages categories. Admin accounts are created directly via the seed script or by manually updating the role in MongoDB Atlas.

> Important: You cannot set role to "admin" during registration. This is intentional to prevent privilege escalation.

---

## Complete API reference

Base URL: `http://localhost:3000/api`

All protected routes need this header:
```
Authorization: Bearer <your_token>
```

---

### 🔐 Authentication — `/api/auth`

| Method | Endpoint | Who can use | What it does |
|--------|----------|-------------|-------------|
| POST | `/auth/register` | Anyone | Create a new account |
| POST | `/auth/login` | Anyone | Login and get JWT token |
| GET | `/auth/me` | Logged in | Get your own profile |
| POST | `/auth/logout` | Logged in | Logout and clear cookie |

**Register body:**
```json
{
  "name": "Hassan Ali",
  "email": "hassan@gmail.com",
  "password": "123456",
  "phoneNumber": 3001234567
}
```

**Login body:**
```json
{
  "email": "hassan@gmail.com",
  "password": "123456"
}
```

On login, the JWT is sent both in the response body (for Postman/mobile apps) and set as an HTTP-only cookie (for browsers). The cookie approach is more secure because JavaScript can't access it.

---

### 🏠 Properties — `/api/properties`

| Method | Endpoint | Who can use | What it does |
|--------|----------|-------------|-------------|
| GET | `/properties` | Anyone | Browse all approved properties |
| GET | `/properties/featured` | Anyone | Get featured listings (for homepage) |
| GET | `/properties/:id` | Anyone | View a single property (also increments view count) |
| GET | `/properties/user/my-properties` | Logged in | See your own listings |
| GET | `/properties/agent/dashboard` | Logged in | Agent stats: views, inquiries, property breakdown |
| POST | `/properties` | Logged in | Post a new property listing |
| PUT | `/properties/:id` | Owner or Admin | Edit a property |
| DELETE | `/properties/:id` | Owner or Admin | Delete a property |
| GET | `/properties/admin/pending` | Admin only | See all listings waiting for approval |
| PATCH | `/properties/admin/:id/approve` | Admin only | Approve a listing |
| PATCH | `/properties/admin/:id/reject` | Admin only | Reject with a reason |
| PATCH | `/properties/admin/:id/featured` | Admin only | Toggle featured on/off |

**Create property — send as `form-data` (not JSON, because of images):**

| Field | Required | Example |
|-------|----------|---------|
| title | ✅ | Dream Villa Lahore |
| description | ✅ | Spacious 3 bed villa |
| price | ✅ | 15000000 |
| propertyType | ✅ | Villa / House / Apartment / Plot / Commercial / Other |
| listingType | ✅ | Sale / Rent |
| bedrooms | ✅ | 3 |
| bathrooms | ✅ | 2 |
| area | ✅ | 2000 (sq ft) |
| address | ✅ | 12 Garden Town |
| city | ✅ | Lahore |
| country | ✅ | Pakistan |
| lat | ❌ | 31.5204 |
| lng | ❌ | 74.3587 |
| parking | ❌ | true / false |
| pool | ❌ | true / false |
| gym | ❌ | true / false |
| garden | ❌ | true / false |
| security | ❌ | true / false |
| elevator | ❌ | true / false |
| status | ❌ | Available / Sold / Rented |
| images | ✅ | Up to 10 image files, max 10MB each |

**Search and filter (query params):**

```
/api/properties?keyword=villa&city=Lahore&propertyType=Villa&listingType=Sale&minPrice=5000000&maxPrice=30000000&bedrooms=3&bathrooms=2&minArea=1000&maxArea=5000&sort=price_asc&page=1&limit=10
```

Sort options: `newest` (default), `oldest`, `price_asc`, `price_desc`, `most_viewed`

**Reject a property body:**
```json
{
  "reason": "Images are not clear"
}
```

**How property approval works:**
When a property is created, it gets `approvalStatus: "pending"` and won't show up in public search results. An admin reviews it and either approves (it goes live) or rejects it with a reason. This keeps the platform clean.

---

### 📩 Inquiries — `/api/inquiries`

| Method | Endpoint | Who can use | What it does |
|--------|----------|-------------|-------------|
| POST | `/inquiries/:propertyId` | Logged in | Send an inquiry on a property |
| GET | `/inquiries/sent/me` | Logged in | See all inquiries you've sent |
| GET | `/inquiries/received/my-listings` | Logged in | Agent sees all inquiries on their properties |
| PATCH | `/inquiries/:id/read` | Property owner | Mark an inquiry as read |

**Send inquiry body:**
```json
{
  "message": "Is this property still available?",
  "buyerPhone": "03001234567"
}
```

Your name and email are auto-filled from your account. You can optionally override `buyerPhone`. Owners cannot send inquiries on their own properties — that would be a bit weird.

**Filter received inquiries:**
```
/api/inquiries/received/my-listings?status=unread&page=1&limit=10
```

---

### ❤️ Favorites — `/api/favorites`

| Method | Endpoint | Who can use | What it does |
|--------|----------|-------------|-------------|
| POST | `/favorites/:propertyId` | Logged in | Add or remove from favorites (toggle) |
| GET | `/favorites` | Logged in | Get all your saved properties |
| GET | `/favorites/:propertyId/check` | Logged in | Check if a property is in your favorites |

The toggle is smart — hit it once to save, hit it again to unsave. Your favorites are stored in the database against your user account, not in the browser.

---

### 👤 User & Agent Profile — `/api/users`

| Method | Endpoint | Who can use | What it does |
|--------|----------|-------------|-------------|
| GET | `/users/agent/:agentId` | Anyone | View an agent's public profile + their listings |
| GET | `/users/agent/:agentId/properties` | Anyone | Browse all approved listings by a specific agent |
| PUT | `/users/profile` | Logged in | Update your own profile |

**Update profile — send as `form-data`:**

| Field | What it updates |
|-------|----------------|
| name | Your display name |
| phoneNumber | Contact number |
| bio | Short description (shown on agent profile) |
| agencyName | Agency or company name |
| profileImage | Upload a new profile photo |

---

### 🛡️ Admin — `/api/admin`

All admin routes need an admin token.

**Stats:**

| Method | Endpoint | What it returns |
|--------|----------|----------------|
| GET | `/admin/stats` | Total users, properties, inquiries, breakdowns |

Stats response looks like:
```json
{
  "users": { "total": 50, "agents": 10, "buyers": 39, "blocked": 1 },
  "properties": { "total": 100, "pending": 5, "approved": 90, "rejected": 5, "featured": 8 },
  "inquiries": { "total": 200 }
}
```

**User management:**

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/admin/users` | List all users with pagination |
| GET | `/admin/users/:id` | View a specific user |
| PATCH | `/admin/users/:id/block` | Block or unblock (toggle) |
| PATCH | `/admin/users/:id/promote` | Promote a Buyer to Agent |
| DELETE | `/admin/users/:id` | Permanently delete a user |

Filter users: `/api/admin/users?role=agent&isBlocked=false&page=1&limit=10`

**Category management:**

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/admin/categories` | All categories |
| POST | `/admin/categories` | Create a new category |
| PUT | `/admin/categories/:id` | Update a category |
| DELETE | `/admin/categories/:id` | Delete a category |

Create category body:
```json
{
  "name": "Villa",
  "description": "Luxury standalone villas"
}
```

---

### 🗂️ Categories (Public) — `/api/categories`

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/categories` | Get all active categories (for frontend dropdowns) |

---

## How the error handling works

Every unmatched route returns a clean 404 response instead of an ugly server crash. All errors — whether it's a bad MongoDB ID, a duplicate email, an expired JWT, or a Multer file size error — are caught by the centralized `errorMiddleware.js` and returned in a consistent format:

```json
{
  "success": false,
  "message": "What went wrong, explained clearly"
}
```

No raw stack traces going to the client in production.

---

## How image uploads work

1. You send a `form-data` request with image files
2. Multer picks them up and holds them in memory (max 10MB per file, max 10 files)
3. Each file gets streamed directly to Cloudinary
4. Cloudinary returns a permanent public URL
5. That URL gets saved in MongoDB

When a property is deleted, all its Cloudinary images are deleted too — no orphaned files left behind.

---

## Environment variables

| Variable | What it's for |
|----------|--------------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `PORT` | Port to run the server on (default 3000) |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `EMAIL_USER` | Gmail address for sending emails |
| `EMAIL_PASS` | Gmail App Password (16-character code from Google) |

---

## Packages used

| Package | What it does |
|---------|-------------|
| express | Web server framework |
| mongoose | MongoDB object modeling |
| bcrypt | Password hashing |
| jsonwebtoken | Creating and verifying JWT tokens |
| cloudinary | Cloud image storage |
| multer | Handling file uploads |
| cookie-parser | Reading cookies from requests |
| dotenv | Loading environment variables |
| nodemailer | Sending emails |
| nodemon | Auto-restarts server on file changes (dev only) |

---

## Postman collection

Import `RealState_API.postman_collection.json` into Postman to get all 30+ endpoints ready to test with example data.

After importing, set these collection variables:

| Variable | Where to get it |
|----------|----------------|
| `token` | Login as buyer → copy the `token` from response |
| `agent_token` | Login as agent → copy the `token` |
| `admin_token` | Login as admin → copy the `token` |
| `property_id` | After creating a property → copy `_id` |
| `agent_id` | From login response or Get Users → copy `_id` |
| `inquiry_id` | After sending an inquiry → copy `_id` |
| `category_id` | After creating a category → copy `_id` |

**Recommended test order:**
1. Admin Login
2. Agent Register → Agent Login
3. Buyer Register → Buyer Login
4. Create Property (as agent)
5. Approve Property (as admin)
6. Send Inquiry (as buyer)
7. View inquiries, favorites, dashboard — everything should work

---

## Built by

**Hassan** — MERN Stack Developer

> This is a portfolio project demonstrating full-stack development with MongoDB, Express, Node.js, complete auth flows, image uploads, role-based access, and production-ready API design.
