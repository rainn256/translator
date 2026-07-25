<template>
    <div class="login-container">
        <h2>🔐 登录</h2>
        <form @submit.prevent="handleLogin">
            <div class="form-group">
                <label>用户名</label>
                <input v-model="username" type="text" placeholder="请输入用户名" required />
            </div>
            <div class="form-group">
                <label>密码</label>
                <input v-model="password" type="password" placeholder="请输入密码" required />
            </div>
            <button type="submit" :disabled="loading">登录</button>
            <p v-if="error" class="error">{{ error }}</p>
        </form>
    </div>
</template>

<script setup>
import { ref } from "vue"
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
    error.value = ''
    loading.value = true
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.value, password: password.value })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '登录失败')
        localStorage.setItem('token', data.token)
        router.push('/translate')
    } catch (e) {
        error.value = e.message
    } finally {
        loading.value = false
    }
}
</script>

<style scoped>
.login-container {
    max-width: 400px;
    margin: 0 auto;
    padding: 40px 30px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
h2 {
    text-align: center;
    margin-bottom: 30px;
}
.form-group {
    margin-bottom: 20px;
}
label {
    display: block;
    font-weight: 500;
    margin-bottom: 6px;
}
input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
}
button {
    width: 100%;
    padding: 12px;
    background: #2d7aff;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
}
button:disabled {
    opacity: 0.6;
}
.error {
    color: #e53e3e;
    margin-top: 12px;
    text-align: center;
}
</style>