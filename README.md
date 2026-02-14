# KinderHub API

**AI-Powered Childcare Management Platform — Backend**

## Quick Start

```bash
# 1. Start PostgreSQL + Redis
docker-compose up -d db redis

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed development data
npx prisma db seed

# 6. Start development server
npm run start:dev
```

API runs at `http://localhost:4000`
Swagger docs at `http://localhost:4000/api/docs`

## Architecture

```
src/
├── main.ts                    # Entry point, Swagger setup
├── app.module.ts              # Root module
├── database/
│   ├── prisma.module.ts       # Global database module
│   ├── prisma.service.ts      # Prisma client wrapper
│   └── seed.ts                # Development seed data
├── common/
│   └── guards/
│       ├── jwt-auth.guard.ts  # JWT authentication
│       └── roles.guard.ts     # Role-based access control
└── modules/
    ├── auth/                  # Login, register, JWT tokens
    ├── organizations/         # Multi-tenant org management
    ├── centers/               # Physical locations
    ├── classrooms/            # Room management
    ├── children/              # Child profiles & enrollment
    ├── attendance/            # Check-in/out tracking
    ├── activities/            # ⭐ Core daily feed (meals, naps, etc.)
    ├── billing/               # Invoices, payments, Stripe
    ├── messaging/             # Parent-teacher chat
    ├── ai/                    # ⭐ Claude-powered summaries & insights
    ├── staff/                 # Scheduling & time tracking
    ├── waitlist/              # Enrollment pipeline
    └── media/                 # Photo/video uploads (S3)
```

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | Login, get JWT |
| POST | /api/v1/activities | Log activity for a child |
| POST | /api/v1/activities/batch | Log for entire classroom |
| GET | /api/v1/activities/child/:id | Get child's day timeline |
| POST | /api/v1/ai/summary/generate | Generate AI daily summary |
| POST | /api/v1/ai/summary/generate-classroom | Generate for all kids |
| POST | /api/v1/ai/summary/:id/send | Send summary to parents |

## Tech Stack

- **Runtime**: Node.js 20 + NestJS 10
- **Database**: PostgreSQL 16 + Prisma ORM
- **Auth**: JWT + Passport (Clerk-ready)
- **Payments**: Stripe Connect
- **AI**: Anthropic Claude API
- **Storage**: AWS S3
- **Notifications**: Firebase + Twilio
- **Docs**: Swagger/OpenAPI auto-generated

## Deployment

### Railway (Recommended for MVP)
1. Push to GitHub
2. Connect repo in Railway
3. Add PostgreSQL addon
4. Set environment variables
5. Deploy

### Docker
```bash
docker-compose up -d
```

## What's Built vs What's Stubbed

✅ **Fully implemented:**
- Auth (register, login, JWT, role-based guards)
- Activities (create, batch, timeline queries)
- AI daily summaries (real Claude integration)
- AI sentiment analysis
- Prisma schema (all 23 tables)
- Swagger documentation
- Docker setup

🔲 **Stubbed (pattern established, needs CRUD):**
- Children CRUD
- Attendance check-in/out
- Billing/Stripe integration
- Messaging
- Staff scheduling
- Waitlist management
- Media uploads

Each stubbed module has the same structure as Activities — your CTO follows the same pattern to implement.
