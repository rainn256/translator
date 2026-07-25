export async function onRequest(context) {
    const { request, env } = context
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const body = await request.json()
        const { text, target_lang, source_lang } = body

        if (!text) {
            return new Response(JSON.stringify({ error: '缺少 text 参数' }), { status: 400 })
        }

        // 从环境变量获取翻译 Worker 地址
        const translateUrl = env.TRANSLATE_WORKER_URL
        if (!translateUrl) {
            return new Response(JSON.stringify({ error: '翻译服务未配置' }), { status: 500 })
        }

        const resp = await fetch(translateUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                target_lang: target_lang || 'ZH',
                source_lang: source_lang || 'AUTO'
            })
        })

        const data = await resp.json()
        return new Response(JSON.stringify(data), {
            status: resp.status,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: '翻译服务异常' }), { status: 500 })
    }
}