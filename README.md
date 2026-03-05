# 🏠 Xem Trọ Vui Vẻ — Student Room Rental Platform

> **Live demo:** https://xemtrovuive.online  
> A full-stack web application for Vietnamese students to find, list, and review rental rooms.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Models](#database-models)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [CV / Portfolio Highlights](#cv--portfolio-highlights)

---

## Project Overview

**Xem Trọ Vui Vẻ** is a full-stack marketplace for student housing in Vietnam. Landlords can post room listings with photos, and students can search, filter, favourite, and review rooms — all through a responsive single-page application backed by a RESTful API.

| Layer     | Technology                        | Deployment |
|-----------|-----------------------------------|------------|
| Frontend  | React 18, React Router v7, SCSS   | GitHub Pages / Static CDN |
| Backend   | Node.js, Express 5, REST API      | Render |
| Database  | MongoDB Atlas (Mongoose)          | MongoDB Atlas |
| Storage   | Cloudinary                        | Cloudinary Cloud |

---

## Features

### 🔐 Authentication & User Management
- JWT-based registration and login
- Passwords hashed with **bcryptjs**
- Protected routes on both client and server
- Role-based access control (user / admin)
- Profile editing (name, email, phone)

### 🏘️ Room Listings
- Create, edit, and delete your own listings
- Upload up to **10 images per room** (stored on Cloudinary)
- Rich listing form: price, area, bedrooms, bathrooms, address, city/district, 11 amenity toggles (Wi-Fi, AC, parking, security, kitchen, balcony, …)

### 🔍 Search & Filtering
- Full-text keyword search (title, description, address)
- Filter by city and district
- Price range and area range sliders (rc-slider)
- Amenity checkboxes
- Sort by: price ↑↓, area ↑↓, rating, newest

### ⭐ Reviews & Ratings
- Leave a 1–5 star rating with a text comment
- Room owners can reply to individual reviews
- Room average rating is automatically recalculated on every review change

### ❤️ Favourites / Wishlist
- One-click add/remove any room
- Dedicated "My Favourites" page
- Unique constraint prevents duplicate saves

### 🛠️ Admin Dashboard
- Statistics overview (total users, rooms, reviews)
- User management (view, edit, delete)
- Room management (view list)
- Review moderation (delete inappropriate reviews)

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Express | 5.1.0 | HTTP framework |
| Mongoose | 8.14.2 | MongoDB ODM |
| jsonwebtoken | 9.0.2 | JWT auth |
| bcryptjs | – | Password hashing |
| multer | 2.0.1 | Multipart file handling |
| multer-storage-cloudinary | – | Cloudinary storage engine |
| cloudinary | – | Cloud image management |
| express-async-handler | – | Async error propagation |
| dotenv | – | Environment configuration |
| cors | – | Cross-origin resource sharing |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18 | UI library |
| React Router | v7.6.0 | Client-side routing |
| Axios | 1.9.0 | HTTP client |
| rc-slider | – | Range input sliders |
| react-toastify | – | User notifications |
| react-icons | – | Icon library |
| animate.css | – | CSS animations |
| Sass (SCSS) | – | Styling |

---

## Architecture

```
student-room-rentals/
├── client/                   # React SPA
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── context/          # AuthContext, ThemeContext
│       ├── pages/            # Route-level page components
│       ├── services/         # Axios API service layer
│       └── scss/             # Global & component styles
│
└── server/                   # Express REST API
    ├── config/               # DB & Cloudinary setup
    ├── controllers/          # Business logic
    ├── middleware/            # auth, adminAuth, upload
    ├── models/               # Mongoose schemas
    ├── routes/               # Express routers
    ├── utils/                # generateToken helper
    ├── seed.js               # Database seed script
    └── server.js             # App entry point
```

---

## Database Models

### User
```
name, email, password (hashed), phone, isAdmin, timestamps
```

### Room
```
title, description, price, area, address, city, district,
bedrooms, bathrooms, images[], owner (→ User),
amenities { wifi, ac, washingMachine, fridge, parking,
            security, privateBathroom, kitchen,
            window, balcony, waterHeater },
rating (computed), numReviews (computed), timestamps
```

### Review
```
name, rating (1-5), comment,
user (→ User), room (→ Room),
replies [{ name, comment, user, timestamps }],
timestamps
```

### Favorite
```
user (→ User), room (→ Room)
[unique index on (user, room)]
```

---

## API Endpoints

### Users `/api/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | – | Register |
| POST | `/login` | – | Login |
| GET | `/profile` | 🔒 | Get own profile |
| PUT | `/profile` | 🔒 | Update profile |
| GET | `/favorites` | 🔒 | List favourites |
| POST | `/favorites` | 🔒 | Add favourite |
| DELETE | `/favorites/:roomId` | 🔒 | Remove favourite |
| GET | `/` | 👑 Admin | List all users |
| GET | `/:id` | 👑 Admin | Get user |
| PUT | `/:id` | 👑 Admin | Update user |
| DELETE | `/:id` | 👑 Admin | Delete user |

### Rooms `/api/rooms`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | – | List rooms (filter/sort/search) |
| GET | `/my` | 🔒 | User's own listings |
| GET | `/:id` | – | Room detail |
| POST | `/` | 🔒 | Create listing (multipart) |
| PUT | `/:id` | 🔒 | Update listing (multipart) |
| DELETE | `/:id` | 🔒 | Delete listing |
| POST | `/:id/reviews` | 🔒 | Post review |

### Reviews `/api/reviews`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 👑 Admin | List all reviews |
| DELETE | `/:id` | 👑 Admin | Delete review |
| POST | `/:id/replies` | 🔒 | Reply to review |

### Admin `/api/admin`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | 👑 Admin | Dashboard statistics |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- Cloudinary account

### 1. Clone the repository
```bash
git clone https://github.com/MinhNhut05/student-room-rentals.git
cd student-room-rentals
```

### 2. Install dependencies
```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Configure environment variables
See [Environment Variables](#environment-variables) below.

### 4. Seed the database (optional)
```bash
cd server && node seed.js
```

### 5. Run in development
```bash
# Terminal 1 – Backend (port 5000)
cd server && npm run dev

# Terminal 2 – Frontend (port 3000)
cd client && npm start
```

---

## Environment Variables

Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/student-rooms
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000
```

---

## CV / Portfolio Highlights

> Copy the bullet-points below directly into your résumé or LinkedIn profile.

### Project Name
**Student Room Rental Platform** *(Xem Trọ Vui Vẻ)* — [xemtrovuive.online](https://xemtrovuive.online)

### One-line description
> Designed and built a full-stack room-rental marketplace for Vietnamese students, handling authentication, image uploads, real-time search/filtering, reviews, and an admin dashboard — deployed end-to-end.

### Technical bullet-points
- **Architected a full-stack web application** using the MERN stack (MongoDB, Express 5, React 18, Node.js), following a clean MVC pattern with a service-layer abstraction on the frontend.
- **Designed and implemented a RESTful API** with 20+ endpoints covering CRUD operations for rooms, users, reviews, and favourites, protected by JWT middleware and role-based access control.
- **Implemented JWT authentication** end-to-end: registration, login, token generation, protected-route middleware on the server, and a global `AuthContext` on the client that persists sessions via `localStorage`.
- **Integrated Cloudinary image hosting** with Multer, supporting multi-image upload (up to 10 per listing), file-type validation (jpg/png/gif/webp), and automatic image transformation.
- **Built an advanced search & filter system** with keyword full-text search, city/district dropdowns, dual price and area range sliders (rc-slider), amenity checkboxes, and multi-field sorting — all resolved server-side with dynamic Mongoose queries.
- **Developed a nested Reviews & Replies feature** with 1–5 star ratings, automatic average rating recalculation on every create/delete, and threaded owner replies.
- **Created an Admin Dashboard** with statistics widgets and management tables for users, listings, and reviews, secured by a separate admin-auth middleware layer.
- **Deployed the application to production**: backend on Render, database on MongoDB Atlas, static assets on Cloudinary, with proper CORS whitelisting and environment-variable configuration.
- **Styled a responsive SPA** with SCSS, CSS animations (animate.css), and React Icons; used react-toastify for user-facing notifications.

### Skills demonstrated
`React` · `React Router v7` · `Context API` · `Node.js` · `Express.js` · `MongoDB` · `Mongoose` · `REST API design` · `JWT` · `bcryptjs` · `Cloudinary` · `Multer` · `Axios` · `SCSS/Sass` · `Responsive Design` · `Role-based access control` · `Full-stack deployment`
