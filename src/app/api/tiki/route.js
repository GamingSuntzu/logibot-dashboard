import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const cnno = searchParams.get('cnno')

  if (!cnno) {
    return NextResponse.json({ error: 'Missing cnno parameter' }, { status: 400 })
  }

  try {
    const response = await fetch(`https://my.tiki.id/api/v1/tracking?cnno=${cnno}`, {
      headers: {
        'x-api-key': process.env.TIKI_API_KEY,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // ensure fresh fetch, no caching
    })

    const text = await response.text() // read raw body
    let data

    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text } // fallback if not JSON
    }

    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    console.error('Proxy error:', err)
    return NextResponse.json({ error: 'Failed to fetch from TIKI', detail: err.message }, { status: 500 })
  }
}
