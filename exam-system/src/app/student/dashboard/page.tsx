"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, ChevronRight, UserCircle2, LogOut, GraduationCap, Clock } from 'lucide-react';
import { ExamData, Subject } from '@/lib/db';

export default function StudentDashboard() {
    const router = useRouter();
    const [data, setData] = useState<ExamData | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string | null>(null);
    const [studentGrade, setStudentGrade] = useState<string | null>(null);

    useEffect(() => {
        const id = localStorage.getItem('studentId');
        const name = localStorage.getItem('studentName');
        const grade = localStorage.getItem('studentGrade');
        if (!id || !name) { router.push('/student'); return; }
        setStudentId(id);
        setStudentName(name);
        setStudentGrade(grade);
        fetch('/api/data').then(r => r.json()).then(setData);
    }, [router]);

    if (!data || !studentId) {
        return (
            <div className="min-h-screen flex justify-center items-center bg-gray-50">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    const subjectsWithExams = data.subjects.filter(sub => data.exams[sub.id] && data.exams[sub.id].length > 0);
    const hasTaken = (subjectId: string) => data.scores.some(s => s.studentId === studentId && s.subjectId === subjectId);
    const completedCount = subjectsWithExams.filter(sub => hasTaken(sub.id)).length;
    const progress = subjectsWithExams.length > 0 ? (completedCount / subjectsWithExams.length) * 100 : 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-sm shadow-lg flex-shrink-0 ${studentGrade === '5' ? 'bg-white/20' : 'bg-white/20'}`}>
                            <UserCircle2 size={28} />
                        </div>
                        <div>
                            <p className="text-indigo-200 text-xs font-medium">นักเรียน ป.{studentGrade}</p>
                            <h1 className="text-lg font-bold">{studentName}</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => { localStorage.clear(); router.push('/student'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 rounded-xl text-sm font-medium border border-white/20 transition-all"
                    >
                        <LogOut size={16} /> ออกจากระบบ
                    </button>
                </div>

                {/* Progress bar area */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-5">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-white/80">ความคืบหน้าการสอบ</span>
                            <span className="text-sm font-bold text-white">{completedCount} / {subjectsWithExams.length} วิชา</span>
                        </div>
                        <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <h2 className="text-lg font-bold text-gray-900 mb-5">
                    วิชาที่ต้องสอบ
                    <span className="text-sm font-normal text-gray-400 ml-2">กดเลือกวิชาเพื่อเริ่มทำข้อสอบ</span>
                </h2>

                {subjectsWithExams.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm py-20 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen size={36} className="text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600">ยังไม่มีข้อสอบในระบบ</h3>
                        <p className="text-gray-400 text-sm mt-2">โปรดรอให้คุณครูเพิ่มข้อสอบก่อน</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                        {subjectsWithExams.map((subject, idx) => {
                            const isCompleted = hasTaken(subject.id);
                            const questionCount = data.exams[subject.id].length;

                            return (
                                <button
                                    key={subject.id}
                                    onClick={() => !isCompleted && router.push(`/student/exam/${subject.id}`)}
                                    disabled={isCompleted}
                                    className={`text-left rounded-2xl border-2 p-5 transition-all duration-300 group relative overflow-hidden w-full
                    ${isCompleted
                                            ? 'border-gray-100 bg-gray-50 cursor-default opacity-80'
                                            : 'border-transparent bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-200 cursor-pointer'
                                        }
                  `}
                                >
                                    {!isCompleted && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-100/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    )}

                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0
                      ${isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors'}`}>
                                            {isCompleted ? <CheckCircle2 size={22} /> : <BookOpen size={22} />}
                                        </div>
                                        {!isCompleted && (
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors text-indigo-400 group-hover:text-indigo-600 mt-1">
                                                <ChevronRight size={18} />
                                            </div>
                                        )}
                                        {isCompleted && (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-3 py-1 rounded-full border border-emerald-200">
                                                ✓ สอบแล้ว
                                            </span>
                                        )}
                                    </div>

                                    <h3 className={`font-bold text-base leading-snug mb-1 ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {subject.name}
                                    </h3>
                                    <p className={`text-sm flex items-center gap-1.5 ${isCompleted ? 'text-gray-400' : 'text-indigo-500 font-medium'}`}>
                                        <Clock size={13} /> {questionCount} ข้อ
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
