import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cnno = searchParams.get('cnno')

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (!cnno) {
    return NextResponse.json(
      { error: 'Missing cnno parameter' },
      { status: 400, headers: corsHeaders }
    )
  }

  // timeout setup (e.g. 6s)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const tikiRes = await fetch(`https://my.tiki.id/api/v1/tracking?cnno=${cnno}`, {
      headers: {
        'x-api-key': process.env.TIKI_API_KEY,
        'Content-Type': 'application/json'
      },
      cache: 'no-store',
      signal: controller.signal
    })

    // ✅ Log the outcome as soon as we get a response
    console.log(`[TIKI Proxy] CNNO ${cnno} → ${tikiRes.status} (${new Date().toISOString()})`)

    clearTimeout(timeout)

    // Handle TIKI API failure explicitly
    const contentType = tikiRes.headers.get('content-type') || ''
    let data

    if (contentType.includes('application/json')) {
      try {
        data = await tikiRes.json()
      } catch {
        data = { error: 'Invalid JSON returned from TIKI' }
      }
    } else {
      const text = await tikiRes.text()
      data = {
        error: 'Non-JSON response from TIKI',
        snippet: text.slice(0, 200)
      }
    }

    return NextResponse.json(data, {
      status: tikiRes.status,
      headers: corsHeaders
    })
  } catch (err) {
    const errorType =
      err.name === 'AbortError'
        ? 'Request timeout (TIKI took too long)'
        : err.message

    return NextResponse.json(
      { error: 'Failed to fetch from TIKI', detail: errorType },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Preflight handler
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  )
}
