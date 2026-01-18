import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = BigInt(session.user.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user?.stripeConnectAccountId) {
            return NextResponse.json({
                error: 'No Stripe Connect account found',
                status: 'not_connected',
            }, { status: 404 });
        }

        // Get account from Stripe
        const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

        // Determine status
        let status = 'pending';
        if (account.charges_enabled && account.payouts_enabled) {
            status = 'active';
        } else if (account.requirements?.disabled_reason) {
            status = 'restricted';
        }

        // Update database
        await prisma.user.update({
            where: { id: userId },
            data: {
                stripeConnectStatus: status,
                stripeConnectOnboarded: account.details_submitted || false,
                stripeConnectPayoutsEnabled: account.payouts_enabled || false,
            },
        });

        return NextResponse.json({
            success: true,
            status: status,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
        });
    } catch (error: any) {
        console.error('❌ Refresh status error:', error);
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
