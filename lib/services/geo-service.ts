// lib/services/geo-service.ts

export interface GeoLocation {
    ip: string
    city?: string
    region?: string
    country_name?: string
    timezone?: string
    latitude?: number
    longitude?: number
    error?: string
}

export interface UserContext {
    location?: {
        city?: string
        country?: string
        timezone?: string
    }
    currentTime?: string
}

/**
 * Get user location data from IP address
 */
export async function getGeoLocation(ip: string): Promise<GeoLocation> {
    try {
        // Fallback for local development
        if (ip === '::1' || ip === '127.0.0.1' || !ip) {
            // Using a sample IP for development (San Francisco)
            ip = '8.8.8.8' 
        }

        console.log(`[GeoService] Fetching location for IP: ${ip}`)
        const response = await fetch(`https://ipapi.co/${ip}/json/`)
        
        if (!response.ok) {
            throw new Error(`IPAPI error: ${response.statusText}`)
        }

        const data = await response.json()
        return data as GeoLocation
    } catch (error) {
        console.error(`[GeoService] ❌ Failed to get location:`, error)
        return { ip, error: 'Failed to fetch location' }
    }
}

/**
 * Build a structured user context for the system prompt
 */
export async function buildUserContext(ip: string): Promise<UserContext> {
    const geo = await getGeoLocation(ip)
    
    if (geo.error || !geo.timezone) {
        return {
            currentTime: new Date().toISOString()
        }
    }

    try {
        // Format time in the user's timezone
        const userTime = new Date().toLocaleString("en-US", {
            timeZone: geo.timezone,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        })

        return {
            location: {
                city: geo.city,
                country: geo.country_name,
                timezone: geo.timezone
            },
            currentTime: userTime
        }
    } catch (error) {
        console.error(`[GeoService] Error formatting time for timezone ${geo.timezone}:`, error)
        return {
            currentTime: new Date().toISOString()
        }
    }
}

/**
 * Generate the system prompt enrichment string
 */
export function getGeoSystemContext(context: UserContext): string {
    if (!context.location) {
        return `\n\n## User Context\n- **Current Time**: ${context.currentTime}\n- **Location**: Unknown`
    }

    return `\n\n## User Context\n- **Current Local Time**: ${context.currentTime}\n- **Location**: ${context.location.city || 'Unknown City'}, ${context.location.country || 'Unknown Country'}\n- **Timezone**: ${context.location.timezone}\n- **Language Preference**: Likely French/Swiss based on application context.`
}
