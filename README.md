# Game Match Platform

A web platform organizing **Teamfight Tactics (TFT)** skill-based tournaments where players pay a small entry fee to join matches and compete for rewards.

## 🎯 Project Overview

This platform follows a **"Tạm ứng dịch vụ" (Service Advance)** model to comply with Vietnamese regulations:

- **Skill-based competitions**, not gambling
- **Virtual ledger system** - real money only exists in Momo/PayOS accounts
- **Service fees** (10-20%) fund platform operation & prize distribution
- **Temporary advances** that can be refunded

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Next.js API Routes + Supabase
- **Database**: Supabase Postgres with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email OTP + Google OAuth)
- **Payment**: Momo/PayOS (MVP: manual, Future: automated)
- **Deployment**: Vercel
- **Testing**: Jest + React Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- PayOS account (for payment integration)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd game-match-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env.local
   ```

   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - PayOS credentials (for future integration)

4. **Run development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📋 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # Run TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions
├── __tests__/          # Test files
└── types/              # TypeScript type definitions
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Rate limiting** on API endpoints
- **Input validation** with Zod schemas
- **Audit logging** for sensitive operations
- **Idempotency** for all money operations

## 📊 Database Schema

Key tables:

- `users` - User profiles and authentication
- `wallets` - Virtual balance tracking
- `topups` - Top-up transaction records
- `matches` - Tournament matches
- `match_players` - Player participation
- `ledger` - All financial transactions
- `payout_requests` - Withdrawal requests

## 🎮 Core Features

### MVP Features

- [x] Project setup and development environment
- [ ] User authentication (Email OTP + Google)
- [ ] Virtual wallet system
- [ ] Match creation and joining
- [ ] Proof upload and settlement
- [ ] Withdrawal system
- [ ] Admin moderation tools

### Future Features

- [ ] PayOS webhook integration
- [ ] Automated payouts
- [ ] KYC for large withdrawals
- [ ] Advanced tournament features
- [ ] Mobile app

## 📝 Legal Compliance

This platform is designed to comply with Vietnamese regulations:

- All transactions are defined as **"service fees"** or **"temporary advances"**
- No "wallet" or "betting" terminology used
- Matches are **skill competitions**, not chance-based
- Refund policy: unused balance auto-refunded after defined period

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## ⚠️ Disclaimer

This platform is not affiliated with Riot Games or Teamfight Tactics. TFT is a trademark of Riot Games, Inc.
