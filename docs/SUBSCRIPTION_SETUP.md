# Subscription Setup Guide

This guide walks you through setting up the subscription system step by step.

## Prerequisites

1. **Stripe Account**: You need a Stripe account (sign up at https://stripe.com)
2. **Environment Variables**: Add these to your `.env` file:
   ```env
   STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
   STRIPE_WEBHOOK_SECRET=whsec_... # Webhook signing secret (get this after setting up webhook)
   NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your app URL
   ```

## Step-by-Step Setup

### Step 1: Populate Plans Table

Run the script to populate your database with plans from the pricing page:

```bash
npx ts-node scripts/populate-plans.ts
```

This will create/update the following plans:
- Free Plan
- Starter (Monthly & Yearly)
- Professional (Monthly & Yearly)
- Enterprise (Monthly & Yearly)

**Note**: At this stage, plans won't have Stripe IDs yet. That's normal!

### Step 2: Create Stripe Products and Prices

Run the script to create products and prices in Stripe, then update your plans table:

```bash
npx ts-node scripts/create-stripe-products.ts
```

This script will:
1. Read all plans from your database
2. Create Stripe products (grouping monthly/yearly plans together)
3. Create Stripe prices for each plan
4. Update your database with Stripe Product IDs and Price IDs

**Important**: Make sure `STRIPE_SECRET_KEY` is set in your `.env` file before running this.

### Step 3: Set Up Stripe Webhook

1. **In Stripe Dashboard**:
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe` (or `http://localhost:3000/api/webhooks/stripe` for local testing)
   - Select events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** (starts with `whsec_`)
   - Add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

2. **For Local Testing**:
   - Install Stripe CLI: `brew install stripe/stripe-cli/stripe` (Mac) or see [Stripe CLI docs](https://stripe.com/docs/stripe-cli)
   - Login: `stripe login`
   - Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - Copy the webhook signing secret from the output and add to `.env`

### Step 4: Test the Flow

1. **Start your development server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to pricing page**: `/pricing`

3. **Click "Subscribe"** on any paid plan

4. **Use Stripe test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

5. **Complete checkout** and verify:
   - You're redirected to `/pricing/success`
   - Subscription is created in your database
   - User's `stripeAccountId` is set

## How It Works

### Subscription Flow

1. **User clicks "Subscribe"** → `createCheckoutSession` server action is called
2. **Server creates Stripe Customer** (if doesn't exist) and saves to `User.stripeAccountId`
3. **Server creates Checkout Session** with plan's `stripePriceId`
4. **User is redirected** to Stripe Checkout
5. **User completes payment** → Stripe sends webhook to `/api/webhooks/stripe`
6. **Webhook handler**:
   - Creates `Subscription` record in database
   - Links to `User` and `Plan`
   - Sets status, period dates, etc.

### Database Schema

Key tables:
- **`plans`**: Subscription plans with Stripe IDs
- **`subscriptions`**: Active user subscriptions
- **`invoices`**: Payment invoices from Stripe
- **`users.stripeAccountId`**: Stripe customer ID

### Server Actions

- `createCheckoutSession(planId)`: Creates Stripe checkout session
- `getCurrentSubscription()`: Gets user's active subscription
- `getPlans()`: Gets all available plans

### Webhook Events Handled

- `checkout.session.completed`: Creates subscription record
- `customer.subscription.updated`: Updates subscription status
- `customer.subscription.deleted`: Marks subscription as canceled
- `invoice.payment_succeeded`: Creates invoice record
- `invoice.payment_failed`: Updates subscription to past_due

## Troubleshooting

### Plans not showing up?
- Make sure you ran `populate-plans.ts` first
- Check database: `SELECT * FROM plans WHERE "isActive" = true;`

### "Plan is not configured for payments" error?
- Run `create-stripe-products.ts` to create Stripe products/prices
- Verify plans have `stripeProductId` and `stripePriceId` set

### Webhook not working?
- Check `STRIPE_WEBHOOK_SECRET` is set correctly
- Verify webhook endpoint URL in Stripe dashboard
- Check server logs for webhook errors
- For local: Make sure `stripe listen` is running

### Checkout redirects but no subscription created?
- Check webhook is receiving events (Stripe Dashboard → Webhooks → Your endpoint)
- Verify webhook secret matches
- Check server logs for webhook processing errors

## Next Steps

After setup is complete, you can:
1. Add subscription management UI (cancel, upgrade, downgrade)
2. Implement usage limits based on plan (assistant limits, etc.)
3. Add subscription status checks in your app
4. Set up email notifications for subscription events

## Support

If you encounter issues:
1. Check Stripe Dashboard → Logs for API errors
2. Check your server logs for webhook processing errors
3. Verify all environment variables are set correctly
4. Ensure database migrations are up to date

