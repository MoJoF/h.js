(function (h) {
    /* const f = h.resource(() => fetch('https://jsonplaceholder.typicode.com/todos/').then(resp => resp.json()))
     * const TodosList = () => {
     *     const state = f.value
     *
     *     if (state.loading) return h('p', { text: 'Загрузка' })
     *     if (state.error) return h('p', { text: 'Ошибка загрузки' })
     *
     *     return h('ul', { children: state.data.map(todo => ['li', { children: [
     *         ['input', { type: 'checkbox', checked: todo.completed }],
     *         ['label', { text: todo.title }]
     *     ] }]) })
     * }
     * document.body.appendChild(h(TodosList))
    */
    
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    h.resource = function (fetcher) {
        const state = h.signal({ loading: true, data: null, error: null })
        let requestId = 0
        let currentController = null

        function load() {
            currentController?.abort()
            const controller = new AbortController()
            currentController = controller

            const currentId = ++requestId
            state.value = { ...state.value, loading: true, error: null }

            Promise.resolve()
                .then(() => fetcher(controller.signal))
                .then(data => {
                    if (currentId !== requestId) return
                    state.value = { loading: false, data, error: null }
                })
                .catch(error => {
                    if (currentId !== requestId) return
                    if (error?.name === 'AbortError') return // отменённый запрос — не показываем как ошибку
                    state.value = { loading: false, data: null, error }
                })
        }

        load()

        return {
            get value() { return state.value },
            __isSignal: true,
            refetch: load,
            dispose: () => currentController?.abort()
        }
    }
})(window.h)