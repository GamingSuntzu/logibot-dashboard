import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cnno = searchParams.get('cnno')

  if (!cnno) {
    return NextResponse.json({ error: 'Missing cnno parameter' }, { status: 400, headers: corsHeaders })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  try {
    const response = await fetch(`https://my.tiki.id/api/v1/tracking?cnno=${cnno}`, {
      headers: {
        'x-api-key': process.env.TIKI_API_KEY,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status, headers: corsHeaders })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch from TIKI', detail: err.message }, { status: 500, headers: corsHeaders })
  }
}

// Handle preflight requests (OPTIONS)
export async function OPTIONS() {
  return NextResponse.json({}, { headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }})
}
