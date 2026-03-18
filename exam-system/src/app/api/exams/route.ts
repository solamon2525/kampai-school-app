import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { subjectId, questions } = await req.json();
        if (!subjectId || !questions) {
            return NextResponse.json({ error: 'Missing subjectId or questions' }, { status: 400 });
        }
        const data = await readData();
        data.exams[subjectId] = questions;
        await writeData(data);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update exams' }, { status: 500 });
    }
}
