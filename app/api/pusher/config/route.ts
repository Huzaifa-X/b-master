import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust path

interface PusherConfig {
    key: string;
    cluster: string;
    authEndpoint: string;
}

export async function GET(request: NextRequest) {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const config: PusherConfig = {
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth'
    };

    return NextResponse.json({
        success: true,
        data: config
    });
}