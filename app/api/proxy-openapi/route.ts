import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { url, method = 'GET', headers = {} } = body

        // Validate URL is absolute
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return NextResponse.json(
                { error: 'Invalid URL. Must be absolute URL.' },
                { status: 400 }
            )
        }

        console.log('🔄 Proxying request:', { method, url })

        // Build fetch options
        const fetchOptions: RequestInit = {
            method,
            headers: {
                ...headers,
            },
        }

        // Make the actual request from the backend
        const response = await fetch(url, fetchOptions)

        const contentType = response.headers.get('content-type')
        let data

        if (contentType?.includes('application/json')) {
            data = await response.json()
        } else {
            const text = await response.text()
            data = { response: text }
        }

        console.log('✅ Proxy response:', { status: response.status })

        // Return the response with proper status
        return NextResponse.json(data, {
            status: response.status,
        })
    } catch (error: any) {
        console.error('❌ Proxy error:', error)
        return NextResponse.json(
            { error: error.message || 'Proxy request failed' },
            { status: 500 }
        )
    }
}