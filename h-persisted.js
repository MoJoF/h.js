(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    h.persisted = function (key, defaultValue) {
        let stored
        try { stored = JSON.parse(localStorage.getItem(key)) } catch { }
        const s = h.signal(stored ?? defaultValue)
        h.watch(() => {
            localStorage.setItem(key, JSON.stringify(s.value))
        })
        return s
    }
})(window.h)