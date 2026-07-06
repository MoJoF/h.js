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
    const count = h.signal(0);

    const app = h("main", {
        css: {
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "15px"
        },

        children: [
            ["h1", { text: "h.js Demo" }],
            ["button", {
                text: () => `Нажато ${count.value} раз`,
                on: { click() { count.value++; } }
            }],

            () => count.value >= 5
                ? ["div", { text: "🎉 Отлично!", on: {
                    click: () => { h.attachAll('p', { animate: { duration: 500, transform: 'translateX(100px)' } }) }
                } }]
                : ["div", { text: "Продолжайте нажимать..." }]
        ]
    });

    document.body.appendChild(app);
    h.attachAll('p', { text: count })
})