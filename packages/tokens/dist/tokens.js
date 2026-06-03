//#region src/colors.ts
var e = {
	black: "#000",
	white: "#fff",
	neutral: {
		50: "#f9f9fb",
		100: "#f2f2f5",
		200: "#e5e4e7",
		300: "#c8c7cc",
		400: "#9e9ca4",
		500: "#6b6375",
		600: "#504b5c",
		700: "#3a3545",
		800: "#211e2c",
		900: "#08060d"
	},
	primaryLight: "#fbfbf8",
	primaryDark: "#6b6e6f",
	cyan: {
		50: "#ebfffe",
		100: "#cdfefb",
		200: "#9efaf5",
		300: "#5af2ea",
		400: "#1ae6db",
		500: "#14b8af",
		600: "#0f8a83",
		700: "#0b6560",
		800: "#07403d",
		900: "#042523"
	},
	primary: {
		50: "#f4f0ff",
		100: "#e5d9ff",
		200: "#c9b4ff",
		300: "#a97fff",
		400: "#8a52f5",
		500: "#6c2fd4",
		600: "#5420a8",
		700: "#3d1680",
		800: "#280e56",
		900: "#14072c"
	},
	success: {
		50: "#edfaf2",
		100: "#d0f4df",
		200: "#9ae8ba",
		300: "#5dd891",
		400: "#2cc46e",
		500: "#1aa354",
		600: "#138040",
		700: "#0d5e2e",
		800: "#073d1d",
		900: "#031e0e"
	},
	warning: {
		50: "#fffaeb",
		100: "#fef0c7",
		200: "#fedf89",
		300: "#fec84b",
		400: "#fdb022",
		500: "#f79009",
		600: "#dc6803",
		700: "#b54708",
		800: "#93370d",
		900: "#7a2e0e"
	},
	danger: {
		50: "#fff1f3",
		100: "#ffe4e8",
		200: "#fecdd6",
		300: "#fda4af",
		400: "#fb7185",
		500: "#f43f5e",
		600: "#e11d48",
		700: "#be123c",
		800: "#9f1239",
		900: "#881337"
	},
	info: {
		50: "#ecfeff",
		100: "#cffafe",
		200: "#a5f3fc",
		300: "#67e8f9",
		400: "#22d3ee",
		500: "#06b6d4",
		600: "#0891b2",
		700: "#0e7490",
		800: "#155e75",
		900: "#164e63"
	}
}, t = {
	0: "0",
	1: "0.286rem",
	2: "0.571rem",
	3: "0.857rem",
	4: "1.143rem",
	5: "1.429rem",
	6: "1.714rem",
	8: "2.286rem",
	10: "2.857rem",
	12: "3.429rem",
	16: "4.571rem",
	20: "5.714rem",
	24: "6.857rem"
}, n = {
	sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
	mono: "'JetBrains Mono', 'Fira Code', ui-monospace, 'Cascadia Mono', monospace"
}, r = {
	"2xs": "0.625rem",
	xs: "0.75rem",
	sm: "0.875rem",
	md: "1rem",
	lg: "1.125rem",
	xl: "1.25rem",
	"2xl": "1.5rem",
	"3xl": "1.875rem",
	"4xl": "2.25rem",
	"5xl": "3rem"
}, i = {
	regular: 400,
	medium: 500,
	semibold: 600,
	bold: 700
}, a = {
	tight: 1.25,
	snug: 1.375,
	normal: 1.5,
	relaxed: 1.625,
	loose: 2
}, o = {
	tight: "-0.025em",
	normal: "0em",
	wide: "0.025em",
	wider: "0.05em",
	widest: "0.1em"
}, s = {
	none: "0",
	xs: "2px",
	sm: "4px",
	md: "6px",
	lg: "8px",
	xl: "12px",
	"2xl": "16px",
	"3xl": "24px",
	full: "9999px"
}, c = {
	none: "none",
	"2xs": "0 1px 1px 0 rgb(0 0 0 / 3%)",
	xs: "0 1px 2px 0 rgb(0 0 0 / 5%)",
	sm: "0 1px 3px 0 rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%)",
	md: "0 4px 6px -1px rgb(0 0 0 / 10%), 0 2px 4px -2px rgb(0 0 0 / 10%)",
	lg: "0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)",
	xl: "0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%)",
	"2xl": "0 25px 50px -12px rgb(0 0 0 / 25%)",
	inner: "inset 0 2px 4px 0 rgb(0 0 0 / 5%)",
	focusPrimary: "0 0 0 3px rgb(108 47 212 / 30%)",
	focusDanger: "0 0 0 3px rgb(244 63 94 / 30%)"
}, l = [
	"2xs",
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
	"2xl"
], u = {
	"2xs": "0.643rem",
	xs: "0.786rem",
	sm: "0.929rem",
	md: "1rem",
	lg: "1.143rem",
	xl: "1.286rem",
	"2xl": "1.714rem"
}, d = {
	"2xs": 1.25,
	xs: 1.25,
	sm: 1.375,
	md: 1.5,
	lg: 1.5,
	xl: 1.5,
	"2xl": 1.375
}, f = {
	"2xs": "0.143rem",
	xs: "0.286rem",
	sm: "0.429rem",
	md: "0.571rem",
	lg: "0.714rem",
	xl: "0.857rem",
	"2xl": "1.143rem"
}, p = {
	"2xs": "0.286rem",
	xs: "0.571rem",
	sm: "0.714rem",
	md: "0.857rem",
	lg: "1.143rem",
	xl: "1.429rem",
	"2xl": "1.714rem"
}, m = {
	"2xs": "0.143rem",
	xs: "0.286rem",
	sm: "0.429rem",
	md: "0.571rem",
	lg: "0.857rem",
	xl: "1.143rem",
	"2xl": "1.714rem"
}, h = {
	"2xs": "0.143rem",
	xs: "0.286rem",
	sm: "0.286rem",
	md: "0.429rem",
	lg: "0.571rem",
	xl: "0.714rem",
	"2xl": "0.857rem"
}, g = {
	"2xs": "0.643rem",
	xs: "0.786rem",
	sm: "0.929rem",
	md: "1rem",
	lg: "1.143rem",
	xl: "1.286rem",
	"2xl": "1.714rem"
}, _ = {
	"2xs": "0 0.071rem 0.071rem 0 rgb(0 0 0 / 3%)",
	xs: "0 0.071rem 0.143rem 0 rgb(0 0 0 / 5%)",
	sm: "0 0.071rem 0.214rem 0 rgb(0 0 0 / 10%), 0 0.071rem 0.143rem -0.071rem rgb(0 0 0 / 10%)",
	md: "0 0.286rem 0.429rem -0.071rem rgb(0 0 0 / 10%), 0 0.143rem 0.286rem -0.143rem rgb(0 0 0 / 10%)",
	lg: "0 0.714rem 1.071rem -0.214rem rgb(0 0 0 / 10%), 0 0.286rem 0.429rem -0.286rem rgb(0 0 0 / 10%)",
	xl: "0 1.429rem 1.786rem -0.357rem rgb(0 0 0 / 10%), 0 0.571rem 0.714rem -0.429rem rgb(0 0 0 / 10%)",
	"2xl": "0 1.786rem 3.571rem -0.857rem rgb(0 0 0 / 25%)"
}, v = {
	"2xs": "1.429rem",
	xs: "1.714rem",
	sm: "2rem",
	md: "2.571rem",
	lg: "2.857rem",
	xl: "3.429rem",
	"2xl": "4rem"
}, y = m, b = {
	"2xs": "100vw",
	xs: "100vw",
	sm: "34.286rem",
	md: "45.714rem",
	lg: "85.714rem",
	xl: "114.286rem",
	"2xl": "171.429rem"
};
//#endregion
export { l as SIZE_STEPS, e as colors, n as fontFamilies, r as fontSizes, i as fontWeights, o as letterSpacings, a as lineHeights, s as radii, c as shadows, u as sizeFonts, m as sizeGaps, v as sizeHeights, g as sizeIcons, d as sizeLeadings, y as sizeMargins, f as sizePadBlock, p as sizePadInline, h as sizeRadii, _ as sizeShadows, b as sizeWidths, t as spacing };
