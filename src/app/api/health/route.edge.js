// Edge function - runs on Vercel Edge Network for instant response
export const runtime = 'edge';

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      edge: true, // Indicates this ran on edge network
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'CDN-Cache-Control': 'public, max-age=300',
      },
    }
  );
}
