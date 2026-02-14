import { useAuth } from '../contexts/AuthContext'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { BookOpen, PlusCircle, LogOut } from 'lucide-react'

export default function DashboardPage() {
    const { user, signOut } = useAuth()
    const location = useLocation()

    const navItems = [
        { path: '/dashboard/courses', label: 'Courses', icon: BookOpen },
        { path: '/dashboard/courses/new', label: 'Add Course', icon: PlusCircle },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-8">
                            <h1 className="text-xl font-bold text-gray-900">
                                Course Manager
                            </h1>
                            <div className="flex gap-1">
                                {navItems.map(item => {
                                    const Icon = item.icon
                                    const isActive = location.pathname === item.path
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${isActive
                                                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.label}
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user?.email}</span>
                            <button
                                onClick={() => signOut()}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    )
}
