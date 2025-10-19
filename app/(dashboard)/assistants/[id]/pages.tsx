import React from 'react'

export default async function AssistantPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    return (
        <div>
            <h1>Assistant Page {id}</h1>
        </div>
    )
}