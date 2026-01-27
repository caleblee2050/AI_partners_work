import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const { clientName, docDate, projectTitle, items, subtotal, vat, total, discountName, discountAmount, isPercentDiscount } = data;

        const db = getDb();
        const result = await db.execute({
            sql: `INSERT INTO invoices (client_name, doc_date, project_title, items, subtotal, vat, discount_name, discount_amount, is_percent_discount, total) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [clientName, docDate, projectTitle, JSON.stringify(items), subtotal, vat, discountName || '', discountAmount || 0, isPercentDiscount ? 1 : 0, total],
        });

        return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
    } catch (error) {
        console.error('Save invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save invoice' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const db = getDb();

        if (id) {
            const result = await db.execute({
                sql: 'SELECT * FROM invoices WHERE id = ?',
                args: [id],
            });
            if (result.rows.length === 0) {
                return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: result.rows[0] });
        }

        const result = await db.execute('SELECT * FROM invoices ORDER BY created_at DESC');
        return NextResponse.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Fetch invoices error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch invoices' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const data = await req.json();
        const { id, clientName, docDate, projectTitle, items, subtotal, vat, total, discountName, discountAmount, isPercentDiscount } = data;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required for update' }, { status: 400 });
        }

        const db = getDb();
        await db.execute({
            sql: `UPDATE invoices SET 
                client_name = ?, doc_date = ?, project_title = ?, items = ?, 
                subtotal = ?, vat = ?, discount_name = ?, discount_amount = ?, 
                is_percent_discount = ?, total = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
            args: [
                clientName, docDate, projectTitle, JSON.stringify(items),
                subtotal, vat, discountName || '', discountAmount || 0,
                isPercentDiscount ? 1 : 0, total, id
            ],
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const db = getDb();
        await db.execute({
            sql: 'DELETE FROM invoices WHERE id = ?',
            args: [id],
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete invoice' }, { status: 500 });
    }
}
