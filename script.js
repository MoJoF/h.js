menuLinks = [
    { text: "Главная", link: "/" },
    { text: "О нас", link: "/about" },
    { text: "Контакты", link: "/contacts" }
]

document.addEventListener("DOMContentLoaded", function () {
    const header = h('header', {
        css: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '10vh',
            borderBottom: '1px solid black'
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

    const count = h.signal(1)
    const color = h.signal('red')

    document.body.appendChild(
        h("main", {
            css: { width: "100vw", height: '100vh' },
            children: [
                ['button', {
                    text: 'Click', css: { color },
                    on: { click: () => h.unmount(header) }
                }],
                ['input', {
                    on: { input: (e) => color.value = e.target.value },
                    attrs: { d: color },
                    dataset: { color }
                }],
                ['span', { text: count }]
            ]
        },
        )
    )
})