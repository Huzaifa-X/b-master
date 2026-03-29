"use server"

import { z } from "zod"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const addDomainSchema = z.object({
  artifactId: z.number(),
  domain: z.string().min(3, "Domain is required"),
  githubUrl: z.string().min(1, "GitHub URL is required"),
})

const checkDomainStatusSchema = z.object({
  artifactId: z.number(),
  domain: z.string(),
  githubUrl: z.string(),
})

const DOMAIN_API_BASE = process.env.DEPLOY_API_URL || "https://deploy.prod.bmaster.ch/"

/**
 * Add a custom domain to a deployed project
 */
export async function addCustomDomain(input: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: { message: "Authentication required" } }
    }

    const parseResult = addDomainSchema.safeParse(input)
    if (!parseResult.success) {
      return {
        success: false,
        error: { message: parseResult.error.issues[0]?.message || "Invalid input" }
      }
    }

    const { artifactId, domain, githubUrl } = parseResult.data

    // Verify user has access to artifact
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactId,
        OR: [
          { userId: BigInt(session.user.id) },
          { permissions: { some: { userId: BigInt(session.user.id), access: "ADMIN" } } }
        ]
      },
      select: { metadata: true }
    })

    if (!artifact) {
      return { success: false, error: { message: "Artifact not found or access denied" } }
    }

    // Call external domain API
    const response = await fetch(`${DOMAIN_API_BASE}domain/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ github_url: githubUrl, domain })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Domain API error: ${errorData}`)
    }

    const data = await response.json()

    // Update artifact metadata with domain info
    const currentMetadata = (artifact.metadata as any) || {}
    await prisma.assistantArtifact.update({
      where: { id: artifactId },
      data: {
        metadata: {
          ...currentMetadata,
          customDomain: {
            domain,
            verified: false,
            configuredAt: new Date().toISOString(),
            dnsRecords: data.dns_records || [],
            verificationRecords: data.verification_records || [],
            message: data.message
          }
        }
      }
    })

    return {
      success: true,
      data: {
        domain: data.domain,
        verified: data.verified,
        dnsRecords: data.dns_records || [],
        verificationRecords: data.verification_records || [],
        message: data.message
      }
    }
  } catch (error: any) {
    console.error("[addCustomDomain]", error)
    return {
      success: false,
      error: { message: error.message || "Failed to add custom domain" }
    }
  }
}

/**
 * Check domain verification status
 */
export async function checkDomainStatus(input: any) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: { message: "Authentication required" } }
    }

    const parseResult = checkDomainStatusSchema.safeParse(input)
    if (!parseResult.success) {
      return { success: false, error: { message: "Invalid input" } }
    }

    const { artifactId, domain, githubUrl } = parseResult.data

    // Verify user has access to artifact
    const artifact = await prisma.assistantArtifact.findFirst({
      where: {
        id: artifactId,
        OR: [
          { userId: BigInt(session.user.id) },
          { permissions: { some: { userId: BigInt(session.user.id), access: "ADMIN" } } }
        ]
      },
      select: { metadata: true }
    })

    if (!artifact) {
      return { success: false, error: { message: "Artifact not found or access denied" } }
    }

    // Call external domain API
    const url = `${DOMAIN_API_BASE}domain/status?github_url=${encodeURIComponent(githubUrl)}&domain=${encodeURIComponent(domain)}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Domain status check failed`)
    }

    const data = await response.json()

    // Update artifact metadata if verified
    if (data.verified) {
      const currentMetadata = (artifact.metadata as any) || {}
      const customDomain = currentMetadata.customDomain || {}

      await prisma.assistantArtifact.update({
        where: { id: artifactId },
        data: {
          metadata: {
            ...currentMetadata,
            customDomain: {
              ...customDomain,
              verified: true,
              verifiedAt: new Date().toISOString()
            }
          }
        }
      })
    }

    return {
      success: true,
      data: {
        domain: data.domain,
        verified: data.verified,
        misconfigured: data.misconfigured,
        cdnEnabled: data.cdn_enabled
      }
    }
  } catch (error: any) {
    console.error("[checkDomainStatus]", error)
    return {
      success: false,
      error: { message: error.message || "Failed to check domain status" }
    }
  }
}
