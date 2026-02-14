import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { CourseWithSchedule, Location } from '../../types/database'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { BookOpen, MapPin, Calendar, Trash2 } from 'lucide-react'

export default function CourseListPage() {
    const [courses, setCourses] = useState<CourseWithSchedule[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)

    useEffect(() => {
        fetchLocations()
        fetchCourses()
    }, [selectedLocation])

    const fetchLocations = async () => {
        const { data } = await supabase.from('locations').select('*')
        if (data) setLocations(data)
    }

    const fetchCourses = async () => {
        setLoading(true)
        let query = supabase
            .from('courses')
            .select(`
        *,
        location:locations(*),
        schedules:course_schedules(*)
      `)

        if (selectedLocation !== 'all') {
            query = query.eq('location_id', selectedLocation)
        }

        const { data } = await query
        if (data) setCourses(data as any)
        setLoading(false)
    }

    const toggleCourseStatus = async (courseId: string, currentStatus: boolean) => {
        // Confirmation dialog for deactivation
        if (currentStatus) {
            const confirmed = window.confirm(
                'Are you sure you want to deactivate this course? It will no longer be visible to public users.'
            )
            if (!confirmed) return
        }

        setToggling(courseId)
        try {
            const { error } = await supabase
                .from('courses')
                .update({ is_active: !currentStatus })
                .eq('id', courseId)

            if (error) throw error

            // Update local state
            setCourses(courses.map(course =>
                course.id === courseId
                    ? { ...course, is_active: !currentStatus }
                    : course
            ))
        } catch (error) {
            console.error('Error toggling course status:', error)
            alert('Failed to update course status')
        } finally {
            setToggling(null)
        }
    }

    const deleteCourse = async (courseId: string, courseTitle: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${courseTitle}"?\n\nThis action cannot be undone. All course schedules will also be deleted.`
        )
        if (!confirmed) return

        setDeleting(courseId)
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId)

            if (error) throw error

            // Remove from local state
            setCourses(courses.filter(course => course.id !== courseId))
        } catch (error) {
            console.error('Error deleting course:', error)
            alert('Failed to delete course. Please try again.')
        } finally {
            setDeleting(null)
        }
    }

    const isAvailable = (schedules: any[]) => {
        if (!schedules || schedules.length === 0) return false
        const now = new Date()
        return schedules.some(schedule => {
            if (!schedule.is_active) return false
            try {
                return isWithinInterval(now, {
                    start: parseISO(schedule.start_date),
                    end: parseISO(schedule.end_date)
                })
            } catch {
                return false
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
                <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Locations</option>
                    {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map(course => {
                        const available = isAvailable(course.schedules)
                        const isActive = course.is_active
                        const isTogglingThis = toggling === course.id

                        return (
                            <div
                                key={course.id}
                                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 ${!isActive ? 'opacity-60' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <BookOpen className="w-5 h-5 text-indigo-600" />
                                        <h3 className="font-semibold text-lg text-gray-900">{course.title}</h3>
                                    </div>

                                    {/* Toggle Switch */}
                                    <button
                                        onClick={() => toggleCourseStatus(course.id, isActive)}
                                        disabled={isTogglingThis}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive ? 'bg-indigo-600' : 'bg-gray-200'
                                            } ${isTogglingThis ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                        title={isActive ? 'Deactivate course' : 'Activate course'}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {/* Status Badges */}
                                <div className="flex gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {isActive && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${available
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {available ? 'Available' : 'Unavailable'}
                                        </span>
                                    )}
                                </div>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {course.description || 'No description available'}
                                </p>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <MapPin className="w-4 h-4" />
                                        <span>{course.location?.name}</span>
                                    </div>
                                    {course.schedules && course.schedules.length > 0 && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            <span>
                                                {format(parseISO(course.schedules[0].start_date), 'MMM d')} - {' '}
                                                {format(parseISO(course.schedules[0].end_date), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Delete Button */}
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => deleteCourse(course.id, course.title)}
                                        disabled={deleting === course.id}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Delete course"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleting === course.id ? 'Deleting...' : 'Delete Course'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {!loading && courses.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-500">No courses found for this location.</p>
                </div>
            )}
        </div>
    )
}
