"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Download, Save, Printer, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface InvoiceItem {
  id: number;
  name: string;
  details: string;
  price: number;
  qty: number;
}

export default function InvoicePage() {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [stampImage, setStampImage] = useState<string | null>(null);
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
      { id: prev.length + 1, name: '', details: '', price: 0, qty: 0 },
    ]);
  };

  const updateItem = (id: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const vat = Math.floor(subtotal * 0.1);
  const total = subtotal + vat;

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;

    // 임시로 인쇄용 스타일 적용을 위해 클래스 추가 등의 처리가 필요할 수 있음
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

  return (
    <main className="bg-gray-100 min-h-screen py-10 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 액션바 */}
        <div className="flex justify-end space-x-4 no-print bg-white p-4 rounded-lg shadow-sm">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
          >
            <Printer size={18} />
            <span>화면 인쇄</span>
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            <Download size={18} />
            <span>PDF 저장</span>
          </button>
          <button
            onClick={saveToDB}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            <Save size={18} />
            <span>DB 저장</span>
          </button>
        </div>

        {/* 견적서 영역 */}
        <div ref={invoiceRef} className="bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-200">
          {/* 상단 헤더 */}
          <div className="bg-slate-800 text-white p-8 flex justify-between items-end relative">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">견 적 서</h1>
              <p className="text-slate-400 mt-2">Quotation</p>
            </div>
            <div className="text-right flex flex-col items-end relative">
              <div className="relative group">
                <p className="text-xl font-bold inline-block mr-2">AI 파트너스</p>
                {/* 도장 영역 */}
                <div className="absolute -right-12 -top-4 w-16 h-16 flex items-center justify-center">
                  {stampImage ? (
                    <img src={stampImage} alt="Stamp" className="w-full h-full object-contain opacity-80" />
                  ) : (
                    <label className="no-print cursor-pointer w-10 h-10 border-2 border-dashed border-slate-500 rounded-full flex items-center justify-center hover:bg-slate-700">
                      <ImageIcon size={20} className="text-slate-400" />
                      <input type="file" className="hidden" onChange={handleStampUpload} accept="image/*" />
                    </label>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-400">전문적인 AI 교육 및 서비스 솔루션</p>
            </div>
          </div>

          <div className="p-8">
            {/* 공급자/수신자 정보 */}
            <div className="grid grid-cols-2 gap-12 mb-10">
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b pb-1">수신 (Client)</h2>
                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    className="text-2xl font-bold w-full border-b border-dashed border-gray-200 focus:border-blue-500 outline-none pb-1"
                    placeholder="고객사/기관명 귀중"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-20">작성일자:</span>
                    <input
                      type="date"
                      className="flex-1 border-b border-dashed border-gray-200 focus:border-blue-500 outline-none"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-20">견적명:</span>
                    <input
                      type="text"
                      className="flex-1 border-b border-dashed border-gray-200 focus:border-blue-500 outline-none"
                      placeholder="프로젝트 또는 교육명을 입력하세요"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b pb-1">공급자 (Supplier)</h2>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="h-8">
                      <td className="w-24 text-gray-500">사업자번호</td>
                      <td className="font-medium">205-23-75240</td>
                    </tr>
                    <tr className="h-8">
                      <td className="text-gray-500">상 호</td>
                      <td className="font-medium">AI 파트너스</td>
                    </tr>
                    <tr className="h-8">
                      <td className="text-gray-500">대 표 자</td>
                      <td className="font-medium">이충우</td>
                    </tr>
                    <tr className="h-8">
                      <td className="text-gray-500">업태/종목</td>
                      <td className="font-medium">서비스 / 교육서비스</td>
                    </tr>
                    <tr className="h-8">
                      <td className="text-gray-500">연 락 처</td>
                      <td className="font-medium">010-9911-2585 / aip@aipart.io</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 메인 테이블 */}
            <div className="mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                    <th className="px-4 py-3 border-b w-12 text-center">No.</th>
                    <th className="px-4 py-3 border-b">품목 및 세부내용</th>
                    <th className="px-4 py-3 border-b text-right w-32">단가 (원)</th>
                    <th className="px-4 py-3 border-b text-center w-20">수량</th>
                    <th className="px-4 py-3 border-b text-right w-40">공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="group border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-center text-gray-400 text-sm font-medium">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          className="w-full bg-transparent font-medium outline-none"
                          placeholder="품목명을 입력하세요"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent text-xs text-gray-400 mt-1 outline-none"
                          placeholder="세부 내용을 입력하세요"
                          value={item.details}
                          onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          className="w-full bg-transparent text-right outline-none"
                          placeholder="0"
                          value={item.price || ''}
                          onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          className="w-full bg-transparent text-center outline-none"
                          placeholder="0"
                          value={item.qty || ''}
                          onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-700">
                        {(item.price * item.qty).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={addRow}
                className="no-print mt-4 flex items-center space-x-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded transition-colors font-medium"
              >
                <Plus size={14} />
                <span>항목 추가</span>
              </button>
            </div>

            {/* 합계 영역 */}
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-3 bg-slate-50 p-6 rounded-lg border border-slate-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>소계 (Subtotal)</span>
                  <span>{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>부가가치세 (VAT 10%)</span>
                  <span>{vat.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-slate-900 border-t pt-3 mt-3">
                  <span>총 합계 (Total)</span>
                  <span>₩ {total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* 하단 안내 */}
            <div className="mt-12 pt-8 border-t border-gray-100 text-center text-gray-500 italic text-sm">
              <p>위와 같이 견적을 제출합니다.</p>
              <p className="mt-2 text-slate-400 font-normal">AI 파트너스 대표 이충우 (인)</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
          }
          main {
            padding: 0 !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
          }
          .shadow-2xl {
            box-shadow: none !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
          .border {
            border: none !important;
          }
        }
      `}</style>
    </main>
  );
}
