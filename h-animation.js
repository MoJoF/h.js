(function (h) {
    if (!h?.meta || h.meta.name !== "h") {
        throw new Error("h.js is not loaded.")
    }
    /**
     * 
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
                if (animation.playState !== "running") return
                const timing = animation.effect.getTiming()
                const progress = Math.min(
                    (animation.currentTime ?? 0) / timing.duration,
                    1
                )
                onUpdate({
                    progress,
                    currentTime: animation.currentTime ?? 0,
                    duration: timing.duration,
                    animation,
                    element: el
                })
                raf = requestAnimationFrame(tick)
            }
            raf = requestAnimationFrame(tick)
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

    h.addProcessor("animate", (value, el) => animate(el, value))

    h.animate = animate

})(window.h)