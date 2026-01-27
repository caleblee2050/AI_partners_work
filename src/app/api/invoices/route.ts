import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { clientName, docDate, projectTitle, items, subtotal, vat, total } = data;

        const db = getDb();
        const result = await db.execute({
            sql: `INSERT INTO invoices (client_name, doc_date, project_title, items, subtotal, vat, total) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [clientName, docDate, projectTitle, JSON.stringify(items), subtotal, vat, total],
        });

        return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (error) {
        console.error('Save invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save invoice' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = getDb();
        const result = await db.execute('SELECT * FROM invoices ORDER BY created_at DESC');
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Fetch invoices error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
    }
}
