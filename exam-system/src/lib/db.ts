// ─────────────────────────────────────────────────────────────
//  Data types
// ─────────────────────────────────────────────────────────────
export type Student = {
  id: string;
  name: string;
  grade: number;
};

export type Subject = {
  id: string;
  name: string;
};

export type ExamQuestion = {
  id: string;
  text: string;
  choices: string[];
  correctAnswer: number; // index of choices
};

export type Score = {
  studentId: string;
  subjectId: string;
  score: number;
  maxScore: number;
  submittedAt: string;
};

export type ExamData = {
  students: Student[];
  subjects: Subject[];
  exams: Record<string, ExamQuestion[]>;
  scores: Score[];
};

// ─────────────────────────────────────────────────────────────
//  Default seed data
// ─────────────────────────────────────────────────────────────
const DEFAULT_DATA: ExamData = {
  students: [
    { id: 's1', name: 'ตะวัน', grade: 4 },
    { id: 's2', name: 'มิก', grade: 5 },
    { id: 's3', name: 'อาชา', grade: 5 },
    { id: 's4', name: 'เต้น', grade: 5 },
    { id: 's5', name: 'ซูโม่', grade: 5 },
  ],
  subjects: [
    { id: 'subj1', name: 'คณิตศาสตร์' },
    { id: 'subj2', name: 'ภาษาไทย' },
    { id: 'subj3', name: 'สังคมศึกษา' },
    { id: 'subj4', name: 'ภาษาอังกฤษเพื่อการสื่อสาร' },
    { id: 'subj5', name: 'การงานอาชีพ' },
    { id: 'subj6', name: 'ต้านทุจริต' },
    { id: 'subj7', name: 'วิทยาศาสตร์' },
    { id: 'subj8', name: 'ภาษาอังกฤษ' },
    { id: 'subj9', name: 'ประวัติศาสตร์' },
    { id: 'subj10', name: 'สุขศึกษา' },
    { id: 'subj11', name: 'ศิลปะ' },
  ],
  exams: {},
  scores: [],
};

const REDIS_KEY = 'examData';

// ─────────────────────────────────────────────────────────────
//  Helpers: detect whether Upstash env vars are configured
// ─────────────────────────────────────────────────────────────
function isRedisConfigured(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

// ─────────────────────────────────────────────────────────────
//  readData  (async – works in both dev and production)
// ─────────────────────────────────────────────────────────────
export async function readData(): Promise<ExamData> {
  // ── Production: Upstash Redis ──────────────────────────────
  if (isRedisConfigured()) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      const data = await redis.get<ExamData>(REDIS_KEY);
      if (!data) {
        // First run: seed with default data
        await redis.set(REDIS_KEY, DEFAULT_DATA);
        return DEFAULT_DATA;
      }
      return data;
    } catch (err) {
      console.error('[db] Redis read error:', err);
      return DEFAULT_DATA;
    }
  }

  // ── Development: local JSON file ───────────────────────────
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'data.json');
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
      return DEFAULT_DATA;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExamData;
  } catch {
    return DEFAULT_DATA;
  }
}

// ─────────────────────────────────────────────────────────────
//  writeData  (async – works in both dev and production)
// ─────────────────────────────────────────────────────────────
export async function writeData(data: ExamData): Promise<void> {
  // ── Production: Upstash Redis ──────────────────────────────
  if (isRedisConfigured()) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      await redis.set(REDIS_KEY, data);
      return;
    } catch (err) {
      console.error('[db] Redis write error:', err);
    }
  }

  // ── Development: local JSON file ───────────────────────────
  const fs = await import('fs');
  const path = await import('path');
  fs.writeFileSync(
    path.join(process.cwd(), 'data.json'),
    JSON.stringify(data, null, 2),
    'utf8',
  );
}
