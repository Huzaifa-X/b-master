'use client';

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';

export const usePusher = () => {
  const [pusherClient, setPusherClient] = useState<Pusher | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      // Initialize Pusher
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
        // No Authorization header needed — the auth endpoint uses NextAuth session cookies
      });

      pusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
      });

      pusher.connection.bind('error', (err: any) => {
        // Only log errors with meaningful details; ignore empty {} transport-close events
        if (err && typeof err === 'object' && Object.keys(err).length > 0) {
          console.error('❌ Pusher error:', err);
        }
      });

      setPusherClient(pusher);

      return () => {
        pusher.disconnect();
      };
    }
  }, [session, status]);

  return pusherClient;
};