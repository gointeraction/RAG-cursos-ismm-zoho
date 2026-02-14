import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Location } from '../../types/database'
import { Upload, Loader2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export default function CourseCreatePage() {
    const navigate = useNavigate()
    const [locations, setLocations] = useState<Location[]>([])
    const [loading, setLoading] = useState(false)
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [extracting, setExtracting] = useState(false)

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location_id: '',
        start_date: '',
        end_date: '',
        is_active: true,
    })

    useEffect(() => {
        fetchLocations()
    }, [])

    const fetchLocations = async () => {
        const { data } = await supabase.from('locations').select('*')
        if (data) setLocations(data)
    }

    const extractTextFromPDF = async (file: File): Promise<string> => {
        setExtracting(true)
        try {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
            let fullText = ''

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i)
                const textContent = await page.getTextContent()
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ')
                fullText += pageText + '\n'
            }

            return fullText.trim()
        } catch (error) {
            console.error('Error extracting PDF text:', error)
            throw new Error('Failed to extract text from PDF')
        } finally {
            setExtracting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type === 'application/pdf') {
            setPdfFile(file)
        } else {
            alert('Please select a valid PDF file')
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!formData.title || !formData.location_id || !formData.start_date || !formData.end_date) {
            alert('Please fill in all required fields')
            return
        }

        setLoading(true)

        try {
            let pdfUrl = null
            let contentText = null

            // Handle PDF upload and text extraction
            if (pdfFile) {
                // Extract text from PDF
                contentText = await extractTextFromPDF(pdfFile)

                // Upload PDF to Supabase Storage
                const fileExt = pdfFile.name.split('.').pop()
                const fileName = `${Date.now()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('course-pdfs')
                    .upload(fileName, pdfFile)

                if (uploadError) {
                    // Create bucket if it doesn't exist
                    const { error: bucketError } = await supabase.storage.createBucket('course-pdfs', {
                        public: true,
                    })

                    if (!bucketError) {
                        // Retry upload
                        const { data: retryData, error: retryError } = await supabase.storage
                            .from('course-pdfs')
                            .upload(fileName, pdfFile)

                        if (retryError) throw retryError
                        pdfUrl = retryData?.path
                    } else {
                        throw uploadError
                    }
                } else {
                    pdfUrl = uploadData?.path
                }

                // Get public URL
                if (pdfUrl) {
                    const { data: urlData } = supabase.storage
                        .from('course-pdfs')
                        .getPublicUrl(pdfUrl)
                    pdfUrl = urlData.publicUrl
                }
            }

            // Insert course
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .insert({
                    title: formData.title,
                    description: formData.description,
                    location_id: formData.location_id,
                    content_text: contentText,
                    pdf_url: pdfUrl,
                    is_active: formData.is_active,
                })
                .select()
                .single()

            if (courseError) throw courseError

            // Insert schedule
            const { error: scheduleError } = await supabase
                .from('course_schedules')
                .insert({
                    course_id: courseData.id,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    is_active: true,
                })

            if (scheduleError) throw scheduleError

            // Success - navigate to course list
            navigate('/dashboard/courses')
        } catch (error) {
            console.error('Error creating course:', error)
            alert('Failed to create course. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Add New Course</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-8 space-y-6">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        Course Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="e.g., Advanced Culinary Techniques"
                    />
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        placeholder="Describe the course content and objectives..."
                    />
                </div>

                {/* Location */}
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                        Location <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="location"
                        value={formData.location_id}
                        onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    >
                        <option value="">Select a location</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                            End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="end_date"
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                        />
                    </div>
                </div>

                {/* Activation Status */}
                <div className="flex items-center gap-3">
                    <input
                        id="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                        Activate course immediately
                    </label>
                </div>
                <p className="text-sm text-gray-500 -mt-4 ml-7">
                    Inactive courses will not be visible to public users
                </p>

                {/* PDF Upload */}
                <div>
                    <label htmlFor="pdf" className="block text-sm font-medium text-gray-700 mb-2">
                        Course Material (PDF)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition">
                        <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label
                                    htmlFor="pdf"
                                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                >
                                    <span>Upload a PDF</span>
                                    <input
                                        id="pdf"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="sr-only"
                                    />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PDF up to 10MB</p>
                            {pdfFile && (
                                <p className="text-sm text-green-600 font-medium mt-2">
                                    ✓ {pdfFile.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                        The PDF content will be automatically extracted for AI-powered search
                    </p>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/courses')}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || extracting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading || extracting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {extracting ? 'Extracting PDF...' : 'Creating...'}
                            </>
                        ) : (
                            'Create Course'
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
