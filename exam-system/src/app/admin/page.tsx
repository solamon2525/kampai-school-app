"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

const HOME_URL = process.env.NEXT_PUBLIC_HOME_URL || '/';
import {
    Home, Trash2, Plus, Save, BookOpen, Users, Upload,
    Download, CheckCircle2, AlertCircle, X, RefreshCw, ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import { ExamData, ExamQuestion, Subject } from '@/lib/db';

/* ── Toast notification ─────────────────────────────────── */
type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium min-w-[260px] max-w-xs transition-all duration-300
            ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-500' : 'bg-indigo-600'}`}
                >
                    {t.type === 'success' ? <CheckCircle2 size={18} /> : t.type === 'error' ? <AlertCircle size={18} /> : <AlertCircle size={18} />}
                    <span className="flex-1">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
                </div>
            ))}
        </div>
    );
}

/* ── Import Modal ──────────────────────────────────────── */
type ImportModalProps = {
    subjectName: string;
    onClose: () => void;
    onImport: (questions: ExamQuestion[]) => void;
};

function ImportModal({ subjectName, onClose, onImport }: ImportModalProps) {
    const [tab, setTab] = useState<'json' | 'csv'>('json');
    const [jsonText, setJsonText] = useState('');
    const [csvText, setCsvText] = useState('');
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const JSON_EXAMPLE = JSON.stringify([
        {
            "text": "2 + 2 = ?",
            "choices": ["3", "4", "5", "6"],
            "correctAnswer": 1
        },
        {
            "text": "เมืองหลวงของประเทศไทยคือ?",
            "choices": ["เชียงใหม่", "กรุงเทพมหานคร", "ขอนแก่น", "ภูเก็ต"],
            "correctAnswer": 1
        }
    ], null, 2);

    const CSV_EXAMPLE = `คำถาม,ตัวเลือก1,ตัวเลือก2,ตัวเลือก3,ตัวเลือก4,เฉลย
2 + 2 = ?,3,4,5,6,2
เมืองหลวงของประเทศไทยคือ?,เชียงใหม่,กรุงเทพมหานคร,ขอนแก่น,ภูเก็ต,2`;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            if (file.name.endsWith('.json')) {
                setTab('json');
                setJsonText(content);
            } else {
                setTab('csv');
                setCsvText(content);
            }
        };
        reader.readAsText(file, 'utf-8');
    };

    const parseCSV = (text: string): ExamQuestion[] => {
        const lines = text.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('ไฟล์ CSV ต้องมีข้อมูลอย่างน้อย 1 แถว (ไม่นับหัวตาราง)');
        return lines.slice(1).map((line, i) => {
            // handle commas inside quoted fields
            const cols: string[] = [];
            let cur = '';
            let inQ = false;
            for (const ch of line) {
                if (ch === '"') { inQ = !inQ; continue; }
                if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
                cur += ch;
            }
            cols.push(cur.trim());

            if (cols.length < 6) throw new Error(`แถวที่ ${i + 2}: ต้องมีอย่างน้อย 6 คอลัมน์ (คำถาม, ตัวเลือก 1-4, เฉลย)`);
            const correctAnswer = parseInt(cols[5]) - 1;
            if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3)
                throw new Error(`แถวที่ ${i + 2}: คอลัมน์ "เฉลย" ต้องเป็นตัวเลข 1-4`);
            return {
                id: `q_${Date.now()}_${i}`,
                text: cols[0],
                choices: [cols[1], cols[2], cols[3], cols[4]],
                correctAnswer
            };
        });
    };

    const parseJSON = (text: string): ExamQuestion[] => {
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('ข้อมูล JSON ต้องเป็น Array []');
        return arr.map((item, i) => {
            if (!item.text || !Array.isArray(item.choices) || item.choices.length < 2)
                throw new Error(`ข้อที่ ${i + 1}: ต้องมีฟิลด์ "text" และ "choices" อย่างน้อย 2 ตัวเลือก`);
            if (typeof item.correctAnswer !== 'number')
                throw new Error(`ข้อที่ ${i + 1}: "correctAnswer" ต้องเป็นตัวเลข index (เริ่มจาก 0)`);
            return {
                id: `q_${Date.now()}_${i}`,
                text: item.text,
                choices: item.choices,
                correctAnswer: item.correctAnswer
            };
        });
    };

    const handleImport = () => {
        setError('');
        try {
            let questions: ExamQuestion[] = [];
            if (tab === 'json') {
                if (!jsonText.trim()) { setError('กรุณาวางหรืออัปโหลดข้อมูล JSON'); return; }
                questions = parseJSON(jsonText);
            } else {
                if (!csvText.trim()) { setError('กรุณาวางหรืออัปโหลดข้อมูล CSV'); return; }
                questions = parseCSV(csvText);
            }
            if (questions.length === 0) { setError('ไม่พบข้อสอบในไฟล์'); return; }
            onImport(questions);
        } catch (err: any) {
            setError(err.message || 'ข้อมูลไม่ถูกต้อง');
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Upload size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">นำเข้าข้อสอบ</h3>
                            <p className="text-xs text-gray-500">วิชา: {subjectName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Upload area */}
                <div className="p-5 border-b bg-gray-50/80">
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 rounded-xl p-6 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                        <Upload size={28} className="text-indigo-400 group-hover:text-indigo-600 mb-2 transition-colors" />
                        <span className="text-sm font-medium text-indigo-700">คลิกเพื่อเลือกไฟล์</span>
                        <span className="text-xs text-gray-400 mt-1">รองรับไฟล์ .json และ .csv</span>
                        <input ref={fileRef} type="file" accept=".json,.csv,.txt" className="sr-only" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* Tabs for manual paste */}
                <div className="flex border-b px-5 gap-2 pt-2">
                    {(['json', 'csv'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t === 'json' ? '📋 JSON' : '📊 CSV'}
                        </button>
                    ))}
                </div>

                <div className="p-5 flex flex-col gap-3 flex-1 overflow-y-auto min-h-0">
                    {tab === 'json' ? (
                        <>
                            <div className="text-xs text-gray-500">วางข้อมูล JSON (Array ของ objects) ลงในช่องด้านล่าง</div>
                            <details className="text-xs">
                                <summary className="cursor-pointer font-medium text-indigo-600 hover:underline inline-flex items-center gap-1">
                                    <FileText size={12} /> ดูตัวอย่าง JSON
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-900 text-emerald-300 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{JSON_EXAMPLE}</pre>
                            </details>
                            <textarea
                                value={jsonText}
                                onChange={e => setJsonText(e.target.value)}
                                className="w-full min-h-[180px] border border-gray-300 rounded-lg p-3 text-xs font-mono bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                                placeholder={JSON_EXAMPLE}
                            />
                        </>
                    ) : (
                        <>
                            <div className="text-xs text-gray-500">
                                รูปแบบ CSV: <strong>คำถาม, ตัวเลือก1, ตัวเลือก2, ตัวเลือก3, ตัวเลือก4, เฉลย(1-4)</strong>
                            </div>
                            <details className="text-xs">
                                <summary className="cursor-pointer font-medium text-indigo-600 hover:underline inline-flex items-center gap-1">
                                    <FileText size={12} /> ดูตัวอย่าง CSV
                                </summary>
                                <pre className="mt-2 p-3 bg-gray-900 text-emerald-300 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{CSV_EXAMPLE}</pre>
                            </details>
                            <textarea
                                value={csvText}
                                onChange={e => setCsvText(e.target.value)}
                                className="w-full min-h-[180px] border border-gray-300 rounded-lg p-3 text-xs font-mono bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                                placeholder={CSV_EXAMPLE}
                            />
                        </>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-200 font-medium transition-colors">
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleImport}
                        className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-2 shadow-md shadow-indigo-200 transition-colors"
                    >
                        <Upload size={16} /> นำเข้าข้อสอบ
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Admin Page ─────────────────────────────────────── */
export default function AdminDashboard() {
    const [data, setData] = useState<ExamData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'exams' | 'scores'>('exams');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [questions, setQuestions] = useState<ExamQuestion[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const addToast = useCallback((type: Toast['type'], message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

    const fetchData = async () => {
        const res = await fetch('/api/data');
        return res.json() as Promise<ExamData>;
    };

    useEffect(() => {
        fetchData().then(json => { setData(json); setLoading(false); });
    }, []);

    useEffect(() => {
        if (selectedSubject && data) {
            setQuestions(data.exams[selectedSubject.id] ? [...data.exams[selectedSubject.id]] : []);
        }
    }, [selectedSubject?.id]);

    const handleRefreshScores = async () => {
        setRefreshing(true);
        const json = await fetchData();
        setData(json);
        setTimeout(() => setRefreshing(false), 600);
    };

    const handleAddQuestion = () => {
        const newQ: ExamQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            choices: ['', '', '', ''],
            correctAnswer: 0
        };
        setQuestions(prev => [...prev, newQ]);
    };

    const handleUpdateQuestion = (index: number, field: keyof ExamQuestion, value: unknown) => {
        setQuestions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleUpdateChoice = (qIndex: number, cIndex: number, value: string) => {
        setQuestions(prev => {
            const next = [...prev];
            const choices = [...next[qIndex].choices];
            choices[cIndex] = value;
            next[qIndex] = { ...next[qIndex], choices };
            return next;
        });
    };

    const handleDeleteQuestion = (index: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveExams = async () => {
        if (!selectedSubject) return;
        const valid = questions.every(q => q.text.trim() !== '' && q.choices.every(c => c.trim() !== ''));
        if (!valid) { addToast('error', 'กรุณากรอกข้อมูลข้อสอบให้ครบทุกช่อง'); return; }

        setSaving(true);
        try {
            const res = await fetch('/api/exams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjectId: selectedSubject.id, questions })
            });
            if (res.ok) {
                addToast('success', `บันทึกข้อสอบวิชา "${selectedSubject.name}" สำเร็จ! (${questions.length} ข้อ)`);
                const json = await fetchData();
                setData(json);
            } else {
                addToast('error', 'เกิดข้อผิดพลาดในการบันทึก');
            }
        } catch {
            addToast('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
        } finally {
            setSaving(false);
        }
    };

    const handleExportJSON = () => {
        if (!selectedSubject || questions.length === 0) { addToast('info', 'ไม่มีข้อสอบที่จะส่งออก'); return; }
        const clean = questions.map(({ text, choices, correctAnswer }) => ({ text, choices, correctAnswer }));
        const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${selectedSubject.name}_questions.json`; a.click();
        URL.revokeObjectURL(url);
        addToast('success', 'ส่งออกไฟล์ JSON สำเร็จ');
    };

    const handleImportQuestions = (importedQuestions: ExamQuestion[]) => {
        if (questions.length > 0) {
            const confirmed = window.confirm(
                `มีข้อสอบอยู่แล้ว ${questions.length} ข้อ\nต้องการ "เพิ่มต่อ" หรือ "แทนที่ทั้งหมด"?\n\nกด OK เพื่อแทนที่ทั้งหมด\nกด Cancel เพื่อเพิ่มต่อจากของเดิม`
            );
            if (confirmed) {
                setQuestions(importedQuestions);
            } else {
                setQuestions(prev => [...prev, ...importedQuestions]);
            }
        } else {
            setQuestions(importedQuestions);
        }
        setShowImportModal(false);
        addToast('success', `นำเข้าสำเร็จ ${importedQuestions.length} ข้อ! อย่าลืมกด "บันทึกข้อสอบ"`);
    };

    if (loading || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer toasts={toasts} remove={removeToast} />
            {showImportModal && selectedSubject && (
                <ImportModal
                    subjectName={selectedSubject.name}
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportQuestions}
                />
            )}

            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header */}
                <header className="bg-white shadow-sm border-b sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <a href={HOME_URL} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="กลับ Super App บ้านคำไผ่">
                                <Home size={20} />
                            </a>
                            <div className="h-5 w-px bg-gray-200" />
                            <h1 className="text-lg font-bold text-gray-800">ระบบจัดการข้อสอบ</h1>
                        </div>
                        <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                            {[
                                { key: 'exams', label: 'จัดการข้อสอบ', icon: <BookOpen size={15} /> },
                                { key: 'scores', label: 'ดูคะแนนสอบ', icon: <Users size={15} /> },
                            ].map(({ key, label, icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key as any)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === key ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {icon}{label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </header>

                <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">

                    {/* ── EXAMS TAB ── */}
                    {activeTab === 'exams' && (
                        <div className="grid md:grid-cols-4 gap-6 items-start">
                            {/* Subject sidebar */}
                            <div className="md:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-xs uppercase tracking-widest text-gray-500">รายวิชา ({data.subjects.length})</div>
                                <ul className="divide-y divide-gray-50 max-h-[75vh] overflow-y-auto">
                                    {data.subjects.map(subject => {
                                        const qCount = data.exams[subject.id]?.length || 0;
                                        const isActive = selectedSubject?.id === subject.id;
                                        return (
                                            <li key={subject.id}>
                                                <button
                                                    onClick={() => setSelectedSubject(subject)}
                                                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex justify-between items-center gap-2 group
                            ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50 text-gray-700'}`}
                                                >
                                                    <span className="truncate">{subject.name}</span>
                                                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-white/20 text-white' : qCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                                                        {qCount > 0 ? qCount : '0'}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Questions editor */}
                            <div className="md:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {selectedSubject ? (
                                    <>
                                        {/* Toolbar */}
                                        <div className="sticky top-16 z-20 bg-white border-b px-6 py-4 flex flex-wrap gap-2 justify-between items-center">
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">{selectedSubject.name}</h2>
                                                <p className="text-xs text-gray-400 mt-0.5">{questions.length} ข้อสอบ</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={handleAddQuestion}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                                >
                                                    <Plus size={15} /> เพิ่มข้อสอบ
                                                </button>
                                                <button
                                                    onClick={() => setShowImportModal(true)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg transition-colors border border-violet-200"
                                                >
                                                    <Upload size={15} /> Import
                                                </button>
                                                <button
                                                    onClick={handleExportJSON}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                                    title="ส่งออกเป็น JSON"
                                                >
                                                    <Download size={15} /> Export
                                                </button>
                                                <button
                                                    onClick={handleSaveExams}
                                                    disabled={saving}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-60"
                                                >
                                                    <Save size={15} /> {saving ? 'กำลังบันทึก...' : 'บันทึกข้อสอบ'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6">
                                            {questions.length === 0 ? (
                                                <div className="py-20 text-center">
                                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <BookOpen size={36} className="text-indigo-300" />
                                                    </div>
                                                    <p className="text-gray-500 font-medium">ยังไม่มีข้อสอบสำหรับวิชานี้</p>
                                                    <p className="text-gray-400 text-sm mt-1">คลิก "เพิ่มข้อสอบ" หรือ "Import" เพื่อเริ่มต้น</p>
                                                    <div className="flex justify-center gap-3 mt-6">
                                                        <button onClick={handleAddQuestion} className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                                                            <Plus size={15} className="inline mr-1" /> เพิ่มข้อสอบ
                                                        </button>
                                                        <button onClick={() => setShowImportModal(true)} className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                                                            <Upload size={15} className="inline mr-1" /> Import ข้อสอบ
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-5">
                                                    {questions.map((q, qIndex) => (
                                                        <div key={q.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                                            {/* Question header */}
                                                            <div className="flex items-start gap-3 px-5 pt-5 pb-4">
                                                                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
                                                                    {qIndex + 1}
                                                                </span>
                                                                <textarea
                                                                    value={q.text}
                                                                    onChange={e => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                                                                    placeholder="พิมพ์คำถามที่นี่..."
                                                                    rows={2}
                                                                    className="flex-grow border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none outline-none transition"
                                                                />
                                                                <button
                                                                    onClick={() => handleDeleteQuestion(qIndex)}
                                                                    className="flex-shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                                                                    title="ลบข้อสอบ"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>

                                                            {/* Choices */}
                                                            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-16">
                                                                {q.choices.map((choice, cIndex) => {
                                                                    const isCorrect = q.correctAnswer === cIndex;
                                                                    return (
                                                                        <label
                                                                            key={cIndex}
                                                                            className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 cursor-pointer transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400' : 'border-gray-200 bg-gray-50 hover:border-indigo-300'}`}
                                                                        >
                                                                            <input
                                                                                type="radio"
                                                                                name={`correct-${q.id}`}
                                                                                checked={isCorrect}
                                                                                onChange={() => handleUpdateQuestion(qIndex, 'correctAnswer', cIndex)}
                                                                                className="w-4 h-4 text-emerald-600 accent-emerald-600"
                                                                            />
                                                                            <span className={`text-xs font-bold mr-1 ${isCorrect ? 'text-emerald-700' : 'text-gray-400'}`}>{String.fromCharCode(65 + cIndex)}.</span>
                                                                            <input
                                                                                type="text"
                                                                                value={choice}
                                                                                onChange={e => handleUpdateChoice(qIndex, cIndex, e.target.value)}
                                                                                placeholder={`ตัวเลือก ${String.fromCharCode(65 + cIndex)}`}
                                                                                className="flex-grow bg-transparent border-0 outline-none text-gray-800 text-sm"
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Bottom add button */}
                                                    <button
                                                        onClick={handleAddQuestion}
                                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 font-medium"
                                                    >
                                                        <Plus size={18} /> เพิ่มข้อสอบ
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-gray-300 p-12">
                                        <BookOpen size={72} className="mb-4" />
                                        <p className="text-xl font-medium text-gray-400">เลือกวิชาจากเมนูด้านซ้าย</p>
                                        <p className="text-sm text-gray-400 mt-1">เพื่อเริ่มจัดการข้อสอบ</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── SCORES TAB ── */}
                    {activeTab === 'scores' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b flex flex-wrap justify-between items-center gap-3 bg-gray-50/60">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">สรุปคะแนนสอบ</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">ปลายภาคเรียนที่ 2 ปีการศึกษา 2568</p>
                                </div>
                                <button
                                    onClick={handleRefreshScores}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> รีเฟรชคะแนน
                                </button>
                            </div>

                            {/* Summary cards */}
                            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b">
                                {[
                                    { label: 'นักเรียนทั้งหมด', value: data.students.length, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
                                    { label: 'วิชาที่มีข้อสอบ', value: data.subjects.filter(s => (data.exams[s.id]?.length || 0) > 0).length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
                                    { label: 'การสอบทั้งหมด', value: data.scores.length, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                                    { label: 'คะแนนเฉลี่ย', value: data.scores.length > 0 ? (data.scores.reduce((s, r) => s + (r.maxScore > 0 ? r.score / r.maxScore * 100 : 0), 0) / data.scores.length).toFixed(1) + '%' : '-', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
                                ].map(({ label, value, color, bg }) => (
                                    <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                                        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10 border-r border-gray-200 whitespace-nowrap">
                                                นักเรียน
                                            </th>
                                            {data.subjects.filter(s => (data.exams[s.id]?.length || 0) > 0).map(sub => (
                                                <th key={sub.id} className="px-3 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 whitespace-nowrap max-w-[100px]" title={sub.name}>
                                                    <div className="truncate max-w-[90px] mx-auto">{sub.name}</div>
                                                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">/{data.exams[sub.id].length} คะแนน</div>
                                                </th>
                                            ))}
                                            <th className="px-5 py-3.5 text-center text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 whitespace-nowrap">
                                                รวมคะแนน
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.students.map((student, idx) => {
                                            let totalScore = 0;
                                            let totalMax = 0;
                                            const subjectsWithExams = data.subjects.filter(s => (data.exams[s.id]?.length || 0) > 0);

                                            return (
                                                <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                                                    <td className="px-5 py-4 whitespace-nowrap sticky left-0 z-10 border-r border-gray-200 bg-inherit">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm ${student.grade === 4 ? 'bg-gradient-to-br from-orange-400 to-amber-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                                                ป.{student.grade}
                                                            </div>
                                                            <span className="font-semibold text-gray-900 text-sm">{student.name}</span>
                                                        </div>
                                                    </td>
                                                    {subjectsWithExams.map(sub => {
                                                        const scoreObj = data.scores.find(s => s.studentId === student.id && s.subjectId === sub.id);
                                                        if (scoreObj) {
                                                            totalScore += scoreObj.score;
                                                            totalMax += scoreObj.maxScore;
                                                        }
                                                        const pct = scoreObj ? Math.round((scoreObj.score / scoreObj.maxScore) * 100) : null;
                                                        return (
                                                            <td key={sub.id} className="px-3 py-4 whitespace-nowrap text-center text-sm border-r border-gray-100">
                                                                {scoreObj ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className={`font-bold text-base ${pct! >= 80 ? 'text-emerald-600' : pct! >= 50 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                                            {scoreObj.score}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-300 text-lg">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-5 py-4 whitespace-nowrap text-center bg-indigo-50/50">
                                                        {totalMax > 0 ? (
                                                            <div>
                                                                <span className="font-bold text-indigo-700">{totalScore}</span>
                                                                <span className="text-gray-400 text-xs">/{totalMax}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t bg-gray-50/50 text-xs text-gray-400 text-center">
                                คะแนนสีเขียว ≥ 80% | สีน้ำเงิน 50–79% | สีแดง &lt; 50%
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
