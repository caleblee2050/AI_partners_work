"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Save, Printer, Image as ImageIcon, ChevronLeft, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Link from 'next/link';

interface InvoiceItem {
  id: number;
  name: string;
  details: string;
  price: number;
  qty: number;
}

// html2canvas 호환성을 위한 표준 HEX 컬러 정의
const COLORS = {
  slate900: '#0f172a',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  slate50: '#f8fafc',
  blue600: '#2563eb',
  blue500: '#3b82f6',
  blue100: '#dbeafe',
  blue50: '#eff6ff',
  red500: '#ef4444',
  white: '#ffffff',
};

export default function InvoiceEditor() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [stampImage, setStampImage] = useState<string | null>(null);

  const [discountName, setDiscountName] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isPercentDiscount, setIsPercentDiscount] = useState(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('invoice_draft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setItems(parsed.items || []);
        setDocDate(parsed.docDate || new Date().toISOString().split('T')[0]);
        setClientName(parsed.clientName || '');
        setProjectTitle(parsed.projectTitle || '');
        setStampImage(parsed.stampImage || null);
        setDiscountName(parsed.discountName || '');
        setDiscountAmount(parsed.discountAmount || 0);
        setIsPercentDiscount(parsed.isPercentDiscount || false);
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    } else {
      const initialItems = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: '',
        details: '',
        price: 0,
        qty: 0,
      }));
      setItems(initialItems);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const dataToSave = {
      items,
      docDate,
      clientName,
      projectTitle,
      stampImage,
      discountName,
      discountAmount,
      isPercentDiscount
    };
    localStorage.setItem('invoice_draft', JSON.stringify(dataToSave));
  }, [items, docDate, clientName, projectTitle, stampImage, discountName, discountAmount, isPercentDiscount, isLoaded]);

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), name: '', details: '', price: 0, qty: 0 },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length <= 1) {
      alert('최소 하나의 품목은 있어야 합니다.');
      return;
    }
    setItems((prev) => prev.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);

  const calculatedDiscount = isPercentDiscount
    ? Math.floor(subtotal * (discountAmount / 100))
    : discountAmount;

  const discountedSubtotal = subtotal - calculatedDiscount;
  const vat = Math.floor(discountedSubtotal * 0.1);
  const total = discountedSubtotal + vat;

  const downloadPDF = async () => {
    if (!invoiceRef.current) {
      alert('출력할 내용이 없습니다.');
      return;
    }

    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        logging: true,
        allowTaint: true,
        backgroundColor: COLORS.white,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`견적서_${clientName || '알수없음'}_${docDate}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저 콘솔을 확인해 주세요.');
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStampImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToDB = async () => {
    try {
      const dbData = {
        clientName, docDate, projectTitle, items, subtotal, vat,
        discountName, discountAmount, isPercentDiscount, total,
      };

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
      });

      const result = await response.json();
      if (result.success) {
        alert('견적서가 성공적으로 저장되었습니다!');
      } else {
        alert('저장 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다. DB 연결 상태를 확인해 주세요.');
    }
  };

  const formatWithCommas = (value: number) => {
    if (value === 0) return '';
    return value.toLocaleString();
  };

  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">데이터를 불러오는 중...</div>;

  return (
    <main className="bg-slate-50 min-h-screen py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 상단 액션바 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 no-print">
          <Link href="/dashboard" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">대시보드로 돌아가기</span>
          </Link>
          <div className="flex space-x-3 w-full md:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm"
            >
              <Printer size={18} />
              <span>인쇄</span>
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-bold"
            >
              <Download size={18} />
              <span>PDF 내보내기</span>
            </button>
            <button
              onClick={saveToDB}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 px-8 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold shadow-md hover:shadow-lg"
            >
              <Save size={18} />
              <span>DB 저장</span>
            </button>
          </div>
        </div>

        {/* 견적서 시트 - 캡처 영역 */}
        <div
          ref={invoiceRef}
          className="bg-white shadow-premium rounded-[2rem] overflow-hidden"
          style={{
            minHeight: '1120px',
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.slate100}`,
          }}
        >
          {/* 견적서 상단 */}
          <div style={{ backgroundColor: COLORS.slate900, color: COLORS.white }} className="p-12 flex justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}></div>
            <div className="relative z-10">
              <h1 className="text-5xl font-black tracking-tighter mb-2">견 적 서</h1>
              <p style={{ color: COLORS.slate400 }} className="font-medium tracking-[0.2em] uppercase text-sm">Official Quotation</p>
            </div>
            <div className="text-right flex flex-col items-end relative z-10">
              <div className="relative mb-2">
                <span className="text-2xl font-black tracking-tight underline underline-offset-8 uppercase" style={{ textDecorationColor: COLORS.blue500 }}>AI Partners</span>
              </div>
              <p style={{ color: COLORS.slate400 }} className="text-xs font-medium">Professional AI Education & Service Solutions</p>
            </div>
          </div>

          <div className="p-12">
            {/* 정보 섹션 */}
            <div className="grid grid-cols-2 gap-20 mb-16">
              <div className="space-y-8">
                <div>
                  <h2 style={{ color: COLORS.blue600 }} className="text-[10px] font-black uppercase tracking-widest mb-4">수신 (Client Information)</h2>
                  <input
                    type="text"
                    style={{
                      borderBottom: `2px solid ${COLORS.slate100}`,
                      color: COLORS.slate900
                    }}
                    className="text-3xl font-black w-full outline-none pb-2 transition-colors placeholder:text-slate-200"
                    placeholder="고객사/기관명 귀중"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center group">
                    <span style={{ color: COLORS.slate400 }} className="w-24 text-xs font-bold uppercase tracking-tighter">Issue Date</span>
                    <input
                      type="date"
                      style={{
                        backgroundColor: COLORS.slate50,
                        color: COLORS.slate700
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none transition-all font-mono"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center group">
                    <span style={{ color: COLORS.slate400 }} className="w-24 text-xs font-bold uppercase tracking-tighter">Project Name</span>
                    <input
                      type="text"
                      style={{
                        backgroundColor: COLORS.slate50,
                        color: COLORS.slate700
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none transition-all placeholder:text-slate-300"
                      placeholder="프로젝트 또는 교육명을 입력하세요"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ color: COLORS.slate400, borderBottom: `1px solid ${COLORS.slate100}` }} className="text-[10px] font-black uppercase tracking-widest mb-6 pb-2">공급자 (Our Company)</h2>
                <div className="grid grid-cols-1 gap-3 relative">
                  {[
                    ['사업자번호', '205-23-75240'],
                    ['상 호', 'AI 파트너스'],
                    ['대 표 자', '이충우'],
                    ['업태/종목', '서비스 / 교육서비스'],
                    ['연 락 처', '010-9911-2585 / aip@aipart.io'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex text-sm">
                      <span style={{ color: COLORS.slate400 }} className="min-w-[80px] font-medium">{label}</span>
                      <span style={{ color: COLORS.slate900 }} className="font-bold">{value}</span>
                    </div>
                  ))}

                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center">
                    {stampImage ? (
                      <img src={stampImage} alt="Stamp" className="w-full h-full object-contain opacity-90 rotate-[-10deg]" />
                    ) : (
                      <label
                        style={{ border: `2px dashed ${COLORS.slate200}` }}
                        className="no-print cursor-pointer w-14 h-14 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors"
                      >
                        <ImageIcon size={20} style={{ color: COLORS.slate300 }} />
                        <input type="file" className="hidden" onChange={handleStampUpload} accept="image/*" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 품목 테이블 */}
            <div className="mb-12">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderTop: `2px solid ${COLORS.slate900}`, borderBottom: `2px solid ${COLORS.slate900}`, color: COLORS.slate900 }} className="text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-4 py-4 w-12 text-center">No.</th>
                    <th className="px-4 py-4">항목 및 세부 세부사항</th>
                    <th className="px-4 py-4 text-right w-32">단가 (KRW)</th>
                    <th className="px-4 py-4 text-center w-20">수량</th>
                    <th className="px-4 py-4 text-right w-40">합계 금액</th>
                    <th className="px-4 py-4 w-12 no-print"></th>
                  </tr>
                </thead>
                <tbody style={{ borderBottom: `1px solid ${COLORS.slate100}` }}>
                  {items.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.slate100}` }} className="group">
                      <td style={{ color: COLORS.slate300 }} className="px-4 py-5 text-center text-xs font-black">{idx + 1}</td>
                      <td className="px-4 py-5 space-y-1">
                        <input
                          type="text"
                          style={{ color: COLORS.slate900 }}
                          className="w-full bg-transparent font-bold outline-none placeholder:text-slate-200"
                          placeholder="품목명을 입력하세요"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          style={{ color: COLORS.slate400 }}
                          className="w-full bg-transparent text-xs outline-none placeholder:text-slate-200"
                          placeholder="세부 기술 사양 또는 관련 정보를 입력하세요"
                          value={item.details}
                          onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-5">
                        <input
                          type="text"
                          style={{ color: COLORS.slate700 }}
                          className="w-full bg-transparent text-right font-semibold outline-none"
                          value={formatWithCommas(item.price)}
                          onChange={(e) => updateItem(item.id, 'price', parseFormattedNumber(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-5">
                        <input
                          type="number"
                          style={{ color: COLORS.slate700 }}
                          className="w-full bg-transparent text-center font-semibold outline-none"
                          value={item.qty || ''}
                          onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td style={{ color: COLORS.slate900 }} className="px-4 py-5 text-right font-black">
                        {(item.price * item.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-5 text-center no-print">
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{ color: COLORS.slate200 }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addRow}
                style={{ backgroundColor: COLORS.slate50, color: COLORS.slate500 }}
                className="no-print mt-6 flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 hover:text-slate-900 text-xs rounded-lg transition-all font-bold tracking-tight border border-transparent"
              >
                <Plus size={14} />
                <span>라인 아이템 추가</span>
              </button>
            </div>

            {/* 정산 영역 */}
            <div style={{ borderTop: `2px solid ${COLORS.slate900}` }} className="flex justify-end pt-8">
              <div className="w-full md:w-96 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: COLORS.slate400 }} className="font-bold uppercase tracking-widest text-[10px]">Total Subtotal</span>
                  <span style={{ color: COLORS.slate600 }} className="font-bold font-mono tracking-tighter">{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: COLORS.slate400 }} className="font-bold uppercase tracking-widest text-[10px]">VAT (10%)</span>
                  <span style={{ color: COLORS.slate600 }} className="font-bold font-mono tracking-tighter">{vat.toLocaleString()}</span>
                </div>

                <div
                  style={{
                    borderTop: `1px dashed ${COLORS.slate100}`,
                    borderBottom: `1px dashed ${COLORS.slate100}`
                  }}
                  className="flex flex-col space-y-2 py-3"
                >
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      style={{ color: COLORS.blue500 }}
                      className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-1/2 placeholder:text-blue-100"
                      placeholder="할인 항목 입력 (예: 프로모션)"
                      value={discountName}
                      onChange={(e) => setDiscountName(e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        style={{ backgroundColor: COLORS.slate50, color: COLORS.slate900 }}
                        className="w-24 px-2 py-1 rounded text-right font-bold outline-none text-xs"
                        placeholder="0"
                        value={formatWithCommas(discountAmount)}
                        onChange={(e) => setDiscountAmount(parseFormattedNumber(e.target.value))}
                      />
                      <select
                        style={{ backgroundColor: COLORS.slate50, color: COLORS.slate500 }}
                        className="border-none rounded text-[10px] font-bold outline-none p-1 cursor-pointer"
                        value={isPercentDiscount ? 'percent' : 'amount'}
                        onChange={(e) => setIsPercentDiscount(e.target.value === 'percent')}
                      >
                        <option value="amount">KRW</option>
                        <option value="percent">%</option>
                      </select>
                    </div>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-right">
                      <span style={{ color: COLORS.slate400 }} className="font-medium italic">Calculated Discount:</span>
                      <span style={{ color: COLORS.red500 }} className="font-bold font-mono">- {calculatedDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span style={{ color: COLORS.blue600 }} className="font-black uppercase tracking-widest text-xs">Total Amount</span>
                  <span style={{ color: COLORS.slate900 }} className="text-3xl font-black font-mono">₩ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 하단 푸터 */}
            <div className="mt-32 text-center space-y-6">
              <p style={{ color: COLORS.slate900 }} className="font-bold text-lg">위와 같이 견적 내용을 제출합니다.</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          main { padding: 0 !important; }
          .max-w-5xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; }
          .shadow-premium { box-shadow: none !important; }
          .rounded-\[2rem\] { border-radius: 0 !important; }
          .border { border: none !important; }
          .pt-16 { padding-top: 0 !important; }
        }
      `}</style>
    </main>
  );
}
