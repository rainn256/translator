import { sign } from '@tsndr/cloudflare-worker-jwt'

export async function onRequest(context) {
    const { request, env } = context
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const { username, password } = await request.json()
        // 从环境变量读取预设用户名密码
        const validUser = env.VALID_USER || 'admin'
        const validPass = env.VALID_PASS || 'password'

        if (username === validUser && password === validPass) {
            const token = await sign({ username, exp: Math.floor(Date.now() / 1000) + 3600 }, // 1小时过期
                env.JWT_SECRET
            )
            return new Response(JSON.stringify({ token }), {
                headers: { 'Content-Type': 'application/json' }
            })
        } else {
            return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 })
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: '请求格式错误' }), { status: 400 })
    }
}