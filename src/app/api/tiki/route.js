import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cnno = searchParams.get('cnno')

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (!cnno) {
    return NextResponse.json(
      { error: 'Missing cnno parameter' },
      { status: 400, headers: corsHeaders }
    )
  }

  // ⏱ Timeout guard (6s)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const tikiRes = await fetch(
      `https://my.tiki.id/api/v1/tracking?cnno=${cnno}`,
      {
        headers: {
          'x-api-key': process.env.TIKI_API_KEY,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )

    clearTimeout(timeout)

    // Log outcome
    console.log(`[TIKI Proxy] CNNO ${cnno} → ${tikiRes.status} (${new Date().toISOString()})`)

    const contentType = tikiRes.headers.get('content-type') || ''
    let data = null

    // 🧠 1. Detect HTML / non-JSON or 429 responses
    if (tikiRes.status === 429 || contentType.includes('text/html')) {
      return NextResponse.json(
        {
          success: false,
          error: 'SERVER_BUSY',
          message:
            'TIKI server sedang sibuk atau tidak stabil. Coba lagi dalam beberapa saat.',
          hint: 'Received non-JSON / HTML or 429 response.',
        },
        { status: 503, headers: corsHeaders }
      )
    }

    // 🧠 2. Parse JSON normally
    if (contentType.includes('application/json')) {
      try {
        data = await tikiRes.json()
      } catch {
        data = { success: false, error: 'INVALID_JSON', message: 'TIKI returned malformed JSON' }
      }
    } else {
      const snippet = (await tikiRes.text()).slice(0, 300)
      data = {
        success: false,
        error: 'NON_JSON_RESPONSE',
        snippet,
        message: 'Unexpected non-JSON response from TIKI',
      }
    }

    // 🧠 3. Extra guard — if response seems empty or incomplete
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'EMPTY_RESPONSE',
          message: 'TIKI did not return any data. Please try again shortly.',
        },
        { status: 502, headers: corsHeaders }
      )
    }

    // ✅ Normal forward if everything looks fine
    return NextResponse.json(data, {
      status: tikiRes.status,
      headers: corsHeaders,
    })
  } catch (err) {
    clearTimeout(timeout)
    const errorType =
      err.name === 'AbortError'
        ? 'Request timeout (TIKI took too long)'
        : err.message

    return NextResponse.json(
      {
        success: false,
        error: 'PROXY_FAILURE',
        detail: errorType,
        message:
          'Tidak dapat menghubungi server TIKI saat ini. Silakan coba beberapa saat lagi.',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

// ✅ Preflight handler
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
