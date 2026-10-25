import { NextResponse, type NextRequest } from 'next/server';

// 앱 전체(화면 + /api/*)를 HTTP Basic 인증으로 막는다.
// APP_PASSWORD가 없으면 열어 두지 않고 503으로 막는다(fail-closed).
export function proxy(req: NextRequest) {
    const password = process.env.APP_PASSWORD;
    const user = process.env.APP_USER || 'admin';

    if (!password) {
        return new NextResponse('APP_PASSWORD is not configured', { status: 503 });
    }

    const header = req.headers.get('authorization') || '';
    if (header.startsWith('Basic ')) {
        const decoded = atob(header.slice(6));
        const sep = decoded.indexOf(':');
        if (sep !== -1 && safeEqual(decoded.slice(0, sep), user) && safeEqual(decoded.slice(sep + 1), password)) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="invoice-aip", charset="UTF-8"' },
    });
}

function safeEqual(a: string, b: string) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
