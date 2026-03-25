import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
    createNewsFeedPost,
    getNewsFeedPosts,
    getNewsFeedPost,
    updateNewsFeedPost,
    deleteNewsFeedPost,
    likeNewsFeedPost,
    unlikeNewsFeedPost,
    getPostLikes,
    createComment,
    getComments,
    updateComment,
    deleteComment,
    getNewsFeedPostPermissions,
    updateNewsFeedPostPermissions,
    addNewsFeedPostPermission,
    removeNewsFeedPostPermission
} from '@/app/actions/newsFeed.action'
import { toast } from 'sonner'
import { useLocale } from '@/lib/i18n'

// ================================================================
// TYPES
// ================================================================

interface User {
    id: string
    name: string | null
    email: string | null
    image: string | null
}

interface Post {
    id: string
    assistantId: string
    userId: string
    title: string | null
    content: string | null
    image: string | null
    isPublic: boolean
    likeCount: number
    commentCount: number
    createdAt: Date
    updatedAt: Date
    user: User
    isLikedByCurrentUser: boolean
}

interface PostsResponse {
    success: boolean
    posts: Post[]
    pagination: {
        page: number
        limit: number
        totalCount: number
        totalPages: number
        hasMore: boolean
    }
    error?: string
}

// ================================================================
// POST QUERIES
// ================================================================

export function useNewsFeedPosts(assistantId: string, userId?: string) {
    return useInfiniteQuery<PostsResponse>({
        queryKey: ['newsfeed-posts', assistantId, userId],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await getNewsFeedPosts({
                assistantId,
                page: pageParam as number,
                limit: 10,
                userId
            })

            return result
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination?.hasMore) {
                return lastPage.pagination.page + 1
            }
            return undefined
        },
        initialPageParam: 1
    })
}

export function useNewsFeedPost(postId: string) {
    return useQuery({
        queryKey: ['newsfeed-post', postId],
        queryFn: async () => {
            const result = await getNewsFeedPost(postId)

            if (!result.success) {
                throw new Error(result.error)
            }

            return result.post
        },
        enabled: !!postId
    })
}

// ================================================================
// POST MUTATIONS
// ================================================================

export function useCreatePost() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createNewsFeedPost,
        onSuccess: (data) => {
            if (data.success && 'post' in data && data.post) {
                toast.success(t('feed.postCreated'))
                // Invalidate all queries for this assistant
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts', data.post.assistantId]
                })
            } else {
                toast.error(data.error || t('feed.errorCreatePost'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorCreatePost'))
        }
    })
}

export function useUpdatePost() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateNewsFeedPost,
        onSuccess: (data) => {
            if (data.success && 'post' in data && data.post) {
                toast.success(t('feed.postUpdated'))
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts', data.post.assistantId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-post', data.post.id]
                })
            } else {
                toast.error(data.error || t('feed.errorUpdatePost'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorUpdatePost'))
        }
    })
}

export function useDeletePost() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteNewsFeedPost,
        onSuccess: (data, postId) => {
            if (data.success) {
                toast.success(t('feed.postDeleted'))
                // Invalidate all newsfeed queries to refresh the list
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
                queryClient.removeQueries({
                    queryKey: ['newsfeed-post', postId]
                })
            } else {
                toast.error(data.error || t('feed.errorDeletePost'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorDeletePost'))
        }
    })
}

// ================================================================
// LIKE QUERIES & MUTATIONS
// ================================================================

export function usePostLikes(postId: string) {
    return useQuery({
        queryKey: ['post-likes', postId],
        queryFn: async () => {
            const result = await getPostLikes(postId)

            if (!result.success) {
                throw new Error(result.error)
            }

            return result.likes
        },
        enabled: !!postId
    })
}

export function useLikePost() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: likeNewsFeedPost,
        onMutate: async (postId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['newsfeed-posts'] })

            // Snapshot the previous value
            const previousQueries = queryClient.getQueriesData<PostsResponse>({ 
                queryKey: ['newsfeed-posts'] 
            })

            // Optimistically update all matching queries
            queryClient.setQueriesData<any>(
                { queryKey: ['newsfeed-posts'] },
                (old: any) => {
                    if (!old?.pages) return old

                    return {
                        ...old,
                        pages: old.pages.map((page: PostsResponse) => ({
                            ...page,
                            posts: page.posts?.map((post: Post) =>
                                post.id === postId
                                    ? {
                                        ...post,
                                        likeCount: post.likeCount + 1,
                                        isLikedByCurrentUser: true
                                    }
                                    : post
                            )
                        }))
                    }
                }
            )

            return { previousQueries }
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['post-likes'] })
            } else {
                toast.error(data.error || t('feed.errorLikePost'))
            }
        },
        onError: (error: Error, postId, context) => {
            // Rollback on error
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data)
                })
            }
            toast.error(error.message || t('feed.errorLikePost'))
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ['newsfeed-posts'] })
        }
    })
}

export function useUnlikePost() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: unlikeNewsFeedPost,
        onMutate: async (postId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['newsfeed-posts'] })

            // Snapshot the previous value
            const previousQueries = queryClient.getQueriesData<PostsResponse>({ 
                queryKey: ['newsfeed-posts'] 
            })

            // Optimistically update all matching queries
            queryClient.setQueriesData<any>(
                { queryKey: ['newsfeed-posts'] },
                (old: any) => {
                    if (!old?.pages) return old

                    return {
                        ...old,
                        pages: old.pages.map((page: PostsResponse) => ({
                            ...page,
                            posts: page.posts?.map((post: Post) =>
                                post.id === postId
                                    ? {
                                        ...post,
                                        likeCount: Math.max(0, post.likeCount - 1),
                                        isLikedByCurrentUser: false
                                    }
                                    : post
                            )
                        }))
                    }
                }
            )

            return { previousQueries }
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['post-likes'] })
            } else {
                toast.error(data.error || t('feed.errorUnlikePost'))
            }
        },
        onError: (error: Error, postId, context) => {
            // Rollback on error
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data)
                })
            }
            toast.error(error.message || t('feed.errorUnlikePost'))
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ['newsfeed-posts'] })
        }
    })
}

// ================================================================
// COMMENT QUERIES & MUTATIONS
// ================================================================

export function useComments(postId: string, parentCommentId?: string) {
    return useQuery({
        queryKey: ['comments', postId, parentCommentId],
        queryFn: async () => {
            const result = await getComments({ postId, parentCommentId })

            if (!result.success) {
                throw new Error(result.error)
            }

            return result.comments
        },
        enabled: !!postId
    })
}

export function useCreateComment() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createComment,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success(t('feed.commentAdded'))
                // Invalidate comments for this post
                queryClient.invalidateQueries({
                    queryKey: ['comments', variables.postId]
                })
                // Invalidate posts to update comment count
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || t('feed.errorAddComment'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorAddComment'))
        }
    })
}

export function useUpdateComment() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateComment,
        onSuccess: (data) => {
            if (data.success) {
                toast.success(t('feed.commentUpdated'))
                queryClient.invalidateQueries({
                    queryKey: ['comments']
                })
            } else {
                toast.error(data.error || t('feed.errorUpdateComment'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorUpdateComment'))
        }
    })
}

export function useDeleteComment() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteComment,
        onSuccess: (data) => {
            if (data.success) {
                toast.success(t('feed.commentDeleted'))
                queryClient.invalidateQueries({
                    queryKey: ['comments']
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || t('feed.errorDeleteComment'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorDeleteComment'))
        }
    })
}

// ================================================================
// PERMISSION MANAGEMENT HOOKS
// ================================================================

export function usePostPermissions(postId: string) {
    return useQuery({
        queryKey: ['post-permissions', postId],
        queryFn: async () => {
            const result = await getNewsFeedPostPermissions(postId)

            if (!result.success) {
                throw new Error(result.error)
            }

            return result
        },
        enabled: !!postId
    })
}

export function useUpdatePostPermissions() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateNewsFeedPostPermissions,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success(t('feed.permissionsUpdated'))
                queryClient.invalidateQueries({
                    queryKey: ['post-permissions', variables.postId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || t('feed.errorUpdatePermissions'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorUpdatePermissions'))
        }
    })
}

export function useAddPostPermission() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: addNewsFeedPostPermission,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success(t('feed.permissionAdded'))
                queryClient.invalidateQueries({
                    queryKey: ['post-permissions', variables.postId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || t('feed.errorAddPermission'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorAddPermission'))
        }
    })
}

export function useRemovePostPermission() {
    const { t } = useLocale()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: removeNewsFeedPostPermission,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success(t('feed.permissionRemoved'))
                queryClient.invalidateQueries({
                    queryKey: ['post-permissions', variables.postId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || t('feed.errorRemovePermission'))
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || t('feed.errorRemovePermission'))
        }
    })
}

// ================================================================
// TOGGLE LIKE (Combined hook for convenience)
// ================================================================

export function useToggleLike() {
    const likePost = useLikePost()
    const unlikePost = useUnlikePost()

    return {
        toggleLike: (postId: string, isLiked: boolean) => {
            if (isLiked) {
                return unlikePost.mutate(postId)
            } else {
                return likePost.mutate(postId)
            }
        },
        isLoading: likePost.isPending || unlikePost.isPending
    }
}