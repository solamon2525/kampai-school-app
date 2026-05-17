"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, ChevronDown, LogIn, AlertCircle } from 'lucide-react';
import { ExamData, Student } from '@/lib/db';

export default function StudentLogin() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [entering, setEntering] = useState(false);

    useEffect(() => {
        fetch('/api/data')
            .then(res => res.json())
            .then((data: ExamData) => {
                setStudents(data.students);
                setLoading(false);
            });
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudentId) return;
        setEntering(true);
        const student = students.find(s => s.id === selectedStudentId);
        if (student) {
            localStorage.setItem('studentId', student.id);
            localStorage.setItem('studentName', student.name);
            localStorage.setItem('studentGrade', student.grade.toString());
            router.push('/student/dashboard');
        }
    };

    const grade5 = students.filter(s => s.grade === 5);
    const grade4 = students.filter(s => s.grade === 4);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 flex flex-col items-center justify-center p-4">
            {/* Card */}
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
                {/* Top banner */}
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-8 py-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <GraduationCap size={36} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">เข้าสู่ระบบสอบ</h1>
                    <p className="text-indigo-200 text-sm mt-1">ปลายภาคเรียนที่ 2 ปีการศึกษา 2568</p>
                    <p className="text-indigo-100 text-xs mt-1">โรงเรียนบ้านคำไผ่</p>
                </div>

                {/* Form */}
                <div className="px-8 py-8">
                    {loading ? (
                        <div className="text-center py-6">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
                            <p className="text-gray-400 text-sm">กำลังโหลดรายชื่อ...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label htmlFor="student-select" className="block text-sm font-bold text-gray-700 mb-2">
                                    เลือกชื่อของคุณ
                                </label>
                                <div className="relative">
                                    <select
                                        id="student-select"
                                        value={selectedStudentId}
                                        onChange={e => setSelectedStudentId(e.target.value)}
                                        className="w-full appearance-none bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 py-3.5 pr-12 text-gray-800 font-medium outline-none transition-all cursor-pointer"
                                    >
                                        <option value="" disabled>-- กรุณาเลือกชื่อ --</option>
                                        {grade5.length > 0 && <optgroup label="🎒 ระดับชั้น ป.5">
                                            {grade5.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </optgroup>}
                                        {grade4.length > 0 && <optgroup label="🎒 ระดับชั้น ป.4">
                                            {grade4.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </optgroup>}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                                </div>
                            </div>

                            {/* Show selected student info */}
                            {selectedStudentId && (() => {
                                const student = students.find(s => s.id === selectedStudentId);
                                return student ? (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 ${student.grade === 5 ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-orange-400 to-amber-500'}`}>
                                            ป.{student.grade}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                                            <p className="text-indigo-600 text-xs font-medium">ประถมศึกษาปีที่ {student.grade}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            <button
                                type="submit"
                                disabled={!selectedStudentId || entering}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                            >
                                {entering ? (
                                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />กำลังเข้าสู่ระบบ...</>
                                ) : (
                                    <><LogIn size={18} /> เข้าทำข้อสอบ</>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium">
                            ← กลับหน้าหลัก
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
