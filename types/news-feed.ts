export interface NewsFeedPost {
    id: string
    assistantId: string
    userId: string
    content: string | null
    isPublic: boolean
    likeCount: number
    commentCount: number
    isLikedByCurrentUser?: boolean
    createdAt: Date
    updatedAt: Date
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    }
}

export interface NewsFeedLike {
    id: string
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    }
    createdAt: Date
}

export interface NewsFeedComment {
    id: string
    newsFeedId: number
    userId: string
    comment: string | null
    parentCommentId: string | null
    status: string
    createdAt: Date
    updatedAt: Date
    user: {
        id: string
        name: string | null
        email: string
        image: string | null
    }
    replies?: NewsFeedComment[]
}

export interface CreatePostData {
    assistantId: string
    content: string
    isPublic?: boolean
}

export interface UpdatePostData {
    postId: string
    content?: string
    isPublic?: boolean
}

export interface CreateCommentData {
    postId: string
    comment: string
    parentCommentId?: string
}

export interface UpdateCommentData {
    commentId: string
    comment: string
}