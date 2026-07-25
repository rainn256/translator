// 全局中间件：校验 /api/* 请求的 JWT（除 /api/login）
export async function onRequest(context) {
    const { request, next, env } = context
    const url = new URL(request.url)

    // 放行登录接口
    if (url.pathname === '/api/login') {
        return next()
    }

    // 仅对 /api/* 进行校验
    if (!url.pathname.startsWith('/api/')) {
        return next()
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: '未授权' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const token = authHeader.split(' ')[1]
    try {
        // 使用 jwt 库验证
        const { verify } = await import('@tsndr/cloudflare-worker-jwt')
        const isValid = await verify(token, env.JWT_SECRET)
        if (!isValid) {
            return new Response(JSON.stringify({ error: '无效的 token' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        }
        // 验证通过，继续处理
        return next()
    } catch (err) {
        return new Response(JSON.stringify({ error: '认证失败' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
}