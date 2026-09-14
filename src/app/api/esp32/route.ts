import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const espIp = searchParams.get('ip');

  if (!espIp) {
    return NextResponse.json(
      { error: 'Missing ESP32 IP address parameter (?ip=...)' },
      { status: 400 }
    );
  }

  // Sanitize IP format
  const sanitizedIp = espIp.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    const response = await fetch(`http://${sanitizedIp}/api/status`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `ESP32 responded with status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown connection error';
    return NextResponse.json(
      {
        error: `Could not connect to ESP32 at ${sanitizedIp}. Make sure it is powered on and connected to the same Wi-Fi network. (${errorMsg})`,
      },
      { status: 504 }
    );
  }
}
