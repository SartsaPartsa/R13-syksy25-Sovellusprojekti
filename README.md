
# Movie Application Project

## About The Project

This project was developed as part of the "Web Development Application Project" course at Oulu University of Applied Sciences (OAMK). It's a modern web application that combines movie browsing, social features, and real-time theater information in a responsive, bilingual interface.

### Project Team

| Name | GitHub |
|:---|:---|
| <img src="https://github.com/SartsaPartsa.png" width="30" height="30"> Sara Vehviläinen | [SartsaPartsa](https://github.com/SartsaPartsa) |
| <img src="https://github.com/t2koan07.png" width="30" height="30"> Andreas Kotala | [t2koan07](https://github.com/t2koan07) |
| <img src="https://github.com/c3komi01.png" width="30" height="30"> Mihail Konstantinov | [c3komi01](https://github.com/c3komi01) |
| <img src="https://github.com/Janikaho.png" width="30" height="30"> Janika Ahonen | [Janikaho](https://github.com/Janikaho) |


### Project Overview

The application enables users to discover movies, create watchlists, form movie groups, and share their favorites with others. Key highlights include:
- Full-stack implementation with React and Node.js
- Integration with TMDB API for movie data
- Responsive design for all device sizes
- Bilingual support (Finnish/English)
- Real-time theater information

### Learning Context

This project demonstrates practical implementation of:
- Modern React development practices
- RESTful API design and implementation
- Database design and management
- User authentication and authorization
- Responsive UI/UX design
- Internationalization (i18n)

## Key Features

### User Management
- Secure user registration and authentication
- Protected routes for authenticated users
- Profile management and password reset
- Session handling with JWT

### Movie Experience
- Comprehensive movie browsing interface
- Advanced search with multiple criteria
- Detailed movie information from TMDB
- Local theater showtimes and information

### Social Features
- Personal movie favorites list
- Group creation and management
- Shared movie collections
- Movie reviews and ratings
- Social sharing capabilities

## Technical Implementation

### Technology Stack

#### Frontend
- React 19 with Vite 7 for modern build tooling
- Tailwind CSS 4 for responsive design
- React Router 7 for client-side routing
- i18next for Finnish/English language support
- React Toastify for user notifications

#### Backend
- Node.js with Express 5 framework
- PostgreSQL for data persistence
- JWT and Bcrypt for authentication
- CORS for API security
- TMDB API v3 integration for movie data
  - Documentation: https://developers.themoviedb.org/3/
  - Endpoints used: /movie, /search, /configuration

#### Development Environment
- ESLint for code quality
- Nodemon for auto-reloading
- PostCSS for CSS processing
- Git for version control

## Getting Started

### System Requirements
- Node.js v18 or higher
- PostgreSQL v14 or higher
- npm (included with Node.js)
- TMDB API key

### Quick Start Guide

1. **Clone and Setup**
```bash
# Clone repository
git clone https://github.com/SartsaPartsa/R13-syksy25-Sovellusprojekti.git
cd R13-syksy25-Sovellusprojekti

# Install dependencies
npm install              # Frontend dependencies
cd backend && npm install  # Backend dependencies
```

2. **Environment Configuration**
- Create `.env` files in both root and backend directories
- Use `.env.example` as templates
- Required variables:
  ```
  # Frontend (.env)
  VITE_API_URL=http://localhost:3001
  VITE_TMDB_API_KEY=your_tmdb_key

  # Backend (.env)
  PORT=3001
  DB_CONNECTION=postgresql://user:pass@localhost:5432/moviedb
  JWT_SECRET=your_secret_key
  ```

3. **Database Setup**
```bash
# Create and populate database
psql -U your_username -d your_database -f backend/movieApp.sql
```

### Database Architecture

The application uses PostgreSQL with the following structure:

#### Core Tables
- **Users**
  - Authentication credentials
  - Profile information
  - Session management

- **Movies**
  - Cached TMDB data
  - Local theater information
  - Custom metadata

#### Feature Tables
- **Favorites**
  - User-movie relationships
  - Timestamp information
  - Sharing settings

- **Groups**
  - Group metadata
  - Member relationships
  - Shared movie lists

- **Reviews**
  - User comments
  - Ratings
  - Movie references

Full database schema and setup available in `backend/movieApp.sql`

## Known Limitations

1. **API Rate Limits**
   - TMDB API has a rate limit of 40 requests per 10 seconds
   - Movie data is cached in database to minimize API calls

2. **Theater Information**
   - Real-time theater schedules available only from Finnkino
   - Limited to Finnkino theaters only

3. **Authentication Features**
   - Password reset functionality not implemented

4. **Browser Compatibility**
   - Basic browser compatibility implemented
   - Not fully optimized for all browsers and versions

## API Reference

### Authentication API
```
POST /api/auth/register
# Register new user
# Body: { username, email, password }

POST /api/auth/login
# Authenticate user
# Body: { email, password }
# Returns: JWT token

POST /api/auth/change-password
# Change user password
# Headers: Authorization: Bearer <token>
# Body: { currentPassword, newPassword }
```

### Movies API
```
GET /api/movies
# List movies with optional filters
# Query: { page, genre, year, sort }

GET /api/movies/:id
# Get detailed movie information
# Returns: Movie details + local theater info

GET /api/movies/search
# Search movies
# Query: { q, type, language }
```

### User Features API
```
# Favorites
GET   /api/favorites         # List user's favorites
POST  /api/favorites        # Add movie to favorites
DELETE /api/favorites/:id   # Remove from favorites

# Groups
GET    /api/groups         # List user's groups
POST   /api/groups         # Create new group
PUT    /api/groups/:id     # Update group info
DELETE /api/groups/:id     # Delete group
```

> **Note:** All protected endpoints require `Authorization: Bearer <token>` header

## Development Guide

### Local Development Setup

1. Start Frontend Development Server
```bash
# In root directory
npm run dev        # Launches Vite dev server
                  # Access at http://localhost:5173
```

2. Start Backend Server
```bash
# In backend directory
npm run devStart   # Launches Express with Nodemon
                  # API available at http://localhost:3001
```

### Testing Environment

The project uses Mocha and Chai for backend testing.

#### Running Tests
```bash
cd backend

# Start test database
NODE_ENV=test npm run devStart

# In another terminal
npm test          # Runs all tests
npm test user     # Run specific test suite
```

#### Test Structure
```
backend/test/
├── auth.login.test.js       # Authentication login tests
├── auth.logout.test.js      # Authentication logout tests
├── auth.signup.test.js      # User signup tests
├── reviews.browse.test.js   # Review browsing tests
├── setup.test.js           # Test environment setup
├── user.deleteUser.test.js # User deletion tests
└── user.getCount.test.js   # User count tests
```

---

## Folders and Key Files

```
├── backend/                  # Backend server implementation
│   ├── controllers/         # API controllers
│   │   ├── favoritesController.js # Favorites handling
│   │   ├── groupController.js     # Group management
│   │   ├── movieController.js     # Movie operations
│   │   ├── reviewController.js    # Review handling
│   │   ├── searchController.js    # Search functionality
│   │   └── userController.js      # User management
│   ├── helper/              # Helper functions and utilities
│   │   ├── auth.js         # Authentication helper functions
│   │   ├── db.js           # Database connection and queries
│   │   ├── test.js         # Test helper functions
│   │   └── tmdbClient.js   # TMDB API client implementation
│   ├── models/             # Database models
│   │   ├── favoritesModel.js  # Favorites data model
│   │   ├── groupModel.js      # Group data model
│   │   ├── reviewModel.js     # Review data model
│   │   └── userModel.js       # User data model
│   ├── routes/             # API route handlers
│   │   ├── favoritesRouter.js # Favorites endpoints
│   │   ├── groupRouter.js     # Group management endpoints
│   │   ├── movieRouter.js     # Movie-related endpoints
│   │   ├── searchRouter.js    # Search functionality
│   │   └── userRouter.js      # User management endpoints
│   ├── test/               # Backend tests
│   │   ├── auth.login.test.js      # Authentication login tests
│   │   ├── auth.logout.test.js     # Authentication logout tests
│   │   ├── auth.signup.test.js     # User signup tests
│   │   ├── reviews.browse.test.js  # Review browsing tests
│   │   ├── setup.test.js           # Test environment setup
│   │   ├── user.deleteUser.test.js # User deletion tests
│   │   └── user.getCount.test.js   # User count tests
│   ├── .env               # Environment variables
│   ├── .env.example       # Environment variables template
│   ├── index.js          # Main backend entry point
│   ├── movieApp.sql      # Database schema
│   └── package.json      # Backend dependencies
│
├── documents/            # Project documentation
│   ├── database_class_diagram.pdf  # Database diagram
│   ├── rest.md                     # REST API documentation
│   └── UI Design/                  # UI design files
│       ├── Elokuva.pdf            # Movie view design
│       ├── Elokuvat.pdf           # Movies list design
│       ├── Etusivu.pdf            # Homepage design
│       ├── Haku.pdf               # Search view design
│       ├── Info.md                # Design information
│       ├── Kirjautuminen.pdf      # Login view design
│       ├── Omat tiedot.pdf        # Profile view design
│       ├── Rekiteröityminen.pdf   # Registration design
│       ├── Ryhmä näkymä-1.pdf     # Group view 1 design
│       ├── Ryhmä näkymä.pdf       # Group view 2 design
│       ├── Ryhmät.pdf             # Groups list design
│       ├── Suosikit.pdf           # Favorites design
│       ├── Teatterit.pdf          # Theaters design
│       ├── Valikko - Kirjautumatta.pdf      # Menu (logged out)
│       └── Valikko - Kirjautumisen jälkeen.pdf  # Menu (logged in)
│
├── src/                    # Frontend source code
│   ├── assets/            # Static assets
│   │   └── images/        # Image assets
│   │       └── oamk.png   # OAMK logo
│   │
│   ├── components/        # Reusable React components
│   │   ├── FancySelect.jsx     # Custom select component
│   │   ├── FavoriteButton.jsx  # Favorite toggle button
│   │   ├── Footer.jsx          # App footer component
│   │   ├── Navbar.jsx          # Navigation bar
│   │   └── ProtectedRoute.jsx  # Route protection wrapper
│   │
│   ├── context/           # React context providers
│   │   ├── UserContext.js      # User context definition
│   │   ├── UserProvider.jsx    # User context provider
│   │   └── useUser.js         # User context hook
│   │
│   ├── layouts/           # Layout components
│   │   └── AppLayout.jsx       # Main application layout
│   │
│   ├── lib/              # Utility libraries
│   │   ├── api.js            # Base API configuration
│   │   └── api/             # API endpoint implementations
│   │       ├── movies.js    # Movie API calls
│   │       └── search.js    # Search API calls
│   │
│   ├── pages/            # Application pages
│   │   ├── Account.jsx        # User account page
│   │   ├── Authentication.jsx # Auth wrapper component
│   │   ├── ChangePassword.jsx # Password change page
│   │   ├── Favorites.jsx      # User favorites page
│   │   ├── GroupPage.jsx      # Single group view
│   │   ├── Groups.jsx         # Groups listing page
│   │   ├── Home.jsx           # Homepage
│   │   ├── Login.jsx          # Login page
│   │   ├── MovieDetails.jsx   # Movie details page
│   │   ├── Movies.jsx         # Movies listing page
│   │   ├── NotFound.jsx       # 404 page
│   │   ├── Reviews.jsx        # Movie reviews page
│   │   ├── Search.jsx         # Search page
│   │   └── Theaters.jsx       # Movie theaters page
│   │
│   ├── styles/           # Style definitions
│   │   └── tailwind.css      # Tailwind CSS imports
│   │
│   ├── App.jsx          # Root application component
│   ├── i18n.js          # Internationalization setup
│   └── main.jsx         # Application entry point
│
├── .env                 # Environment variables
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore file
├── eslint.config.js     # ESLint configuration
├── index.html          # HTML entry point
├── LICENSE             # Project license
├── package.json        # Frontend dependencies
├── postcss.config.js   # PostCSS configuration
├── README.md          # Project documentation
├── tailwind.config.js  # Tailwind CSS configuration
└── vite.config.js     # Vite bundler configuration
```

---

### Responsive Design Implementation

The application follows a mobile-first approach using Tailwind CSS:

#### Key Components
- **Navigation Menu**
  - Desktop: Horizontal menu (`hidden md:flex`)
  - Mobile: Hamburger menu (`md:hidden`) with dropdown
  
#### Common Patterns
- **Layout Classes**
  ```css
  /* Visibility control */
  .hidden md:flex    /* Show on desktop only */
  .md:hidden        /* Show on mobile only */
  
  /* Header styling */
  .sticky.top-0     /* Fixed header */
  .bg-gray-900/90   /* Semi-transparent background */
  
  /* Mobile menu */
  .fixed.inset-x-0  /* Full-width overlay */
  .backdrop-blur-md /* Background blur effect */
  ```

---

## Internationalization (i18n)

Language support is implemented using `i18next` + `react-i18next` libraries.

- Configuration and language resources are in `src/i18n.js`
- Application initializes i18n with `import './i18n'` in `src/main.jsx`
- Text is retrieved in components using `useTranslation()` hook: `t('key')`
- Finnish and English are in the `common` namespace

Quick usage example:
```jsx
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()
<h1>{t('title')}</h1>
```

---

## Static Images and Icons

- Application images (e.g., OAMK logo) are placed in `src/assets/images/` directory and imported:
  ```jsx
  import oamkLogo from '../assets/images/oamk.png'
  <img src={oamkLogo} alt="OAMK" />
  ```
- Emoji logo (e.g., 🎥) size is scaled using text size (`text-2xl`, `text-3xl`) within the icon.

