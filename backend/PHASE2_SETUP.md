# Phase 2 Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install:
- `pg` (PostgreSQL client)
- `stripe` (Payment processing)
- `nodemailer` (Email sending)

### 2. Set Up PostgreSQL

#### Option A: Local PostgreSQL

```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Create database
createdb job_tracker

# Or using psql
psql postgres
CREATE DATABASE job_tracker;
\q
```

#### Option B: Cloud PostgreSQL (Recommended for Production)

- **Heroku Postgres:** Free tier available
- **AWS RDS:** Managed PostgreSQL
- **Railway:** Easy setup
- **Supabase:** Free tier with PostgreSQL

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/job_tracker

# JWT Secret (generate one)
JWT_SECRET=$(openssl rand -hex 64)

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe (get from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Run Database Migration

```bash
npm run migrate
```

This creates all tables and indexes.

### 5. Start the Server

```bash
npm run dev
```

Server should start on `http://localhost:3001`

---

## Email Setup (Gmail)

1. **Enable 2-Factor Authentication**
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Enable 2FA

2. **Generate App Password**
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "Smart Job Tracker"
   - Copy the 16-character password

3. **Use in .env**
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx  # The app password (no spaces)
   ```

**Alternative Email Services:**
- **SendGrid:** Free tier (100 emails/day)
- **AWS SES:** Very cheap, requires AWS account
- **Mailgun:** Free tier (5,000 emails/month)

---

## Stripe Setup

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for free account
3. Complete account setup

### 2. Get API Keys

1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy **Secret key** (starts with `sk_test_...`)
3. Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

### 3. Set Up Webhook

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `http://localhost:3001/api/webhooks/stripe` (for local testing)
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy **Signing secret** (starts with `whsec_...`)
6. Add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 4. Test with Stripe CLI (Optional)

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### 5. Create Price IDs

1. Go to [dashboard.stripe.com/products](https://dashboard.stripe.com/products)
2. Create products for your plans:
   - **Professional Plan:** $9.99/month
   - **Enterprise Plan:** $29.99/month
3. Copy **Price IDs** (start with `price_...`)
4. Use in frontend when creating checkout sessions

---

## Testing

### Test Database Connection

```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "OK",
  "version": "3.0.0",
  "features": ["postgresql", "stripe", "email-verification", ...]
}
```

### Test Registration (with email)

```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Check your email for verification link.

### Test Password Reset

```bash
curl -X POST http://localhost:3001/api/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

Check your email for reset link.

### Test Stripe Checkout

```bash
curl -X POST http://localhost:3001/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "plan": "professional",
    "priceId": "price_1234567890"
  }'
```

---

## Troubleshooting

### Database Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Make sure PostgreSQL is running: `brew services list` (macOS)
- Check `DATABASE_URL` in `.env`
- Verify database exists: `psql -l`

### Email Not Sending

```
Error: Invalid login
```

**Solution:**
- Use App Password (not regular password) for Gmail
- Check SMTP credentials in `.env`
- Verify SMTP port (587 for TLS, 465 for SSL)

### Stripe Webhook Not Working

```
Error: No signatures found matching the expected signature
```

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches webhook signing secret
- Make sure webhook endpoint URL is correct
- For local testing, use Stripe CLI: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`

### Migration Fails

```
Error: relation "users" already exists
```

**Solution:**
- Tables already exist, this is fine
- Migration script is idempotent (safe to run multiple times)

---

## Production Deployment

### Environment Variables Checklist

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (production PostgreSQL URL)
- [ ] `JWT_SECRET` (strong random secret)
- [ ] `CORS_ORIGINS` (your production domain)
- [ ] `FRONTEND_URL` (your production frontend URL)
- [ ] `SMTP_*` (production email service)
- [ ] `STRIPE_SECRET_KEY` (use `sk_live_...` for production)
- [ ] `STRIPE_WEBHOOK_SECRET` (production webhook secret)

### Database Migration in Production

```bash
# Set production DATABASE_URL
export DATABASE_URL=postgresql://...

# Run migration
npm run migrate
```

### Webhook URL in Production

Update Stripe webhook endpoint to:
```
https://yourdomain.com/api/webhooks/stripe
```

---

## Support

For issues or questions:
1. Check `PHASE2_CHANGELOG.md` for detailed changes
2. Review error logs in console
3. Test each service individually (database, email, Stripe)

---

*Last updated: December 2024*
