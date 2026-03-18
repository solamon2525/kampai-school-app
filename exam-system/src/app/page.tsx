import Link from 'next/link';
import { BookOpen, Users, GraduationCap, ArrowLeft } from 'lucide-react';

const HOME_URL = process.env.NEXT_PUBLIC_HOME_URL || '/';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center">
        {/* Back to main app */}
        <div className="mb-4 flex justify-start">
          <a
            href={HOME_URL}
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-indigo-600 transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            กลับ Super App บ้านคำไผ่
          </a>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="bg-blue-600 p-4 rounded-full text-white">
            <GraduationCap size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ระบบสอบปลายภาคเรียนออนไลน์</h1>
        <p className="text-gray-600 mb-8">โรงเรียนบ้านคำไผ่ | ระดับชั้นประถมศึกษาปีที่ 4-5</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/student"
            className="group flex flex-col items-center justify-center p-8 border-2 border-indigo-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300">
            <Users size={32} className="text-indigo-600 mb-4 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-semibold text-gray-800">เข้าสอบ (นักเรียน)</span>
          </Link>

          <Link href="/admin"
            className="group flex flex-col items-center justify-center p-8 border-2 border-emerald-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300">
            <BookOpen size={32} className="text-emerald-600 mb-4 group-hover:scale-110 transition-transform" />
            <span className="text-xl font-semibold text-gray-800">จัดการระบบ (คุณครู)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
