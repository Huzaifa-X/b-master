"use server"

import { Octokit } from "@octokit/rest"
import { z } from "zod"

const deploySchema = z.object({
    repoName: z.string().min(1, "Repository name is required"),
    description: z.string().optional(),
    isPrivate: z.boolean().default(false),
    files: z.record(z.string(), z.string()).refine((val) => Object.keys(val).length > 0, { message: "No files to deploy" }),
})

export async function deployToGithubAndVercel(input: any) {
    try {
        const parseResult = deploySchema.safeParse(input)
        if (!parseResult.success) {
            return {
                success: false,
                error: { message: parseResult.error.issues[0]?.message || "Invalid input" }
            }
        }

        const { repoName, description, isPrivate, files } = parseResult.data

        const githubToken = process.env.GITHUB_PAT
        if (!githubToken) {
            return {
                success: false,
                error: { message: "GITHUB_PAT environment variable is not set on the server" }
            }
        }

        const octokit = new Octokit({ auth: githubToken })

        // 1. Get authenticated user
        const { data: user } = await octokit.rest.users.getAuthenticated()
        const owner = user.login

        // 2. Create Repository
        let repoResponse;
        try {
            repoResponse = await octokit.rest.repos.createForAuthenticatedUser({
                name: repoName,
                description: description || "Deployed via B-Coder Workspace",
                private: isPrivate,
                auto_init: true, // we need an initial commit to get a branch to push to
            })
        } catch (err: any) {
            // handle repo already exists
            if (err.status === 422 && err.message?.includes('already exists')) {
                return {
                    success: false,
                    error: { message: `Repository '${repoName}' already exists on GitHub. Please choose a different name.` }
                }
            }
            return {
                success: false,
                error: { message: `Failed to create repository: ${err.message}` }
            }
        }

        const repoUrl = repoResponse.data.html_url
        const defaultBranch = repoResponse.data.default_branch || "main"

        // 3. Get the latest commit SHA of the default branch
        const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo: repoName,
            ref: `heads/${defaultBranch}`,
        })
        const commitSha = refData.object.sha

        // 4. Get the tree SHA for the commit
        const { data: commitData } = await octokit.rest.git.getCommit({
            owner,
            repo: repoName,
            commit_sha: commitSha,
        })
        const baseTreeSha = commitData.tree.sha

        // 5. Create blobs (files) and prepare the new tree items
        const treeItems = await Promise.all(
            Object.entries(files).map(async ([filePath, content]) => {
                // create a blob for the file content
                const { data: blobData } = await octokit.rest.git.createBlob({
                    owner,
                    repo: repoName,
                    content: content,
                    encoding: "utf-8",
                })

                return {
                    path: filePath,
                    mode: "100644" as const, // file (blob)
                    type: "blob" as const,
                    sha: blobData.sha,
                }
            })
        )

        // 6. Create the new tree
        const { data: newTreeData } = await octokit.rest.git.createTree({
            owner,
            repo: repoName,
            base_tree: baseTreeSha,
            tree: treeItems,
        })

        // 7. Create a new commit
        const { data: newCommitData } = await octokit.rest.git.createCommit({
            owner,
            repo: repoName,
            message: "Initial commit by B-Coder",
            tree: newTreeData.sha,
            parents: [commitSha],
        })

        // 8. Update the branch reference
        await octokit.rest.git.updateRef({
            owner,
            repo: repoName,
            ref: `heads/${defaultBranch}`,
            sha: newCommitData.sha,
        })

        // ============================================
        // 9. Deploy to Vercel via internal API endpoint
        // ============================================
        const fullRepoPath = `${owner}/${repoName}`
        const deployEndpoint = "https://pdf-converter.dev.bmaster.ch/deploy"

        let vercelUrl = ""

        try {
            const deployRes = await fetch(deployEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    github_url: fullRepoPath,
                    first_time: true
                })
            })

            if (!deployRes.ok) {
                const errData = await deployRes.text()
                console.error("Vercel Deploy Error:", errData)
                throw new Error(`Vercel deployment failed (${deployRes.status})`)
            }

            const data = await deployRes.json()

            // Let's assume the endpoint returns `{ "url": "someurl.vercel.app" }`
            // or just a raw string depending on swagger.
            vercelUrl = typeof data === 'string' ? data : data.url || data.live_url || data.vercel_url || ""

        } catch (err: any) {
            return {
                success: false,
                error: { message: `Code pushed to GitHub successfully, but Vercel Deployment trigger failed: ${err.message}` }
            }
        }

        return {
            success: true,
            data: {
                githubUrl: repoUrl,
                vercelUrl: vercelUrl,
            }
        }

    } catch (error: any) {
        console.error("[deployToGithubAndVercel]", error)
        return {
            success: false,
            error: { message: error.message || "Failed to deploy project" }
        }
    }
}
