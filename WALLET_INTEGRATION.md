# User Wallet Integration Documentation

This document explains the User Wallet system integration with Stripe webhooks for assistant purchases and subscription payments.

## Overview

The User Wallet system tracks earnings for assistant creators/sellers on the platform. When users purchase assistants or subscriptions, the wallet is automatically updated through Stripe webhooks.

## Database Schema

### UserWallet Table
```prisma
model UserWallet {
  id                Int       @id @default(autoincrement())
  userId            BigInt    @unique
  pendingAmount     Decimal   @default(0.00) @db.Decimal(10, 2)  // Earnings in holding period
  availableAmount   Decimal   @default(0.00) @db.Decimal(10, 2)  // Available for withdrawal
  totalEarnings     Decimal   @default(0.00) @db.Decimal(10, 2)  // Lifetime earnings
  transferredAmount Decimal   @default(0.00) @db.Decimal(10, 2)  // Already withdrawn
  currency          String    @default("CHF") @db.VarChar(3)
  lastUpdated       DateTime  @default(now())
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
}
```

## Wallet Flow

### 1. Assistant Purchase Flow

When a buyer purchases an assistant:

#### Step 1: Payment Processing
- Buyer completes Stripe checkout session
- Stripe webhook `checkout.session.completed` is triggered
- System verifies the purchase record exists and is pending

#### Step 2: Transaction Creation
- **Gross Amount**: Full payment amount from Stripe
- **Platform Fee**: 10% of gross amount (configurable)
- **Net Amount**: Amount credited to seller (90% of gross)

Example:
```
Gross Amount: CHF 100.00
Platform Fee: CHF 10.00 (10%)
Seller Receives: CHF 90.00
```

#### Step 3: Wallet Update
```typescript
// Seller's wallet is updated
pendingAmount += CHF 90.00    // Added to pending (holding period)
totalEarnings += CHF 90.00    // Lifetime total increases
```

#### Step 4: Transaction Record
```typescript
AssistantTransaction {
  assistantOwnerId: sellerId,
  amount: 90.00,
  currency: "CHF",
  type: "sale",
  status: "completed",
  metadata: {
    assistantId: "123",
    buyerId: "456",
    grossAmount: 100.00,
    platformFee: 10.00,
    netAmount: 90.00
  }
}
```

#### Step 5: Notifications
- **Buyer**: Receives "Assistant Purchase Successful" notification
- **Seller**: Receives "Your Assistant Was Sold" notification with earnings amount

### 2. Refund Flow

When a purchase is refunded:

#### Step 1: Refund Processing
- Stripe refund is initiated
- Webhook `charge.refunded` is triggered
- System locates the original purchase

#### Step 2: Wallet Deduction
The system intelligently deducts from the seller's wallet:

```typescript
// Priority order:
1. Deduct from pendingAmount first (if sufficient)
2. Deduct from availableAmount (if pending insufficient)
3. Deduct from both (if neither is sufficient alone)
```

Example scenarios:
```
Scenario A: Refund CHF 90, Pending CHF 200
Result: pendingAmount -= 90

Scenario B: Refund CHF 90, Pending CHF 50, Available CHF 100
Result: pendingAmount -= 50, availableAmount -= 40

Scenario C: Refund CHF 90, Pending CHF 0, Available CHF 100
Result: availableAmount -= 90
```

#### Step 3: Transaction Record
```typescript
AssistantTransaction {
  assistantOwnerId: sellerId,
  amount: -90.00,  // Negative for refund
  currency: "CHF",
  type: "refund",
  status: "completed",
  metadata: {
    originalTransactionId: 123,
    refundAmount: 100.00,      // Full refund to buyer
    sellerRefundAmount: 90.00  // Amount deducted from seller
  }
}
```

#### Step 4: Notifications
- **Buyer**: Notified of refund completion
- **Seller**: Notified of refund deduction from wallet

### 3. Pending to Available Flow

Earnings are held in `pendingAmount` for a holding period (default: 7 days) to allow for refunds/disputes.

#### Manual Release
```typescript
// User can call this after holding period
await releasePendingAmounts(holdingPeriodDays: 7)
```

#### Process
1. Find all completed transactions older than holding period
2. Verify purchases are still completed (not refunded)
3. Calculate total eligible for release
4. Transfer from pending to available:
```typescript
pendingAmount -= releaseAmount
availableAmount += releaseAmount
```

## Webhook Integration

### File: `/app/api/webhooks/stripe/route.ts`

#### Helper Function
```typescript
async function updateUserWallet(
  userId: BigInt,
  amount: number,
  currency: string,
  type: "add_pending" | "pending_to_available" | "deduct_available",
  tx: any
)
```

#### Webhook Events

##### 1. `checkout.session.completed` (Assistant Purchase)
- Validates purchase metadata
- Calculates platform fee and net amount
- Creates transaction record
- Updates seller's wallet (pending)
- Links transaction to purchase
- Sends notifications

##### 2. `charge.refunded`
- Finds purchase by payment intent
- Validates refund eligibility
- Creates refund transaction
- Deducts from seller's wallet
- Updates purchase status to "refunded"
- Sends refund notifications

##### 3. Subscription Events
Note: Subscription payments currently go to the platform, not individual sellers. If you implement a referral/affiliate system, you would update wallets here.

## React Query Hook

### File: `/hooks/useWallet.ts`

The wallet hook uses **React Query** for optimal caching and state management:

**Features:**
- ✅ Automatic caching with configurable stale time
- ✅ Optimistic updates on mutations
- ✅ Automatic cache invalidation
- ✅ Background refetching
- ✅ Loading and error states
- ✅ DevTools support

**Cache Keys:**
```typescript
WALLET_KEYS = {
  all: ["wallet"],
  details: ["wallet", "details"],
  transactions: ["wallet", "transactions", { limit, offset }],
  stats: ["wallet", "stats"],
}
```

**Stale Times:**
- Wallet details: 30 seconds
- Transactions: 60 seconds
- Stats: 60 seconds

**Usage:**
```typescript
const {
  wallet,           // WalletData | null
  transactions,     // WalletTransaction[]
  stats,           // WalletStats | null
  loading,         // boolean
  transactionsLoading, // boolean
  statsLoading,    // boolean
  error,           // string | null
  refetch,         // () => Promise<void>
  releaseEarnings, // (holdingPeriodDays?: number) => Promise<Result>
  requestWithdrawal, // (amount: number) => Promise<Result>
  isReleasingEarnings, // boolean
  isRequestingPayout, // boolean
} = useWallet(limit?, offset?)
```

**Cache Invalidation:**
- `releaseEarnings()` invalidates wallet details & stats
- `requestWithdrawal()` invalidates wallet details

## Server Actions

### File: `/app/actions/wallet.action.ts`

#### 1. `getUserWallet()`
Get or create user's wallet information.

**Returns:**
```typescript
{
  success: true,
  wallet: {
    userId: string,
    pendingAmount: Decimal,
    availableAmount: Decimal,
    totalEarnings: Decimal,
    transferredAmount: Decimal,
    currency: string,
    lastUpdated: Date
  }
}
```

#### 2. `getWalletTransactions(limit, offset)`
Get paginated transaction history.

**Returns:**
```typescript
{
  success: true,
  transactions: AssistantTransaction[],
  total: number
}
```

#### 3. `releasePendingAmounts(holdingPeriodDays)`
Release pending amounts to available after holding period.

**Returns:**
```typescript
{
  success: true,
  amountReleased: number,
  currency: string
}
```

#### 4. `getWalletStats()`
Get comprehensive wallet statistics.

**Returns:**
```typescript
{
  success: true,
  stats: {
    totalSales: number,
    totalRefunds: number,
    totalSalesAmount: number,
    totalRefundsAmount: number,
    pendingAmount: number,
    availableAmount: number,
    totalEarnings: number,
    transferredAmount: number,
    currency: string
  }
}
```

#### 5. `requestPayout(amount)`
Request withdrawal/payout (requires Stripe Connect integration).

**Note:** This is a placeholder. Full implementation requires:
- Stripe Connect account setup
- Payout request record creation
- Integration with Stripe Connect API
- Update `transferredAmount` on completion

## Notification Types

Added to `/types/notification.ts`:
```typescript
| 'assistant_refund'         // Buyer receives refund
| 'assistant_refund_seller'  // Seller notified of deduction
```

## Platform Fee Configuration

Currently hardcoded in webhook:
```typescript
const platformFeePercentage = 0.1 // 10%
```

**To make configurable:**
1. Add to environment variables
2. Store in database settings table
3. Allow per-assistant custom fees

## Security Considerations

1. **Webhook Verification**: All webhooks verify Stripe signature
2. **Transaction Integrity**: Uses Prisma transactions for atomic operations
3. **BigInt Handling**: Proper conversion for userId references
4. **Decimal Math**: Careful handling of Decimal types for accuracy

## Testing Checklist

### Assistant Purchase
- [ ] Purchase completes successfully
- [ ] Seller wallet increases (pending)
- [ ] Transaction record created
- [ ] Platform fee calculated correctly
- [ ] Both parties receive notifications
- [ ] Purchase status updates to "completed"

### Refund Flow
- [ ] Refund processes correctly
- [ ] Seller wallet decreases appropriately
- [ ] Handles insufficient pending balance
- [ ] Handles insufficient available balance
- [ ] Deducts from both when needed
- [ ] Refund transaction created
- [ ] Both parties receive refund notifications
- [ ] Purchase status updates to "refunded"

### Pending Release
- [ ] Only releases after holding period
- [ ] Doesn't release refunded transactions
- [ ] Correctly moves pending to available
- [ ] Handles zero pending amount
- [ ] Returns correct release amount

### Wallet Queries
- [ ] Creates wallet if doesn't exist
- [ ] Returns correct balances
- [ ] Transaction history paginated correctly
- [ ] Stats calculations accurate
- [ ] Authorization enforced

## Future Enhancements

1. **Stripe Connect Integration**
   - Direct payouts to sellers
   - Automated payout schedules
   - Tax reporting integration

2. **Advanced Fee Structures**
   - Tiered platform fees
   - Per-assistant custom fees
   - Promotional fee reductions

3. **Automated Pending Release**
   - Cron job to auto-release after holding period
   - Configurable holding periods per transaction type

4. **Wallet Dashboard**
   - Frontend components for wallet management
   - Transaction history UI
   - Payout request interface
   - Earnings analytics

5. **Multi-Currency Support**
   - Currency conversion
   - Multi-currency wallets
   - Exchange rate tracking

6. **Dispute Management**
   - Extended holding for disputed transactions
   - Manual review workflow
   - Partial refund support

## Error Handling

All webhook events wrapped in try-catch:
- Logs errors without failing webhook
- Returns 200 to prevent retry storms
- Critical errors return 500
- Signature verification returns 400

## Database Indexes

Ensure these indexes exist for performance:
```sql
CREATE INDEX idx_user_wallets_user_id ON user_wallets(userId);
CREATE INDEX idx_user_wallets_last_updated ON user_wallets(lastUpdated);
CREATE INDEX idx_assistant_transactions_owner ON assistant_transactions(assistantOwnerId);
CREATE INDEX idx_assistant_transactions_status ON assistant_transactions(status);
CREATE INDEX idx_assistant_transactions_created ON assistant_transactions(createdAt);
```

## Contact & Support

For issues or questions about wallet integration:
1. Check webhook logs in Stripe Dashboard
2. Review database transaction records
3. Verify notification delivery via Pusher
4. Check application logs for errors
