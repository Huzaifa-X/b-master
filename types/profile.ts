export interface ProfileData {
    name: string
    email: string
    organization: string
    gender: string
    address: string
    image: string
}

export interface ProfileTabProps {
    initialData: ProfileData
    onSave: (data: ProfileData) => void
    isLoading: boolean
}