import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import http from 'http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LARAVEL_HOST = '127.0.0.1';
const LARAVEL_PORT = 8080;

async function proxyRequest(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  
  // Build query string
  const queryString = request.nextUrl.search || '';
  const targetPath = `/${path}${queryString}`;

  // Collect headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers[key] = value;
    }
  });
  headers['host'] = `${LARAVEL_HOST}:${LARAVEL_PORT}`;

  return new Promise<NextResponse>(async (resolve) => {
    const options: http.RequestOptions = {
      hostname: LARAVEL_HOST,
      port: LARAVEL_PORT,
      path: targetPath,
      method: request.method,
      headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Collect response body
      const chunks: Buffer[] = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks);
        const responseHeaders = new Headers();
        
        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (value && !['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
            responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
          }
        });

        resolve(new NextResponse(body, {
          status: proxyRes.statusCode || 500,
          headers: responseHeaders,
        }));
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Upload proxy error:', err.message);
      resolve(NextResponse.json(
        { success: false, message: 'API unreachable: ' + err.message },
        { status: 502 }
      ));
    });

    // Stream the request body to Laravel
    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      const reader = request.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            proxyReq.end();
            break;
          }
          proxyReq.write(value);
        }
      };
      pump().catch(() => proxyReq.end());
    } else {
      proxyReq.end();
    }
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxyRequest(req, ctx);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxyRequest(req, ctx);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxyRequest(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxyRequest(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return proxyRequest(req, ctx);
}
