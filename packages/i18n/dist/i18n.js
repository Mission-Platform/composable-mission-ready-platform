import { n as e, t } from "./define-locales-D6PMfHOT.js";
import { createI18n as n, useI18n as r } from "vue-i18n";
//#region src/merge-locales.ts
function i(e) {
	let t = {};
	for (let n of e) for (let [e, r] of Object.entries(n)) t[e] = {
		...t[e],
		...r
	};
	return t;
}
//#endregion
//#region src/create-mp-i18n.ts
function a(t = {}) {
	let { locale: r = "en", modules: a = [], messages: o = {} } = t, s = i([{ en: e }, ...a]);
	for (let [e, t] of Object.entries(o)) s[e] = {
		...s[e],
		...t
	};
	return n({
		legacy: !1,
		locale: r,
		fallbackLocale: "en",
		messages: s
	});
}
//#endregion
export { a as createMpI18n, t as defineLocales, i as mergeLocales, r as useI18n };
