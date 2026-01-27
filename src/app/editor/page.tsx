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

export default function InvoiceEditor() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [stampImage, setStampImage] = useState<string | null>(null);

  // 할인 관련 상태 추가
  const [discountName, setDiscountName] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [isPercentDiscount, setIsPercentDiscount] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 초기 행 5개 추가
    const initialItems = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: '',
      details: '',
      price: 0,
      qty: 0,
    }));
    setItems(initialItems);
  }, []);

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
  const vat = Math.floor(subtotal * 0.1);

  // 할인액 계산
  const calculatedDiscount = isPercentDiscount
    ? Math.floor(subtotal * (discountAmount / 100))
    : discountAmount;

  const total = subtotal + vat - calculatedDiscount;

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`견적서_${clientName || '알수없음'}_${docDate}.pdf`);
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
        clientName,
        docDate,
        projectTitle,
        items,
        subtotal,
        vat,
        discountName,
        discountAmount,
        isPercentDiscount,
        total,
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
        alert('저장 실패: ' + result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const formatWithCommas = (value: number) => {
    if (value === 0) return '';
    return value.toLocaleString();
  };

  const parseFormattedNumber = (value: string) => {
    return parseInt(value.replace(/,/g, '')) || 0;
  };

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

        {/* 견적서 시트 */}
        <div
          ref={invoiceRef}
          className="bg-white shadow-premium rounded-[2rem] overflow-hidden border border-slate-100"
          style={{ minHeight: '1120px' }}
        >
          {/* 견적서 상단 */}
          <div className="bg-slate-900 text-white p-12 flex justify-between items-end relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <h1 className="text-5xl font-black tracking-tighter mb-2">견 적 서</h1>
              <p className="text-slate-400 font-medium tracking-[0.2em] uppercase text-sm">Official Quotation</p>
            </div>
            <div className="text-right flex flex-col items-end relative z-10">
              <div className="relative mb-2">
                <span className="text-2xl font-black tracking-tight underline underline-offset-8 decoration-blue-500 uppercase">AI Partners</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Professional AI Education & Service Solutions</p>
            </div>
          </div>

          <div className="p-12">
            {/* 정보 섹션 */}
            <div className="grid grid-cols-2 gap-20 mb-16">
              <div className="space-y-8">
                <div>
                  <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">수신 (Client Information)</h2>
                  <input
                    type="text"
                    className="text-3xl font-black w-full border-b-2 border-slate-100 focus:border-blue-500 outline-none pb-2 transition-colors placeholder:text-slate-200 text-slate-900"
                    placeholder="고객사/기관명 귀중"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center group">
                    <span className="w-24 text-xs font-bold text-slate-400 uppercase tracking-tighter">Issue Date</span>
                    <input
                      type="date"
                      className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all font-mono"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center group">
                    <span className="w-24 text-xs font-bold text-slate-400 uppercase tracking-tighter">Project Name</span>
                    <input
                      type="text"
                      className="flex-1 bg-slate-50 px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-300"
                      placeholder="프로젝트 또는 교육명을 입력하세요"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">공급자 (Our Company)</h2>
                <div className="grid grid-cols-1 gap-3 relative">
                  {[
                    ['사업자번호', '205-23-75240'],
                    ['상 호', 'AI 파트너스'],
                    ['대 표 자', '이충우'],
                    ['업태/종목', '서비스 / 교육서비스'],
                    ['연 락 처', '010-9911-2585 / aip@aipart.io'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex text-sm">
                      <span className="min-w-[80px] text-slate-400 font-medium">{label}</span>
                      <span className="font-bold text-slate-900">{value}</span>
                    </div>
                  ))}

                  {/* 도장 위치 */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center">
                    {stampImage ? (
                      <img src={stampImage} alt="Stamp" className="w-full h-full object-contain opacity-90 rotate-[-10deg]" />
                    ) : (
                      <label className="no-print cursor-pointer w-14 h-14 border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <ImageIcon size={20} className="text-slate-300" />
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
                  <tr className="border-y-2 border-slate-900 text-slate-900 text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-4 py-4 w-12 text-center">No.</th>
                    <th className="px-4 py-4">항목 및 세부 세부사항</th>
                    <th className="px-4 py-4 text-right w-32">단가 (KRW)</th>
                    <th className="px-4 py-4 text-center w-20">수량</th>
                    <th className="px-4 py-4 text-right w-40">합계 금액</th>
                    <th className="px-4 py-4 w-12 no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-5 text-center text-slate-300 text-xs font-black">{idx + 1}</td>
                      <td className="px-4 py-5 space-y-1">
                        <input
                          type="text"
                          className="w-full bg-transparent font-bold text-slate-900 outline-none placeholder:text-slate-200"
                          placeholder="품목명을 입력하세요"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent text-xs text-slate-400 outline-none placeholder:text-slate-200"
                          placeholder="세부 기술 사양 또는 관련 정보를 입력하세요"
                          value={item.details}
                          onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-5">
                        <input
                          type="text"
                          className="w-full bg-transparent text-right font-semibold text-slate-600 outline-none"
                          value={formatWithCommas(item.price)}
                          onChange={(e) => updateItem(item.id, 'price', parseFormattedNumber(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-5">
                        <input
                          type="number"
                          className="w-full bg-transparent text-center font-semibold text-slate-600 outline-none"
                          value={item.qty || ''}
                          onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-5 text-right font-black text-slate-900">
                        {(item.price * item.qty).toLocaleString()}
                      </td>
                      <td className="px-4 py-5 text-center no-print">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-200 hover:text-red-500 transition-colors"
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
                className="no-print mt-6 flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 text-xs rounded-lg transition-all font-bold tracking-tight border border-transparent hover:border-slate-200"
              >
                <Plus size={14} />
                <span>라인 아이템 추가</span>
              </button>
            </div>

            {/* 정산 영역 */}
            <div className="flex justify-end pt-8 border-t-2 border-slate-900">
              <div className="w-full md:w-96 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Total Subtotal</span>
                  <span className="font-bold text-slate-600 font-mono tracking-tighter">{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">VAT (10%)</span>
                  <span className="font-bold text-slate-600 font-mono tracking-tighter">{vat.toLocaleString()}</span>
                </div>

                {/* 할인 입력 필드 */}
                <div className="flex flex-col space-y-2 py-3 border-y border-dashed border-slate-100">
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      className="bg-transparent border-none outline-none text-[10px] font-black text-blue-500 uppercase tracking-widest w-1/2 placeholder:text-blue-200"
                      placeholder="할인 항목 입력 (예: 프로모션)"
                      value={discountName}
                      onChange={(e) => setDiscountName(e.target.value)}
                    />
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="w-24 bg-slate-50 px-2 py-1 rounded text-right font-bold text-slate-900 outline-none text-xs"
                        placeholder="0"
                        value={formatWithCommas(discountAmount)}
                        onChange={(e) => setDiscountAmount(parseFormattedNumber(e.target.value))}
                      />
                      <select
                        className="bg-slate-50 border-none rounded text-[10px] font-bold text-slate-500 outline-none p-1 cursor-pointer"
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
                      <span className="text-slate-400 font-medium italic">Calculated Discount:</span>
                      <span className="text-red-500 font-bold font-mono">- {calculatedDiscount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-blue-600 font-black uppercase tracking-widest text-xs">Total Amount</span>
                  <span className="text-3xl font-black text-slate-900 font-mono">₩ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 하단 푸터 */}
            <div className="mt-32 text-center space-y-6">
              <p className="text-slate-900 font-bold text-lg">위와 같이 견적 내용을 제출합니다.</p>
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
