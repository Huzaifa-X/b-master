import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import axios from 'axios'

export async function POST(request: NextRequest) {
    try {
        // Verify user is authenticated
        const session = await getServerSession()
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized. Please sign in.' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { url, method = 'GET', headers = {}, requestBody } = body

        // Validate URL is absolute
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return NextResponse.json(
                { error: 'Invalid URL. Must be absolute URL.' },
                { status: 400 }
            )
        }

        // Validate method
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
        if (!validMethods.includes(method.toUpperCase())) {
            return NextResponse.json(
                { error: `Invalid HTTP method: ${method}` },
                { status: 400 }
            )
        }

        console.log('🔄 Proxying request:', {
            method,
            url: url.replace(/([?&](api[_-]?key|token|auth)=)[^&]*/gi, '$1***'),
            hasBody: !!requestBody
        })

        // Make the actual request using axios (more reliable than node fetch)
        const response = await axios({
            method: method.toLowerCase(),
            url,
            headers,
            data: requestBody,
            validateStatus: () => true, // Don't throw on any status code
            maxRedirects: 5,
            timeout: 0, // No timeout
        })

        const contentType = response.headers['content-type'] || ''
        let data = response.data

        // If response is not JSON or text, provide metadata
        if (typeof data !== 'object' && typeof data !== 'string') {
            data = {
                message: 'Response received but content type is not text/json',
                contentType,
                status: response.status,
                statusText: response.statusText
            }
        }

        console.log('✅ Proxy response:', {
            status: response.status,
            contentType,
            size: JSON.stringify(data).length
        })

        // Return the response with proper status and additional metadata
        return NextResponse.json({
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText,
            data,
            headers: response.headers
        }, {
            status: response.status,
        })
    } catch (error: any) {
        console.error('❌ Proxy error:', error)

        // Handle axios-specific errors
        if (error.code === 'ENOTFOUND') {
            return NextResponse.json(
                { error: 'Domain not found. Check that the URL is correct.' },
                { status: 404 }
            )
        }

        if (error.code === 'ECONNREFUSED') {
            return NextResponse.json(
                { error: 'Connection refused. The server may be down or not accepting connections.' },
                { status: 503 }
            )
        }

        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return NextResponse.json(
                { error: 'Request timeout. The server took too long to respond.' },
                { status: 504 }
            )
        }

        if (error.code === 'ERR_BAD_REQUEST') {
            return NextResponse.json(
                { error: 'Invalid request. Check your URL and parameters.' },
                { status: 400 }
            )
        }

        // SSL/TLS errors
        if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
            return NextResponse.json(
                { error: 'SSL certificate error. The API\'s SSL certificate could not be verified.' },
                { status: 495 }
            )
        }

        // Network errors
        if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
            return NextResponse.json(
                { error: 'Network connection lost. Please try again.' },
                { status: 503 }
            )
        }

        // Return generic error with details
        return NextResponse.json(
            {
                error: error.message || 'Request failed',
                code: error.code,
                details: error.response?.data || error.cause?.message
            },
            { status: error.response?.status || 500 }
        )
    }
}