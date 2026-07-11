(function (h) {
    if (!h?.meta || h.meta.name !== 'h') console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');

    h.resource = function (fetcher) {
        const state = h.signal({ loading: true, data: null, error: null })
        let requestId = 0

        function load() {
            const currentId = ++requestId
            state.value = { ...state.value, loading: true }

            Promise.resolve()
                .then(fetcher)
                .then(data => {
                    if (currentId !== requestId) return // пришёл устаревший ответ — игнорируем
                    state.value = { loading: false, data, error: null }
                })
                .catch(error => {
                    if (currentId !== requestId) return
                    state.value = { loading: false, data: null, error }
                })
        }

        load()

        return {
            get value() { return state.value },
            __isSignal: true,
            refetch: load
        }
    }
})(window.h)