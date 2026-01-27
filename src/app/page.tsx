"use client";

import Link from 'next/link';
import { ArrowRight, CheckCircle, Shield, Zap, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden hero-gradient">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 mt-[-100px]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl opacity-50 animate-float" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-3xl opacity-50" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Premium Quotation Solution</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
            가장 스마트하게 제안하고<br />
            <span className="text-gradient">비즈니스를 가속하세요</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed font-medium">
            AI 파트너스 표준 견적서 시스템으로 전문적인 제안서를 단 몇 분 만에 완성하세요.
            클라우드 기반 저장과 즉시 내보내기 기능으로 업무 효율을 극대화합니다.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
            <Link
              href="/editor"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <span>견적서 작성하기</span>
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl font-bold text-lg shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
            >
              <FileText size={20} />
              <span>내역 확인하기</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white/50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">초고속 작성</h3>
              <p className="text-slate-600 leading-relaxed">
                직관적인 인터페이스로 복잡한 항목도 빠르게 입력하고 실시간으로 합계를 계산합니다.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">안전한 데이터 보관</h3>
              <p className="text-slate-600 leading-relaxed">
                작성된 모든 견적서는 Turso DB에 안전하게 보관되어 언제 어디서든 다시 불러올 수 있습니다.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="text-emerald-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">전문적인 PDF 리포트</h3>
              <p className="text-slate-600 leading-relaxed">
                표준화된 양식의 PDF로 즉시 변환하여 고객에게 신뢰감 있는 제안을 전달하세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer-like Branding */}
      <section className="py-20 text-center border-t border-slate-100">
        <p className="text-slate-400 font-medium">© 2026 AI Partners. Professional AI Education & Service Solutions.</p>
      </section>
    </div>
  );
}
