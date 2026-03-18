import { NextResponse } from 'next/server';
import { readData } from '@/lib/db';

export async function GET() {
    const data = await readData();
    return NextResponse.json(data);
}
