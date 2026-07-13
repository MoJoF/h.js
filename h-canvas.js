(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    let ctx
    let scene = []

    const processors = {}

    function init(target) {
        if (ctx) return

        let canvas = typeof target === 'string' ? document.querySelector(target) : target;
        ctx = canvasElement.getContext('2d')

        h.watch(() => {
            ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            

        })
    }

    


    function handleCanvasClick(event) {
        const rectBound = canvasElement.getBoundingClientRect();
        const clickX = event.clientX - rectBound.left;
        const clickY = event.clientY - rectBound.top;

        let hitItem = null;

        // 1. Идем по сцене с конца (сверху вниз) и ищем САМЫЙ первый элемент, в который попали
        for (let i = scene.length - 1; i >= 0; i--) {
            const item = scene[i];

            if (item.type === 'rect') {
                const x = item.x?.__isSignal ? item.x.value : (typeof item.x === 'function' ? item.x() : item.x);
                const y = item.y?.__isSignal ? item.y.value : (typeof item.y === 'function' ? item.y() : item.y);
                const w = item.w?.__isSignal ? item.w.value : (typeof item.w === 'function' ? item.w() : item.w);
                const hDim = item.h?.__isSignal ? item.h.value : (typeof item.h === 'function' ? item.h() : item.h);

                // Если точка внутри границ прямоугольника
                if (clickX >= x && clickX <= x + w && clickY >= y && clickY <= y + hDim) {
                    hitItem = item; // Запоминаем, что мы попали именно в него
                    break;          // МГНОВЕННО прерываем цикл. Нижние элементы нас больше не волнуют!
                }
            }
        }

        // 2. Работаем строго с тем элементом, который оказался сверху
        if (hitItem && hitItem.onClick) {
            hitItem.onClick(event);
        }
    }

    function rect(x, y, w, h, r = 0, color) {
        
    }

    h.canvas = {
        init,
        rect
    }
})(window.h);