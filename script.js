menuLinks = [
    { text: "Главная", link: "/" },
    { text: "О нас", link: "/about" },
    { text: "Контакты", link: "/contacts" }
]

const count = h.signal(1)
const color = h.signal('#121212')
const showCart = h.signal(false)

const tasks = h.signal(['Поработать', 'Купить хлеба', "Пойти домой"])

document.addEventListener("DOMContentLoaded", function () {
    const header = h('header', {
        css: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '10vh',
            borderBottom: '1px solid black',
            background: color
        }, children: [
            ["a", {
                className: "logo_cont", attrs: { href: '/' }, text: "SiteTitle"
            }],
            ["nav", {
                css: { display: 'flex', gap: '10px' },
                children: menuLinks.map(menuItem => ["a", { text: menuItem.text, href: menuItem.link }])
            }]
        ]
    })

    document.body.appendChild(header)


    // Рендеринг списков
    document.body.appendChild(
        h('ul', { css: { marginTop: '20px', marginBottom: '20px' },
            children:
                // Рендеринг списков
                h.each(tasks, item =>
                    ["li", {
                        text: item, children: [
                            ['button', { text: 'Удалить', on: { click: () => {
                                tasks.value = tasks.value.filter(arrItem => arrItem !== item)
                            } } }]
                        ]
                    }]
                )
        })
    )

    document.body.appendChild(
        h("main", {
            css: { width: "100vw", height: '10vh' },
            children: [
                // баг
                ['button', { 
                    text: () => showCart.value ? 'Скрыть корзину' : "Показать корзину", 
                    on: { click: () => showCart.value = !showCart.value } 
                }],
                // ТИПА КОРЗИНА
                () => showCart.value ? ['h1', { text: 'Корзина' }] : ['span', {}],
                
                // Условный рендеринг
                () => {
                    if (count.value === 0) return ["h1", { text: "0" }]
                    else if (count.value === 1) return ["h1", { text: "Один" }]
                    else if (count.value === 2) return ["h1", { text: "Два" }]
                    else return ["h1", { text: "Много" }]
                },

                // Реактивность
                ['button', {
                    text: '+', css: { color, fontSize: '32px' },
                    on: { click: () => count.value++ }
                }],
                ['button', {
                    text: '-', css: { color, fontSize: '32px' }, 
                    on: { click: () => count.value-- }
                }],
                ['span', { text: count }],

                // Двусторонее связывание
                ['input', {
                    on: { input: (e) => color.value = e.target.value },
                    attrs: { d: color },
                    dataset: { color }
                }],
            ]
        },
        )
    )
})