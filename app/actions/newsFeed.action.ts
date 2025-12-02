'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ================================================================
// CREATE POST
// ================================================================

export async function createNewsFeedPost(data: {
    assistantId: string
    content: string
    isPublic?: boolean
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)

        // Check if user has access to post (owner or contact with newsfeed permission)
        const hasAccess = await checkNewsFeedAccess(assistantId, userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have permission to post in this newsfeed'
            }
        }

        // Create the post
        const post = await prisma.assistantNewsFeed.create({
            data: {
                assistantId,
                userId,
                content: data.content,
                isPublic: data.isPublic ?? true,
                likeCount: 0,
                commentCount: 0
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        revalidatePath(`/assistants/${data.assistantId}/newsfeed`)

        return {
            success: true,
            post: {
                ...post,
                id: post.id.toString(),
                assistantId: post.assistantId.toString(),
                userId: post.userId.toString()
            }
        }
    } catch (error) {
        console.error('Error creating newsfeed post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create post'
        }
    }
}

// ================================================================
// GET POSTS (with pagination)
// ================================================================

export async function getNewsFeedPosts(data: {
    assistantId: string
    page?: number
    limit?: number
    userId?: string // Optional: filter by specific user
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const currentUserId = BigInt(session.user.id)
        const assistantId = BigInt(data.assistantId)
        const page = data.page || 1
        const limit = data.limit || 10
        const skip = (page - 1) * limit

        // Check access
        const hasAccess = await checkNewsFeedAccess(assistantId, currentUserId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have permission to view this newsfeed'
            }
        }

        // Build where clause
        const where: any = {
            assistantId
        }

        if (data.userId) {
            where.userId = BigInt(data.userId)
        }

        // Get posts with user info, likes, and comments
        const [posts, totalCount] = await Promise.all([
            prisma.assistantNewsFeed.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    },
                    likes: {
                        where: {
                            userId: currentUserId
                        },
                        select: {
                            id: true
                        }
                    },
                    comments: {
                        where: {
                            status: 'active',
                            parentCommentId: null // Only top-level comments for count
                        },
                        select: {
                            id: true
                        }
                    }
                }
            }),
            prisma.assistantNewsFeed.count({ where })
        ])

        // Format posts
        const formattedPosts = posts.map(post => ({
            ...post,
            id: post.id.toString(),
            assistantId: post.assistantId.toString(),
            userId: post.userId.toString(),
            user: {
                ...post.user,
                id: post.user.id.toString()
            },
            isLikedByCurrentUser: post.likes.length > 0,
            likes: undefined,
            comments: undefined
        }))

        return {
            success: true,
            posts: formattedPosts,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        }
    } catch (error) {
        console.error('Error fetching newsfeed posts:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch posts'
        }
    }
}

// ================================================================
// GET SINGLE POST
// ================================================================

export async function getNewsFeedPost(postId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const currentUserId = BigInt(session.user.id)

        const post = await prisma.assistantNewsFeed.findUnique({
            where: {
                id: parseInt(postId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                likes: {
                    where: {
                        userId: currentUserId
                    },
                    select: {
                        id: true
                    }
                }
            }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        // Check access
        const hasAccess = await checkNewsFeedAccess(post.assistantId, currentUserId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have permission to view this post'
            }
        }

        return {
            success: true,
            post: {
                ...post,
                id: post.id.toString(),
                assistantId: post.assistantId.toString(),
                userId: post.userId.toString(),
                user: {
                    ...post.user,
                    id: post.user.id.toString()
                },
                isLikedByCurrentUser: post.likes.length > 0,
                likes: undefined
            }
        }
    } catch (error) {
        console.error('Error fetching post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch post'
        }
    }
}

// ================================================================
// UPDATE POST
// ================================================================

export async function updateNewsFeedPost(data: {
    postId: string
    content?: string
    isPublic?: boolean
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const postId = parseInt(data.postId)

        // Check if post exists and user is the owner
        const post = await prisma.assistantNewsFeed.findUnique({
            where: { id: postId }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        if (post.userId !== userId) {
            return {
                success: false,
                error: 'You can only edit your own posts'
            }
        }

        // Update the post
        const updatedPost = await prisma.assistantNewsFeed.update({
            where: { id: postId },
            data: {
                ...(data.content !== undefined && { content: data.content }),
                ...(data.isPublic !== undefined && { isPublic: data.isPublic })
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            }
        })

        revalidatePath(`/assistants/${post.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            post: {
                ...updatedPost,
                id: updatedPost.id.toString(),
                assistantId: updatedPost.assistantId.toString(),
                userId: updatedPost.userId.toString(),
                user: {
                    ...updatedPost.user,
                    id: updatedPost.user.id.toString()
                }
            }
        }
    } catch (error) {
        console.error('Error updating post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update post'
        }
    }
}

// ================================================================
// DELETE POST
// ================================================================

export async function deleteNewsFeedPost(postId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const postIdInt = parseInt(postId)

        // Check if post exists
        const post = await prisma.assistantNewsFeed.findUnique({
            where: { id: postIdInt },
            include: {
                assistant: {
                    select: { userId: true }
                }
            }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        // Only post owner or assistant owner can delete
        const isPostOwner = post.userId === userId
        const isAssistantOwner = post.assistant.userId === userId

        if (!isPostOwner && !isAssistantOwner) {
            return {
                success: false,
                error: 'You do not have permission to delete this post'
            }
        }

        // Delete the post (this will cascade delete likes and comments)
        await prisma.assistantNewsFeed.delete({
            where: { id: postIdInt }
        })

        revalidatePath(`/assistants/${post.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            message: 'Post deleted successfully'
        }
    } catch (error) {
        console.error('Error deleting post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete post'
        }
    }
}

// ================================================================
// LIKE POST
// ================================================================

export async function likeNewsFeedPost(postId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const postIdInt = parseInt(postId)

        // Check if post exists
        const post = await prisma.assistantNewsFeed.findUnique({
            where: { id: postIdInt }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        // Check access
        const hasAccess = await checkNewsFeedAccess(post.assistantId, userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have permission to like this post'
            }
        }

        // Check if already liked
        const existingLike = await prisma.assistantNewsFeedLike.findUnique({
            where: {
                newsFeedId_userId: {
                    newsFeedId: postIdInt,
                    userId: userId
                }
            }
        })

        if (existingLike) {
            return {
                success: false,
                error: 'You have already liked this post'
            }
        }

        // Create like and increment like count
        await prisma.$transaction([
            prisma.assistantNewsFeedLike.create({
                data: {
                    newsFeedId: postIdInt,
                    userId: userId
                }
            }),
            prisma.assistantNewsFeed.update({
                where: { id: postIdInt },
                data: {
                    likeCount: {
                        increment: 1
                    }
                }
            })
        ])

        revalidatePath(`/assistants/${post.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            message: 'Post liked successfully'
        }
    } catch (error) {
        console.error('Error liking post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to like post'
        }
    }
}

// ================================================================
// UNLIKE POST
// ================================================================

export async function unlikeNewsFeedPost(postId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const postIdInt = parseInt(postId)

        // Check if post exists
        const post = await prisma.assistantNewsFeed.findUnique({
            where: { id: postIdInt }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        // Check if like exists
        const existingLike = await prisma.assistantNewsFeedLike.findUnique({
            where: {
                newsFeedId_userId: {
                    newsFeedId: postIdInt,
                    userId: userId
                }
            }
        })

        if (!existingLike) {
            return {
                success: false,
                error: 'You have not liked this post'
            }
        }

        // Delete like and decrement like count
        await prisma.$transaction([
            prisma.assistantNewsFeedLike.delete({
                where: {
                    newsFeedId_userId: {
                        newsFeedId: postIdInt,
                        userId: userId
                    }
                }
            }),
            prisma.assistantNewsFeed.update({
                where: { id: postIdInt },
                data: {
                    likeCount: {
                        decrement: 1
                    }
                }
            })
        ])

        revalidatePath(`/assistants/${post.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            message: 'Post unliked successfully'
        }
    } catch (error) {
        console.error('Error unliking post:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to unlike post'
        }
    }
}

// ================================================================
// GET POST LIKES
// ================================================================

export async function getPostLikes(postId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const likes = await prisma.assistantNewsFeedLike.findMany({
            where: {
                newsFeedId: parseInt(postId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return {
            success: true,
            likes: likes.map(like => ({
                id: like.id.toString(),
                user: {
                    ...like.user,
                    id: like.user.id.toString()
                },
                createdAt: like.createdAt
            }))
        }
    } catch (error) {
        console.error('Error fetching likes:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch likes'
        }
    }
}

// ================================================================
// CREATE COMMENT
// ================================================================

export async function createComment(data: {
    postId: string
    comment: string
    parentCommentId?: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const postIdInt = parseInt(data.postId)

        // Check if post exists
        const post = await prisma.assistantNewsFeed.findUnique({
            where: { id: postIdInt }
        })

        if (!post) {
            return {
                success: false,
                error: 'Post not found'
            }
        }

        // Check access
        const hasAccess = await checkNewsFeedAccess(post.assistantId, userId)
        if (!hasAccess) {
            return {
                success: false,
                error: 'You do not have permission to comment on this post'
            }
        }

        // If replying to a comment, verify parent exists
        if (data.parentCommentId) {
            const parentComment = await prisma.assistantNewsFeedComment.findUnique({
                where: { id: parseInt(data.parentCommentId) }
            })

            if (!parentComment || parentComment.newsFeedId !== postIdInt) {
                return {
                    success: false,
                    error: 'Parent comment not found'
                }
            }
        }

        // Create comment and increment comment count (only for top-level comments)
        const comment = await prisma.$transaction(async (tx) => {
            const newComment = await tx.assistantNewsFeedComment.create({
                data: {
                    newsFeedId: postIdInt,
                    userId: userId,
                    comment: data.comment,
                    parentCommentId: data.parentCommentId ? parseInt(data.parentCommentId) : null,
                    status: 'active'
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                }
            })

            // Only increment count for top-level comments
            if (!data.parentCommentId) {
                await tx.assistantNewsFeed.update({
                    where: { id: postIdInt },
                    data: {
                        commentCount: {
                            increment: 1
                        }
                    }
                })
            }

            return newComment
        })

        revalidatePath(`/assistants/${post.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            comment: {
                ...comment,
                id: comment.id.toString(),
                userId: comment.userId.toString(),
                user: {
                    ...comment.user,
                    id: comment.user.id.toString()
                }
            }
        }
    } catch (error) {
        console.error('Error creating comment:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create comment'
        }
    }
}

// ================================================================
// GET COMMENTS
// ================================================================

export async function getComments(data: {
    postId: string
    parentCommentId?: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const postIdInt = parseInt(data.postId)

        const comments = await prisma.assistantNewsFeedComment.findMany({
            where: {
                newsFeedId: postIdInt,
                parentCommentId: data.parentCommentId ? parseInt(data.parentCommentId) : null,
                status: 'active'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                replies: {
                    where: {
                        status: 'active'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                image: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        const formattedComments = comments.map(comment => ({
            ...comment,
            id: comment.id.toString(),
            userId: comment.userId.toString(),
            parentCommentId: comment.parentCommentId?.toString() || null,
            user: {
                ...comment.user,
                id: comment.user.id.toString()
            },
            replies: comment.replies.map(reply => ({
                ...reply,
                id: reply.id.toString(),
                userId: reply.userId.toString(),
                parentCommentId: reply.parentCommentId?.toString() || null,
                user: {
                    ...reply.user,
                    id: reply.user.id.toString()
                }
            }))
        }))

        return {
            success: true,
            comments: formattedComments
        }
    } catch (error) {
        console.error('Error fetching comments:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch comments'
        }
    }
}

// ================================================================
// UPDATE COMMENT
// ================================================================

export async function updateComment(data: {
    commentId: string
    comment: string
}) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const commentId = parseInt(data.commentId)

        // Check if comment exists and user is the owner
        const existingComment = await prisma.assistantNewsFeedComment.findUnique({
            where: { id: commentId }
        })

        if (!existingComment) {
            return {
                success: false,
                error: 'Comment not found'
            }
        }

        if (existingComment.userId !== userId) {
            return {
                success: false,
                error: 'You can only edit your own comments'
            }
        }

        // Update the comment
        const updatedComment = await prisma.assistantNewsFeedComment.update({
            where: { id: commentId },
            data: {
                comment: data.comment
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                newsFeed: {
                    select: {
                        assistantId: true
                    }
                }
            }
        })

        revalidatePath(`/assistants/${updatedComment.newsFeed.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            comment: {
                ...updatedComment,
                id: updatedComment.id.toString(),
                userId: updatedComment.userId.toString(),
                user: {
                    ...updatedComment.user,
                    id: updatedComment.user.id.toString()
                },
                newsFeed: undefined
            }
        }
    } catch (error) {
        console.error('Error updating comment:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update comment'
        }
    }
}

// ================================================================
// DELETE COMMENT
// ================================================================

export async function deleteComment(commentId: string) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return {
                success: false,
                error: 'Authentication required'
            }
        }

        const userId = BigInt(session.user.id)
        const commentIdInt = parseInt(commentId)

        // Check if comment exists
        const comment = await prisma.assistantNewsFeedComment.findUnique({
            where: { id: commentIdInt },
            include: {
                newsFeed: {
                    include: {
                        assistant: {
                            select: { userId: true }
                        }
                    }
                }
            }
        })

        if (!comment) {
            return {
                success: false,
                error: 'Comment not found'
            }
        }

        // Only comment owner or assistant owner can delete
        const isCommentOwner = comment.userId === userId
        const isAssistantOwner = comment.newsFeed.assistant.userId === userId

        if (!isCommentOwner && !isAssistantOwner) {
            return {
                success: false,
                error: 'You do not have permission to delete this comment'
            }
        }

        // Soft delete the comment and decrement count (only for top-level comments)
        await prisma.$transaction(async (tx) => {
            await tx.assistantNewsFeedComment.update({
                where: { id: commentIdInt },
                data: {
                    status: 'deleted',
                    comment: '[deleted]'
                }
            })

            // Only decrement count for top-level comments
            if (!comment.parentCommentId) {
                await tx.assistantNewsFeed.update({
                    where: { id: comment.newsFeedId },
                    data: {
                        commentCount: {
                            decrement: 1
                        }
                    }
                })
            }
        })

        revalidatePath(`/assistants/${comment.newsFeed.assistantId.toString()}/newsfeed`)

        return {
            success: true,
            message: 'Comment deleted successfully'
        }
    } catch (error) {
        console.error('Error deleting comment:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete comment'
        }
    }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

async function checkNewsFeedAccess(assistantId: bigint, userId: bigint): Promise<boolean> {
    // Check if user is the assistant owner
    const assistant = await prisma.assistant.findUnique({
        where: { id: assistantId },
        select: { userId: true, public: true }
    })

    if (!assistant) return false
    if (assistant.userId === userId) return true

    // Check if user is a contact with newsfeed permission
    const contact = await prisma.assistantContact.findFirst({
        where: {
            assistantId: assistantId,
            userId: userId
        }
    })

    if (!contact) {
        // If assistant is public, allow access
        return assistant.public
    }

    // Check if contact has admin access or newsfeed permission
    if (contact.access === 'admin') return true

    if (contact.permissions) {
        try {
            const permissions = JSON.parse(contact.permissions)
            return permissions.includes('newsfeed')
        } catch {
            return false
        }
    }

    return false
}