import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = BigInt(session.user.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        let accountId = user.stripeConnectAccountId;

        // Create Connect account if doesn't exist
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'CH', // Switzerland
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                metadata: {
                    userId: userId.toString(),
                    userEmail: user.email,
                },
            });

            accountId = account.id;

            await prisma.user.update({
                where: { id: userId },
                data: {
                    stripeConnectAccountId: accountId,
                    stripeConnectStatus: 'pending',
                },
            });

            console.log('✅ Created Stripe Connect account:', accountId);
        }

        // Construct base URL from environment or request headers
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
            `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('host')}`;

        // Ensure URL starts with http:// or https://
        const normalizedBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${normalizedBaseUrl}/profile?tab=wallet&stripe=reauth`,
            return_url: `${normalizedBaseUrl}/profile?tab=wallet&stripe=success`,
            type: 'account_onboarding',
        });

        return NextResponse.json({
            url: accountLink.url,
            accountId: accountId,
        });
    } catch (error: any) {
        console.error('❌ Stripe Connect onboarding error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to create onboarding link'
        }, { status: 500 });
    }
}
