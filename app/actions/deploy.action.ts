"use server"

import { Octokit } from "@octokit/rest"
import { z } from "zod"

const deploySchema = z.object({
    repoName: z.string().min(1, "Repository name is required"),
    description: z.string().optional(),
    isPrivate: z.boolean().default(false),
    files: z.record(z.string(), z.string()).refine((val) => Object.keys(val).length > 0, { message: "No files to deploy" }),
    isUpdate: z.boolean().optional(),
    activeArtifactId: z.number().optional(),
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

        const { repoName, description, isPrivate, files, isUpdate, activeArtifactId } = parseResult.data
        const assistantId = input.assistantId

        if (!assistantId) {
            return {
                success: false,
                error: { message: "Assistant ID is required to save the deployment as an artifact." }
            }
        }

        // Get authenticated user for artifact creation
        const { getServerSession } = await import("next-auth")
        const { authOptions } = await import("@/lib/auth")
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return {
                success: false,
                error: { message: "Authentication required to deploy" }
            }
        }

        const userId = BigInt(session.user.id)
        const assistantIdBigInt = BigInt(assistantId)


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

        // 2. Handle Repository
        let defaultBranch = "main"
        if (!isUpdate) {
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
            defaultBranch = repoResponse.data.default_branch || "main"
        } else {
            // Get repository to confirm existence and get default branch
            try {
                const { data: existingRepo } = await octokit.rest.repos.get({
                    owner,
                    repo: repoName,
                })
                defaultBranch = existingRepo.default_branch || "main"
            } catch (err: any) {
                return { success: false, error: { message: `Repository '${repoName}' not found or inaccessible.` } }
            }
        }

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
                    content: content as string,
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
            message: isUpdate ? (description || "Update deployment by B-Coder") : "Initial commit by B-Coder",
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
                    first_time: !isUpdate
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

        // ===========================================
        // 10. Save as an Artifact
        // ===========================================
        let artifactId: number | null = null;
        const repoUrl = `https://github.com/${owner}/${repoName}`
        try {
            // Import prisma dynamically to avoid edge runtime issues if applicable
            const { default: prisma } = await import('@/lib/prisma')

            const deployMetadata = {
                githubUrl: repoUrl,
                vercelUrl: vercelUrl,
                owner: owner,
                repo: repoName
            }

            if (isUpdate && activeArtifactId) {
                // Determine next version number
                const lastVersion = await prisma.artifactVersion.findFirst({
                    where: { artifactId: activeArtifactId },
                    orderBy: { versionNumber: 'desc' }
                });
                const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

                const newVersion = await prisma.artifactVersion.create({
                    data: {
                        artifactId: activeArtifactId,
                        userId: userId,
                        versionNumber: nextVersionNumber,
                        versionName: `v1.0.${nextVersionNumber}`,
                        code: JSON.stringify(deployMetadata, null, 2),
                        description: description || "Update Deployment",
                        changeType: "user",
                        isSnapshot: false
                    }
                })

                await prisma.assistantArtifact.update({
                    where: { id: activeArtifactId },
                    data: { activeVersionId: newVersion.id }
                })

                artifactId = activeArtifactId;
            } else {
                const newArtifact = await prisma.assistantArtifact.create({
                    data: {
                        assistantId: assistantIdBigInt,
                        userId: userId,
                        name: repoName,
                        instructions: JSON.stringify(deployMetadata),
                        category: "Deployed Project",
                        isPublic: false,
                    }
                })

                artifactId = newArtifact.id

                // Create ADMIN permission for the creator
                await prisma.artifactPermission.create({
                    data: {
                        userId: userId,
                        assistantId: assistantIdBigInt,
                        artifactId: newArtifact.id,
                        access: 'ADMIN'
                    }
                })

                // Create an initial version
                const firstVersion = await prisma.artifactVersion.create({
                    data: {
                        artifactId: newArtifact.id,
                        userId: userId,
                        versionNumber: 1,
                        versionName: "v1.0.0",
                        code: JSON.stringify(deployMetadata, null, 2),
                        description: "Initial Deployment",
                        changeType: "user",
                        isSnapshot: false
                    }
                })

                // Update artifact with active version
                await prisma.assistantArtifact.update({
                    where: { id: newArtifact.id },
                    data: { activeVersionId: firstVersion.id }
                })
            }
        } catch (err) {
            console.error("Failed to save artifact:", err)
            // Soft fail: return success but log the error
        }

        return {
            success: true,
            data: {
                githubUrl: repoUrl,
                vercelUrl: vercelUrl,
                artifactId: artifactId
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
