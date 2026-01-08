/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'cairo': ['Cairo', 'sans-serif'],
            },
            colors: {
                'voga-primary': '#0e3c63',
                'voga-secondary': '#1a4d7a',
            },
        },
    },
    plugins: [],
}
