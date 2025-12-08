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
    deleteComment
} from '@/app/actions/newsFeed.action'
import { toast } from 'sonner'

// ================================================================
// POST QUERIES
// ================================================================

export function useNewsFeedPosts(assistantId: string, userId?: string) {
    return useInfiniteQuery({
        queryKey: ['newsfeed-posts', assistantId, userId],
        queryFn: async ({ pageParam = 1 }) => {
            const result = await getNewsFeedPosts({
                assistantId,
                page: pageParam,
                limit: 10,
                userId
            })

            if (!result.success) {
                throw new Error(result.error)
            }

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
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createNewsFeedPost,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Post created successfully')
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts', data.post?.assistantId]
                })
            } else {
                toast.error(data.error || 'Failed to create post')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create post')
        }
    })
}

export function useUpdatePost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateNewsFeedPost,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Post updated successfully')
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts', data.post?.assistantId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-post', data.post?.id]
                })
            } else {
                toast.error(data.error || 'Failed to update post')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update post')
        }
    })
}

export function useDeletePost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteNewsFeedPost,
        onSuccess: (data, postId) => {
            if (data.success) {
                toast.success('Post deleted successfully')
                // Invalidate all newsfeed queries to refresh the list
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
                queryClient.removeQueries({
                    queryKey: ['newsfeed-post', postId]
                })
            } else {
                toast.error(data.error || 'Failed to delete post')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete post')
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
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: likeNewsFeedPost,
        onMutate: async (postId) => {
            // Optimistically update the UI
            await queryClient.cancelQueries({ queryKey: ['newsfeed-posts'] })

            const previousData = queryClient.getQueriesData({ queryKey: ['newsfeed-posts'] })

            // Update cache optimistically
            queryClient.setQueriesData({ queryKey: ['newsfeed-posts'] }, (old: any) => {
                if (!old?.pages) return old

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        posts: page.posts?.map((post: any) =>
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
            })

            return { previousData }
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['post-likes'] })
            } else {
                toast.error(data.error || 'Failed to like post')
            }
        },
        onError: (error: Error, postId, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueriesData({ queryKey: ['newsfeed-posts'] }, context.previousData)
            }
            toast.error(error.message || 'Failed to like post')
        }
    })
}

export function useUnlikePost() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: unlikeNewsFeedPost,
        onMutate: async (postId) => {
            // Optimistically update the UI
            await queryClient.cancelQueries({ queryKey: ['newsfeed-posts'] })

            const previousData = queryClient.getQueriesData({ queryKey: ['newsfeed-posts'] })

            // Update cache optimistically
            queryClient.setQueriesData({ queryKey: ['newsfeed-posts'] }, (old: any) => {
                if (!old?.pages) return old

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        posts: page.posts?.map((post: any) =>
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
            })

            return { previousData }
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['post-likes'] })
            } else {
                toast.error(data.error || 'Failed to unlike post')
            }
        },
        onError: (error: Error, postId, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueriesData({ queryKey: ['newsfeed-posts'] }, context.previousData)
            }
            toast.error(error.message || 'Failed to unlike post')
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
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createComment,
        onSuccess: (data, variables) => {
            if (data.success) {
                toast.success('Comment added successfully')
                queryClient.invalidateQueries({
                    queryKey: ['comments', variables.postId]
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || 'Failed to add comment')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add comment')
        }
    })
}

export function useUpdateComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateComment,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Comment updated successfully')
                queryClient.invalidateQueries({
                    queryKey: ['comments']
                })
            } else {
                toast.error(data.error || 'Failed to update comment')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update comment')
        }
    })
}

export function useDeleteComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteComment,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Comment deleted successfully')
                queryClient.invalidateQueries({
                    queryKey: ['comments']
                })
                queryClient.invalidateQueries({
                    queryKey: ['newsfeed-posts']
                })
            } else {
                toast.error(data.error || 'Failed to delete comment')
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete comment')
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