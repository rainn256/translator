<template>
    <div id="app">
        <router-view />
    </div>
</template>

<script setup>
</script>

<style>
/* 全局基础样式 */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        sans-serif;
    background: #f5f7fa;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
}
#app {
    width: 100%;
    max-width: 2000px;
}
</style>