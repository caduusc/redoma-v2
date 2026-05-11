import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ ok: true, service: 'redoma-v2-bot', timestamp: new Date().toISOString() });
}
