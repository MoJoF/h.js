(function (h) {
    /**
     * Create sync: const nameLocal = h.persisted('name', 'Max')
     * 
     * document.body.appendChild(h('input', { on: { input: (e) => nameLocal.value = e.target.value } }))
     * 
     * Remove sync: nameLocal.destroy()
     */
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version.')
        return
    }

    h.persisted = function (key, defaultValue, { storage = localStorage } = {}) {
        let stored = defaultValue

        const raw = storage.getItem(key)

        if (raw !== null) {
            try { stored = JSON.parse(raw) } 
            catch (e) { console.error(e) }
        }

        const s = h.signal(stored)

        h.watch(() => {
            try { storage.setItem(key, JSON.stringify(s.value)) } 
            catch (e) { console.error(e) }
        })

        function onStorage(e) {
            if (e.storageArea !== storage) return
            if (e.key !== key) return

            try {
                s.value = e.newValue === null
                    ? defaultValue
                    : JSON.parse(e.newValue)
            } catch (err) { console.error(err) }
        }

        window.addEventListener("storage", onStorage)

        return {
            get value() { return s.value },
            set value(v) { s.value = v },
            __isSignal: true,
            destroy() { window.removeEventListener("storage", onStorage) }
        }
    }
})(window.h)