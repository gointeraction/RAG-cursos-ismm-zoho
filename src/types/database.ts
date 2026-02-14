export interface Location {
    id: string
    name: string
    country_code: string
}

export interface Course {
    id: string
    title: string
    description?: string
    location_id: string
    content_text?: string
    pdf_url?: string
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface CourseSchedule {
    id: string
    course_id: string
    start_date: string
    end_date: string
    is_active: boolean
    created_at: string
}

export interface CourseWithSchedule extends Course {
    schedules: CourseSchedule[]
    location: Location
}
