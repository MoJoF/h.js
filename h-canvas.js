(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    let ctx
    const scene = h.signal([])

    const drawings = {
        rect: drawRect
    }

    const clickers = {
        rect: clickRect
    }

    // Инициализация canvas
    function init(target) {
        if (ctx) return

        let canvas = typeof target === 'string' ? document.querySelector(target) : target;
        ctx = canvas.getContext('2d')

        h.watch(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            scene.value.forEach(el => drawings[el.type](el))
        })

        canvas.addEventListener('click', handleCanvasClick);
    }

    // Удаление элемента по id
    function unmount(id) {
        scene.value = scene.value.filter(layer => layer.id !== id)
    }

    // Нахождение слоя по id
    function getById(id) {
        return scene.value.find(layer => layer.id === id)
    }

    // Отслеживание клика
    function handleCanvasClick(event) {
        const rectBound = canvas.getBoundingClientRect();
        const clickX = event.clientX - rectBound.left;
        const clickY = event.clientY - rectBound.top;

        let hitItem = null;

        scene.forEach(el => {
            if (clickers[el.type](el, clickX, clickY)) {
                hitItem = el
                return
            }
        })
    }

    function rect(props = {}) {
        const shape = {
            type: 'rect',
            id: crypto.randomUUID(),
            x: props.x,
            y: props.y,
            w: props.w,
            h: props.h,
            color: props.color,
            clicked: props.clicked
        }

        scene.value = [...scene.value, shape]
    }

    function drawRect(item) {
        const x = typeof item.x === 'function' ? item.x() : (item.x?.__isSignal ? item.x.value : item.x);
        const y = typeof item.y === 'function' ? item.y() : (item.y?.__isSignal ? item.y.value : item.y);
        const w = typeof item.w === 'function' ? item.w() : (item.w?.__isSignal ? item.w.value : item.w);
        const hDim = typeof item.h === 'function' ? item.h() : (item.h?.__isSignal ? item.h.value : item.h);
        const r = typeof item.r === 'function' ? item.r() : (item.r?.__isSignal ? item.r.value : item.r);
        const color = typeof item.color === 'function' ? item.color() : (item.color?.__isSignal ? item.color.value : item.color);

        ctx.save()

        ctx.fillStyle = color || 'black';
        ctx.beginPath();
        ctx.roundRect(x, y, w, hDim, r || 0);
        ctx.fill();

        ctx.restore();
    }

    function clickRect(item, clickX, clickY) {
        const x = item.x?.__isSignal ? item.x.value : (typeof item.x === 'function' ? item.x() : item.x);
        const y = item.y?.__isSignal ? item.y.value : (typeof item.y === 'function' ? item.y() : item.y);
        const w = item.w?.__isSignal ? item.w.value : (typeof item.w === 'function' ? item.w() : item.w);
        const hDim = item.h?.__isSignal ? item.h.value : (typeof item.h === 'function' ? item.h() : item.h);

        // Если точка внутри границ прямоугольника
        if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + hDim) {
            return true
        }
    }

    h.canvas = {
        init,
        rect,
        unmount,
        getById,
    }
})(window.h);