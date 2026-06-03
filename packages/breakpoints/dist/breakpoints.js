import { Fragment as e, computed as t, createCommentVNode as n, createElementBlock as r, createElementVNode as i, createTextVNode as a, defineComponent as o, normalizeClass as s, onMounted as c, onUnmounted as l, openBlock as u, readonly as d, ref as f, renderList as p, renderSlot as m, toDisplayString as h, unref as g } from "vue";
//#region src/breakpoints.ts
var _ = [
	"2xs",
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
	"2xl"
], v = {
	"2xs": 0,
	xs: 480,
	sm: 768,
	md: 1024,
	lg: 1920,
	xl: 2560,
	"2xl": 3840
};
function y(e) {
	return v[e];
}
function b(e) {
	let t = v[e];
	return t === 0 ? "all" : `(min-width: ${t}px)`;
}
function x(e) {
	let t = v[e];
	return t === 0 ? "not all" : `(max-width: ${t - 1}px)`;
}
function S(e) {
	return Object.entries(v).reverse().filter(([t, n]) => e >= n).map(([e, t]) => e).at(0) || "2xs";
}
//#endregion
//#region src/use-breakpoints.ts
function C() {
	return globalThis.window === void 0 ? 0 : globalThis.window.innerWidth;
}
function w() {
	let e = f(S(C())), t = f(Object.fromEntries(_.map((e) => [e, C() >= v[e]]))), n = /* @__PURE__ */ new Map();
	function r() {
		let n = C();
		e.value = S(n);
		for (let e of _) t.value[e] = n >= v[e];
	}
	return c(() => {
		if (globalThis.window !== void 0) {
			for (let e of _) {
				if (v[e] === 0) continue;
				let t = globalThis.window.matchMedia(b(e));
				t.addEventListener("change", r), n.set(e, t);
			}
			r();
		}
	}), l(() => {
		for (let e of n.values()) e.removeEventListener("change", r);
		n.clear();
	}), {
		current: d(e),
		active: d(t),
		isAbove: (e) => t.value[e],
		isBelow: (e) => !t.value[e],
		isOnly: (e) => {
			let n = _[_.indexOf(e) + 1];
			return t.value[e] && (n === void 0 || !t.value[n]);
		}
	};
}
//#endregion
//#region src/components/BreakpointDebug.vue?vue&type=script&setup=true&lang.ts
var T = {
	class: "bp-debug",
	"aria-hidden": "true"
}, E = { class: "bp-debug__current" }, D = { class: "bp-debug__px" }, O = /* @__PURE__ */ ((e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
})(/* @__PURE__ */ o({
	__name: "BreakpointDebug",
	setup(t) {
		let { current: n, active: o } = w();
		return (t, c) => (u(), r("div", T, [
			c[0] ||= i("span", { class: "bp-debug__label" }, "breakpoint:", -1),
			i("span", E, h(g(n)), 1),
			c[1] ||= i("span", { class: "bp-debug__separator" }, "|", -1),
			(u(!0), r(e, null, p(g(_), (e) => (u(), r("span", {
				key: e,
				class: s(["bp-debug__badge", { "bp-debug__badge--active": g(o)[e] }])
			}, [a(h(e) + " ", 1), i("span", D, "(" + h(g(v)[e] === 0 ? "0" : `${g(v)[e]}`) + "px)", 1)], 2))), 128))
		]));
	}
}), [["__scopeId", "data-v-b3d987b3"]]), k = /* @__PURE__ */ o({
	__name: "HideAt",
	props: {
		min: {},
		max: {}
	},
	setup(e) {
		let r = e;
		r.min !== void 0 && !_.includes(r.min) && console.warn(`[HideAt] Unknown breakpoint key "${r.min}"`), r.max !== void 0 && !_.includes(r.max) && console.warn(`[HideAt] Unknown breakpoint key "${r.max}"`);
		let { isAbove: i, isBelow: a } = w(), o = t(() => {
			let e = r.min === void 0 || i(r.min), t = r.max === void 0 || a(r.max);
			return e && t;
		});
		return (e, t) => o.value ? n("", !0) : m(e.$slots, "default", { key: 0 });
	}
}), A = /* @__PURE__ */ o({
	__name: "ShowAt",
	props: {
		min: {},
		max: {}
	},
	setup(e) {
		let r = e;
		r.min !== void 0 && !_.includes(r.min) && console.warn(`[ShowAt] Unknown breakpoint key "${r.min}"`), r.max !== void 0 && !_.includes(r.max) && console.warn(`[ShowAt] Unknown breakpoint key "${r.max}"`);
		let { isAbove: i, isBelow: a } = w(), o = t(() => {
			let e = r.min === void 0 || i(r.min), t = r.max === void 0 || a(r.max);
			return e && t;
		});
		return (e, t) => o.value ? m(e.$slots, "default", { key: 0 }) : n("", !0);
	}
});
//#endregion
export { O as BreakpointDebug, k as HideAt, A as ShowAt, _ as breakpointKeys, v as breakpoints, y as getBreakpointValue, x as maxMediaQuery, b as mediaQuery, S as resolveBreakpoint, w as useBreakpoints };
