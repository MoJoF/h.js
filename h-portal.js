(function(h){
    if (!h?.meta || h.meta.name !== 'h') console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.'); 

    h.portal = function(target, node) {
        if (typeof target === 'string') {
            target = document.querySelector(target);
        }

        if (!(target instanceof HTMLElement)) {
            console.error('Target must be a valid HTMLElement or a selector string.');
            return;
        }

        target.appendChild(node);

        return {
            node, remove() { h.unmount(node); }
        }
    }
})(window.h);