(function (h) {
    if (!h?.meta || h.meta.name !== "h") {
        throw new Error("h.js is not loaded.")
    }
    /**
     * Анимирует элемент с помощью Web Animations API
     * @param {HTMLElement} el 
     * @param {*} options 
     * @returns 
     */
    function animate(el, options = {}) {
        const {
            duration = 300,
            easing = "ease",
            fill = "forwards",
            onStart,
            onUpdate,
            onComplete,
            onCancel,
            ...styles
        } = options
        const animation = el.animate(
            [{}, styles],
            {
                duration,
                easing,
                fill
            }
        )
        onStart?.(el, animation)
        let raf = null
        if (onUpdate) {
            const tick = () => {
                const timing = animation.effect?.getTiming?.();
                const duration = timing?.duration ?? 300;
                const current = animation.currentTime ?? 0;
                const progress = Math.min(current / duration, 1);
                onUpdate({
                    progress,
                    currentTime: current,
                    duration,
                    animation,
                    element: el
                });
                if (progress < 1) {
                    raf = requestAnimationFrame(tick);
                }
            };
            raf = requestAnimationFrame(tick);
        }
        animation.finished
            .then(() => {
                if (raf !== null) {
                    cancelAnimationFrame(raf)
                }
                onComplete?.(el, animation)
            })
            .catch(() => {
                if (raf !== null) {
                    cancelAnimationFrame(raf)
                }
                onCancel?.(el, animation)
            })
        return animation
    }

    h._internals.addProcessor("animate", (value, el) => animate(el, value))
    h.animate = animate

})(window.h)