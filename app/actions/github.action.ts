"use server"

import { Octokit } from "@octokit/rest"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function fetchGithubRepo(owner: string, repo: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: "Authentication required"
            }
        }

        const githubToken = process.env.GITHUB_PAT
        if (!githubToken) {
            return {
                success: false,
                error: "GITHUB_PAT environment variable is not set on the server"
            }
        }

        const octokit = new Octokit({ auth: githubToken })

        // 1. Get the repository default branch
        const { data: repoData } = await octokit.rest.repos.get({
            owner,
            repo
        })
        const defaultBranch = repoData.default_branch

        // 2. Get the latest commit SHA of the default branch
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
        })
        const commitSha = refData.object.sha

        // 3. Get the tree (recursive) to get all files
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: commitSha,
            recursive: "1",
        })

        // 4. Fetch content for all files (filter out directories)
        const blobs = treeData.tree.filter(item => item.type === "blob")

        const files: Record<string, string> = {}

        // Fetch blobs in parallel (chunks of 10 to avoid rate limits if many files)
        const chunkSize = 10
        for (let i = 0; i < blobs.length; i += chunkSize) {
            const chunk = blobs.slice(i, i + chunkSize)
            await Promise.all(
                chunk.map(async (blob) => {
                    if (!blob.path || !blob.sha) return

                    const { data: blobContent } = await octokit.rest.git.getBlob({
                        owner,
                        repo,
                        file_sha: blob.sha
                    })

                    // The content is base64 encoded
                    const content = Buffer.from(blobContent.content, 'base64').toString('utf-8')
                    files[blob.path] = content
                })
            )
        }

        return {
            success: true,
            data: {
                files,
                defaultBranch,
                owner,
                repo
            }
        }

    } catch (err: any) {
        console.error("[fetchGithubRepo] error:", err)
        return {
            success: false,
            error: err.message || "Failed to fetch repository from GitHub"
        }
    }
}
