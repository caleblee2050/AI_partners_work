"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Save, Printer, Image as ImageIcon, ChevronLeft, Trash2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

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
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">페이지를 준비 중입니다...</div>}>
      <InvoiceEditorContent />
    </Suspense>
  );
}

function InvoiceEditorContent() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [stampImage, setStampImage] = useState<string | null>(null);

  const [discountName, setDiscountName] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isPercentDiscount, setIsPercentDiscount] = useState(false);
  const [includeVat, setIncludeVat] = useState(true);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true);
    const handleAfterPrint = () => setIsPrinting(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  useEffect(() => {
    const fetchInvoice = async (id: string) => {
      try {
        const response = await fetch(`/api/invoices?id=${id}`);
        const result = await response.json();
        if (result.success && result.data) {
          const inv = result.data;
          setInvoiceId(id);
          setClientName(inv.client_name || '');
          setDocDate(inv.doc_date || '');
          setProjectTitle(inv.project_title || '');
          setItems(JSON.parse(inv.items) || []);
          setDiscountName(inv.discount_name || '');
          setDiscountAmount(inv.discount_amount || 0);
          setIsPercentDiscount(!!inv.is_percent_discount);
          setIncludeVat(inv.include_vat === undefined || inv.include_vat === null ? true : Number(inv.include_vat) !== 0);
          // 도장 이미지는 별도로 저장되지 않으므로 draft나 기본값 유지 (필요시 DB 확장)
        }
      } catch (error) {
        console.error('Failed to fetch invoice:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    const id = searchParams.get('id');
    if (id) {
      fetchInvoice(id);
    } else {
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
          setIncludeVat(parsed.includeVat ?? true);
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
    }
  }, [searchParams]);

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
      isPercentDiscount,
      includeVat
    };
    localStorage.setItem('invoice_draft', JSON.stringify(dataToSave));
  }, [items, docDate, clientName, projectTitle, stampImage, discountName, discountAmount, isPercentDiscount, includeVat, isLoaded]);

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
  const vat = includeVat ? Math.floor(discountedSubtotal * 0.1) : 0;
  const total = discountedSubtotal + vat;

  const downloadPDF = async () => {
    if (!invoiceRef.current) {
      alert('출력할 내용이 없습니다.');
      return;
    }

    try {
      setIsPrinting(true);
      // React 렌더링을 기다리기 위해 약간의 지연 시간을 둡니다.
      await new Promise(resolve => setTimeout(resolve, 300));

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
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsPrinting(false);
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
        id: invoiceId,
        clientName, docDate, projectTitle, items, subtotal, vat,
        discountName, discountAmount, isPercentDiscount, includeVat, total,
      };

      const response = await fetch('/api/invoices', {
        method: invoiceId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
      });

      const result = await response.json();
      if (result.success) {
        alert(invoiceId ? '견적서가 성공적으로 수정되었습니다!' : '견적서가 성공적으로 저장되었습니다!');
        if (!invoiceId && result.id) {
          setInvoiceId(result.id.toString());
        }
      } else {
        alert('저장 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다. DB 연결 상태를 확인해 주세요.');
    }
  };

  const formatWithCommas = (value: number) => {
    if (value === 0) return isPrinting ? '0' : '';
    return value.toLocaleString();
  };

  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

  if (!isLoaded) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400">데이터를 불러오는 중...</div>;

  // 출력 시에는 이름이 있는 행만 표시
  const displayItems = isPrinting ? items.filter(item => item.name.trim() !== '') : items;

  return (
    <main className="bg-slate-50 min-h-screen py-10 px-4 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 상단 액션바 */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 no-print">
          <Link href="/dashboard" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-semibold">대시보드로 돌아가기</span>
          </Link>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:flex md:w-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-lg sm:rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm text-xs sm:text-sm whitespace-nowrap"
            >
              <Printer size={16} />
              <span>인쇄</span>
            </button>
            <button
              onClick={downloadPDF}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 bg-blue-50 text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-100 transition-all font-bold text-xs sm:text-sm whitespace-nowrap"
            >
              <Download size={16} />
              <span>PDF 내보내기</span>
            </button>
            <button
              onClick={saveToDB}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-8 py-2.5 bg-slate-900 text-white rounded-lg sm:rounded-xl hover:bg-slate-800 transition-all font-bold shadow-md hover:shadow-lg text-xs sm:text-sm whitespace-nowrap"
            >
              <Save size={16} />
              <span>DB 저장</span>
            </button>
          </div>
        </div>

        {/* 견적서 시트 - 캡처 영역 */}
        <div className="overflow-x-auto pb-4">
          <div
            ref={invoiceRef}
            className="bg-white w-full min-w-[820px]"
            style={{
              minHeight: '1120px',
              backgroundColor: COLORS.white,
              border: isPrinting ? 'none' : `1px solid ${COLORS.slate100}`,
              boxShadow: isPrinting ? 'none' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              borderRadius: isPrinting ? '0' : '2rem',
              overflow: 'hidden'
            }}
          >
          {/* 견적서 상단 */}
          <div style={{ backgroundColor: COLORS.slate900, color: COLORS.white }} className="p-12 flex justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}></div>
            <div className="relative z-10">
              <h1 className="text-5xl font-black tracking-tighter mb-2">견 적 서</h1>
              <p style={{ color: COLORS.slate300 }} className="font-medium tracking-[0.2em] uppercase text-sm">Official Quotation</p>
            </div>
            <div className="text-right flex flex-col items-end relative z-10">
              <div className="relative mb-2">
                <span className="text-2xl font-black tracking-tight underline underline-offset-8 uppercase" style={{ textDecorationColor: COLORS.blue500 }}>AI Partners</span>
              </div>
              <p style={{ color: COLORS.slate300 }} className="text-xs font-medium">Professional AI Education & Service Solutions</p>
            </div>
          </div>

          <div className="p-12">
            {/* 정보 섹션 */}
            <div className="grid grid-cols-2 gap-20 mb-16">
              <div className="space-y-8">
                <div>
                  <h2 style={{ color: COLORS.blue600 }} className="text-[10px] font-black uppercase tracking-widest mb-4">수신 (Client Information)</h2>
                  {isPrinting ? (
                    <div className="text-3xl font-black pb-2 min-h-[44px]" style={{ color: COLORS.slate900 }}>
                      {clientName || '고객사 귀중'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="text-3xl font-black w-full outline-none pb-2 transition-colors placeholder:text-slate-400"
                      style={{ borderBottom: `2px solid ${COLORS.slate100}`, color: COLORS.slate900 }}
                      placeholder="고객사/기관명 귀중"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex items-center group">
                    <span style={{ color: COLORS.slate500 }} className="w-24 text-xs font-bold uppercase tracking-tighter">Issue Date</span>
                    {isPrinting ? (
                      <div className="text-sm font-semibold font-mono" style={{ color: COLORS.slate700 }}>{docDate}</div>
                    ) : (
                      <input
                        type="date"
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none transition-all font-mono"
                        style={{ backgroundColor: COLORS.slate100, color: COLORS.slate700 }}
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex items-center group">
                    <span style={{ color: COLORS.slate500 }} className="w-24 text-xs font-bold uppercase tracking-tighter">Project Name</span>
                    {isPrinting ? (
                      <div className="text-sm font-semibold" style={{ color: COLORS.slate700 }}>{projectTitle || '-'}</div>
                    ) : (
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold outline-none transition-all placeholder:text-slate-500"
                        style={{ backgroundColor: COLORS.slate100, color: COLORS.slate700 }}
                        placeholder="프로젝트 또는 교육명을 입력하세요"
                        value={projectTitle}
                        onChange={(e) => setProjectTitle(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ color: COLORS.slate500, borderBottom: `1px solid ${COLORS.slate200}` }} className="text-[10px] font-black uppercase tracking-widest mb-6 pb-2">공급자 (Our Company)</h2>
                <div className="grid grid-cols-1 gap-3 relative">
                  {[
                    ['사업자번호', '205-23-75240'],
                    ['상 호', 'AI 파트너스'],
                    ['대 표 자', '이충우'],
                    ['업태/종목', '서비스 / 교육서비스'],
                    ['연 락 처', '010-9911-2585 / aip@aipart.io'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex text-sm">
                      <span style={{ color: COLORS.slate500 }} className="min-w-[80px] font-medium">{label}</span>
                      <span style={{ color: COLORS.slate900 }} className="font-bold">{value}</span>
                    </div>
                  ))}

                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center">
                    {stampImage ? (
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          backgroundImage: `url(${stampImage})`,
                          backgroundSize: 'contain',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'center',
                          opacity: 0.9,
                          transform: 'rotate(-10deg)',
                        }}
                        aria-label="Stamp"
                      />
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
                    {!isPrinting && <th className="px-4 py-4 w-12 no-print"></th>}
                  </tr>
                </thead>
                <tbody style={{ borderBottom: `1px solid ${COLORS.slate100}` }}>
                  {displayItems.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.slate100}` }} className="group">
                      <td style={{ color: COLORS.slate300 }} className="px-4 py-5 text-center text-xs font-black">{idx + 1}</td>
                      <td className="px-4 py-5 space-y-1">
                        {isPrinting ? (
                          <>
                            <div style={{ color: COLORS.slate900 }} className="font-bold">{item.name}</div>
                            {item.details && <div style={{ color: COLORS.slate500 }} className="text-xs">{item.details}</div>}
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              style={{ color: COLORS.slate900 }}
                              className="w-full bg-transparent font-bold outline-none placeholder:text-slate-400"
                              placeholder="품목명을 입력하세요"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            />
                            <input
                              type="text"
                              style={{ color: COLORS.slate500 }}
                              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
                              placeholder="세부 기술 사양 또는 관련 정보를 입력하세요"
                              value={item.details}
                              onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                            />
                          </>
                        )}
                      </td>
                      <td className="px-4 py-5">
                        {isPrinting ? (
                          <div style={{ color: COLORS.slate700 }} className="text-right font-semibold">
                            {formatWithCommas(item.price)}
                          </div>
                        ) : (
                          <input
                            type="text"
                            style={{ color: COLORS.slate700 }}
                            className="w-full bg-transparent text-right font-semibold outline-none"
                            value={formatWithCommas(item.price)}
                            onChange={(e) => updateItem(item.id, 'price', parseFormattedNumber(e.target.value))}
                          />
                        )}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {isPrinting ? (
                          <div style={{ color: COLORS.slate700 }} className="font-semibold">{item.qty}</div>
                        ) : (
                          <input
                            type="number"
                            style={{ color: COLORS.slate700 }}
                            className="w-full bg-transparent text-center font-semibold outline-none"
                            value={item.qty || ''}
                            onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                          />
                        )}
                      </td>
                      <td style={{ color: COLORS.slate900 }} className="px-4 py-5 text-right font-black">
                        {(item.price * item.qty).toLocaleString()}
                      </td>
                      {!isPrinting && (
                        <td className="px-4 py-5 text-center no-print">
                          <button
                            onClick={() => removeItem(item.id)}
                            style={{ color: COLORS.slate300 }}
                            className="hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isPrinting && (
                <button
                  onClick={addRow}
                  style={{ backgroundColor: COLORS.slate50, color: COLORS.slate500 }}
                  className="no-print mt-6 flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 hover:text-slate-900 text-xs rounded-lg transition-all font-bold tracking-tight border border-transparent"
                >
                  <Plus size={14} />
                  <span>라인 아이템 추가</span>
                </button>
              )}
            </div>

            {/* 정산 영역 */}
            <div style={{ borderTop: `2px solid ${COLORS.slate900}` }} className="flex justify-end pt-8">
              <div className="w-full md:w-96 space-y-4">
                {/* 1. 품목 합계 (Raw Subtotal) */}
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: COLORS.slate500 }} className="font-bold uppercase tracking-widest text-[10px]">Items Total (품목 합계)</span>
                  <span style={{ color: COLORS.slate700 }} className="font-bold font-mono tracking-tighter">{subtotal.toLocaleString()}</span>
                </div>

                {/* 2. 할인 영역 */}
                <div
                  style={{
                    borderTop: `1px dashed ${COLORS.slate100}`,
                    borderBottom: `1px dashed ${COLORS.slate100}`
                  }}
                  className="flex flex-col space-y-2 py-3"
                >
                  <div className="flex justify-between items-center">
                    {isPrinting ? (
                      <div style={{ color: COLORS.blue500 }} className="text-[10px] font-black uppercase tracking-widest font-bold">
                        {discountName || 'Discount (할인)'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        style={{ color: COLORS.blue500 }}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-1/2 placeholder:text-blue-300"
                        placeholder="할인 항목 입력 (예: 프로모션)"
                        value={discountName}
                        onChange={(e) => setDiscountName(e.target.value)}
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      {isPrinting ? (
                        <div className="text-xs font-bold" style={{ color: COLORS.slate900 }}>
                          {formatWithCommas(discountAmount)} {isPercentDiscount ? '%' : 'KRW'}
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            style={{ backgroundColor: COLORS.slate100, color: COLORS.slate900 }}
                            className="w-24 px-2 py-1 rounded text-right font-bold outline-none text-xs"
                            placeholder="0"
                            value={formatWithCommas(discountAmount)}
                            onChange={(e) => setDiscountAmount(parseFormattedNumber(e.target.value))}
                          />
                          <select
                            style={{ backgroundColor: COLORS.slate100, color: COLORS.slate600 }}
                            className="border-none rounded text-[10px] font-bold outline-none p-1 cursor-pointer"
                            value={isPercentDiscount ? 'percent' : 'amount'}
                            onChange={(e) => setIsPercentDiscount(e.target.value === 'percent')}
                          >
                            <option value="amount">KRW</option>
                            <option value="percent">%</option>
                          </select>
                        </>
                      )}
                    </div>
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-right">
                      <span style={{ color: COLORS.slate500 }} className="font-medium italic">Calculated:</span>
                      <span style={{ color: COLORS.red500 }} className="font-bold font-mono">- {calculatedDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* 3. 할인 후 공급가액 (Subtotal) */}
                <div className="flex justify-between items-center text-sm pt-2">
                  <span style={{ color: COLORS.slate500 }} className="font-bold uppercase tracking-widest text-[10px]">Supply Value (공급가액)</span>
                  <span style={{ color: COLORS.slate900 }} className="font-bold font-mono tracking-tighter">{discountedSubtotal.toLocaleString()}</span>
                </div>

                {/* 4. 부가세 (VAT) */}
                {(includeVat || !isPrinting) && (
                  <div
                    className={`flex justify-between items-center gap-4 text-sm ${!includeVat ? 'no-print rounded-lg px-3 py-2' : ''}`}
                    style={!includeVat ? { backgroundColor: COLORS.slate50, border: `1px dashed ${COLORS.slate200}` } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: includeVat ? COLORS.slate500 : COLORS.slate600 }} className="font-bold uppercase tracking-widest text-[10px]">VAT (부가세 10%)</span>
                      {!isPrinting && (
                        <button
                          type="button"
                          onClick={() => setIncludeVat((prev) => !prev)}
                          className="no-print rounded-md border px-2 py-1 text-[10px] font-black transition-all hover:bg-slate-900 hover:text-white"
                          style={{ borderColor: COLORS.slate200, color: COLORS.slate700 }}
                        >
                          {includeVat ? '부가세 삭제' : '부가세 추가'}
                        </button>
                      )}
                    </div>
                    <span style={{ color: includeVat ? COLORS.slate700 : COLORS.slate500 }} className="font-bold font-mono tracking-tighter">
                      {includeVat ? vat.toLocaleString() : '미적용'}
                    </span>
                  </div>
                )}

                {/* 5. 최종 합계 (Total) */}
                <div className="flex justify-between items-center pt-6" style={{ borderTop: `1px solid ${COLORS.slate900}` }}>
                  <span style={{ color: COLORS.blue600 }} className="font-black uppercase tracking-widest text-xs">Total Amount (합계금액)</span>
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
