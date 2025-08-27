# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TripSum (旅算) is a travel expense-splitting application designed for small groups. It helps friends easily record shared expenses during trips and uses intelligent algorithms to calculate settlement amounts, achieving zero-sum settlement.

### Key Features Implemented
- **Fund Contribution Mode**: Pre-collection fund management with member contributions tracking
- **Smart Expense Recording**: Natural language AI parsing with calculator tool integration
- **Virtual Member Support**: Add non-registered users to trip calculations
- **Modular AI Architecture**: Intent-first parsing system (expense/member/mixed/settlement/unknown)
- **AI Calculator Tool**: Function Calling integration for precise mathematical calculations
- **Optimized UI/UX**: Direct action buttons replacing hidden ActionSheet interactions
- **Real-time Balance Calculation**: Formula: contribution + paid - share = balance
- **Admin Controls**: Trip deletion with confirmation dialogs and permission-based UI rendering
- **Trip Selector**: Multi-trip expense recording with trip selection dropdown

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
- **src/pages/** - Page components (Login, Register, Home, TripList, TripDetail, ExpenseForm, ChatExpense, AddMember, etc.)
- **src/components/** - Reusable React components
  - **confirmation/** - Modular confirmation dialogs (BaseConfirm, MemberConfirm, MixedIntentConfirm)
  - **common/** - Layout, Loading, ErrorBoundary, PrivateRoute components
- **src/services/** - API service layer (api.ts base, auth/trip/expense/ai services)
- **src/stores/** - Zustand stores for auth, trip, and expense state management

### Backend Structure
- **src/controllers/** - Request handlers (auth, trip, expense, calculation, ai)
- **src/services/** - Business logic layer
  - **ai.intent.service.ts** - Intent classification using OpenAI API
  - **ai.member.parser.ts** - Member parsing and validation
  - **ai.unified.parser.ts** - Coordinate between intent recognition and specialized parsers
- **src/routes/** - API route definitions
- **src/middleware/** - Auth, validation, error handling, file upload
- **src/validators/** - Joi validation schemas including ai.validator.ts
- **src/types/** - TypeScript type definitions including ai.types.ts
- **prisma/** - Database schema and migrations

### Database Schema (Prisma)
Key models:
- **User** - User accounts with authentication
- **Trip** - Travel groups with initial fund (sum of contributions) and currency
- **TripMember** - Trip membership with roles and **contribution** field (基金缴纳)
- **Expense** - Individual expenses with payer and amount (positive only for expenses)
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

1. **Database operations** use Prisma ORM - modify schema.prisma and run migrations
2. **Fund Management System**:
   - Members contribute to fund pool via `contribution` field in TripMember
   - Balance calculation: `contribution + totalPaid - totalShare`
   - Positive balance = others owe them, Negative = they owe others
3. **AI features** integrate with OpenAI GPT-4 using modular intent-first architecture
   - Intent classification → Specialized parsing → Unified coordination
   - Supports expense, member, mixed, settlement, and unknown intents
   - **Calculator Tool**: Function Calling for precise calculations (add/subtract/multiply/divide)
   - AI prompts include member information for context-aware parsing
4. **Authentication** uses JWT with refresh token rotation and secure token handling
5. **File uploads** stored in MinIO with metadata in PostgreSQL
6. **Real-time sync** handled via Socket.io websockets for live updates
7. **Mobile-first UI** using Ant Design Mobile with optimized touch interactions
8. **Settlement calculation** uses optimized debt reduction with fund contributions
9. **Virtual members** supported for non-registered users in trip calculations
10. **Permission-based UI rendering** - admin vs member role functionality
11. **Code quality** - all TypeScript warnings resolved, ESLint compliant

## UI/UX Improvements Implemented
- **TripDetail Page**: Replaced hidden ActionSheet with visible bottom action button grid
- **Permission-based Actions**: 3 buttons for regular users, 5 for admins
- **Dangerous Actions**: Delete button with red styling and confirmation dialogs  
- **Fixed Positioning**: Bottom action buttons always visible, no scrolling required
- **Touch-optimized**: Minimum 80px button height with 12px gaps to prevent mis-taps

## Testing Approach
- **Backend**: Jest for unit tests (npm run test)
- **Frontend**: Component testing setup pending
- **Manual Testing**: Development servers for end-to-end workflows
- **AI Features**: Test plans documented for member addition and mixed intents
- **UI Interactions**: Comprehensive test scenarios for improved UX patterns
- 如果要测试运行项目端的话让用户运行，而不是自己运行后台进程

## Recent Improvements (v1.3.0)

### Fund Contribution System
- Added `contribution` field to TripMember model for tracking fund payments
- Created member service and routes for updating contributions
- Modified balance calculation to include contributions
- Updated UI to display fund pool and individual contributions
- Changed income recording from negative expenses to contribution updates

### AI Calculator Integration
- Implemented calculator tool in `/backend/src/utils/calculator.ts`
- Added Function Calling support in AI service
- AI now uses calculator for all mathematical operations
- Prevents calculation errors from LLM arithmetic limitations

### UI/UX Enhancements  
- Trip selector dropdown in expense recording page
- Separated income confirmation component for fund contributions
- Enhanced member dashboard showing contribution/paid/share breakdown
- "应收/应付/已清" labels for clearer balance display

## Known Issues & Limitations
- **ESLint Configuration**: No .eslintrc file found in frontend - linting relies on TypeScript compiler checks
- **AI Model Configuration**: Uses Kimi API (Moonshot) instead of OpenAI in some deployments