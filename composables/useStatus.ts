const successMsg = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

const showSuccess = (msg: string) => {
    successMsg.value = msg
    clearTimeout(timer)
    timer = setTimeout(() => {
        successMsg.value = ''
    }, 3000)
}

export const useStatus = () => ({ success: successMsg, showSuccess })
