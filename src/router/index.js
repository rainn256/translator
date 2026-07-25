import { createRouter, createWebHistory } from "vue-router"
import Login from '../components/Login.vue'
import Translator from '../components/Translator.vue'

const routes = [
    { path: '/', redirect: '/translate' },
    { path: '/login', component: Login },
    { path: '/translate', component: Translator },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// 导航守卫：未登录跳转
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.path !== '/login' && !token) {
        next('/login')
    } else if (to.path === '/login' && token) {
        next('/translate')
    } else {
        next()
    }
})

export default router