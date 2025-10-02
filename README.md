# NOION Analytics

AI-powered human analytics platform for restaurants that analyzes employee behavior, customer service quality, and operational efficiency using POS data.

## 🚀 Business Model

### Subscription Tiers

- **Pulse Tier** ($29-99/month): Basic insights, lead generation tool, 65% conversion to paid
- **Intelligence Tier** ($299-799/month): Core product, comprehensive analytics
- **Command Tier** ($2,500-10K/month): Enterprise multi-location, white-label options

### Core Innovation: "The Discovery Advantage"

- Offer FREE insights report by connecting POS system
- Show restaurants $4,200/month they're losing
- Convert 65% to paid (vs 25% industry standard)
- Each connection feeds AI training, creating data moat

## 🏗️ Tech Stack

### Frontend

- **Next.js 14.2** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend

- **Next.js API Routes** - Serverless functions
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Stripe** - Payments
- **SendGrid** - Email delivery

### External Services

- **Anthropic Claude API** - AI insights generation
- **Toast API** - POS integration
- **Stripe** - Payment processing

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Stripe account
- Toast POS developer account (optional)

### Setup

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd noion
npm install
```

2. **Create environment file:**

```bash
cp .env.example .env
```

3. **Configure environment variables:**

Edit `.env` with your credentials:

- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT tokens
- `ANTHROPIC_API_KEY` - Claude API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `SENDGRID_API_KEY` - SendGrid API key (optional)
- `TOAST_CLIENT_ID` & `TOAST_CLIENT_SECRET` - Toast POS credentials (optional)

4. **Run development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏃 Quick Start

### 1. Create Account

```bash
POST /api/auth/signup
{
  "name": "John Doe",
  "email": "john@restaurant.com",
  "password": "securepass123",
  "restaurantName": "John's Bistro",
  "phone": "555-1234"
}
```

### 2. Connect POS System

```bash
POST /api/restaurants/{id}/connect-pos
{
  "posType": "toast"
}
```

### 3. Generate Discovery Report

```bash
POST /api/reports/{restaurantId}/discovery
{
  "sendEmail": true
}
```

## 📁 Project Structure

```
noion/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # Authentication
│   │   │   ├── insights/   # Insights generation
│   │   │   ├── reports/    # Report generation
│   │   │   └── webhooks/   # Stripe webhooks
│   │   ├── dashboard/      # Dashboard page
│   │   ├── pos/            # POS connection page
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── layout/         # Layout components
│   │   └── pos/            # POS components
│   ├── models/             # MongoDB models
│   │   ├── Restaurant.ts
│   │   ├── Insight.ts
│   │   └── Transaction.ts
│   ├── services/           # Business logic
│   │   ├── AuthService.ts
│   │   ├── ToastIntegration.ts
│   │   ├── InsightGenerator.ts
│   │   ├── DiscoveryReport.ts
│   │   ├── SubscriptionService.ts
│   │   └── EmailService.ts
│   ├── lib/                # Utilities
│   │   └── mongodb.ts
│   ├── middleware/         # Middleware
│   │   └── auth.ts
│   └── utils/              # Helper functions
│       └── encryption.ts
├── public/                 # Static files
├── .env.example           # Environment template
├── package.json
└── README.md
```

## 🔑 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Restaurants

- `GET /api/restaurants/{id}` - Get restaurant
- `PUT /api/restaurants/{id}` - Update restaurant
- `POST /api/restaurants/{id}/connect-pos` - Initiate POS connection

### Insights

- `GET /api/insights/{restaurantId}` - List insights
- `POST /api/insights/{restaurantId}/generate` - Generate insights

### Reports

- `POST /api/reports/{restaurantId}/discovery` - Generate discovery report

### Subscriptions

- `GET /api/subscription/{restaurantId}` - Get subscription
- `POST /api/subscription/{restaurantId}/upgrade` - Upgrade tier
- `POST /api/subscription/{restaurantId}/cancel` - Cancel subscription

### Webhooks

- `POST /api/webhooks/stripe` - Stripe webhooks

## 🧪 Testing

```bash
# Run build to check for errors
npm run build

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI:

```bash
npm i -g vercel
```

2. Deploy:

```bash
vercel
```

3. Set environment variables in Vercel dashboard

4. Configure MongoDB Atlas for production

### Manual Deployment

1. Build the application:

```bash
npm run build
```

2. Start production server:

```bash
npm start
```

## 🔐 Security

- JWT tokens with HTTP-only cookies
- Password hashing with bcrypt (10 rounds)
- API key encryption at rest (AES-256-GCM)
- Stripe webhook signature verification
- Rate limiting on API routes
- Input validation and sanitization

## 📊 Database Schema

### Restaurant

- Owner information
- Restaurant details
- POS system configuration
- Subscription tier
- Billing information
- Analytics settings

### Insight

- Restaurant reference
- Report type (discovery, weekly, monthly)
- Key findings and recommendations
- Confidence scores
- Engagement metrics

### Transaction

- POS transaction data
- Normalized format
- Employee attribution
- Analytics metadata

## 🤖 AI Integration

The platform uses Anthropic Claude for:

- Revenue leakage detection
- Employee performance analysis
- Customer experience scoring
- Pattern recognition
- Recommendation generation

## 📈 Business Intelligence

### Discovery Report Features

- Total lost revenue calculation
- Top 3 revenue opportunities
- Quick wins (30-day ROI)
- Industry benchmark comparison
- Conversion-optimized presentation

### Analytics Capabilities

- Real-time POS data sync
- Employee performance tracking
- Peak hour optimization
- Upselling opportunity detection
- Customer service quality scoring

## 🔄 Background Jobs

### Automated Tasks

- Daily transaction sync (2 AM)
- Weekly report generation (Monday 8 AM)
- Monthly analytics compilation
- Email notifications
- Data cleanup

## 🎨 UI Components

- Analytics Dashboard
- POS Connection Flow
- Insight Cards
- Revenue Charts
- Subscription Management

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB connection failed**
   - Check DATABASE_URL in .env
   - Ensure MongoDB is running
   - Whitelist IP in MongoDB Atlas

2. **Stripe webhook not working**
   - Verify STRIPE_WEBHOOK_SECRET
   - Check webhook endpoint URL
   - Use Stripe CLI for local testing

3. **POS connection fails**
   - Verify Toast API credentials
   - Check redirect URI configuration
   - Review OAuth scopes

## 📝 License

Proprietary - All rights reserved

## 👥 Team

Project Lead: Demetri Gregorakis
Contact: demetri_gregorakis@icloud.com

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [Stripe Documentation](https://stripe.com/docs)
- [Toast API Documentation](https://doc.toasttab.com)
- [Anthropic Claude API](https://docs.anthropic.com)
