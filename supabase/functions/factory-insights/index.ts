import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import { createInsightsHandler } from './handler.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
});

Deno.serve(createInsightsHandler({
    authenticate: async token => {
        const { data: { user }, error } = await admin.auth.getUser(token);
        if (error || !user) return null;
        const { data: profile, error: profileError } = await admin.from('profiles')
            .select('id,role,status,deleted_at').eq('id', user.id).single();
        if (profileError) throw profileError;
        return profile;
    },
    reserve: async id => {
        const { data, error } = await admin.rpc('reserve_factory_ai_request', { p_user_id: id });
        if (error) throw error;
        return data === true;
    },
    generate: async metrics => {
        const { data: apiKey, error } = await admin.rpc('read_factory_ai_secret');
        if (error || !apiKey) throw new Error('Server configuration unavailable');
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                contents: [{ parts: [{ text: `أنت خبير تشغيل لمصنع فلين. قدم 3 نصائح تشغيلية قصيرة باللغة العربية بناءً على هذه الإحصاءات الشهرية. لا تفترض وجود بيانات غير مذكورة. الشهر: ${metrics.month + 1}. استثمار المخزن: ${metrics.inventoryInvestment} دولار. المصاريف: ${metrics.totalExpenses} دولار. توفير الطاقة: ${metrics.savings}%. تكلفة ساعة الطاقة: ${metrics.hourly} دولار.` }] }],
                generationConfig: { responseMimeType: 'application/json', responseSchema: {
                    type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, text: { type: 'STRING' } }, required: ['title', 'text'] }
                } }
            })
        });
        if (!response.ok) throw new Error('Insights provider unavailable');
        const body = await response.json();
        const text = body.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('');
        return JSON.parse(text || 'null');
    }
}));
