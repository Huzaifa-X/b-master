import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pusher from '@/lib/pusher';

interface PusherAuthRequest {
    socket_id: string;
    channel_name: string;
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
        );
    }

    // Pusher sends form-encoded data, not JSON
    const formData = await request.formData();
    const socket_id = formData.get('socket_id') as string;
    const channel_name = formData.get('channel_name') as string;

    if (!socket_id || !channel_name) {
        return NextResponse.json(
            { error: 'Socket ID and channel name are required' },
            { status: 400 }
        );
    }

    const userId = session.user.id;

    // Verify user has access to their own private notification channel
    // Channel format: private-user-{userId}
    if (channel_name === `private-user-${userId}`) {
        const authResponse = pusher.authorizeChannel(socket_id, channel_name);
        return NextResponse.json(authResponse);
    }

    // Legacy support for global-notifications (can be removed later)
    if (channel_name === 'global-notifications') {
        const authResponse = pusher.authorizeChannel(socket_id, channel_name);
        return NextResponse.json(authResponse);
    }

    return NextResponse.json(
        { error: 'Invalid channel name' },
        { status: 400 }
    );
}