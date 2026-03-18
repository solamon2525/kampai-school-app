import { NextRequest, NextResponse } from 'next/server';
import { readData, writeData } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const { studentId, subjectId, score, maxScore } = await req.json();
        if (!studentId || !subjectId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        const data = await readData();
        const existingIndex = data.scores.findIndex(
            s => s.studentId === studentId && s.subjectId === subjectId
        );
        const newScore = {
            studentId,
            subjectId,
            score,
            maxScore,
            submittedAt: new Date().toISOString(),
        };
        if (existingIndex >= 0) {
            data.scores[existingIndex] = newScore;
        } else {
            data.scores.push(newScore);
        }
        await writeData(data);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update score' }, { status: 500 });
    }
}
