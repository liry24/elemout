import './style.css'
import App from './App.vue'
import { router } from './router'

createApp(App).use(router).mount('#app')

// Firefox: WXT のホットリロードでバックグラウンドが再起動すると接続が切れる。
// 切断を検知してページをリロードすることで白画面を防ぐ。
// 起動直後（3秒以内）の切断は再起動サイクル中の誤検知のため無視し、無限ループを防ぐ。
if (import.meta.env.FIREFOX) {
    const loadedAt = Date.now()
    const port = browser.runtime.connect({ name: 'keepalive' })
    port.onDisconnect.addListener(() => {
        if (Date.now() - loadedAt < 3000) return
        window.location.reload()
    })
}
