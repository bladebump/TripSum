# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripSum (旅算) is a travel expense-splitting application designed for small groups. It helps friends easily record shared expenses during trips and uses intelligent algorithms to calculate settlement amounts, achieving zero-sum settlement.

## Tech Stack

### Frontend
- React 18 with TypeScript 5
- Ant Design Mobile 5 for UI components
- Zustand for state management
- Vite as build tool
- Recharts for data visualization

### Backend
- Node.js 20 with Express and TypeScript
- Prisma ORM with PostgreSQL 15
- Redis 7 for caching and sessions
- Socket.io for real-time communication
- JWT for authentication
- MinIO for file storage
- OpenAI GPT-4 / Claude API for AI features

## Essential Commands

### Development Setup
```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Setup database
cd backend
npx prisma migrate dev
npx prisma db seed

# Start development servers
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)  
cd frontend && npm run dev
```

### Common Development Tasks
```bash
# Frontend
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build

# Backend
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npx prisma generate  # Generate Prisma client
npx prisma migrate dev  # Run migrations
```

### Docker Operations
```bash
docker-compose up -d     # Start all services
docker-compose logs -f   # View logs
docker-compose down      # Stop all services
```

## Code Architecture

### Frontend Structure
- **src/pages/** - Page components (Login, Register, Home, TripList, TripDetail, ExpenseForm, etc.)
- **src/components/** - Reusable React components
- **src/services/** - API service layer (api.ts base, auth/trip/expense/ai services)
- **src/stores/** - Zustand stores for auth, trip, and expense state management

### Backend Structure
- **src/controllers/** - Request handlers (auth, trip, expense, calculation, ai)
- **src/services/** - Business logic layer
- **src/routes/** - API route definitions
- **src/middleware/** - Auth, validation, error handling, file upload
- **src/validators/** - Joi validation schemas
- **prisma/** - Database schema and migrations

### Database Schema (Prisma)
Key models:
- **User** - User accounts with authentication
- **Trip** - Travel groups with initial fund and currency
- **TripMember** - Trip membership with roles (admin/member)
- **Expense** - Individual expenses with payer and amount
- **ExpenseParticipant** - Expense sharing details
- **Settlement** - Calculated settlement transactions
- **Category** - Expense categories

### API Architecture
- RESTful API with `/api` prefix
- JWT-based authentication with access/refresh tokens
- Request validation using Joi
- Standardized error responses
- File uploads via Multer to MinIO

### State Management
Frontend uses Zustand stores:
- **authStore** - User authentication state, tokens
- **tripStore** - Current trip data, members, expenses
- **expenseStore** - Expense form state, calculations

### Real-time Features
Socket.io implementation for:
- Live expense updates
- Member join/leave notifications
- Balance recalculations

## Environment Configuration

Backend requires `.env` file with:
- DATABASE_URL - PostgreSQL connection string
- REDIS_URL - Redis connection
- JWT secrets and expiry settings
- OpenAI API key for AI features
- MinIO configuration for file storage

Frontend uses Vite environment variables:
- VITE_API_URL - Backend API endpoint

## Key Development Notes

1. Database operations use Prisma ORM - modify schema.prisma and run migrations
2. AI features integrate with OpenAI GPT-4 for expense parsing and categorization
3. Authentication uses JWT with refresh token rotation
4. File uploads stored in MinIO with metadata in PostgreSQL
5. Real-time sync handled via Socket.io websockets
6. Mobile-first UI using Ant Design Mobile components
7. Settlement calculation uses optimized debt reduction algorithm

## Testing Approach
- Backend: Jest for unit tests (npm run test)
- Frontend: Component testing setup pending
- Manual testing via development servers