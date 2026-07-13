(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    h._internals.use('h-portal')
    
    h.portal = function (target, node) {
        if (typeof target === 'string') {
            target = document.querySelector(target);
        }

        if (!(target instanceof HTMLElement)) {
            console.error('Target must be a valid HTMLElement or a selector string.');
            return;
        }

        // Если node — DocumentFragment (например, результат h(Component)),
        // после appendChild он опустеет, поэтому запоминаем реальные вставленные узлы заранее
        const inserted = node instanceof DocumentFragment
            ? Array.from(node.childNodes)
            : [node]

        target.appendChild(node)

        return {
            node,
            remove() {
                for (const n of inserted) h.unmount(n)
            }
        }
    }
})(window.h);