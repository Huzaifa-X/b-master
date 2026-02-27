import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// ─── GET — return current Supabase connection status ─────────────────────────

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connector = await prisma.connector.findFirst({
        where: {
            userId: BigInt(session.user.id),
            provider: 'SUPABASE',
            deletedAt: null,
        },
    })

    if (!connector) {
        return NextResponse.json({ connected: false })
    }

    const cfg = (connector.config ?? {}) as Record<string, string>

    return NextResponse.json({
        connected: true,
        projectRef: cfg.projectRef ?? '',
        projectUrl: cfg.projectUrl ?? '',
        anonKey: cfg.anonKey ?? '',
        providerEmail: connector.providerEmail,
    })
}

// ─── POST — connect Supabase (PAT + projectRef) ───────────────────────────────

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pat, projectRef } = await req.json()

    if (!pat || !projectRef) {
        return NextResponse.json({ error: 'PAT and projectRef are required' }, { status: 400 })
    }

    // Verify the PAT and fetch project details from Supabase Management API
    let projectUrl = ''
    let anonKey = ''
    let accountEmail = ''

    try {
        // Fetch project details
        const projectRes = await fetch(
            `https://api.supabase.com/v1/projects/${projectRef}`,
            { headers: { Authorization: `Bearer ${pat}` } }
        )
        if (!projectRes.ok) {
            const errText = await projectRes.text()
            console.error('[Supabase connect] Project fetch failed:', errText)
            return NextResponse.json(
                { error: 'Invalid PAT or project ref. Could not fetch project details.' },
                { status: 400 }
            )
        }
        const project = await projectRes.json()
        projectUrl = `https://${project.ref}.supabase.co`

        // Fetch API keys
        const keysRes = await fetch(
            `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
            { headers: { Authorization: `Bearer ${pat}` } }
        )
        if (keysRes.ok) {
            const keys = await keysRes.json()
            const anonEntry = Array.isArray(keys)
                ? keys.find((k: any) => k.name === 'anon' || k.tags?.includes('anon'))
                : null
            anonKey = anonEntry?.api_key ?? ''
        }

        // Fetch account email
        const meRes = await fetch('https://api.supabase.com/v1/profile', {
            headers: { Authorization: `Bearer ${pat}` },
        })
        if (meRes.ok) {
            const me = await meRes.json()
            accountEmail = me.email ?? ''
        }
    } catch (err) {
        console.error('[Supabase connect] Verification error:', err)
        return NextResponse.json({ error: 'Failed to verify Supabase credentials' }, { status: 500 })
    }

    const userId = BigInt(session.user.id)

    // Find existing connector (assistantId is null for user-level connectors,
    // so we can't use the compound unique key in upsert)
    const existing = await prisma.connector.findFirst({
        where: { userId, provider: 'SUPABASE', assistantId: null },
    })

    if (existing) {
        await prisma.connector.update({
            where: { id: existing.id },
            data: {
                accessToken: pat,
                providerEmail: accountEmail,
                providerAccountId: projectRef,
                description: `Supabase project: ${projectRef}`,
                status: 'ACTIVE',
                deletedAt: null,
                config: { projectRef, projectUrl, anonKey },
                updatedAt: new Date(),
            },
        })
    } else {
        await prisma.connector.create({
            data: {
                userId,
                provider: 'SUPABASE',
                name: 'Supabase',
                description: `Supabase project: ${projectRef}`,
                accessToken: pat,
                refreshToken: '',
                tokenExpiry: new Date('2099-12-31'),
                providerEmail: accountEmail,
                providerAccountId: projectRef,
                scopes: [],
                status: 'ACTIVE',
                config: { projectRef, projectUrl, anonKey },
            },
        })
    }

    return NextResponse.json({
        connected: true,
        projectRef,
        projectUrl,
        anonKey,
        providerEmail: accountEmail,
    })
}

// ─── DELETE — disconnect Supabase ─────────────────────────────────────────────

export async function DELETE() {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.connector.updateMany({
        where: {
            userId: BigInt(session.user.id),
            provider: 'SUPABASE',
            deletedAt: null,
        },
        data: { deletedAt: new Date() },
    })

    return NextResponse.json({ connected: false })
}
