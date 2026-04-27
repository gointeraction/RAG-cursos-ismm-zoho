import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { CourseWithSchedule, Location } from '../../types/database'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { BookOpen, MapPin, Calendar, Trash2, Pencil, Check, X, LayoutGrid, List } from 'lucide-react'

export default function CourseListPage() {
    const [courses, setCourses] = useState<CourseWithSchedule[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState<string | null>(null)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
    const [editDates, setEditDates] = useState<{ start_date: string; end_date: string }>({ start_date: '', end_date: '' })
    const [savingDates, setSavingDates] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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

    const startEditingDates = (scheduleId: string, startDate: string, endDate: string) => {
        setEditingSchedule(scheduleId)
        setEditDates({ start_date: startDate, end_date: endDate })
    }

    const cancelEditingDates = () => {
        setEditingSchedule(null)
        setEditDates({ start_date: '', end_date: '' })
    }

    const saveDates = async (scheduleId: string, courseId: string) => {
        if (!editDates.start_date || !editDates.end_date) {
            alert('Please fill in both dates')
            return
        }

        setSavingDates(true)
        try {
            const { error } = await supabase
                .from('course_schedules')
                .update({
                    start_date: editDates.start_date,
                    end_date: editDates.end_date
                })
                .eq('id', scheduleId)

            if (error) throw error

            setCourses(courses.map(course =>
                course.id === courseId
                    ? {
                        ...course,
                        schedules: course.schedules.map((s: any) =>
                            s.id === scheduleId
                                ? { ...s, start_date: editDates.start_date, end_date: editDates.end_date }
                                : s
                        )
                    }
                    : course
            ))

            setEditingSchedule(null)
        } catch (error) {
            console.error('Error updating dates:', error)
            alert('Failed to update dates. Please try again.')
        } finally {
            setSavingDates(false)
        }
    }

    const deleteCourse = async (courseId: string, courseTitle: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${courseTitle}"?\n\nThis action cannot be undone. All course schedules and embeddings will also be deleted.`
        )
        if (!confirmed) return

        setDeleting(courseId)
        try {
            await supabase.from('course_embeddings').delete().filter('metadata->>course_id', 'eq', courseId)
            await supabase.from('course_embeddings_rd').delete().filter('metadata->>course_id', 'eq', courseId)

            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId)

            if (error) throw error

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

    const tipoBadgeColor = (tipo?: string) => {
        switch (tipo) {
            case 'DIPLOMADO': return 'bg-purple-100 text-purple-700'
            case 'CARRERA': return 'bg-orange-100 text-orange-700'
            default: return 'bg-indigo-100 text-indigo-700'
        }
    }

    const CourseToggle = ({ course, isActive, isTogglingThis }: { course: CourseWithSchedule, isActive: boolean, isTogglingThis: boolean }) => (
        <button
            onClick={() => toggleCourseStatus(course.id, isActive)}
            disabled={isTogglingThis}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isActive ? 'bg-indigo-600' : 'bg-gray-200'} ${isTogglingThis ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isActive ? 'Deactivate course' : 'Activate course'}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    )

    const DateEditor = ({ schedule, courseId }: { schedule: any, courseId: string }) => {
        if (!schedule) return null
        if (editingSchedule === schedule.id) {
            return (
                <div className="flex flex-col gap-1">
                    <input
                        type="date"
                        value={editDates.start_date}
                        onChange={(e) => setEditDates({ ...editDates, start_date: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 w-full"
                    />
                    <input
                        type="date"
                        value={editDates.end_date}
                        onChange={(e) => setEditDates({ ...editDates, end_date: e.target.value })}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 w-full"
                    />
                    <div className="flex gap-1 mt-1">
                        <button
                            onClick={() => saveDates(schedule.id, courseId)}
                            disabled={savingDates}
                            className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Check className="w-3 h-3" />
                            {savingDates ? '...' : 'Guardar'}
                        </button>
                        <button
                            onClick={cancelEditingDates}
                            disabled={savingDates}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )
        }
        return (
            <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="text-xs">
                    {format(parseISO(schedule.start_date), 'MMM d')} - {format(parseISO(schedule.end_date), 'MMM d, yy')}
                </span>
                <button
                    onClick={() => startEditingDates(schedule.id, schedule.start_date, schedule.end_date)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition ml-1"
                    title="Editar fechas"
                >
                    <Pencil className="w-3 h-3" />
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
                <div className="flex items-center gap-3">
                    {/* View toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Vista grid"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Vista lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Location filter */}
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
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {courses.map(course => {
                        const available = isAvailable(course.schedules)
                        const isActive = course.is_active
                        const isTogglingThis = toggling === course.id
                        const schedule = course.schedules?.[0]

                        return (
                            <div
                                key={course.id}
                                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 ${!isActive ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <BookOpen className="w-5 h-5 text-indigo-600 shrink-0" />
                                        <h3 className="font-semibold text-lg text-gray-900">{course.title}</h3>
                                    </div>
                                    <CourseToggle course={course} isActive={isActive} isTogglingThis={isTogglingThis} />
                                </div>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {isActive && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${available ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {available ? 'Available' : 'Unavailable'}
                                        </span>
                                    )}
                                    {course.tipo_programa && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${tipoBadgeColor(course.tipo_programa)}`}>
                                            {course.tipo_programa}
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
                                    {schedule && (
                                        <div>
                                            {editingSchedule === schedule.id ? (
                                                <div className="space-y-2 mt-2">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs text-gray-500">Fecha inicio</label>
                                                        <input
                                                            type="date"
                                                            value={editDates.start_date}
                                                            onChange={(e) => setEditDates({ ...editDates, start_date: e.target.value })}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs text-gray-500">Fecha fin</label>
                                                        <input
                                                            type="date"
                                                            value={editDates.end_date}
                                                            onChange={(e) => setEditDates({ ...editDates, end_date: e.target.value })}
                                                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 mt-1">
                                                        <button
                                                            onClick={() => saveDates(schedule.id, course.id)}
                                                            disabled={savingDates}
                                                            className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            {savingDates ? 'Guardando...' : 'Guardar'}
                                                        </button>
                                                        <button
                                                            onClick={cancelEditingDates}
                                                            disabled={savingDates}
                                                            className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200"
                                                        >
                                                            <X className="w-3 h-3" />
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>
                                                            {format(parseISO(schedule.start_date), 'MMM d')} -{' '}
                                                            {format(parseISO(schedule.end_date), 'MMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => startEditingDates(schedule.id, schedule.start_date, schedule.end_date)}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 transition"
                                                        title="Editar fechas"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => deleteCourse(course.id, course.title)}
                                        disabled={deleting === course.id}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        {deleting === course.id ? 'Deleting...' : 'Delete Course'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                /* LIST VIEW */
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-4">Curso</div>
                        <div className="col-span-2">Categoría</div>
                        <div className="col-span-2">Ubicación</div>
                        <div className="col-span-2">Fechas</div>
                        <div className="col-span-1 text-center">Estado</div>
                        <div className="col-span-1 text-center">Acciones</div>
                    </div>

                    {courses.map((course, idx) => {
                        const available = isAvailable(course.schedules)
                        const isActive = course.is_active
                        const isTogglingThis = toggling === course.id
                        const schedule = course.schedules?.[0]

                        return (
                            <div
                                key={course.id}
                                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-gray-100 hover:bg-gray-50 transition ${!isActive ? 'opacity-60' : ''} ${idx === courses.length - 1 ? 'border-b-0' : ''}`}
                            >
                                {/* Nombre */}
                                <div className="col-span-4 flex items-center gap-2 min-w-0">
                                    <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{course.title}</p>
                                        <div className="flex gap-1 mt-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            {isActive && (
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${available ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {available ? 'Available' : 'Unavailable'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Categoría */}
                                <div className="col-span-2">
                                    {course.tipo_programa ? (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipoBadgeColor(course.tipo_programa)}`}>
                                            {course.tipo_programa}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">—</span>
                                    )}
                                </div>

                                {/* Ubicación */}
                                <div className="col-span-2 flex items-center gap-1 text-gray-500 text-sm">
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{course.location?.name}</span>
                                </div>

                                {/* Fechas */}
                                <div className="col-span-2">
                                    {schedule && <DateEditor schedule={schedule} courseId={course.id} />}
                                </div>

                                {/* Toggle */}
                                <div className="col-span-1 flex justify-center">
                                    <CourseToggle course={course} isActive={isActive} isTogglingThis={isTogglingThis} />
                                </div>

                                {/* Eliminar */}
                                <div className="col-span-1 flex justify-center">
                                    <button
                                        onClick={() => deleteCourse(course.id, course.title)}
                                        disabled={deleting === course.id}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                        title="Eliminar curso"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
