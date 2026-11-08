type Actor = { id: string; role: string; status?: string; deleted_at?: string | null };
type Metrics = { month: number; inventoryInvestment: number; totalExpenses: number; savings: number; hourly: number };
type Insight = { title: string; text: string };
type Dependencies = {
    authenticate: (token: string) => Promise<Actor | null>;
    reserve: (id: string) => Promise<boolean>;
    generate: (metrics: Metrics) => Promise<Insight[]>;
};

export const createInsightsHandler = (dependencies: Dependencies) => async (request: Request) => {
    const origin = request.headers.get('origin');
    const allowed = !origin || ['https://v.high-star.iq', 'https://agents.high-star.iq', 'http://localhost:3000', 'http://127.0.0.1:3000', 'null'].includes(origin);
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowed && origin ? origin : 'https://v.high-star.iq',
        'Access-Control-Allow-Headers': 'authorization,x-client-info,apikey,content-type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Vary': 'Origin'
    };
    const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return respond(403, { error: 'Origin not allowed' });
    if (request.method === 'OPTIONS') return respond(200, { ok: true });
    if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });
    const match = request.headers.get('authorization')?.match(/^Bearer (.+)$/i);
    if (!match) return respond(401, { error: 'Authentication required' });
    try {
        const actor = await dependencies.authenticate(match[1]);
        if (!actor) return respond(401, { error: 'Invalid session' });
        if (!['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VIEWER'].includes(actor.role) || actor.status === 'suspended' || actor.deleted_at) {
            return respond(403, { error: 'Staff access required' });
        }
        const text = await request.text();
        if (text.length > 2048) return respond(400, { error: 'Request too large' });
        let metrics: Metrics;
        try { metrics = JSON.parse(text); } catch { return respond(400, { error: 'Invalid JSON' }); }
        if (!metrics || !Number.isInteger(metrics.month) || metrics.month < 0 || metrics.month > 11 ||
            ['inventoryInvestment', 'totalExpenses', 'savings', 'hourly'].some(key => {
                const value = metrics[key as keyof Metrics];
                return typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12;
            })) return respond(400, { error: 'Invalid metrics' });
        if (!await dependencies.reserve(actor.id)) return respond(429, { error: 'Please wait one minute before retrying' });
        const insights = await dependencies.generate(metrics);
        if (!Array.isArray(insights) || insights.length !== 3 || insights.some(item => typeof item.title !== 'string' || typeof item.text !== 'string')) {
            return respond(502, { error: 'Invalid insights response' });
        }
        return respond(200, { insights });
    } catch {
        return respond(502, { error: 'Insights service unavailable' });
    }
};
