"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ExamData, ExamQuestion, Subject } from '@/lib/db';
import { CheckCircle2, ChevronLeft, HelpCircle } from 'lucide-react';

export default function ExamTaking({ params }: { params: Promise<{ subject: string }> }) {
    const router = useRouter();
    const { subject: subjectId } = use(params);
    const [data, setData] = useState<ExamData | null>(null);
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentName, setStudentName] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [completed, setCompleted] = useState(false);
    const [score, setScore] = useState<number | null>(null);

    useEffect(() => {
        const id = localStorage.getItem('studentId');
        const name = localStorage.getItem('studentName');
        if (!id) {
            router.push('/student');
            return;
        }
        setStudentId(id);
        setStudentName(name);

        fetch('/api/data')
            .then(res => res.json())
            .then((json: ExamData) => {
                setData(json);
                const sub = json.subjects.find(s => s.id === subjectId) || null;
                setSubject(sub);
                const qs = json.exams[subjectId] || [];
                setQuestions(qs);

                // redirect if they already took it
                const hasTaken = json.scores.some(s => s.studentId === id && s.subjectId === subjectId);
                if (hasTaken) {
                    router.push('/student/dashboard');
                    return;
                }

                if (qs.length === 0) {
                    router.push('/student/dashboard'); // nothing to test
                }
            });
    }, [router, subjectId]);

    const handleSelectAnswer = (qIndex: number, choiceIndex: number) => {
        setAnswers(prev => ({ ...prev, [qIndex]: choiceIndex }));
    };

    const handleSubmit = async () => {
        // Validate if all questions answered
        if (Object.keys(answers).length < questions.length) {
            alert('กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งข้อสอบ');
            return;
        }

        if (!confirm('คุณแน่ใจว่าต้องการส่งคำตอบ? ไม่สามารถแก้ไขได้หลังจากส่ง')) {
            return;
        }

        setSubmitting(true);

        // Calculate score
        let totalScore = 0;
        questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                totalScore++;
            }
        });

        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    subjectId,
                    score: totalScore,
                    maxScore: questions.length
                })
            });

            if (res.ok) {
                setScore(totalScore);
                setCompleted(true);
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึกคะแนน โปรดลองใหม่');
            }
        } catch (e) {
            alert('เกิดข้อผิดพลาดในการบันทึกคะแนน');
        } finally {
            setSubmitting(false);
        }
    };

    if (!subject || questions.length === 0) {
        return <div className="min-h-screen flex justify-center items-center">กำลังโหลดข้อสอบ...</div>;
    }

    if (completed) {
        return (
            <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-10 text-center animate-in zoom-in duration-300">
                    <CheckCircle2 size={80} className="mx-auto text-emerald-500 mb-6" />
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">ส่งคำตอบสำเร็จ!</h2>
                    <p className="text-lg text-gray-600 mb-8">วิชา: {subject.name}</p>

                    {score !== null && (
                        <div className="bg-blue-100 rounded-2xl py-6 px-4 mb-6">
                            <p className="text-blue-600 text-sm uppercase tracking-widest font-semibold mb-2">คะแนนที่ได้</p>
                            <p className="text-4xl font-bold text-blue-900">{score} / {questions.length}</p>
                            <p className="text-blue-700 text-sm mt-2">
                                {((score / questions.length) * 100).toFixed(1)}%
                            </p>
                        </div>
                    )}

                    <div className="bg-emerald-100 rounded-2xl py-6 px-4 mb-8">
                        <p className="font-bold text-emerald-800 text-sm uppercase tracking-widest mb-1">ยินดีด้วย {studentName}</p>
                        <p className="text-emerald-900 text-lg">การทำข้อสอบของคุณถูกบันทึกเรียบร้อย</p>
                    </div>

                    <button
                        onClick={() => router.push('/student/dashboard')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-colors text-lg"
                    >
                        กลับสู่หน้ารายวิชา
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow sticky top-0 z-10 transition-shadow">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/student/dashboard')}
                            className="text-gray-400 hover:text-gray-900 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800 line-clamp-1">{subject.name}</h1>
                    </div>
                    <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        {Object.keys(answers).length} / {questions.length} ข้อ
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-gray-100">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    />
                </div>
            </header>

            <main className="flex-grow max-w-3xl mx-auto px-4 py-8 w-full space-y-8 pb-32">
                {questions.map((q, index) => {
                    const isAnswered = answers[index] !== undefined;

                    return (
                        <div
                            key={q.id}
                            id={`q-${index}`}
                            className={`bg-white rounded-2xl shadow-sm border-2 transition-colors p-6 sm:p-8
                ${isAnswered ? 'border-emerald-200 shadow-emerald-50/50' : 'border-gray-100'}
              `}
                        >
                            <div className="flex items-start mb-6">
                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mr-4 text-sm border border-indigo-200 shadow-sm">
                                    {index + 1}
                                </span>
                                <h3 className="text-xl font-bold text-gray-800 leading-relaxed pt-1">
                                    {q.text}
                                </h3>
                            </div>

                            <div className="space-y-3 pl-12 pr-4">
                                {q.choices.map((choice, cIndex) => {
                                    const isSelected = answers[index] === cIndex;
                                    return (
                                        <label
                                            key={cIndex}
                                            className={`
                        relative flex items-center p-4 cursor-pointer rounded-xl border-2 transition-all duration-200 group
                        ${isSelected
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100 scale-[1.01]'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                }
                      `}
                                        >
                                            <input
                                                type="radio"
                                                name={`q-${index}`}
                                                value={cIndex}
                                                checked={isSelected}
                                                onChange={() => handleSelectAnswer(index, cIndex)}
                                                className="sr-only"
                                            />
                                            <div className={`
                          flex-shrink-0 w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-colors
                          ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}
                        `}
                                            >
                                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                            </div>
                                            <span className={`text-[1.05rem] ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                                                {choice}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </main>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-3xl mx-auto flex justify-between items-center px-2">
                    <div className="text-gray-500 text-sm hidden sm:flex items-center font-medium">
                        <HelpCircle size={18} className="mr-2" />
                        ตรวจทานคำตอบให้ครบก่อนส่ง
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || Object.keys(answers).length < questions.length}
                        className={`
              font-bold py-3 px-10 rounded-xl shadow-md transition-all sm:ml-auto w-full sm:w-auto text-lg
              ${Object.keys(answers).length < questions.length
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg active:scale-95'
                            }
            `}
                    >
                        {submitting ? 'กำลังส่ง...' : 'ส่งคำตอบ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
