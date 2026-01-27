"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Calendar, User, Hash, ExternalLink, Trash2, Loader2, Plus } from 'lucide-react';

interface Invoice {
    id: number;
    client_name: string;
    doc_date: string;
    project_title: string;
    total: number;
    created_at: string;
}

export default function DashboardPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvoices = async () => {
        try {
            const response = await fetch('/api/invoices');
            const result = await response.json();
            if (result.success) {
                setInvoices(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('정말로 이 견적서를 삭제하시겠습니까?')) return;

        try {
            const response = await fetch(`/api/invoices?id=${id}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (result.success) {
                setInvoices(invoices.filter(inv => inv.id !== id));
            } else {
                alert('삭제 실패: ' + result.error);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="text-slate-500 font-medium">데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 space-y-4 md:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">견적서 대시보드</h1>
                    <p className="text-slate-500 mt-1">저장된 견적서 내역을 관리하고 확인하세요.</p>
                </div>
                <Link
                    href="/editor"
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                >
                    <Plus size={18} />
                    <span>새 견적서 작성</span>
                </Link>
            </div>

            {invoices.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="text-slate-300" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">저장된 견적서가 없습니다</h3>
                    <p className="text-slate-500 mb-8">지금 첫 번째 견적서를 작성하고 데이터베이스에 보관해 보세요.</p>
                    <Link
                        href="/editor"
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all"
                    >
                        <span>시작하기</span>
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                                <th className="px-6 py-4">고객사 및 프로젝트</th>
                                <th className="px-6 py-4">작성일</th>
                                <th className="px-6 py-4 text-right">총 금액</th>
                                <th className="px-6 py-4 text-center w-32">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-bold group-hover:text-blue-600 transition-colors">{inv.client_name || '미지정 고객'}</span>
                                            <span className="text-slate-500 text-sm mt-0.5">{inv.project_title || '제목 없음'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center text-slate-600 text-sm">
                                            <Calendar size={14} className="mr-2 opacity-50" />
                                            {inv.doc_date}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-bold text-slate-900">
                                        ₩ {inv.total.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {/* TODO: 상세 보기 기능 연결 */}
                                            <Link
                                                href={`/editor?id=${inv.id}`}
                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                title="자세히 보기"
                                            >
                                                <ExternalLink size={18} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(inv.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
