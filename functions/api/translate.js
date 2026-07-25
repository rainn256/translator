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

        // 通过 Service Binding 调用翻译 Worker
        const translateRequest = new Request('/deepl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({
                text, 
                target_lang: target_lang || 'ZH',
                source_lang: source_lang || 'AUTO'
            })
        })
        // 使用 Binding 的 fetch 方法发起内部调用
        const resp = await env.TRANSLATE_SERVICE.fetch(translateRequest)
        if (!resp.ok) {
            const errorBody = await resp.text()
            return new Response(JSON.stringify({ error: `翻译服务异常: ${resp.status} - ${errorBody}` }), { 
                status: resp.status,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const data = await resp.json()
        return new Response(JSON.stringify(data), {
            status: resp.status,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (err) {
        return new Response(JSON.stringify({ error: '翻译服务调用失败' + + err.message }), { status: 500 })
    }
}
