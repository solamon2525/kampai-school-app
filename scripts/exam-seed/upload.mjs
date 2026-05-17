import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const REDIS_URL = 'https://refined-pegasus-16027.upstash.io';
const REDIS_TOKEN = 'AT6bAAIncDEwN2FiNTE0ODFjNTg0ZDUxOWVkNmVmYTZmNjVhMjE4OXAxMTYwMjc';

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

function load(f) { return JSON.parse(readFileSync(join(__dirname, f), 'utf8')); }

async function main() {
  console.log('📚 Seed ข้อสอบ ป.4 ทุกวิชา (ระดับง่าย)\n');

  // Read existing data
  console.log('📖 อ่านข้อมูลเดิม...');
  const get = await redis(['GET', 'examData']);
  let data = get.result
    ? (typeof get.result === 'string' ? JSON.parse(get.result) : get.result)
    : { students: [], subjects: [], exams: {}, scores: [] };

  // Load all question files
  const files = ['subj1.json','subj2.json','subj3.json','subj4.json','subj5.json',
                 'subj6.json','subj7.json','subj8.json','subj9.json','subj10.json','subj11.json'];
  const allNew = {};
  for (const f of files) {
    try {
      const d = load(f);
      Object.assign(allNew, d);
    } catch(e) { console.log(`⚠️ ไม่พบ ${f}, ข้าม`); }
  }

  // Merge
  console.log('\n🔄 Merge ข้อสอบ...');
  let totalAdded = 0;
  for (const [sid, newQs] of Object.entries(allNew)) {
    const existing = data.exams[sid] || [];
    const ids = new Set(existing.map(q => q.id));
    const fresh = newQs.filter(q => !ids.has(q.id));
    data.exams[sid] = [...existing, ...fresh];
    totalAdded += fresh.length;
    console.log(`  ✅ ${sid}: ${existing.length} เดิม + ${fresh.length} ใหม่ = ${data.exams[sid].length} ข้อ`);
  }

  // Save
  console.log(`\n💾 บันทึก (รวมเพิ่ม ${totalAdded} ข้อ)...`);
  const res = await redis(['SET', 'examData', JSON.stringify(data)]);
  console.log('  Result:', JSON.stringify(res));
  console.log('\n✨ เสร็จสิ้น!');
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });
