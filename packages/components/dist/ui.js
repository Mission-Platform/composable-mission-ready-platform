import { c as e, d as t, f as n, i as r, l as i, n as a, o, r as s, s as c, t as l, u } from "./editor.api2-BNt2jrne.js";
import { t as d } from "./monaco.contribution-DP_oi8yQ.js";
import "./workers-B5vBBmRC.js";
import * as f from "vue";
import { Fragment as p, Teleport as m, Transition as h, computed as g, createBlock as _, createCommentVNode as v, createElementBlock as y, createElementVNode as b, createSlots as x, createStaticVNode as S, createTextVNode as C, createVNode as w, defineComponent as T, getCurrentInstance as E, guardReactiveProps as D, h as O, inject as k, mergeProps as A, nextTick as ee, normalizeClass as j, normalizeProps as te, normalizeStyle as M, onBeforeUnmount as ne, onMounted as re, onUnmounted as ie, openBlock as N, provide as ae, reactive as oe, readonly as se, ref as P, renderList as F, renderSlot as I, resolveComponent as ce, resolveDynamicComponent as le, shallowRef as ue, toDisplayString as L, unref as R, vModelText as de, vShow as fe, watch as pe, watchEffect as me, withCtx as z, withDirectives as he, withKeys as ge, withModifiers as B } from "vue";
import { useI18n as _e } from "vue-i18n";
//#region src/components/BaseButton/BaseButton.vue?vue&type=script&setup=true&lang.ts
var ve = [
	"type",
	"disabled",
	"aria-busy"
], ye = ["aria-label"], be = /* @__PURE__ */ T({
	__name: "BaseButton",
	props: {
		variant: { default: "primary" },
		size: { default: "md" },
		disabled: {
			type: Boolean,
			default: !1
		},
		loading: {
			type: Boolean,
			default: !1
		},
		type: { default: "button" }
	},
	emits: ["click"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { loading: "Loading…" } }
		});
		function a(e) {
			!n.disabled && !n.loading && r("click", e);
		}
		return (t, n) => (N(), y("button", {
			type: e.type,
			disabled: e.disabled || e.loading,
			class: j([
				"base-button",
				`base-button--${e.variant}`,
				`base-button--${e.size}`,
				{ "base-button--loading": e.loading }
			]),
			"aria-busy": e.loading,
			onClick: a
		}, [e.loading ? (N(), y("span", {
			key: 0,
			class: "base-button__spinner",
			role: "status",
			"aria-atomic": "false",
			"aria-live": "off",
			"aria-label": R(i)("loading")
		}, null, 8, ye)) : v("", !0), I(t.$slots, "default", {}, void 0, !0)], 10, ve));
	}
}), V = (e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
}, xe = /* @__PURE__ */ V(be, [["__scopeId", "data-v-d560a720"]]), Se = Math.min, Ce = Math.max, we = Math.round, Te = Math.floor, Ee = (e) => ({
	x: e,
	y: e
}), De = {
	left: "right",
	right: "left",
	bottom: "top",
	top: "bottom"
};
function Oe(e, t, n) {
	return Ce(e, Se(t, n));
}
function ke(e, t) {
	return typeof e == "function" ? e(t) : e;
}
function Ae(e) {
	return e.split("-")[0];
}
function je(e) {
	return e.split("-")[1];
}
function Me(e) {
	return e === "x" ? "y" : "x";
}
function Ne(e) {
	return e === "y" ? "height" : "width";
}
function Pe(e) {
	let t = e[0];
	return t === "t" || t === "b" ? "y" : "x";
}
function Fe(e) {
	return Me(Pe(e));
}
function Ie(e, t, n) {
	n === void 0 && (n = !1);
	let r = je(e), i = Fe(e), a = Ne(i), o = i === "x" ? r === (n ? "end" : "start") ? "right" : "left" : r === "start" ? "bottom" : "top";
	return t.reference[a] > t.floating[a] && (o = Ge(o)), [o, Ge(o)];
}
function Le(e) {
	let t = Ge(e);
	return [
		Re(e),
		t,
		Re(t)
	];
}
function Re(e) {
	return e.includes("start") ? e.replace("start", "end") : e.replace("end", "start");
}
var ze = ["left", "right"], Be = ["right", "left"], Ve = ["top", "bottom"], He = ["bottom", "top"];
function Ue(e, t, n) {
	switch (e) {
		case "top":
		case "bottom": return n ? t ? Be : ze : t ? ze : Be;
		case "left":
		case "right": return t ? Ve : He;
		default: return [];
	}
}
function We(e, t, n, r) {
	let i = je(e), a = Ue(Ae(e), n === "start", r);
	return i && (a = a.map((e) => e + "-" + i), t && (a = a.concat(a.map(Re)))), a;
}
function Ge(e) {
	let t = Ae(e);
	return De[t] + e.slice(t.length);
}
function Ke(e) {
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		...e
	};
}
function qe(e) {
	return typeof e == "number" ? {
		top: e,
		right: e,
		bottom: e,
		left: e
	} : Ke(e);
}
function Je(e) {
	let { x: t, y: n, width: r, height: i } = e;
	return {
		width: r,
		height: i,
		top: n,
		left: t,
		right: t + r,
		bottom: n + i,
		x: t,
		y: n
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+core@1.7.5/node_modules/@floating-ui/core/dist/floating-ui.core.mjs
function Ye(e, t, n) {
	let { reference: r, floating: i } = e, a = Pe(t), o = Fe(t), s = Ne(o), c = Ae(t), l = a === "y", u = r.x + r.width / 2 - i.width / 2, d = r.y + r.height / 2 - i.height / 2, f = r[s] / 2 - i[s] / 2, p;
	switch (c) {
		case "top":
			p = {
				x: u,
				y: r.y - i.height
			};
			break;
		case "bottom":
			p = {
				x: u,
				y: r.y + r.height
			};
			break;
		case "right":
			p = {
				x: r.x + r.width,
				y: d
			};
			break;
		case "left":
			p = {
				x: r.x - i.width,
				y: d
			};
			break;
		default: p = {
			x: r.x,
			y: r.y
		};
	}
	switch (je(t)) {
		case "start":
			p[o] -= f * (n && l ? -1 : 1);
			break;
		case "end":
			p[o] += f * (n && l ? -1 : 1);
			break;
	}
	return p;
}
async function Xe(e, t) {
	t === void 0 && (t = {});
	let { x: n, y: r, platform: i, rects: a, elements: o, strategy: s } = e, { boundary: c = "clippingAncestors", rootBoundary: l = "viewport", elementContext: u = "floating", altBoundary: d = !1, padding: f = 0 } = ke(t, e), p = qe(f), m = o[d ? u === "floating" ? "reference" : "floating" : u], h = Je(await i.getClippingRect({
		element: await (i.isElement == null ? void 0 : i.isElement(m)) ?? !0 ? m : m.contextElement || await (i.getDocumentElement == null ? void 0 : i.getDocumentElement(o.floating)),
		boundary: c,
		rootBoundary: l,
		strategy: s
	})), g = u === "floating" ? {
		x: n,
		y: r,
		width: a.floating.width,
		height: a.floating.height
	} : a.reference, _ = await (i.getOffsetParent == null ? void 0 : i.getOffsetParent(o.floating)), v = await (i.isElement == null ? void 0 : i.isElement(_)) && await (i.getScale == null ? void 0 : i.getScale(_)) || {
		x: 1,
		y: 1
	}, y = Je(i.convertOffsetParentRelativeRectToViewportRelativeRect ? await i.convertOffsetParentRelativeRectToViewportRelativeRect({
		elements: o,
		rect: g,
		offsetParent: _,
		strategy: s
	}) : g);
	return {
		top: (h.top - y.top + p.top) / v.y,
		bottom: (y.bottom - h.bottom + p.bottom) / v.y,
		left: (h.left - y.left + p.left) / v.x,
		right: (y.right - h.right + p.right) / v.x
	};
}
var Ze = 50, Qe = async (e, t, n) => {
	let { placement: r = "bottom", strategy: i = "absolute", middleware: a = [], platform: o } = n, s = o.detectOverflow ? o : {
		...o,
		detectOverflow: Xe
	}, c = await (o.isRTL == null ? void 0 : o.isRTL(t)), l = await o.getElementRects({
		reference: e,
		floating: t,
		strategy: i
	}), { x: u, y: d } = Ye(l, r, c), f = r, p = 0, m = {};
	for (let n = 0; n < a.length; n++) {
		let h = a[n];
		if (!h) continue;
		let { name: g, fn: _ } = h, { x: v, y, data: b, reset: x } = await _({
			x: u,
			y: d,
			initialPlacement: r,
			placement: f,
			strategy: i,
			middlewareData: m,
			rects: l,
			platform: s,
			elements: {
				reference: e,
				floating: t
			}
		});
		u = v ?? u, d = y ?? d, m[g] = {
			...m[g],
			...b
		}, x && p < Ze && (p++, typeof x == "object" && (x.placement && (f = x.placement), x.rects && (l = x.rects === !0 ? await o.getElementRects({
			reference: e,
			floating: t,
			strategy: i
		}) : x.rects), {x: u, y: d} = Ye(l, f, c)), n = -1);
	}
	return {
		x: u,
		y: d,
		placement: f,
		strategy: i,
		middlewareData: m
	};
}, $e = (e) => ({
	name: "arrow",
	options: e,
	async fn(t) {
		let { x: n, y: r, placement: i, rects: a, platform: o, elements: s, middlewareData: c } = t, { element: l, padding: u = 0 } = ke(e, t) || {};
		if (l == null) return {};
		let d = qe(u), f = {
			x: n,
			y: r
		}, p = Fe(i), m = Ne(p), h = await o.getDimensions(l), g = p === "y", _ = g ? "top" : "left", v = g ? "bottom" : "right", y = g ? "clientHeight" : "clientWidth", b = a.reference[m] + a.reference[p] - f[p] - a.floating[m], x = f[p] - a.reference[p], S = await (o.getOffsetParent == null ? void 0 : o.getOffsetParent(l)), C = S ? S[y] : 0;
		(!C || !await (o.isElement == null ? void 0 : o.isElement(S))) && (C = s.floating[y] || a.floating[m]);
		let w = b / 2 - x / 2, T = C / 2 - h[m] / 2 - 1, E = Se(d[_], T), D = Se(d[v], T), O = E, k = C - h[m] - D, A = C / 2 - h[m] / 2 + w, ee = Oe(O, A, k), j = !c.arrow && je(i) != null && A !== ee && a.reference[m] / 2 - (A < O ? E : D) - h[m] / 2 < 0, te = j ? A < O ? A - O : A - k : 0;
		return {
			[p]: f[p] + te,
			data: {
				[p]: ee,
				centerOffset: A - ee - te,
				...j && { alignmentOffset: te }
			},
			reset: j
		};
	}
}), et = function(e) {
	return e === void 0 && (e = {}), {
		name: "flip",
		options: e,
		async fn(t) {
			var n;
			let { placement: r, middlewareData: i, rects: a, initialPlacement: o, platform: s, elements: c } = t, { mainAxis: l = !0, crossAxis: u = !0, fallbackPlacements: d, fallbackStrategy: f = "bestFit", fallbackAxisSideDirection: p = "none", flipAlignment: m = !0, ...h } = ke(e, t);
			if ((n = i.arrow) != null && n.alignmentOffset) return {};
			let g = Ae(r), _ = Pe(o), v = Ae(o) === o, y = await (s.isRTL == null ? void 0 : s.isRTL(c.floating)), b = d || (v || !m ? [Ge(o)] : Le(o)), x = p !== "none";
			!d && x && b.push(...We(o, m, p, y));
			let S = [o, ...b], C = await s.detectOverflow(t, h), w = [], T = i.flip?.overflows || [];
			if (l && w.push(C[g]), u) {
				let e = Ie(r, a, y);
				w.push(C[e[0]], C[e[1]]);
			}
			if (T = [...T, {
				placement: r,
				overflows: w
			}], !w.every((e) => e <= 0)) {
				let e = (i.flip?.index || 0) + 1, t = S[e];
				if (t && (!(u === "alignment" && _ !== Pe(t)) || T.every((e) => Pe(e.placement) === _ ? e.overflows[0] > 0 : !0))) return {
					data: {
						index: e,
						overflows: T
					},
					reset: { placement: t }
				};
				let n = T.filter((e) => e.overflows[0] <= 0).sort((e, t) => e.overflows[1] - t.overflows[1])[0]?.placement;
				if (!n) switch (f) {
					case "bestFit": {
						let e = T.filter((e) => {
							if (x) {
								let t = Pe(e.placement);
								return t === _ || t === "y";
							}
							return !0;
						}).map((e) => [e.placement, e.overflows.filter((e) => e > 0).reduce((e, t) => e + t, 0)]).sort((e, t) => e[1] - t[1])[0]?.[0];
						e && (n = e);
						break;
					}
					case "initialPlacement":
						n = o;
						break;
				}
				if (r !== n) return { reset: { placement: n } };
			}
			return {};
		}
	};
}, tt = /* @__PURE__ */ new Set(["left", "top"]);
async function nt(e, t) {
	let { placement: n, platform: r, elements: i } = e, a = await (r.isRTL == null ? void 0 : r.isRTL(i.floating)), o = Ae(n), s = je(n), c = Pe(n) === "y", l = tt.has(o) ? -1 : 1, u = a && c ? -1 : 1, d = ke(t, e), { mainAxis: f, crossAxis: p, alignmentAxis: m } = typeof d == "number" ? {
		mainAxis: d,
		crossAxis: 0,
		alignmentAxis: null
	} : {
		mainAxis: d.mainAxis || 0,
		crossAxis: d.crossAxis || 0,
		alignmentAxis: d.alignmentAxis
	};
	return s && typeof m == "number" && (p = s === "end" ? m * -1 : m), c ? {
		x: p * u,
		y: f * l
	} : {
		x: f * l,
		y: p * u
	};
}
var rt = function(e) {
	return e === void 0 && (e = 0), {
		name: "offset",
		options: e,
		async fn(t) {
			var n;
			let { x: r, y: i, placement: a, middlewareData: o } = t, s = await nt(t, e);
			return a === o.offset?.placement && (n = o.arrow) != null && n.alignmentOffset ? {} : {
				x: r + s.x,
				y: i + s.y,
				data: {
					...s,
					placement: a
				}
			};
		}
	};
}, it = function(e) {
	return e === void 0 && (e = {}), {
		name: "shift",
		options: e,
		async fn(t) {
			let { x: n, y: r, placement: i, platform: a } = t, { mainAxis: o = !0, crossAxis: s = !1, limiter: c = { fn: (e) => {
				let { x: t, y: n } = e;
				return {
					x: t,
					y: n
				};
			} }, ...l } = ke(e, t), u = {
				x: n,
				y: r
			}, d = await a.detectOverflow(t, l), f = Pe(Ae(i)), p = Me(f), m = u[p], h = u[f];
			if (o) {
				let e = p === "y" ? "top" : "left", t = p === "y" ? "bottom" : "right", n = m + d[e], r = m - d[t];
				m = Oe(n, m, r);
			}
			if (s) {
				let e = f === "y" ? "top" : "left", t = f === "y" ? "bottom" : "right", n = h + d[e], r = h - d[t];
				h = Oe(n, h, r);
			}
			let g = c.fn({
				...t,
				[p]: m,
				[f]: h
			});
			return {
				...g,
				data: {
					x: g.x - n,
					y: g.y - r,
					enabled: {
						[p]: o,
						[f]: s
					}
				}
			};
		}
	};
};
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+utils@0.2.11/node_modules/@floating-ui/utils/dist/floating-ui.utils.dom.mjs
function at() {
	return typeof window < "u";
}
function ot(e) {
	return lt(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function st(e) {
	var t;
	return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function ct(e) {
	return ((lt(e) ? e.ownerDocument : e.document) || window.document)?.documentElement;
}
function lt(e) {
	return at() ? e instanceof Node || e instanceof st(e).Node : !1;
}
function ut(e) {
	return at() ? e instanceof Element || e instanceof st(e).Element : !1;
}
function dt(e) {
	return at() ? e instanceof HTMLElement || e instanceof st(e).HTMLElement : !1;
}
function ft(e) {
	return !at() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof st(e).ShadowRoot;
}
function pt(e) {
	let { overflow: t, overflowX: n, overflowY: r, display: i } = wt(e);
	return /auto|scroll|overlay|hidden|clip/.test(t + r + n) && i !== "inline" && i !== "contents";
}
function mt(e) {
	return /^(table|td|th)$/.test(ot(e));
}
function ht(e) {
	try {
		if (e.matches(":popover-open")) return !0;
	} catch {}
	try {
		return e.matches(":modal");
	} catch {
		return !1;
	}
}
var gt = /transform|translate|scale|rotate|perspective|filter/, _t = /paint|layout|strict|content/, vt = (e) => !!e && e !== "none", yt;
function bt(e) {
	let t = ut(e) ? wt(e) : e;
	return vt(t.transform) || vt(t.translate) || vt(t.scale) || vt(t.rotate) || vt(t.perspective) || !St() && (vt(t.backdropFilter) || vt(t.filter)) || gt.test(t.willChange || "") || _t.test(t.contain || "");
}
function xt(e) {
	let t = Et(e);
	for (; dt(t) && !Ct(t);) {
		if (bt(t)) return t;
		if (ht(t)) return null;
		t = Et(t);
	}
	return null;
}
function St() {
	return yt ??= typeof CSS < "u" && CSS.supports && CSS.supports("-webkit-backdrop-filter", "none"), yt;
}
function Ct(e) {
	return /^(html|body|#document)$/.test(ot(e));
}
function wt(e) {
	return st(e).getComputedStyle(e);
}
function Tt(e) {
	return ut(e) ? {
		scrollLeft: e.scrollLeft,
		scrollTop: e.scrollTop
	} : {
		scrollLeft: e.scrollX,
		scrollTop: e.scrollY
	};
}
function Et(e) {
	if (ot(e) === "html") return e;
	let t = e.assignedSlot || e.parentNode || ft(e) && e.host || ct(e);
	return ft(t) ? t.host : t;
}
function Dt(e) {
	let t = Et(e);
	return Ct(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : dt(t) && pt(t) ? t : Dt(t);
}
function Ot(e, t, n) {
	t === void 0 && (t = []), n === void 0 && (n = !0);
	let r = Dt(e), i = r === e.ownerDocument?.body, a = st(r);
	if (i) {
		let e = kt(a);
		return t.concat(a, a.visualViewport || [], pt(r) ? r : [], e && n ? Ot(e) : []);
	} else return t.concat(r, Ot(r, [], n));
}
function kt(e) {
	return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+dom@1.7.6/node_modules/@floating-ui/dom/dist/floating-ui.dom.mjs
function At(e) {
	let t = wt(e), n = parseFloat(t.width) || 0, r = parseFloat(t.height) || 0, i = dt(e), a = i ? e.offsetWidth : n, o = i ? e.offsetHeight : r, s = we(n) !== a || we(r) !== o;
	return s && (n = a, r = o), {
		width: n,
		height: r,
		$: s
	};
}
function jt(e) {
	return ut(e) ? e : e.contextElement;
}
function Mt(e) {
	let t = jt(e);
	if (!dt(t)) return Ee(1);
	let n = t.getBoundingClientRect(), { width: r, height: i, $: a } = At(t), o = (a ? we(n.width) : n.width) / r, s = (a ? we(n.height) : n.height) / i;
	return (!o || !Number.isFinite(o)) && (o = 1), (!s || !Number.isFinite(s)) && (s = 1), {
		x: o,
		y: s
	};
}
var Nt = /* @__PURE__ */ Ee(0);
function Pt(e) {
	let t = st(e);
	return !St() || !t.visualViewport ? Nt : {
		x: t.visualViewport.offsetLeft,
		y: t.visualViewport.offsetTop
	};
}
function Ft(e, t, n) {
	return t === void 0 && (t = !1), !n || t && n !== st(e) ? !1 : t;
}
function It(e, t, n, r) {
	t === void 0 && (t = !1), n === void 0 && (n = !1);
	let i = e.getBoundingClientRect(), a = jt(e), o = Ee(1);
	t && (r ? ut(r) && (o = Mt(r)) : o = Mt(e));
	let s = Ft(a, n, r) ? Pt(a) : Ee(0), c = (i.left + s.x) / o.x, l = (i.top + s.y) / o.y, u = i.width / o.x, d = i.height / o.y;
	if (a) {
		let e = st(a), t = r && ut(r) ? st(r) : r, n = e, i = kt(n);
		for (; i && r && t !== n;) {
			let e = Mt(i), t = i.getBoundingClientRect(), r = wt(i), a = t.left + (i.clientLeft + parseFloat(r.paddingLeft)) * e.x, o = t.top + (i.clientTop + parseFloat(r.paddingTop)) * e.y;
			c *= e.x, l *= e.y, u *= e.x, d *= e.y, c += a, l += o, n = st(i), i = kt(n);
		}
	}
	return Je({
		width: u,
		height: d,
		x: c,
		y: l
	});
}
function Lt(e, t) {
	let n = Tt(e).scrollLeft;
	return t ? t.left + n : It(ct(e)).left + n;
}
function Rt(e, t) {
	let n = e.getBoundingClientRect();
	return {
		x: n.left + t.scrollLeft - Lt(e, n),
		y: n.top + t.scrollTop
	};
}
function zt(e) {
	let { elements: t, rect: n, offsetParent: r, strategy: i } = e, a = i === "fixed", o = ct(r), s = t ? ht(t.floating) : !1;
	if (r === o || s && a) return n;
	let c = {
		scrollLeft: 0,
		scrollTop: 0
	}, l = Ee(1), u = Ee(0), d = dt(r);
	if ((d || !d && !a) && ((ot(r) !== "body" || pt(o)) && (c = Tt(r)), d)) {
		let e = It(r);
		l = Mt(r), u.x = e.x + r.clientLeft, u.y = e.y + r.clientTop;
	}
	let f = o && !d && !a ? Rt(o, c) : Ee(0);
	return {
		width: n.width * l.x,
		height: n.height * l.y,
		x: n.x * l.x - c.scrollLeft * l.x + u.x + f.x,
		y: n.y * l.y - c.scrollTop * l.y + u.y + f.y
	};
}
function Bt(e) {
	return Array.from(e.getClientRects());
}
function Vt(e) {
	let t = ct(e), n = Tt(e), r = e.ownerDocument.body, i = Ce(t.scrollWidth, t.clientWidth, r.scrollWidth, r.clientWidth), a = Ce(t.scrollHeight, t.clientHeight, r.scrollHeight, r.clientHeight), o = -n.scrollLeft + Lt(e), s = -n.scrollTop;
	return wt(r).direction === "rtl" && (o += Ce(t.clientWidth, r.clientWidth) - i), {
		width: i,
		height: a,
		x: o,
		y: s
	};
}
var Ht = 25;
function Ut(e, t) {
	let n = st(e), r = ct(e), i = n.visualViewport, a = r.clientWidth, o = r.clientHeight, s = 0, c = 0;
	if (i) {
		a = i.width, o = i.height;
		let e = St();
		(!e || e && t === "fixed") && (s = i.offsetLeft, c = i.offsetTop);
	}
	let l = Lt(r);
	if (l <= 0) {
		let e = r.ownerDocument, t = e.body, n = getComputedStyle(t), i = e.compatMode === "CSS1Compat" && parseFloat(n.marginLeft) + parseFloat(n.marginRight) || 0, o = Math.abs(r.clientWidth - t.clientWidth - i);
		o <= Ht && (a -= o);
	} else l <= Ht && (a += l);
	return {
		width: a,
		height: o,
		x: s,
		y: c
	};
}
function Wt(e, t) {
	let n = It(e, !0, t === "fixed"), r = n.top + e.clientTop, i = n.left + e.clientLeft, a = dt(e) ? Mt(e) : Ee(1);
	return {
		width: e.clientWidth * a.x,
		height: e.clientHeight * a.y,
		x: i * a.x,
		y: r * a.y
	};
}
function Gt(e, t, n) {
	let r;
	if (t === "viewport") r = Ut(e, n);
	else if (t === "document") r = Vt(ct(e));
	else if (ut(t)) r = Wt(t, n);
	else {
		let n = Pt(e);
		r = {
			x: t.x - n.x,
			y: t.y - n.y,
			width: t.width,
			height: t.height
		};
	}
	return Je(r);
}
function Kt(e, t) {
	let n = Et(e);
	return n === t || !ut(n) || Ct(n) ? !1 : wt(n).position === "fixed" || Kt(n, t);
}
function qt(e, t) {
	let n = t.get(e);
	if (n) return n;
	let r = Ot(e, [], !1).filter((e) => ut(e) && ot(e) !== "body"), i = null, a = wt(e).position === "fixed", o = a ? Et(e) : e;
	for (; ut(o) && !Ct(o);) {
		let t = wt(o), n = bt(o);
		!n && t.position === "fixed" && (i = null), (a ? !n && !i : !n && t.position === "static" && i && (i.position === "absolute" || i.position === "fixed") || pt(o) && !n && Kt(e, o)) ? r = r.filter((e) => e !== o) : i = t, o = Et(o);
	}
	return t.set(e, r), r;
}
function Jt(e) {
	let { element: t, boundary: n, rootBoundary: r, strategy: i } = e, a = [...n === "clippingAncestors" ? ht(t) ? [] : qt(t, this._c) : [].concat(n), r], o = Gt(t, a[0], i), s = o.top, c = o.right, l = o.bottom, u = o.left;
	for (let e = 1; e < a.length; e++) {
		let n = Gt(t, a[e], i);
		s = Ce(n.top, s), c = Se(n.right, c), l = Se(n.bottom, l), u = Ce(n.left, u);
	}
	return {
		width: c - u,
		height: l - s,
		x: u,
		y: s
	};
}
function Yt(e) {
	let { width: t, height: n } = At(e);
	return {
		width: t,
		height: n
	};
}
function Xt(e, t, n) {
	let r = dt(t), i = ct(t), a = n === "fixed", o = It(e, !0, a, t), s = {
		scrollLeft: 0,
		scrollTop: 0
	}, c = Ee(0);
	function l() {
		c.x = Lt(i);
	}
	if (r || !r && !a) if ((ot(t) !== "body" || pt(i)) && (s = Tt(t)), r) {
		let e = It(t, !0, a, t);
		c.x = e.x + t.clientLeft, c.y = e.y + t.clientTop;
	} else i && l();
	a && !r && i && l();
	let u = i && !r && !a ? Rt(i, s) : Ee(0);
	return {
		x: o.left + s.scrollLeft - c.x - u.x,
		y: o.top + s.scrollTop - c.y - u.y,
		width: o.width,
		height: o.height
	};
}
function Zt(e) {
	return wt(e).position === "static";
}
function Qt(e, t) {
	if (!dt(e) || wt(e).position === "fixed") return null;
	if (t) return t(e);
	let n = e.offsetParent;
	return ct(e) === n && (n = n.ownerDocument.body), n;
}
function $t(e, t) {
	let n = st(e);
	if (ht(e)) return n;
	if (!dt(e)) {
		let t = Et(e);
		for (; t && !Ct(t);) {
			if (ut(t) && !Zt(t)) return t;
			t = Et(t);
		}
		return n;
	}
	let r = Qt(e, t);
	for (; r && mt(r) && Zt(r);) r = Qt(r, t);
	return r && Ct(r) && Zt(r) && !bt(r) ? n : r || xt(e) || n;
}
var en = async function(e) {
	let t = this.getOffsetParent || $t, n = this.getDimensions, r = await n(e.floating);
	return {
		reference: Xt(e.reference, await t(e.floating), e.strategy),
		floating: {
			x: 0,
			y: 0,
			width: r.width,
			height: r.height
		}
	};
};
function tn(e) {
	return wt(e).direction === "rtl";
}
var nn = {
	convertOffsetParentRelativeRectToViewportRelativeRect: zt,
	getDocumentElement: ct,
	getClippingRect: Jt,
	getOffsetParent: $t,
	getElementRects: en,
	getClientRects: Bt,
	getDimensions: Yt,
	getScale: Mt,
	isElement: ut,
	isRTL: tn
};
function rn(e, t) {
	return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function an(e, t) {
	let n = null, r, i = ct(e);
	function a() {
		var e;
		clearTimeout(r), (e = n) == null || e.disconnect(), n = null;
	}
	function o(s, c) {
		s === void 0 && (s = !1), c === void 0 && (c = 1), a();
		let l = e.getBoundingClientRect(), { left: u, top: d, width: f, height: p } = l;
		if (s || t(), !f || !p) return;
		let m = Te(d), h = Te(i.clientWidth - (u + f)), g = Te(i.clientHeight - (d + p)), _ = Te(u), v = {
			rootMargin: -m + "px " + -h + "px " + -g + "px " + -_ + "px",
			threshold: Ce(0, Se(1, c)) || 1
		}, y = !0;
		function b(t) {
			let n = t[0].intersectionRatio;
			if (n !== c) {
				if (!y) return o();
				n ? o(!1, n) : r = setTimeout(() => {
					o(!1, 1e-7);
				}, 1e3);
			}
			n === 1 && !rn(l, e.getBoundingClientRect()) && o(), y = !1;
		}
		try {
			n = new IntersectionObserver(b, {
				...v,
				root: i.ownerDocument
			});
		} catch {
			n = new IntersectionObserver(b, v);
		}
		n.observe(e);
	}
	return o(!0), a;
}
function on(e, t, n, r) {
	r === void 0 && (r = {});
	let { ancestorScroll: i = !0, ancestorResize: a = !0, elementResize: o = typeof ResizeObserver == "function", layoutShift: s = typeof IntersectionObserver == "function", animationFrame: c = !1 } = r, l = jt(e), u = i || a ? [...l ? Ot(l) : [], ...t ? Ot(t) : []] : [];
	u.forEach((e) => {
		i && e.addEventListener("scroll", n, { passive: !0 }), a && e.addEventListener("resize", n);
	});
	let d = l && s ? an(l, n) : null, f = -1, p = null;
	o && (p = new ResizeObserver((e) => {
		let [r] = e;
		r && r.target === l && p && t && (p.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
			var e;
			(e = p) == null || e.observe(t);
		})), n();
	}), l && !c && p.observe(l), t && p.observe(t));
	let m, h = c ? It(e) : null;
	c && g();
	function g() {
		let t = It(e);
		h && !rn(h, t) && n(), h = t, m = requestAnimationFrame(g);
	}
	return n(), () => {
		var e;
		u.forEach((e) => {
			i && e.removeEventListener("scroll", n), a && e.removeEventListener("resize", n);
		}), d?.(), (e = p) == null || e.disconnect(), p = null, c && cancelAnimationFrame(m);
	};
}
var sn = rt, cn = it, ln = et, un = $e, dn = (e, t, n) => {
	let r = /* @__PURE__ */ new Map(), i = {
		platform: nn,
		...n
	}, a = {
		...i.platform,
		_c: r
	};
	return Qe(e, t, {
		...i,
		platform: a
	});
}, fn = /* @__PURE__ */ u({
	Vue: () => f,
	Vue2: () => void 0,
	del: () => gn,
	install: () => mn,
	isVue2: () => !1,
	isVue3: () => !0,
	set: () => hn
});
import * as pn from "vue";
t(fn, pn);
function mn() {}
function hn(e, t, n) {
	return Array.isArray(e) ? (e.length = Math.max(e.length, t), e.splice(t, 1, n), n) : (e[t] = n, n);
}
function gn(e, t) {
	if (Array.isArray(e)) {
		e.splice(t, 1);
		return;
	}
	delete e[t];
}
//#endregion
//#region ../../node_modules/.pnpm/@floating-ui+vue@1.1.11_vue@3.5.35_typescript@6.0.3_/node_modules/@floating-ui/vue/dist/floating-ui.vue.mjs
function _n(e) {
	return typeof e == "object" && !!e && "$el" in e;
}
function vn(e) {
	if (_n(e)) {
		let t = e.$el;
		return lt(t) && ot(t) === "#comment" ? null : t;
	}
	return e;
}
function yn(e) {
	return typeof e == "function" ? e() : (0, fn.unref)(e);
}
function bn(e) {
	return {
		name: "arrow",
		options: e,
		fn(t) {
			let n = vn(yn(e.element));
			return n == null ? {} : un({
				element: n,
				padding: e.padding
			}).fn(t);
		}
	};
}
function xn(e) {
	return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function Sn(e, t) {
	let n = xn(e);
	return Math.round(t * n) / n;
}
function Cn(e, t, n) {
	n === void 0 && (n = {});
	let r = n.whileElementsMounted, i = (0, fn.computed)(() => yn(n.open) ?? !0), a = (0, fn.computed)(() => yn(n.middleware)), o = (0, fn.computed)(() => yn(n.placement) ?? "bottom"), s = (0, fn.computed)(() => yn(n.strategy) ?? "absolute"), c = (0, fn.computed)(() => yn(n.transform) ?? !0), l = (0, fn.computed)(() => vn(e.value)), u = (0, fn.computed)(() => vn(t.value)), d = (0, fn.ref)(0), f = (0, fn.ref)(0), p = (0, fn.ref)(s.value), m = (0, fn.ref)(o.value), h = (0, fn.shallowRef)({}), g = (0, fn.ref)(!1), _ = (0, fn.computed)(() => {
		let e = {
			position: p.value,
			left: "0",
			top: "0"
		};
		if (!u.value) return e;
		let t = Sn(u.value, d.value), n = Sn(u.value, f.value);
		return c.value ? {
			...e,
			transform: "translate(" + t + "px, " + n + "px)",
			...xn(u.value) >= 1.5 && { willChange: "transform" }
		} : {
			position: p.value,
			left: t + "px",
			top: n + "px"
		};
	}), v;
	function y() {
		if (l.value == null || u.value == null) return;
		let e = i.value;
		dn(l.value, u.value, {
			middleware: a.value,
			placement: o.value,
			strategy: s.value
		}).then((t) => {
			d.value = t.x, f.value = t.y, p.value = t.strategy, m.value = t.placement, h.value = t.middlewareData, g.value = e !== !1;
		});
	}
	function b() {
		typeof v == "function" && (v(), v = void 0);
	}
	function x() {
		if (b(), r === void 0) {
			y();
			return;
		}
		if (l.value != null && u.value != null) {
			v = r(l.value, u.value, y);
			return;
		}
	}
	function S() {
		i.value || (g.value = !1);
	}
	return (0, fn.watch)([
		a,
		o,
		s,
		i
	], y, { flush: "sync" }), (0, fn.watch)([l, u], x, { flush: "sync" }), (0, fn.watch)(i, S, { flush: "sync" }), (0, fn.getCurrentScope)() && (0, fn.onScopeDispose)(b), {
		x: (0, fn.shallowReadonly)(d),
		y: (0, fn.shallowReadonly)(f),
		strategy: (0, fn.shallowReadonly)(p),
		placement: (0, fn.shallowReadonly)(m),
		middlewareData: (0, fn.shallowReadonly)(h),
		isPositioned: (0, fn.shallowReadonly)(g),
		floatingStyles: _,
		update: y
	};
}
//#endregion
//#region src/components/BaseTypography/BaseTypography.vue?vue&type=script&setup=true&lang.ts
var wn = {
	key: 1,
	class: "base-typography-popup-wrapper"
}, H = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTypography",
	props: {
		variant: { default: "body-md" },
		as: { default: void 0 },
		weight: { default: void 0 },
		color: { default: "primary" },
		align: { default: void 0 },
		truncate: {
			type: Boolean,
			default: !1
		},
		truncatePopup: {
			type: Boolean,
			default: !1
		}
	},
	setup(e) {
		let t = {
			display: "h1",
			h1: "h1",
			h2: "h2",
			h3: "h3",
			h4: "h4",
			h5: "h5",
			h6: "h6",
			"body-lg": "p",
			"body-md": "p",
			"body-sm": "p",
			"body-xs": "p",
			label: "span",
			caption: "span",
			code: "code"
		}, n = e, r = g(() => n.as ?? t[n.variant ?? "body-md"]), i = P(null), a = P(null), o = P(!1), { floatingStyles: s } = Cn(i, a, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(6),
				ln(),
				cn({ padding: 8 })
			]
		});
		function c() {
			let e = i.value;
			return e ? e.scrollWidth > e.clientWidth : !1;
		}
		function l() {
			n.truncatePopup && c() && (o.value = !0);
		}
		function u() {
			o.value = !1;
		}
		return (t, n) => e.truncatePopup ? (N(), y("span", wn, [(N(), _(le(r.value), {
			ref_key: "referenceEl",
			ref: i,
			class: j([
				"base-typography",
				`base-typography--${e.variant}`,
				e.weight && `base-typography--weight-${e.weight}`,
				e.color !== "inherit" && `base-typography--color-${e.color}`,
				e.align && `base-typography--align-${e.align}`,
				"base-typography--truncate"
			]),
			onMouseenter: l,
			onMouseleave: u,
			onFocusin: l,
			onFocusout: u
		}, {
			default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
			_: 3
		}, 40, ["class"])), w(h, { name: "base-typography-popup-fade" }, {
			default: z(() => [o.value ? (N(), y("span", {
				key: 0,
				ref_key: "floatingEl",
				ref: a,
				class: "base-typography-popup",
				role: "tooltip",
				style: M(R(s))
			}, [I(t.$slots, "default", {}, void 0, !0)], 4)) : v("", !0)]),
			_: 3
		})])) : (N(), _(le(r.value), {
			key: 0,
			class: j([
				"base-typography",
				`base-typography--${e.variant}`,
				e.weight && `base-typography--weight-${e.weight}`,
				e.color !== "inherit" && `base-typography--color-${e.color}`,
				e.align && `base-typography--align-${e.align}`,
				{ "base-typography--truncate": e.truncate }
			])
		}, {
			default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
			_: 3
		}, 8, ["class"]));
	}
}), [["__scopeId", "data-v-6c68cd33"]]), Tn = { class: "base-card__header" }, En = /* @__PURE__ */ T({
	__name: "BaseCardHeader",
	setup(e) {
		return (e, t) => (N(), y("header", Tn, [w(H, {
			variant: "h5",
			as: "div",
			color: "primary"
		}, {
			default: z(() => [I(e.$slots, "default")]),
			_: 3
		})]));
	}
}), Dn = { class: "base-card__body" }, On = /* @__PURE__ */ T({
	__name: "BaseCardBody",
	setup(e) {
		return (e, t) => (N(), y("div", Dn, [w(H, {
			variant: "body-md",
			as: "div",
			color: "primary"
		}, {
			default: z(() => [I(e.$slots, "default")]),
			_: 3
		})]));
	}
}), kn = { class: "base-card__footer" }, An = /* @__PURE__ */ T({
	__name: "BaseCardFooter",
	setup(e) {
		return (e, t) => (N(), y("footer", kn, [w(H, {
			variant: "body-sm",
			as: "div",
			color: "secondary"
		}, {
			default: z(() => [I(e.$slots, "default")]),
			_: 3
		})]));
	}
}), jn = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseCard",
	props: {
		padding: { default: "md" },
		shadow: {
			type: Boolean,
			default: !1
		},
		bordered: {
			type: Boolean,
			default: !0
		}
	},
	setup(e) {
		return (t, n) => (N(), y("article", { class: j([
			"base-card",
			`base-card--padding-${e.padding}`,
			{
				"base-card--shadow": e.shadow,
				"base-card--bordered": e.bordered
			}
		]) }, [
			t.$slots.header ? (N(), _(En, { key: 0 }, {
				default: z(() => [I(t.$slots, "header", {}, void 0, !0)]),
				_: 3
			})) : v("", !0),
			w(On, null, {
				default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
				_: 3
			}),
			t.$slots.footer ? (N(), _(An, { key: 1 }, {
				default: z(() => [I(t.$slots, "footer", {}, void 0, !0)]),
				_: 3
			})) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-b5b8f64f"]]), Mn = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseBadge",
	props: {
		variant: { default: "neutral" },
		size: { default: "md" },
		pill: {
			type: Boolean,
			default: !1
		}
	},
	setup(e) {
		return (t, n) => (N(), y("span", { class: j([
			"base-badge",
			`base-badge--${e.variant}`,
			`base-badge--${e.size}`,
			{ "base-badge--pill": e.pill }
		]) }, [w(H, {
			variant: "caption",
			weight: "medium",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
			_: 3
		})], 2));
	}
}), [["__scopeId", "data-v-3889bdb5"]]), Nn = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", Pn = (e = 21) => {
	let t = "", n = crypto.getRandomValues(new Uint8Array(e |= 0));
	for (; e--;) t += Nn[n[e] & 63];
	return t;
};
//#endregion
//#region src/composables/useId.ts
function Fn(e) {
	let t = e ?? `mp-${Pn()}`;
	return { id: g(() => t).value };
}
//#endregion
//#region src/components/BaseInput/BaseInput.vue?vue&type=script&setup=true&lang.ts
var In = ["for"], Ln = ["title"], Rn = { class: "base-input__wrapper" }, zn = [
	"id",
	"type",
	"value",
	"placeholder",
	"disabled",
	"required",
	"aria-invalid",
	"aria-describedby"
], Bn = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseInput",
	props: {
		modelValue: { default: "" },
		type: { default: "text" },
		size: { default: "md" },
		placeholder: { default: "" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { required: "required" } }
		}), { id: a } = Fn(n.id);
		function o(e) {
			let t = e.target;
			r("update:modelValue", n.type === "number" ? t.valueAsNumber : t.value);
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-input",
			`base-input--${e.size}`,
			{
				"base-input--error": !!e.error,
				"base-input--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(a),
				class: j(["base-input__label", { "base-input__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-input__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, Ln)) : v("", !0)], 10, In)) : v("", !0),
			b("div", Rn, [
				I(t.$slots, "prefix", {}, void 0, !0),
				b("input", {
					id: R(a),
					type: e.type,
					value: e.modelValue,
					placeholder: e.placeholder,
					disabled: e.disabled,
					required: e.required,
					"aria-invalid": !!e.error || void 0,
					"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
					class: "base-input__field",
					onInput: o,
					onChange: n[0] ||= (e) => r("change", e),
					onBlur: n[1] ||= (e) => r("blur", e),
					onFocus: n[2] ||= (e) => r("focus", e)
				}, null, 40, zn),
				I(t.$slots, "suffix", {}, void 0, !0)
			]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-input__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-input__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-b4c1ae1c"]]), Vn = {
	"2xs": "0.643rem",
	xs: "0.786rem",
	sm: "0.929rem",
	md: "1rem",
	lg: "1.143rem",
	xl: "1.286rem",
	"2xl": "1.714rem"
}, Hn = {
	"2xs": `var(--mp-size-icon-2xs, ${Vn["2xs"]})`,
	xs: `var(--mp-size-icon-xs,  ${Vn.xs})`,
	sm: `var(--mp-size-icon-sm,  ${Vn.sm})`,
	md: `var(--mp-size-icon-md,  ${Vn.md})`,
	lg: `var(--mp-size-icon-lg,  ${Vn.lg})`,
	xl: `var(--mp-size-icon-xl,  ${Vn.xl})`,
	"2xl": `var(--mp-size-icon-2xl, ${Vn["2xl"]})`
};
function Un(e) {
	return g(() => {
		let t = e();
		return typeof t == "number" ? `${t}px` : t in Hn ? Hn[t] : t;
	});
}
var Wn = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Gn = /* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		direction: { default: "down" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size), r = {
			up: 180,
			right: 270,
			down: 0,
			left: 90
		}, i = g(() => `rotate(${r[t.direction]}deg)`);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			style: M({
				transform: i.value,
				transition: "transform 200ms ease"
			}),
			"aria-label": e.ariaLabel ?? `Chevron ${e.direction}`,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-chevron"
		}, [...r[0] ||= [b("path", { d: "M6 9L12 15L18 9" }, null, -1)]], 12, Wn));
	}
}), Kn = (e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
}, qn = /* @__PURE__ */ Kn(Gn, [["__scopeId", "data-v-ef90bf2a"]]), Jn = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Yn = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		direction: { default: "up" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size), r = {
			up: 0,
			right: 90,
			down: 180,
			left: 270
		}, i = g(() => `rotate(${r[t.direction]}deg)`);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			style: M({
				transform: i.value,
				transition: "transform 200ms ease"
			}),
			"aria-label": e.ariaLabel ?? `Arrow ${e.direction}`,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-arrow"
		}, [...r[0] ||= [b("line", {
			x1: "12",
			y1: "19",
			x2: "12",
			y2: "5"
		}, null, -1), b("polyline", { points: "5,12 12,5 19,12" }, null, -1)]], 12, Jn));
	}
}), [["__scopeId", "data-v-cfb17562"]]), Xn = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Zn = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-close"
		}, [...r[0] ||= [b("path", { d: "M18 6L6 18M6 6L18 18" }, null, -1)]], 8, Xn));
	}
}), [["__scopeId", "data-v-bb5730e0"]]), Qn = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], $n = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-search"
		}, [...r[0] ||= [b("circle", {
			cx: "11",
			cy: "11",
			r: "7"
		}, null, -1), b("path", { d: "M21 21L16.65 16.65" }, null, -1)]], 8, Qn));
	}
}), [["__scopeId", "data-v-fc520a21"]]), er = [
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], tr = ["fill", "stroke"], nr = ["fill", "stroke"], rr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 },
		active: {
			type: Boolean,
			default: !1
		},
		direction: { default: null }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-sort"
		}, [b("path", {
			d: "M12 3l5 7H7l5-7z",
			fill: e.active && e.direction === "asc" ? e.color : "none",
			stroke: e.color,
			"stroke-width": "1.5"
		}, null, 8, tr), b("path", {
			d: "M12 21l-5-7h10l-5 7z",
			fill: e.active && e.direction === "desc" ? e.color : "none",
			stroke: e.color,
			"stroke-width": "1.5"
		}, null, 8, nr)], 8, er));
	}
}), [["__scopeId", "data-v-1e4c2bd2"]]), ir = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], ar = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-check"
		}, [...r[0] ||= [b("path", { d: "M20 6L9 17L4 12" }, null, -1)]], 8, ir));
	}
}), [["__scopeId", "data-v-19b39de8"]]), or = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], sr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-info"
		}, [...r[0] ||= [
			b("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}, null, -1),
			b("line", {
				x1: "12",
				y1: "8",
				x2: "12",
				y2: "12"
			}, null, -1),
			b("line", {
				x1: "12",
				y1: "16",
				x2: "12.01",
				y2: "16"
			}, null, -1)
		]], 8, or));
	}
}), [["__scopeId", "data-v-c8c66488"]]), cr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], lr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-warning"
		}, [...r[0] ||= [
			b("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}, null, -1),
			b("line", {
				x1: "12",
				y1: "8",
				x2: "12",
				y2: "12"
			}, null, -1),
			b("line", {
				x1: "12",
				y1: "16",
				x2: "12.01",
				y2: "16"
			}, null, -1)
		]], 8, cr));
	}
}), [["__scopeId", "data-v-0017362a"]]), ur = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], dr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Error",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-error"
		}, [...r[0] ||= [
			b("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}, null, -1),
			b("line", {
				x1: "15",
				y1: "9",
				x2: "9",
				y2: "15"
			}, null, -1),
			b("line", {
				x1: "9",
				y1: "9",
				x2: "15",
				y2: "15"
			}, null, -1)
		]], 8, ur));
	}
}), [["__scopeId", "data-v-c1685e8a"]]), fr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], pr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Alert",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-alert"
		}, [...r[0] ||= [
			b("path", { d: "M10.29 3.86L1.82 18A2 2 0 0 0 3.54 21H20.46A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z" }, null, -1),
			b("line", {
				x1: "12",
				y1: "9",
				x2: "12",
				y2: "13"
			}, null, -1),
			b("line", {
				x1: "12",
				y1: "17",
				x2: "12.01",
				y2: "17"
			}, null, -1)
		]], 8, fr));
	}
}), [["__scopeId", "data-v-2d51c83a"]]), mr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], hr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Debug",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-debug"
		}, [...r[0] ||= [S("<path d=\"M8 6h8\" data-v-027a6306></path><path d=\"M4 12h16\" data-v-027a6306></path><path d=\"M4 18h16\" data-v-027a6306></path><path d=\"M12 2v4\" data-v-027a6306></path><circle cx=\"12\" cy=\"12\" r=\"2\" data-v-027a6306></circle>", 5)]], 8, mr));
	}
}), [["__scopeId", "data-v-027a6306"]]), gr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], _r = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-external-link"
		}, [...r[0] ||= [
			b("path", { d: "M18 13V19A2 2 0 0 1 16 21H5A2 2 0 0 1 3 19V8A2 2 0 0 1 5 6H11" }, null, -1),
			b("polyline", { points: "15,3 21,3 21,9" }, null, -1),
			b("line", {
				x1: "10",
				y1: "14",
				x2: "21",
				y2: "3"
			}, null, -1)
		]], 8, gr));
	}
}), [["__scopeId", "data-v-cec2fc9a"]]), vr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], yr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-globe"
		}, [...r[0] ||= [
			b("circle", {
				cx: "12",
				cy: "12",
				r: "10"
			}, null, -1),
			b("line", {
				x1: "2",
				y1: "12",
				x2: "22",
				y2: "12"
			}, null, -1),
			b("path", { d: "M12 2A15.3 15.3 0 0 1 16 12A15.3 15.3 0 0 1 12 22A15.3 15.3 0 0 1 8 12A15.3 15.3 0 0 1 12 2Z" }, null, -1)
		]], 8, vr));
	}
}), [["__scopeId", "data-v-b05f4cd0"]]), br = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], xr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-plus"
		}, [...r[0] ||= [b("line", {
			x1: "12",
			y1: "5",
			x2: "12",
			y2: "19"
		}, null, -1), b("line", {
			x1: "5",
			y1: "12",
			x2: "19",
			y2: "12"
		}, null, -1)]], 8, br));
	}
}), [["__scopeId", "data-v-7bb696cb"]]), Sr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Cr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-minus"
		}, [...r[0] ||= [b("line", {
			x1: "5",
			y1: "12",
			x2: "19",
			y2: "12"
		}, null, -1)]], 8, Sr));
	}
}), [["__scopeId", "data-v-64770042"]]), wr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Tr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-upload"
		}, [...r[0] ||= [
			b("path", { d: "M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" }, null, -1),
			b("polyline", { points: "17,8 12,3 7,8" }, null, -1),
			b("line", {
				x1: "12",
				y1: "3",
				x2: "12",
				y2: "15"
			}, null, -1)
		]], 8, wr));
	}
}), [["__scopeId", "data-v-18d39e40"]]), Er = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Dr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel,
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-calendar"
		}, [...r[0] ||= [
			b("rect", {
				x: "3",
				y: "4",
				width: "18",
				height: "18",
				rx: "2",
				ry: "2"
			}, null, -1),
			b("line", {
				x1: "16",
				y1: "2",
				x2: "16",
				y2: "6"
			}, null, -1),
			b("line", {
				x1: "8",
				y1: "2",
				x2: "8",
				y2: "6"
			}, null, -1),
			b("line", {
				x1: "3",
				y1: "10",
				x2: "21",
				y2: "10"
			}, null, -1)
		]], 8, Er));
	}
}), [["__scopeId", "data-v-c6e280da"]]), Or = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], kr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Bold",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-bold"
		}, [...r[0] ||= [b("path", { d: "M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" }, null, -1), b("path", { d: "M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" }, null, -1)]], 8, Or));
	}
}), [["__scopeId", "data-v-eff3b8aa"]]), Ar = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], jr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Italic",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-italic"
		}, [...r[0] ||= [
			b("line", {
				x1: "19",
				y1: "4",
				x2: "10",
				y2: "4"
			}, null, -1),
			b("line", {
				x1: "14",
				y1: "20",
				x2: "5",
				y2: "20"
			}, null, -1),
			b("line", {
				x1: "15",
				y1: "4",
				x2: "9",
				y2: "20"
			}, null, -1)
		]], 8, Ar));
	}
}), [["__scopeId", "data-v-0f6a33da"]]), Mr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Nr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Heading",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-heading"
		}, [...r[0] ||= [S("<line x1=\"4\" y1=\"6\" x2=\"4\" y2=\"18\" data-v-2b91db6f></line><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"18\" data-v-2b91db6f></line><line x1=\"4\" y1=\"12\" x2=\"12\" y2=\"12\" data-v-2b91db6f></line><line x1=\"17\" y1=\"10\" x2=\"20\" y2=\"8\" data-v-2b91db6f></line><line x1=\"20\" y1=\"8\" x2=\"20\" y2=\"18\" data-v-2b91db6f></line>", 5)]], 8, Mr));
	}
}), [["__scopeId", "data-v-2b91db6f"]]), Pr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Fr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Inline Code",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-code-inline"
		}, [...r[0] ||= [b("polyline", { points: "10,8 6,12 10,16" }, null, -1), b("polyline", { points: "14,8 18,12 14,16" }, null, -1)]], 8, Pr));
	}
}), [["__scopeId", "data-v-74ff8a2f"]]), Ir = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Lr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Bullet List",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-bullet-list"
		}, [...r[0] ||= [S("<line x1=\"9\" y1=\"6\" x2=\"20\" y2=\"6\" data-v-04f4f70f></line><line x1=\"9\" y1=\"12\" x2=\"20\" y2=\"12\" data-v-04f4f70f></line><line x1=\"9\" y1=\"18\" x2=\"20\" y2=\"18\" data-v-04f4f70f></line><circle cx=\"4\" cy=\"6\" r=\"1\" fill=\"currentColor\" stroke=\"none\" data-v-04f4f70f></circle><circle cx=\"4\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\" data-v-04f4f70f></circle><circle cx=\"4\" cy=\"18\" r=\"1\" fill=\"currentColor\" stroke=\"none\" data-v-04f4f70f></circle>", 6)]], 8, Ir));
	}
}), [["__scopeId", "data-v-04f4f70f"]]), Rr = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], zr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Numbered List",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-numbered-list"
		}, [...r[0] ||= [S("<line x1=\"10\" y1=\"6\" x2=\"21\" y2=\"6\" data-v-29cb9321></line><line x1=\"10\" y1=\"12\" x2=\"21\" y2=\"12\" data-v-29cb9321></line><line x1=\"10\" y1=\"18\" x2=\"21\" y2=\"18\" data-v-29cb9321></line><path d=\"M4 6h1v4\" data-v-29cb9321></path><path d=\"M4 10h2\" data-v-29cb9321></path><path d=\"M6 18H4c0-1 2-2 2-3s-1-2-2-2\" data-v-29cb9321></path>", 6)]], 8, Rr));
	}
}), [["__scopeId", "data-v-29cb9321"]]), Br = [
	"stroke",
	"width",
	"height",
	"aria-label",
	"aria-hidden"
], Vr = /* @__PURE__ */ Kn(/* @__PURE__ */ T({
	__name: "Icon",
	props: {
		size: { default: "md" },
		color: { default: "currentColor" },
		ariaLabel: { default: void 0 }
	},
	setup(e) {
		let t = e, n = Un(() => t.size);
		return (t, r) => (N(), y("svg", {
			xmlns: "http://www.w3.org/2000/svg",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: e.color,
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round",
			width: R(n),
			height: R(n),
			"aria-label": e.ariaLabel ?? "Blockquote",
			"aria-hidden": !e.ariaLabel,
			role: "img",
			class: "base-icon-blockquote"
		}, [...r[0] ||= [b("path", { d: "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" }, null, -1), b("path", { d: "M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" }, null, -1)]], 8, Br));
	}
}), [["__scopeId", "data-v-ec9d0521"]]), Hr = { class: "base-dropdown-host" }, Ur = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDropdown",
	props: {
		open: {
			type: Boolean,
			default: !1
		},
		placement: { default: "bottom-start" },
		matchTriggerWidth: {
			type: Boolean,
			default: !0
		},
		maxHeight: { default: "240px" },
		closeOnOutsideClick: {
			type: Boolean,
			default: !0
		}
	},
	emits: ["update:open", "close"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(null), { floatingStyles: o } = Cn(i, a, {
			placement: n.placement,
			whileElementsMounted: on,
			middleware: [
				sn(2),
				ln({ padding: 4 }),
				cn({ padding: 4 })
			]
		});
		function s(e) {
			if (!n.closeOnOutsideClick || !n.open) return;
			let t = e.target;
			i.value?.contains(t) || a.value?.contains(t) || (r("update:open", !1), r("close"));
		}
		return pe(() => n.open, (e) => {
			e ? document.addEventListener("mousedown", s) : document.removeEventListener("mousedown", s);
		}, { immediate: !0 }), (t, n) => (N(), y("div", Hr, [b("div", {
			ref_key: "referenceEl",
			ref: i,
			class: "base-dropdown-trigger"
		}, [I(t.$slots, "trigger", {}, void 0, !0)], 512), w(h, { name: "base-dropdown-fade" }, {
			default: z(() => [e.open ? (N(), y("div", {
				key: 0,
				ref_key: "floatingEl",
				ref: a,
				tabindex: "0",
				class: "base-dropdown",
				style: M({
					...R(o),
					maxHeight: e.maxHeight,
					minWidth: e.matchTriggerWidth && i.value?.offsetWidth ? `${i.value?.offsetWidth}px` : void 0
				})
			}, [I(t.$slots, "default", {}, void 0, !0)], 4)) : v("", !0)]),
			_: 3
		})]));
	}
}), [["__scopeId", "data-v-f7ca5191"]]), Wr = ["id", "for"], Gr = ["title"], Kr = [
	"aria-expanded",
	"aria-owns",
	"aria-labelledby",
	"aria-required"
], qr = [
	"id",
	"disabled",
	"aria-invalid",
	"aria-describedby"
], Jr = {
	class: "base-select__chevron",
	"aria-hidden": "true"
}, Yr = ["id", "aria-labelledby"], Xr = [
	"aria-selected",
	"aria-disabled",
	"onMousedown"
], Zr = {
	key: 0,
	class: "base-select__empty",
	role: "option",
	"aria-selected": "false",
	"aria-disabled": "true"
}, Qr = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSelect",
	props: {
		modelValue: { default: "" },
		options: { default: () => [] },
		size: { default: "md" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		placeholder: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { required: "required" } }
		}), { id: a } = Fn(n.id), o = P(!1), s = P(null), c = g(() => n.options.find((e) => e.value === n.modelValue) ?? null), l = g(() => c.value ? c.value.label : n.placeholder ?? ""), u = g(() => !c.value);
		function d() {
			n.disabled || (o.value = !0, r("focus", new FocusEvent("focus")));
		}
		function f() {
			o.value = !1;
		}
		function m(e) {
			e.disabled || (r("update:modelValue", e.value), r("change", e.value), f(), s.value?.focus());
		}
		function h(e) {
			e.key === "Enter" || e.key === " " ? (e.preventDefault(), o.value ? f() : d()) : e.key === "Escape" ? f() : e.key === "ArrowDown" ? (e.preventDefault(), o.value ? x(1) : d()) : e.key === "ArrowUp" && (e.preventDefault(), x(-1));
		}
		function x(e) {
			let t = n.options.filter((e) => !e.disabled);
			if (t.length === 0) return;
			let i = t.findIndex((e) => e.value === n.modelValue), a = t[Math.max(0, Math.min(t.length - 1, i + e))];
			a && (r("update:modelValue", a.value), r("change", a.value));
		}
		function S(e) {
			r("blur", e);
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-select",
			`base-select--${e.size}`,
			{
				"base-select--error": !!e.error,
				"base-select--disabled": e.disabled,
				"base-select--open": o.value
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				id: `${R(a)}-label`,
				for: R(a),
				class: j(["base-select__label", { "base-select__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-select__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, Gr)) : v("", !0)], 10, Wr)) : v("", !0),
			w(Ur, {
				open: o.value,
				"onUpdate:open": n[1] ||= (e) => {
					e || f();
				},
				onClose: f
			}, {
				trigger: z(() => [b("div", {
					class: "base-select__wrapper",
					role: "combobox",
					"aria-expanded": o.value,
					"aria-haspopup": "listbox",
					"aria-owns": `${R(a)}-listbox`,
					"aria-labelledby": e.label ? `${R(a)}-label` : void 0,
					"aria-required": e.required || void 0
				}, [b("button", {
					id: R(a),
					ref_key: "triggerRef",
					ref: s,
					type: "button",
					class: j(["base-select__field", { "base-select__field--placeholder": u.value }]),
					disabled: e.disabled,
					"aria-invalid": !!e.error || void 0,
					"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
					onClick: n[0] ||= (e) => o.value ? f() : d(),
					onKeydown: h,
					onBlur: S
				}, L(l.value), 43, qr), b("span", Jr, [w(R(qn), {
					size: "sm",
					direction: o.value ? "up" : "down"
				}, null, 8, ["direction"])])], 8, Kr)]),
				default: z(() => [b("ul", {
					id: `${R(a)}-listbox`,
					role: "listbox",
					class: "base-select__listbox",
					"aria-labelledby": e.label ? `${R(a)}-label` : void 0
				}, [(N(!0), y(p, null, F(e.options, (t) => (N(), y("li", {
					key: t.value,
					class: j(["base-select__option", {
						"base-select__option--selected": t.value === e.modelValue,
						"base-select__option--disabled": t.disabled
					}]),
					role: "option",
					"aria-selected": t.value === e.modelValue,
					"aria-disabled": t.disabled || void 0,
					onMousedown: B((e) => m(t), ["prevent"])
				}, L(t.label), 43, Xr))), 128)), e.options.length === 0 ? (N(), y("li", Zr, " No options available ")) : v("", !0)], 8, Yr)]),
				_: 1
			}, 8, ["open"]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-select__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-select__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-eb388be8"]]), $r = ["for"], ei = ["title"], ti = [
	"id",
	"value",
	"rows",
	"placeholder",
	"disabled",
	"required",
	"aria-invalid",
	"aria-describedby"
], ni = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTextarea",
	props: {
		modelValue: { default: "" },
		rows: { default: 4 },
		size: { default: "md" },
		resize: { default: "vertical" },
		placeholder: { default: "" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { required: "required" } }
		}), { id: a } = Fn(n.id);
		function o(e) {
			let t = e.target;
			r("update:modelValue", t.value);
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-textarea",
			`base-textarea--${e.size}`,
			{
				"base-textarea--error": !!e.error,
				"base-textarea--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(a),
				class: j(["base-textarea__label", { "base-textarea__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-textarea__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, ei)) : v("", !0)], 10, $r)) : v("", !0),
			b("textarea", {
				id: R(a),
				value: e.modelValue,
				rows: e.rows,
				placeholder: e.placeholder,
				disabled: e.disabled,
				required: e.required,
				style: M({ resize: e.resize }),
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
				class: "base-textarea__field",
				onInput: o,
				onChange: n[0] ||= (e) => r("change", e),
				onBlur: n[1] ||= (e) => r("blur", e),
				onFocus: n[2] ||= (e) => r("focus", e)
			}, null, 44, ti),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-textarea__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-textarea__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-4dfc645d"]]), ri = { class: "base-checkbox__row" }, ii = { class: "base-checkbox__control-wrapper" }, ai = [
	"id",
	"checked",
	"value",
	"disabled",
	"required",
	"aria-invalid",
	"aria-describedby"
], oi = {
	class: "base-checkbox__box",
	"aria-hidden": "true"
}, si = {
	key: 0,
	class: "base-checkbox__icon",
	viewBox: "0 0 12 12",
	fill: "none",
	xmlns: "http://www.w3.org/2000/svg"
}, ci = {
	key: 1,
	class: "base-checkbox__icon",
	viewBox: "0 0 12 12",
	fill: "none",
	xmlns: "http://www.w3.org/2000/svg"
}, li = ["title"], ui = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseCheckbox",
	props: {
		modelValue: {
			type: [Boolean, Array],
			default: !1
		},
		value: { default: void 0 },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		indeterminate: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => Array.isArray(n.modelValue) ? n.value !== void 0 && n.modelValue.includes(n.value) : n.modelValue);
		function a(e) {
			let t = e.target;
			if (Array.isArray(n.modelValue) && n.value !== void 0) {
				let e = [...n.modelValue];
				if (t.checked) e.push(n.value);
				else {
					let t = e.indexOf(n.value);
					t !== -1 && e.splice(t, 1);
				}
				r("update:modelValue", e);
			} else r("update:modelValue", t.checked);
			r("change", e);
		}
		let { t: o } = _e({
			inheritLocale: !0,
			messages: { en: { required: "required" } }
		}), { id: s } = Fn(n.id), c = P(null);
		return pe(() => n.indeterminate, (e) => {
			c.value && (c.value.indeterminate = e);
		}, { immediate: !0 }), (t, n) => (N(), y("div", { class: j(["base-checkbox", {
			"base-checkbox--error": !!e.error,
			"base-checkbox--disabled": e.disabled
		}]) }, [b("label", ri, [b("span", ii, [b("input", {
			id: R(s),
			ref_key: "checkboxRef",
			ref: c,
			type: "checkbox",
			checked: i.value,
			value: e.value,
			disabled: e.disabled,
			required: e.required,
			"aria-invalid": !!e.error || void 0,
			"aria-describedby": e.error ? `${R(s)}-error` : e.hint ? `${R(s)}-hint` : void 0,
			class: "base-checkbox__input",
			onChange: a
		}, null, 40, ai), b("span", oi, [e.indeterminate ? (N(), y("svg", si, [...n[0] ||= [b("path", {
			d: "M2 6h8",
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round"
		}, null, -1)]])) : (N(), y("svg", ci, [...n[1] ||= [b("path", {
			d: "M2 6l3 3 5-5",
			stroke: "currentColor",
			"stroke-width": "2",
			"stroke-linecap": "round",
			"stroke-linejoin": "round"
		}, null, -1)]]))])]), e.label ? (N(), y("span", {
			key: 0,
			class: j(["base-checkbox__label", { "base-checkbox__label--hidden": e.labelHidden }])
		}, [w(H, {
			variant: "body-md",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		}), e.required ? (N(), y("span", {
			key: 0,
			class: "base-checkbox__required",
			title: R(o)("required"),
			"aria-hidden": "true"
		}, "*", 8, li)) : v("", !0)], 2)) : v("", !0)]), e.error ? (N(), _(H, {
			key: 0,
			id: `${R(s)}-error`,
			variant: "caption",
			as: "p",
			color: "inherit",
			class: "base-checkbox__error",
			role: "alert"
		}, {
			default: z(() => [C(L(e.error), 1)]),
			_: 1
		}, 8, ["id"])) : e.hint ? (N(), _(H, {
			key: 1,
			id: `${R(s)}-hint`,
			variant: "caption",
			as: "p",
			color: "secondary",
			class: "base-checkbox__hint"
		}, {
			default: z(() => [C(L(e.hint), 1)]),
			_: 1
		}, 8, ["id"])) : v("", !0)], 2));
	}
}), [["__scopeId", "data-v-cf058964"]]), di = { class: "base-radio__control-wrapper" }, fi = [
	"id",
	"checked",
	"value",
	"disabled"
], pi = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseRadio",
	props: {
		modelValue: { default: void 0 },
		value: {},
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		disabled: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => n.modelValue === n.value);
		function a(e) {
			r("update:modelValue", n.value), r("change", e);
		}
		return (t, n) => (N(), y("label", { class: j(["base-radio", {
			"base-radio--checked": i.value,
			"base-radio--disabled": e.disabled
		}]) }, [
			b("span", di, [b("input", {
				id: e.id,
				type: "radio",
				checked: i.value,
				value: e.value,
				disabled: e.disabled,
				class: "base-radio__input",
				onChange: a
			}, null, 40, fi), n[0] ||= b("span", {
				class: "base-radio__circle",
				"aria-hidden": "true"
			}, null, -1)]),
			e.label ? (N(), _(H, {
				key: 0,
				variant: "body-md",
				as: "span",
				color: "primary",
				class: j(["base-radio__label", { "base-radio__label--hidden": e.labelHidden }])
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}, 8, ["class"])) : v("", !0),
			I(t.$slots, "default", {}, void 0, !0)
		], 2));
	}
}), [["__scopeId", "data-v-5c134862"]]), mi = ["title"], hi = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseRadioGroup",
	props: {
		modelValue: { default: void 0 },
		options: { default: () => [] },
		legend: { default: void 0 },
		legendHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		direction: { default: "vertical" },
		name: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { required: "required" } }
		}), a = g(() => n.name ?? `radio-group-${Math.random().toString(36).slice(2, 8)}`);
		return (t, n) => (N(), y("fieldset", { class: j(["base-radio-group", {
			"base-radio-group--error": !!e.error,
			"base-radio-group--disabled": e.disabled
		}]) }, [
			e.legend ? (N(), y("legend", {
				key: 0,
				class: j(["base-radio-group__legend", { "base-radio-group__legend--hidden": e.legendHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.legend), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-radio-group__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, mi)) : v("", !0)], 2)) : v("", !0),
			b("div", { class: j(["base-radio-group__options", `base-radio-group__options--${e.direction}`]) }, [(N(!0), y(p, null, F(e.options, (t) => (N(), _(pi, {
				key: t.value,
				"model-value": e.modelValue,
				value: t.value,
				label: t.label,
				disabled: e.disabled || t.disabled,
				id: `${a.value}-${t.value}`,
				"onUpdate:modelValue": n[0] ||= (e) => r("update:modelValue", e),
				onChange: n[1] ||= (e) => r("change", e)
			}, null, 8, [
				"model-value",
				"value",
				"label",
				"disabled",
				"id"
			]))), 128)), I(t.$slots, "default", {}, void 0, !0)], 2),
			e.error ? (N(), _(H, {
				key: 1,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-radio-group__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			})) : e.hint ? (N(), _(H, {
				key: 2,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-radio-group__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			})) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-8dc82479"]]), gi = { class: "base-switch__row" }, _i = { class: "base-switch__track-wrapper" }, vi = [
	"id",
	"checked",
	"disabled",
	"aria-label",
	"aria-checked",
	"aria-invalid",
	"aria-describedby"
], yi = {
	key: 0,
	class: "base-switch__label"
}, bi = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSwitch",
	props: {
		modelValue: {
			type: Boolean,
			default: !1
		},
		label: { default: void 0 },
		ariaLabel: { default: void 0 },
		hint: { default: void 0 },
		error: { default: void 0 },
		size: { default: "md" },
		disabled: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id);
		function a(e) {
			let t = e.target;
			r("update:modelValue", t.checked), r("change", e);
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-switch",
			`base-switch--${e.size}`,
			{
				"base-switch--error": !!e.error,
				"base-switch--disabled": e.disabled
			}
		]) }, [b("label", gi, [b("span", _i, [b("input", {
			id: R(i),
			type: "checkbox",
			role: "switch",
			checked: e.modelValue,
			disabled: e.disabled,
			"aria-label": e.label ? void 0 : e.ariaLabel,
			"aria-checked": e.modelValue,
			"aria-invalid": !!e.error || void 0,
			"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
			class: "base-switch__input",
			onChange: a
		}, null, 40, vi), n[0] ||= b("span", {
			class: "base-switch__track",
			"aria-hidden": "true"
		}, [b("span", { class: "base-switch__thumb" })], -1)]), e.label ? (N(), y("span", yi, [w(H, {
			variant: "body-md",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		})])) : v("", !0)]), e.error ? (N(), _(H, {
			key: 0,
			id: `${R(i)}-error`,
			variant: "caption",
			as: "p",
			color: "inherit",
			class: "base-switch__error",
			role: "alert"
		}, {
			default: z(() => [C(L(e.error), 1)]),
			_: 1
		}, 8, ["id"])) : e.hint ? (N(), _(H, {
			key: 1,
			id: `${R(i)}-hint`,
			variant: "caption",
			as: "p",
			color: "secondary",
			class: "base-switch__hint"
		}, {
			default: z(() => [C(L(e.hint), 1)]),
			_: 1
		}, 8, ["id"])) : v("", !0)], 2));
	}
}), [["__scopeId", "data-v-cdcb125c"]]);
//#endregion
//#region ../../node_modules/.pnpm/marked@18.0.4/node_modules/marked/lib/marked.esm.js
function xi() {
	return {
		async: !1,
		breaks: !1,
		extensions: null,
		gfm: !0,
		hooks: null,
		pedantic: !1,
		renderer: null,
		silent: !1,
		tokenizer: null,
		walkTokens: null
	};
}
var Si = xi();
function Ci(e) {
	Si = e;
}
var wi = { exec: () => null };
function Ti(e) {
	let t = [];
	return (n) => {
		let r = Math.max(0, Math.min(3, n - 1)), i = t[r];
		return i || (i = e(r), t[r] = i), i;
	};
}
function U(e, t = "") {
	let n = typeof e == "string" ? e : e.source, r = {
		replace: (e, t) => {
			let i = typeof t == "string" ? t : t.source;
			return i = i.replace(Di.caret, "$1"), n = n.replace(e, i), r;
		},
		getRegex: () => new RegExp(n, t)
	};
	return r;
}
var Ei = ((e = "") => {
	try {
		return !!RegExp("(?<=1)(?<!1)" + e);
	} catch {
		return !1;
	}
})(), Di = {
	codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
	outputLinkReplace: /\\([\[\]])/g,
	indentCodeCompensation: /^(\s+)(?:```)/,
	beginningSpace: /^\s+/,
	endingHash: /#$/,
	startingSpaceChar: /^ /,
	endingSpaceChar: / $/,
	nonSpaceChar: /[^ ]/,
	newLineCharGlobal: /\n/g,
	tabCharGlobal: /\t/g,
	multipleSpaceGlobal: /\s+/g,
	blankLine: /^[ \t]*$/,
	doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
	blockquoteStart: /^ {0,3}>/,
	blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
	blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
	listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
	listIsTask: /^\[[ xX]\] +\S/,
	listReplaceTask: /^\[[ xX]\] +/,
	listTaskCheckbox: /\[[ xX]\]/,
	anyLine: /\n.*\n/,
	hrefBrackets: /^<(.*)>$/,
	tableDelimiter: /[:|]/,
	tableAlignChars: /^\||\| *$/g,
	tableRowBlankLine: /\n[ \t]*$/,
	tableAlignRight: /^ *-+: *$/,
	tableAlignCenter: /^ *:-+: *$/,
	tableAlignLeft: /^ *:-+ *$/,
	startATag: /^<a /i,
	endATag: /^<\/a>/i,
	startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
	endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
	startAngleBracket: /^</,
	endAngleBracket: />$/,
	pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
	unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
	escapeTest: /[&<>"']/,
	escapeReplace: /[&<>"']/g,
	escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
	escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
	caret: /(^|[^\[])\^/g,
	percentDecode: /%25/g,
	findPipe: /\|/g,
	splitPipe: / \|/,
	slashPipe: /\\\|/g,
	carriageReturn: /\r\n|\r/g,
	spaceLine: /^ +$/gm,
	notSpaceStart: /^\S*/,
	endingNewline: /\n$/,
	listItemRegex: (e) => RegExp(`^( {0,3}${e})((?:[	 ][^\\n]*)?(?:\\n|$))`),
	nextBulletRegex: Ti((e) => RegExp(`^ {0,${e}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),
	hrRegex: Ti((e) => RegExp(`^ {0,${e}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),
	fencesBeginRegex: Ti((e) => RegExp(`^ {0,${e}}(?:\`\`\`|~~~)`)),
	headingBeginRegex: Ti((e) => RegExp(`^ {0,${e}}#`)),
	htmlBeginRegex: Ti((e) => RegExp(`^ {0,${e}}<(?:[a-z].*>|!--)`, "i")),
	blockquoteBeginRegex: Ti((e) => RegExp(`^ {0,${e}}>`))
}, Oi = /^(?:[ \t]*(?:\n|$))+/, ki = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/, Ai = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/, ji = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/, Mi = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/, Ni = / {0,3}(?:[*+-]|\d{1,9}[.)])/, Pi = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/, Fi = U(Pi).replace(/bull/g, Ni).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex(), Ii = U(Pi).replace(/bull/g, Ni).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(), Li = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/, Ri = /^[^\n]+/, zi = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/, Bi = U(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", zi).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(), Vi = U(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, Ni).getRegex(), Hi = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul", Ui = /<!--(?:-?>|[\s\S]*?(?:-->|$))/, Wi = U("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", Ui).replace("tag", Hi).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(), Gi = U(Li).replace("hr", ji).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Hi).getRegex(), Ki = {
	blockquote: U(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", Gi).getRegex(),
	code: ki,
	def: Bi,
	fences: Ai,
	heading: Mi,
	hr: ji,
	html: Wi,
	lheading: Fi,
	list: Vi,
	newline: Oi,
	paragraph: Gi,
	table: wi,
	text: Ri
}, qi = U("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", ji).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Hi).getRegex(), Ji = {
	...Ki,
	lheading: Ii,
	table: qi,
	paragraph: U(Li).replace("hr", ji).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", qi).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", Hi).getRegex()
}, Yi = {
	...Ki,
	html: U("^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:\"[^\"]*\"|'[^']*'|\\s[^'\"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))").replace("comment", Ui).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
	def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
	heading: /^(#{1,6})(.*)(?:\n+|$)/,
	fences: wi,
	lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
	paragraph: U(Li).replace("hr", ji).replace("heading", " *#{1,6} *[^\n]").replace("lheading", Fi).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
}, Xi = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/, Zi = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/, Qi = /^( {2,}|\\)\n(?!\s*$)/, $i = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/, ea = /[\p{P}\p{S}]/u, ta = /[\s\p{P}\p{S}]/u, na = /[^\s\p{P}\p{S}]/u, ra = U(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, ta).getRegex(), ia = /(?!~)[\p{P}\p{S}]/u, aa = /(?!~)[\s\p{P}\p{S}]/u, oa = /(?:[^\s\p{P}\p{S}]|~)/u, sa = U(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Ei ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex(), ca = /^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/, la = U(ca, "u").replace(/punct/g, ea).getRegex(), ua = U(ca, "u").replace(/punct/g, ia).getRegex(), da = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)", fa = U(da, "gu").replace(/notPunctSpace/g, na).replace(/punctSpace/g, ta).replace(/punct/g, ea).getRegex(), pa = U(da, "gu").replace(/notPunctSpace/g, oa).replace(/punctSpace/g, aa).replace(/punct/g, ia).getRegex(), ma = U("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, na).replace(/punctSpace/g, ta).replace(/punct/g, ea).getRegex(), ha = U(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, ea).getRegex(), ga = U("^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)", "gu").replace(/notPunctSpace/g, na).replace(/punctSpace/g, ta).replace(/punct/g, ea).getRegex(), _a = U(/\\(punct)/, "gu").replace(/punct/g, ea).getRegex(), va = U(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(), ya = U(Ui).replace("(?:-->|$)", "-->").getRegex(), ba = U("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", ya).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(), xa = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/, Sa = U(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", xa).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(), Ca = U(/^!?\[(label)\]\[(ref)\]/).replace("label", xa).replace("ref", zi).getRegex(), wa = U(/^!?\[(ref)\](?:\[\])?/).replace("ref", zi).getRegex(), Ta = U("reflink|nolink(?!\\()", "g").replace("reflink", Ca).replace("nolink", wa).getRegex(), Ea = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/, Da = {
	_backpedal: wi,
	anyPunctuation: _a,
	autolink: va,
	blockSkip: sa,
	br: Qi,
	code: Zi,
	del: wi,
	delLDelim: wi,
	delRDelim: wi,
	emStrongLDelim: la,
	emStrongRDelimAst: fa,
	emStrongRDelimUnd: ma,
	escape: Xi,
	link: Sa,
	nolink: wa,
	punctuation: ra,
	reflink: Ca,
	reflinkSearch: Ta,
	tag: ba,
	text: $i,
	url: wi
}, Oa = {
	...Da,
	link: U(/^!?\[(label)\]\((.*?)\)/).replace("label", xa).getRegex(),
	reflink: U(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", xa).getRegex()
}, ka = {
	...Da,
	emStrongRDelimAst: pa,
	emStrongLDelim: ua,
	delLDelim: ha,
	delRDelim: ga,
	url: U(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", Ea).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
	_backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
	del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
	text: U(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", Ea).getRegex()
}, Aa = {
	...ka,
	br: U(Qi).replace("{2,}", "*").getRegex(),
	text: U(ka.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
}, ja = {
	normal: Ki,
	gfm: Ji,
	pedantic: Yi
}, Ma = {
	normal: Da,
	gfm: ka,
	breaks: Aa,
	pedantic: Oa
}, Na = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;"
}, Pa = (e) => Na[e];
function Fa(e, t) {
	if (t) {
		if (Di.escapeTest.test(e)) return e.replace(Di.escapeReplace, Pa);
	} else if (Di.escapeTestNoEncode.test(e)) return e.replace(Di.escapeReplaceNoEncode, Pa);
	return e;
}
function Ia(e) {
	try {
		e = encodeURI(e).replace(Di.percentDecode, "%");
	} catch {
		return null;
	}
	return e;
}
function La(e, t) {
	let n = e.replace(Di.findPipe, (e, t, n) => {
		let r = !1, i = t;
		for (; --i >= 0 && n[i] === "\\";) r = !r;
		return r ? "|" : " |";
	}).split(Di.splitPipe), r = 0;
	if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), t) if (n.length > t) n.splice(t);
	else for (; n.length < t;) n.push("");
	for (; r < n.length; r++) n[r] = n[r].trim().replace(Di.slashPipe, "|");
	return n;
}
function Ra(e, t, n) {
	let r = e.length;
	if (r === 0) return "";
	let i = 0;
	for (; i < r;) {
		let a = e.charAt(r - i - 1);
		if (a === t && !n) i++;
		else if (a !== t && n) i++;
		else break;
	}
	return e.slice(0, r - i);
}
function za(e) {
	let t = e.split("\n"), n = t.length - 1;
	for (; n >= 0 && Di.blankLine.test(t[n]);) n--;
	return t.length - n <= 2 ? e : t.slice(0, n + 1).join("\n");
}
function Ba(e, t) {
	if (e.indexOf(t[1]) === -1) return -1;
	let n = 0;
	for (let r = 0; r < e.length; r++) if (e[r] === "\\") r++;
	else if (e[r] === t[0]) n++;
	else if (e[r] === t[1] && (n--, n < 0)) return r;
	return n > 0 ? -2 : -1;
}
function Va(e, t = 0) {
	let n = t, r = "";
	for (let t of e) if (t === "	") {
		let e = 4 - n % 4;
		r += " ".repeat(e), n += e;
	} else r += t, n++;
	return r;
}
function Ha(e, t, n, r, i) {
	let a = t.href, o = t.title || null, s = e[1].replace(i.other.outputLinkReplace, "$1");
	r.state.inLink = !0;
	let c = {
		type: e[0].charAt(0) === "!" ? "image" : "link",
		raw: n,
		href: a,
		title: o,
		text: s,
		tokens: r.inlineTokens(s)
	};
	return r.state.inLink = !1, c;
}
function Ua(e, t, n) {
	let r = e.match(n.other.indentCodeCompensation);
	if (r === null) return t;
	let i = r[1];
	return t.split("\n").map((e) => {
		let t = e.match(n.other.beginningSpace);
		if (t === null) return e;
		let [r] = t;
		return r.length >= i.length ? e.slice(i.length) : e;
	}).join("\n");
}
var Wa = class {
	options;
	rules;
	lexer;
	constructor(e) {
		this.options = e || Si;
	}
	space(e) {
		let t = this.rules.block.newline.exec(e);
		if (t && t[0].length > 0) return {
			type: "space",
			raw: t[0]
		};
	}
	code(e) {
		let t = this.rules.block.code.exec(e);
		if (t) {
			let e = this.options.pedantic ? t[0] : za(t[0]);
			return {
				type: "code",
				raw: e,
				codeBlockStyle: "indented",
				text: e.replace(this.rules.other.codeRemoveIndent, "")
			};
		}
	}
	fences(e) {
		let t = this.rules.block.fences.exec(e);
		if (t) {
			let e = t[0], n = Ua(e, t[3] || "", this.rules);
			return {
				type: "code",
				raw: e,
				lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2],
				text: n
			};
		}
	}
	heading(e) {
		let t = this.rules.block.heading.exec(e);
		if (t) {
			let e = t[2].trim();
			if (this.rules.other.endingHash.test(e)) {
				let t = Ra(e, "#");
				(this.options.pedantic || !t || this.rules.other.endingSpaceChar.test(t)) && (e = t.trim());
			}
			return {
				type: "heading",
				raw: Ra(t[0], "\n"),
				depth: t[1].length,
				text: e,
				tokens: this.lexer.inline(e)
			};
		}
	}
	hr(e) {
		let t = this.rules.block.hr.exec(e);
		if (t) return {
			type: "hr",
			raw: Ra(t[0], "\n")
		};
	}
	blockquote(e) {
		let t = this.rules.block.blockquote.exec(e);
		if (t) {
			let e = Ra(t[0], "\n").split("\n"), n = "", r = "", i = [];
			for (; e.length > 0;) {
				let t = !1, a = [], o;
				for (o = 0; o < e.length; o++) if (this.rules.other.blockquoteStart.test(e[o])) a.push(e[o]), t = !0;
				else if (!t) a.push(e[o]);
				else break;
				e = e.slice(o);
				let s = a.join("\n"), c = s.replace(this.rules.other.blockquoteSetextReplace, "\n    $1").replace(this.rules.other.blockquoteSetextReplace2, "");
				n = n ? `${n}
${s}` : s, r = r ? `${r}
${c}` : c;
				let l = this.lexer.state.top;
				if (this.lexer.state.top = !0, this.lexer.blockTokens(c, i, !0), this.lexer.state.top = l, e.length === 0) break;
				let u = i.at(-1);
				if (u?.type === "code") break;
				if (u?.type === "blockquote") {
					let t = u, a = t.raw + "\n" + e.join("\n"), o = this.blockquote(a);
					i[i.length - 1] = o, n = n.substring(0, n.length - t.raw.length) + o.raw, r = r.substring(0, r.length - t.text.length) + o.text;
					break;
				} else if (u?.type === "list") {
					let t = u, a = t.raw + "\n" + e.join("\n"), o = this.list(a);
					i[i.length - 1] = o, n = n.substring(0, n.length - u.raw.length) + o.raw, r = r.substring(0, r.length - t.raw.length) + o.raw, e = a.substring(i.at(-1).raw.length).split("\n");
					continue;
				}
			}
			return {
				type: "blockquote",
				raw: n,
				tokens: i,
				text: r
			};
		}
	}
	list(e) {
		let t = this.rules.block.list.exec(e);
		if (t) {
			let n = t[1].trim(), r = n.length > 1, i = {
				type: "list",
				raw: "",
				ordered: r,
				start: r ? +n.slice(0, -1) : "",
				loose: !1,
				items: []
			};
			n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
			let a = this.rules.other.listItemRegex(n), o = !1;
			for (; e;) {
				let n = !1, r = "", s = "";
				if (!(t = a.exec(e)) || this.rules.block.hr.test(e)) break;
				r = t[0], e = e.substring(r.length);
				let c = Va(t[2].split("\n", 1)[0], t[1].length), l = e.split("\n", 1)[0], u = !c.trim(), d = 0;
				if (this.options.pedantic ? (d = 2, s = c.trimStart()) : u ? d = t[1].length + 1 : (d = c.search(this.rules.other.nonSpaceChar), d = d > 4 ? 1 : d, s = c.slice(d), d += t[1].length), u && this.rules.other.blankLine.test(l) && (r += l + "\n", e = e.substring(l.length + 1), n = !0), !n) {
					let t = this.rules.other.nextBulletRegex(d), n = this.rules.other.hrRegex(d), i = this.rules.other.fencesBeginRegex(d), a = this.rules.other.headingBeginRegex(d), o = this.rules.other.htmlBeginRegex(d), f = this.rules.other.blockquoteBeginRegex(d);
					for (; e;) {
						let p = e.split("\n", 1)[0], m;
						if (l = p, this.options.pedantic ? (l = l.replace(this.rules.other.listReplaceNesting, "  "), m = l) : m = l.replace(this.rules.other.tabCharGlobal, "    "), i.test(l) || a.test(l) || o.test(l) || f.test(l) || t.test(l) || n.test(l)) break;
						if (m.search(this.rules.other.nonSpaceChar) >= d || !l.trim()) s += "\n" + m.slice(d);
						else {
							if (u || c.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || i.test(c) || a.test(c) || n.test(c)) break;
							s += "\n" + l;
						}
						u = !l.trim(), r += p + "\n", e = e.substring(p.length + 1), c = m.slice(d);
					}
				}
				i.loose || (o ? i.loose = !0 : this.rules.other.doubleBlankLine.test(r) && (o = !0)), i.items.push({
					type: "list_item",
					raw: r,
					task: !!this.options.gfm && this.rules.other.listIsTask.test(s),
					loose: !1,
					text: s,
					tokens: []
				}), i.raw += r;
			}
			let s = i.items.at(-1);
			if (s) s.raw = s.raw.trimEnd(), s.text = s.text.trimEnd();
			else return;
			i.raw = i.raw.trimEnd();
			for (let e of i.items) {
				this.lexer.state.top = !1, e.tokens = this.lexer.blockTokens(e.text, []);
				let t = e.tokens[0];
				if (e.task && (t?.type === "text" || t?.type === "paragraph")) {
					e.text = e.text.replace(this.rules.other.listReplaceTask, ""), t.raw = t.raw.replace(this.rules.other.listReplaceTask, ""), t.text = t.text.replace(this.rules.other.listReplaceTask, "");
					for (let e = this.lexer.inlineQueue.length - 1; e >= 0; e--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[e].src)) {
						this.lexer.inlineQueue[e].src = this.lexer.inlineQueue[e].src.replace(this.rules.other.listReplaceTask, "");
						break;
					}
					let n = this.rules.other.listTaskCheckbox.exec(e.raw);
					if (n) {
						let t = {
							type: "checkbox",
							raw: n[0] + " ",
							checked: n[0] !== "[ ]"
						};
						e.checked = t.checked, i.loose ? e.tokens[0] && ["paragraph", "text"].includes(e.tokens[0].type) && "tokens" in e.tokens[0] && e.tokens[0].tokens ? (e.tokens[0].raw = t.raw + e.tokens[0].raw, e.tokens[0].text = t.raw + e.tokens[0].text, e.tokens[0].tokens.unshift(t)) : e.tokens.unshift({
							type: "paragraph",
							raw: t.raw,
							text: t.raw,
							tokens: [t]
						}) : e.tokens.unshift(t);
					}
				} else e.task &&= !1;
				if (!i.loose) {
					let t = e.tokens.filter((e) => e.type === "space");
					i.loose = t.length > 0 && t.some((e) => this.rules.other.anyLine.test(e.raw));
				}
			}
			if (i.loose) for (let e of i.items) {
				e.loose = !0;
				for (let t of e.tokens) t.type === "text" && (t.type = "paragraph");
			}
			return i;
		}
	}
	html(e) {
		let t = this.rules.block.html.exec(e);
		if (t) {
			let e = za(t[0]);
			return {
				type: "html",
				block: !0,
				raw: e,
				pre: t[1] === "pre" || t[1] === "script" || t[1] === "style",
				text: e
			};
		}
	}
	def(e) {
		let t = this.rules.block.def.exec(e);
		if (t) {
			let e = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), n = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", r = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
			return {
				type: "def",
				tag: e,
				raw: Ra(t[0], "\n"),
				href: n,
				title: r
			};
		}
	}
	table(e) {
		let t = this.rules.block.table.exec(e);
		if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
		let n = La(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split("\n") : [], a = {
			type: "table",
			raw: Ra(t[0], "\n"),
			header: [],
			align: [],
			rows: []
		};
		if (n.length === r.length) {
			for (let e of r) this.rules.other.tableAlignRight.test(e) ? a.align.push("right") : this.rules.other.tableAlignCenter.test(e) ? a.align.push("center") : this.rules.other.tableAlignLeft.test(e) ? a.align.push("left") : a.align.push(null);
			for (let e = 0; e < n.length; e++) a.header.push({
				text: n[e],
				tokens: this.lexer.inline(n[e]),
				header: !0,
				align: a.align[e]
			});
			for (let e of i) a.rows.push(La(e, a.header.length).map((e, t) => ({
				text: e,
				tokens: this.lexer.inline(e),
				header: !1,
				align: a.align[t]
			})));
			return a;
		}
	}
	lheading(e) {
		let t = this.rules.block.lheading.exec(e);
		if (t) {
			let e = t[1].trim();
			return {
				type: "heading",
				raw: Ra(t[0], "\n"),
				depth: t[2].charAt(0) === "=" ? 1 : 2,
				text: e,
				tokens: this.lexer.inline(e)
			};
		}
	}
	paragraph(e) {
		let t = this.rules.block.paragraph.exec(e);
		if (t) {
			let e = t[1].charAt(t[1].length - 1) === "\n" ? t[1].slice(0, -1) : t[1];
			return {
				type: "paragraph",
				raw: t[0],
				text: e,
				tokens: this.lexer.inline(e)
			};
		}
	}
	text(e) {
		let t = this.rules.block.text.exec(e);
		if (t) return {
			type: "text",
			raw: t[0],
			text: t[0],
			tokens: this.lexer.inline(t[0])
		};
	}
	escape(e) {
		let t = this.rules.inline.escape.exec(e);
		if (t) return {
			type: "escape",
			raw: t[0],
			text: t[1]
		};
	}
	tag(e) {
		let t = this.rules.inline.tag.exec(e);
		if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), {
			type: "html",
			raw: t[0],
			inLink: this.lexer.state.inLink,
			inRawBlock: this.lexer.state.inRawBlock,
			block: !1,
			text: t[0]
		};
	}
	link(e) {
		let t = this.rules.inline.link.exec(e);
		if (t) {
			let e = t[2].trim();
			if (!this.options.pedantic && this.rules.other.startAngleBracket.test(e)) {
				if (!this.rules.other.endAngleBracket.test(e)) return;
				let t = Ra(e.slice(0, -1), "\\");
				if ((e.length - t.length) % 2 == 0) return;
			} else {
				let e = Ba(t[2], "()");
				if (e === -2) return;
				if (e > -1) {
					let n = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + e;
					t[2] = t[2].substring(0, e), t[0] = t[0].substring(0, n).trim(), t[3] = "";
				}
			}
			let n = t[2], r = "";
			if (this.options.pedantic) {
				let e = this.rules.other.pedanticHrefTitle.exec(n);
				e && (n = e[1], r = e[3]);
			} else r = t[3] ? t[3].slice(1, -1) : "";
			return n = n.trim(), this.rules.other.startAngleBracket.test(n) && (n = this.options.pedantic && !this.rules.other.endAngleBracket.test(e) ? n.slice(1) : n.slice(1, -1)), Ha(t, {
				href: n && n.replace(this.rules.inline.anyPunctuation, "$1"),
				title: r && r.replace(this.rules.inline.anyPunctuation, "$1")
			}, t[0], this.lexer, this.rules);
		}
	}
	reflink(e, t) {
		let n;
		if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
			let e = t[(n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " ").toLowerCase()];
			if (!e) {
				let e = n[0].charAt(0);
				return {
					type: "text",
					raw: e,
					text: e
				};
			}
			return Ha(n, e, n[0], this.lexer, this.rules);
		}
	}
	emStrong(e, t, n = "") {
		let r = this.rules.inline.emStrongLDelim.exec(e);
		if (!(!r || !r[1] && !r[2] && !r[3] && !r[4] || r[4] && n.match(this.rules.other.unicodeAlphaNumeric)) && (!(r[1] || r[3]) || !n || this.rules.inline.punctuation.exec(n))) {
			let n = [...r[0]].length - 1, i, a, o = n, s = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
			for (c.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = c.exec(t)) !== null;) {
				if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i) continue;
				if (a = [...i].length, r[3] || r[4]) {
					o += a;
					continue;
				} else if ((r[5] || r[6]) && n % 3 && !((n + a) % 3)) {
					s += a;
					continue;
				}
				if (o -= a, o > 0) continue;
				a = Math.min(a, a + o + s);
				let t = [...r[0]][0].length, c = e.slice(0, n + r.index + t + a);
				if (Math.min(n, a) % 2) {
					let e = c.slice(1, -1);
					return {
						type: "em",
						raw: c,
						text: e,
						tokens: this.lexer.inlineTokens(e)
					};
				}
				let l = c.slice(2, -2);
				return {
					type: "strong",
					raw: c,
					text: l,
					tokens: this.lexer.inlineTokens(l)
				};
			}
		}
	}
	codespan(e) {
		let t = this.rules.inline.code.exec(e);
		if (t) {
			let e = t[2].replace(this.rules.other.newLineCharGlobal, " "), n = this.rules.other.nonSpaceChar.test(e), r = this.rules.other.startingSpaceChar.test(e) && this.rules.other.endingSpaceChar.test(e);
			return n && r && (e = e.substring(1, e.length - 1)), {
				type: "codespan",
				raw: t[0],
				text: e
			};
		}
	}
	br(e) {
		let t = this.rules.inline.br.exec(e);
		if (t) return {
			type: "br",
			raw: t[0]
		};
	}
	del(e, t, n = "") {
		let r = this.rules.inline.delLDelim.exec(e);
		if (r && (!r[1] || !n || this.rules.inline.punctuation.exec(n))) {
			let n = [...r[0]].length - 1, i, a, o = n, s = this.rules.inline.delRDelim;
			for (s.lastIndex = 0, t = t.slice(-1 * e.length + n); (r = s.exec(t)) !== null;) {
				if (i = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !i || (a = [...i].length, a !== n)) continue;
				if (r[3] || r[4]) {
					o += a;
					continue;
				}
				if (o -= a, o > 0) continue;
				a = Math.min(a, a + o);
				let t = [...r[0]][0].length, s = e.slice(0, n + r.index + t + a), c = s.slice(n, -n);
				return {
					type: "del",
					raw: s,
					text: c,
					tokens: this.lexer.inlineTokens(c)
				};
			}
		}
	}
	autolink(e) {
		let t = this.rules.inline.autolink.exec(e);
		if (t) {
			let e, n;
			return t[2] === "@" ? (e = t[1], n = "mailto:" + e) : (e = t[1], n = e), {
				type: "link",
				raw: t[0],
				text: e,
				href: n,
				tokens: [{
					type: "text",
					raw: e,
					text: e
				}]
			};
		}
	}
	url(e) {
		let t;
		if (t = this.rules.inline.url.exec(e)) {
			let e, n;
			if (t[2] === "@") e = t[0], n = "mailto:" + e;
			else {
				let r;
				do
					r = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
				while (r !== t[0]);
				e = t[0], n = t[1] === "www." ? "http://" + t[0] : t[0];
			}
			return {
				type: "link",
				raw: t[0],
				text: e,
				href: n,
				tokens: [{
					type: "text",
					raw: e,
					text: e
				}]
			};
		}
	}
	inlineText(e) {
		let t = this.rules.inline.text.exec(e);
		if (t) {
			let e = this.lexer.state.inRawBlock;
			return {
				type: "text",
				raw: t[0],
				text: t[0],
				escaped: e
			};
		}
	}
}, Ga = class e {
	tokens;
	options;
	state;
	inlineQueue;
	tokenizer;
	constructor(e) {
		this.tokens = [], this.tokens.links = Object.create(null), this.options = e || Si, this.options.tokenizer = this.options.tokenizer || new Wa(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
			inLink: !1,
			inRawBlock: !1,
			top: !0
		};
		let t = {
			other: Di,
			block: ja.normal,
			inline: Ma.normal
		};
		this.options.pedantic ? (t.block = ja.pedantic, t.inline = Ma.pedantic) : this.options.gfm && (t.block = ja.gfm, this.options.breaks ? t.inline = Ma.breaks : t.inline = Ma.gfm), this.tokenizer.rules = t;
	}
	static get rules() {
		return {
			block: ja,
			inline: Ma
		};
	}
	static lex(t, n) {
		return new e(n).lex(t);
	}
	static lexInline(t, n) {
		return new e(n).inlineTokens(t);
	}
	lex(e) {
		e = e.replace(Di.carriageReturn, "\n"), this.blockTokens(e, this.tokens);
		for (let e = 0; e < this.inlineQueue.length; e++) {
			let t = this.inlineQueue[e];
			this.inlineTokens(t.src, t.tokens);
		}
		return this.inlineQueue = [], this.tokens;
	}
	blockTokens(e, t = [], n = !1) {
		this.tokenizer.lexer = this, this.options.pedantic && (e = e.replace(Di.tabCharGlobal, "    ").replace(Di.spaceLine, ""));
		let r = Infinity;
		for (; e;) {
			if (e.length < r) r = e.length;
			else {
				this.infiniteLoopError(e.charCodeAt(0));
				break;
			}
			let i;
			if (this.options.extensions?.block?.some((n) => (i = n.call({ lexer: this }, e, t)) ? (e = e.substring(i.raw.length), t.push(i), !0) : !1)) continue;
			if (i = this.tokenizer.space(e)) {
				e = e.substring(i.raw.length);
				let n = t.at(-1);
				i.raw.length === 1 && n !== void 0 ? n.raw += "\n" : t.push(i);
				continue;
			}
			if (i = this.tokenizer.code(e)) {
				e = e.substring(i.raw.length);
				let n = t.at(-1);
				n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + i.raw, n.text += "\n" + i.text, this.inlineQueue.at(-1).src = n.text) : t.push(i);
				continue;
			}
			if (i = this.tokenizer.fences(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.heading(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.hr(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.blockquote(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.list(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.html(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.def(e)) {
				e = e.substring(i.raw.length);
				let n = t.at(-1);
				n?.type === "paragraph" || n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + i.raw, n.text += "\n" + i.raw, this.inlineQueue.at(-1).src = n.text) : this.tokens.links[i.tag] || (this.tokens.links[i.tag] = {
					href: i.href,
					title: i.title
				}, t.push(i));
				continue;
			}
			if (i = this.tokenizer.table(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			if (i = this.tokenizer.lheading(e)) {
				e = e.substring(i.raw.length), t.push(i);
				continue;
			}
			let a = e;
			if (this.options.extensions?.startBlock) {
				let t = Infinity, n = e.slice(1), r;
				this.options.extensions.startBlock.forEach((e) => {
					r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
				}), t < Infinity && t >= 0 && (a = e.substring(0, t + 1));
			}
			if (this.state.top && (i = this.tokenizer.paragraph(a))) {
				let r = t.at(-1);
				n && r?.type === "paragraph" ? (r.raw += (r.raw.endsWith("\n") ? "" : "\n") + i.raw, r.text += "\n" + i.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = r.text) : t.push(i), n = a.length !== e.length, e = e.substring(i.raw.length);
				continue;
			}
			if (i = this.tokenizer.text(e)) {
				e = e.substring(i.raw.length);
				let n = t.at(-1);
				n?.type === "text" ? (n.raw += (n.raw.endsWith("\n") ? "" : "\n") + i.raw, n.text += "\n" + i.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = n.text) : t.push(i);
				continue;
			}
			if (e) {
				this.infiniteLoopError(e.charCodeAt(0));
				break;
			}
		}
		return this.state.top = !0, t;
	}
	inline(e, t = []) {
		return this.inlineQueue.push({
			src: e,
			tokens: t
		}), t;
	}
	inlineTokens(e, t = []) {
		this.tokenizer.lexer = this;
		let n = e, r = null;
		if (this.tokens.links) {
			let e = Object.keys(this.tokens.links);
			if (e.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) !== null;) e.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
		}
		for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) !== null;) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
		let i;
		for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) !== null;) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
		n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
		let a = !1, o = "", s = Infinity;
		for (; e;) {
			if (e.length < s) s = e.length;
			else {
				this.infiniteLoopError(e.charCodeAt(0));
				break;
			}
			a || (o = ""), a = !1;
			let r;
			if (this.options.extensions?.inline?.some((n) => (r = n.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
			if (r = this.tokenizer.escape(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.tag(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.link(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.reflink(e, this.tokens.links)) {
				e = e.substring(r.raw.length);
				let n = t.at(-1);
				r.type === "text" && n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
				continue;
			}
			if (r = this.tokenizer.emStrong(e, n, o)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.codespan(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.br(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.del(e, n, o)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (r = this.tokenizer.autolink(e)) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			if (!this.state.inLink && (r = this.tokenizer.url(e))) {
				e = e.substring(r.raw.length), t.push(r);
				continue;
			}
			let i = e;
			if (this.options.extensions?.startInline) {
				let t = Infinity, n = e.slice(1), r;
				this.options.extensions.startInline.forEach((e) => {
					r = e.call({ lexer: this }, n), typeof r == "number" && r >= 0 && (t = Math.min(t, r));
				}), t < Infinity && t >= 0 && (i = e.substring(0, t + 1));
			}
			if (r = this.tokenizer.inlineText(i)) {
				e = e.substring(r.raw.length), r.raw.slice(-1) !== "_" && (o = r.raw.slice(-1)), a = !0;
				let n = t.at(-1);
				n?.type === "text" ? (n.raw += r.raw, n.text += r.text) : t.push(r);
				continue;
			}
			if (e) {
				this.infiniteLoopError(e.charCodeAt(0));
				break;
			}
		}
		return t;
	}
	infiniteLoopError(e) {
		let t = "Infinite loop on byte: " + e;
		if (this.options.silent) console.error(t);
		else throw Error(t);
	}
}, Ka = class {
	options;
	parser;
	constructor(e) {
		this.options = e || Si;
	}
	space(e) {
		return "";
	}
	code({ text: e, lang: t, escaped: n }) {
		let r = (t || "").match(Di.notSpaceStart)?.[0], i = e.replace(Di.endingNewline, "") + "\n";
		return r ? "<pre><code class=\"language-" + Fa(r) + "\">" + (n ? i : Fa(i, !0)) + "</code></pre>\n" : "<pre><code>" + (n ? i : Fa(i, !0)) + "</code></pre>\n";
	}
	blockquote({ tokens: e }) {
		return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
	}
	html({ text: e }) {
		return e;
	}
	def(e) {
		return "";
	}
	heading({ tokens: e, depth: t }) {
		return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
	}
	hr(e) {
		return "<hr>\n";
	}
	list(e) {
		let t = e.ordered, n = e.start, r = "";
		for (let t = 0; t < e.items.length; t++) {
			let n = e.items[t];
			r += this.listitem(n);
		}
		let i = t ? "ol" : "ul", a = t && n !== 1 ? " start=\"" + n + "\"" : "";
		return "<" + i + a + ">\n" + r + "</" + i + ">\n";
	}
	listitem(e) {
		return `<li>${this.parser.parse(e.tokens)}</li>
`;
	}
	checkbox({ checked: e }) {
		return "<input " + (e ? "checked=\"\" " : "") + "disabled=\"\" type=\"checkbox\"> ";
	}
	paragraph({ tokens: e }) {
		return `<p>${this.parser.parseInline(e)}</p>
`;
	}
	table(e) {
		let t = "", n = "";
		for (let t = 0; t < e.header.length; t++) n += this.tablecell(e.header[t]);
		t += this.tablerow({ text: n });
		let r = "";
		for (let t = 0; t < e.rows.length; t++) {
			let i = e.rows[t];
			n = "";
			for (let e = 0; e < i.length; e++) n += this.tablecell(i[e]);
			r += this.tablerow({ text: n });
		}
		return r &&= `<tbody>${r}</tbody>`, "<table>\n<thead>\n" + t + "</thead>\n" + r + "</table>\n";
	}
	tablerow({ text: e }) {
		return `<tr>
${e}</tr>
`;
	}
	tablecell(e) {
		let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
		return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
	}
	strong({ tokens: e }) {
		return `<strong>${this.parser.parseInline(e)}</strong>`;
	}
	em({ tokens: e }) {
		return `<em>${this.parser.parseInline(e)}</em>`;
	}
	codespan({ text: e }) {
		return `<code>${Fa(e, !0)}</code>`;
	}
	br(e) {
		return "<br>";
	}
	del({ tokens: e }) {
		return `<del>${this.parser.parseInline(e)}</del>`;
	}
	link({ href: e, title: t, tokens: n }) {
		let r = this.parser.parseInline(n), i = Ia(e);
		if (i === null) return r;
		e = i;
		let a = "<a href=\"" + e + "\"";
		return t && (a += " title=\"" + Fa(t) + "\""), a += ">" + r + "</a>", a;
	}
	image({ href: e, title: t, text: n, tokens: r }) {
		r && (n = this.parser.parseInline(r, this.parser.textRenderer));
		let i = Ia(e);
		if (i === null) return Fa(n);
		e = i;
		let a = `<img src="${e}" alt="${Fa(n)}"`;
		return t && (a += ` title="${Fa(t)}"`), a += ">", a;
	}
	text(e) {
		return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : Fa(e.text);
	}
}, qa = class {
	strong({ text: e }) {
		return e;
	}
	em({ text: e }) {
		return e;
	}
	codespan({ text: e }) {
		return e;
	}
	del({ text: e }) {
		return e;
	}
	html({ text: e }) {
		return e;
	}
	text({ text: e }) {
		return e;
	}
	link({ text: e }) {
		return "" + e;
	}
	image({ text: e }) {
		return "" + e;
	}
	br() {
		return "";
	}
	checkbox({ raw: e }) {
		return e;
	}
}, Ja = class e {
	options;
	renderer;
	textRenderer;
	constructor(e) {
		this.options = e || Si, this.options.renderer = this.options.renderer || new Ka(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new qa();
	}
	static parse(t, n) {
		return new e(n).parse(t);
	}
	static parseInline(t, n) {
		return new e(n).parseInline(t);
	}
	parse(e) {
		this.renderer.parser = this;
		let t = "";
		for (let n = 0; n < e.length; n++) {
			let r = e[n];
			if (this.options.extensions?.renderers?.[r.type]) {
				let e = r, n = this.options.extensions.renderers[e.type].call({ parser: this }, e);
				if (n !== !1 || ![
					"space",
					"hr",
					"heading",
					"code",
					"table",
					"blockquote",
					"list",
					"html",
					"def",
					"paragraph",
					"text"
				].includes(e.type)) {
					t += n || "";
					continue;
				}
			}
			let i = r;
			switch (i.type) {
				case "space":
					t += this.renderer.space(i);
					break;
				case "hr":
					t += this.renderer.hr(i);
					break;
				case "heading":
					t += this.renderer.heading(i);
					break;
				case "code":
					t += this.renderer.code(i);
					break;
				case "table":
					t += this.renderer.table(i);
					break;
				case "blockquote":
					t += this.renderer.blockquote(i);
					break;
				case "list":
					t += this.renderer.list(i);
					break;
				case "checkbox":
					t += this.renderer.checkbox(i);
					break;
				case "html":
					t += this.renderer.html(i);
					break;
				case "def":
					t += this.renderer.def(i);
					break;
				case "paragraph":
					t += this.renderer.paragraph(i);
					break;
				case "text":
					t += this.renderer.text(i);
					break;
				default: {
					let e = "Token with \"" + i.type + "\" type was not found.";
					if (this.options.silent) return console.error(e), "";
					throw Error(e);
				}
			}
		}
		return t;
	}
	parseInline(e, t = this.renderer) {
		this.renderer.parser = this;
		let n = "";
		for (let r = 0; r < e.length; r++) {
			let i = e[r];
			if (this.options.extensions?.renderers?.[i.type]) {
				let e = this.options.extensions.renderers[i.type].call({ parser: this }, i);
				if (e !== !1 || ![
					"escape",
					"html",
					"link",
					"image",
					"strong",
					"em",
					"codespan",
					"br",
					"del",
					"text"
				].includes(i.type)) {
					n += e || "";
					continue;
				}
			}
			let a = i;
			switch (a.type) {
				case "escape":
					n += t.text(a);
					break;
				case "html":
					n += t.html(a);
					break;
				case "link":
					n += t.link(a);
					break;
				case "image":
					n += t.image(a);
					break;
				case "checkbox":
					n += t.checkbox(a);
					break;
				case "strong":
					n += t.strong(a);
					break;
				case "em":
					n += t.em(a);
					break;
				case "codespan":
					n += t.codespan(a);
					break;
				case "br":
					n += t.br(a);
					break;
				case "del":
					n += t.del(a);
					break;
				case "text":
					n += t.text(a);
					break;
				default: {
					let e = "Token with \"" + a.type + "\" type was not found.";
					if (this.options.silent) return console.error(e), "";
					throw Error(e);
				}
			}
		}
		return n;
	}
}, Ya = class {
	options;
	block;
	constructor(e) {
		this.options = e || Si;
	}
	static passThroughHooks = new Set([
		"preprocess",
		"postprocess",
		"processAllTokens",
		"emStrongMask"
	]);
	static passThroughHooksRespectAsync = new Set([
		"preprocess",
		"postprocess",
		"processAllTokens"
	]);
	preprocess(e) {
		return e;
	}
	postprocess(e) {
		return e;
	}
	processAllTokens(e) {
		return e;
	}
	emStrongMask(e) {
		return e;
	}
	provideLexer(e = this.block) {
		return e ? Ga.lex : Ga.lexInline;
	}
	provideParser(e = this.block) {
		return e ? Ja.parse : Ja.parseInline;
	}
}, Xa = new class {
	defaults = xi();
	options = this.setOptions;
	parse = this.parseMarkdown(!0);
	parseInline = this.parseMarkdown(!1);
	Parser = Ja;
	Renderer = Ka;
	TextRenderer = qa;
	Lexer = Ga;
	Tokenizer = Wa;
	Hooks = Ya;
	constructor(...e) {
		this.use(...e);
	}
	walkTokens(e, t) {
		let n = [];
		for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
			case "table": {
				let e = r;
				for (let r of e.header) n = n.concat(this.walkTokens(r.tokens, t));
				for (let r of e.rows) for (let e of r) n = n.concat(this.walkTokens(e.tokens, t));
				break;
			}
			case "list": {
				let e = r;
				n = n.concat(this.walkTokens(e.items, t));
				break;
			}
			default: {
				let e = r;
				this.defaults.extensions?.childTokens?.[e.type] ? this.defaults.extensions.childTokens[e.type].forEach((r) => {
					let i = e[r].flat(Infinity);
					n = n.concat(this.walkTokens(i, t));
				}) : e.tokens && (n = n.concat(this.walkTokens(e.tokens, t)));
			}
		}
		return n;
	}
	use(...e) {
		let t = this.defaults.extensions || {
			renderers: {},
			childTokens: {}
		};
		return e.forEach((e) => {
			let n = { ...e };
			if (n.async = this.defaults.async || n.async || !1, e.extensions && (e.extensions.forEach((e) => {
				if (!e.name) throw Error("extension name required");
				if ("renderer" in e) {
					let n = t.renderers[e.name];
					n ? t.renderers[e.name] = function(...t) {
						let r = e.renderer.apply(this, t);
						return r === !1 && (r = n.apply(this, t)), r;
					} : t.renderers[e.name] = e.renderer;
				}
				if ("tokenizer" in e) {
					if (!e.level || e.level !== "block" && e.level !== "inline") throw Error("extension level must be 'block' or 'inline'");
					let n = t[e.level];
					n ? n.unshift(e.tokenizer) : t[e.level] = [e.tokenizer], e.start && (e.level === "block" ? t.startBlock ? t.startBlock.push(e.start) : t.startBlock = [e.start] : e.level === "inline" && (t.startInline ? t.startInline.push(e.start) : t.startInline = [e.start]));
				}
				"childTokens" in e && e.childTokens && (t.childTokens[e.name] = e.childTokens);
			}), n.extensions = t), e.renderer) {
				let t = this.defaults.renderer || new Ka(this.defaults);
				for (let n in e.renderer) {
					if (!(n in t)) throw Error(`renderer '${n}' does not exist`);
					if (["options", "parser"].includes(n)) continue;
					let r = n, i = e.renderer[r], a = t[r];
					t[r] = (...e) => {
						let n = i.apply(t, e);
						return n === !1 && (n = a.apply(t, e)), n || "";
					};
				}
				n.renderer = t;
			}
			if (e.tokenizer) {
				let t = this.defaults.tokenizer || new Wa(this.defaults);
				for (let n in e.tokenizer) {
					if (!(n in t)) throw Error(`tokenizer '${n}' does not exist`);
					if ([
						"options",
						"rules",
						"lexer"
					].includes(n)) continue;
					let r = n, i = e.tokenizer[r], a = t[r];
					t[r] = (...e) => {
						let n = i.apply(t, e);
						return n === !1 && (n = a.apply(t, e)), n;
					};
				}
				n.tokenizer = t;
			}
			if (e.hooks) {
				let t = this.defaults.hooks || new Ya();
				for (let n in e.hooks) {
					if (!(n in t)) throw Error(`hook '${n}' does not exist`);
					if (["options", "block"].includes(n)) continue;
					let r = n, i = e.hooks[r], a = t[r];
					Ya.passThroughHooks.has(n) ? t[r] = (e) => {
						if (this.defaults.async && Ya.passThroughHooksRespectAsync.has(n)) return (async () => {
							let n = await i.call(t, e);
							return a.call(t, n);
						})();
						let r = i.call(t, e);
						return a.call(t, r);
					} : t[r] = (...e) => {
						if (this.defaults.async) return (async () => {
							let n = await i.apply(t, e);
							return n === !1 && (n = await a.apply(t, e)), n;
						})();
						let n = i.apply(t, e);
						return n === !1 && (n = a.apply(t, e)), n;
					};
				}
				n.hooks = t;
			}
			if (e.walkTokens) {
				let t = this.defaults.walkTokens, r = e.walkTokens;
				n.walkTokens = function(e) {
					let n = [];
					return n.push(r.call(this, e)), t && (n = n.concat(t.call(this, e))), n;
				};
			}
			this.defaults = {
				...this.defaults,
				...n
			};
		}), this;
	}
	setOptions(e) {
		return this.defaults = {
			...this.defaults,
			...e
		}, this;
	}
	lexer(e, t) {
		return Ga.lex(e, t ?? this.defaults);
	}
	parser(e, t) {
		return Ja.parse(e, t ?? this.defaults);
	}
	parseMarkdown(e) {
		return (t, n) => {
			let r = { ...n }, i = {
				...this.defaults,
				...r
			}, a = this.onError(!!i.silent, !!i.async);
			if (this.defaults.async === !0 && r.async === !1) return a(/* @__PURE__ */ Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
			if (typeof t > "u" || t === null) return a(/* @__PURE__ */ Error("marked(): input parameter is undefined or null"));
			if (typeof t != "string") return a(/* @__PURE__ */ Error("marked(): input parameter is of type " + Object.prototype.toString.call(t) + ", string expected"));
			if (i.hooks && (i.hooks.options = i, i.hooks.block = e), i.async) return (async () => {
				let n = i.hooks ? await i.hooks.preprocess(t) : t, r = await (i.hooks ? await i.hooks.provideLexer(e) : e ? Ga.lex : Ga.lexInline)(n, i), a = i.hooks ? await i.hooks.processAllTokens(r) : r;
				i.walkTokens && await Promise.all(this.walkTokens(a, i.walkTokens));
				let o = await (i.hooks ? await i.hooks.provideParser(e) : e ? Ja.parse : Ja.parseInline)(a, i);
				return i.hooks ? await i.hooks.postprocess(o) : o;
			})().catch(a);
			try {
				i.hooks && (t = i.hooks.preprocess(t));
				let n = (i.hooks ? i.hooks.provideLexer(e) : e ? Ga.lex : Ga.lexInline)(t, i);
				i.hooks && (n = i.hooks.processAllTokens(n)), i.walkTokens && this.walkTokens(n, i.walkTokens);
				let r = (i.hooks ? i.hooks.provideParser(e) : e ? Ja.parse : Ja.parseInline)(n, i);
				return i.hooks && (r = i.hooks.postprocess(r)), r;
			} catch (e) {
				return a(e);
			}
		};
	}
	onError(e, t) {
		return (n) => {
			if (n.message += "\nPlease report this to https://github.com/markedjs/marked.", e) {
				let e = "<p>An error occurred:</p><pre>" + Fa(n.message + "", !0) + "</pre>";
				return t ? Promise.resolve(e) : e;
			}
			if (t) return Promise.reject(n);
			throw n;
		};
	}
}();
function W(e, t) {
	return Xa.parse(e, t);
}
W.options = W.setOptions = function(e) {
	return Xa.setOptions(e), W.defaults = Xa.defaults, Ci(W.defaults), W;
}, W.getDefaults = xi, W.defaults = Si, W.use = function(...e) {
	return Xa.use(...e), W.defaults = Xa.defaults, Ci(W.defaults), W;
}, W.walkTokens = function(e, t) {
	return Xa.walkTokens(e, t);
}, W.parseInline = Xa.parseInline, W.Parser = Ja, W.parser = Ja.parse, W.Renderer = Ka, W.TextRenderer = qa, W.Lexer = Ga, W.lexer = Ga.lex, W.Tokenizer = Wa, W.Hooks = Ya, W.parse = W, W.options, W.setOptions, W.use, W.walkTokens, W.parseInline, Ja.parse, Ga.lex;
//#endregion
//#region src/components/BaseMarkdownInput/BaseMarkdownInput.vue?vue&type=script&setup=true&lang.ts
var Za = ["for"], Qa = ["title"], $a = { class: "markdown-input__editor" }, eo = {
	key: 0,
	class: "markdown-input__tabs",
	role: "tablist"
}, to = ["aria-selected", "aria-controls"], no = ["aria-selected", "aria-controls"], ro = ["aria-label"], io = [
	"title",
	"aria-label",
	"disabled",
	"onClick"
], ao = ["id"], oo = [
	"id",
	"value",
	"rows",
	"placeholder",
	"disabled",
	"readonly",
	"required",
	"aria-invalid",
	"aria-describedby"
], so = ["id"], co = ["innerHTML"], lo = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMarkdownInput",
	props: {
		modelValue: { default: "" },
		rows: { default: 6 },
		size: { default: "md" },
		placeholder: { default: "" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		readonly: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: {
				required: "required",
				write: "Write",
				preview: "Preview",
				bold: "Bold",
				italic: "Italic",
				heading: "Heading",
				link: "Link",
				bulletList: "Bullet list",
				numberedList: "Numbered list",
				quote: "Blockquote",
				code: "Inline code",
				emptyPreview: "Nothing to preview."
			} }
		}), { id: a } = Fn(n.id), o = P("write"), s = g(() => n.disabled || n.readonly ? "preview" : o.value), c = P(null), l = g(() => n.modelValue ? W(n.modelValue) : "");
		function u(e) {
			let t = e.target;
			r("update:modelValue", t.value);
		}
		function d(e, t = "", n = "") {
			let i = c.value;
			if (!i) return;
			let a = i.selectionStart, o = i.selectionEnd, s = i.value.slice(a, o) || n, l = `${e}${s}${t}`;
			r("update:modelValue", i.value.slice(0, a) + l + i.value.slice(o)), requestAnimationFrame(() => {
				i.focus();
				let n = a + e.length + s.length + t.length;
				i.setSelectionRange(n, n);
			});
		}
		let f = [
			{
				key: "bold",
				label: () => i("bold"),
				icon: kr,
				action: () => d("**", "**", "bold text")
			},
			{
				key: "italic",
				label: () => i("italic"),
				icon: jr,
				action: () => d("_", "_", "italic text")
			},
			{
				key: "heading",
				label: () => i("heading"),
				icon: Nr,
				action: () => d("## ", "", "Heading")
			},
			{
				key: "code",
				label: () => i("code"),
				icon: Fr,
				action: () => d("`", "`", "code")
			},
			{
				key: "link",
				label: () => i("link"),
				icon: _r,
				action: () => d("[", "](url)", "link text")
			},
			{
				key: "bulletList",
				label: () => i("bulletList"),
				icon: Lr,
				action: () => d("- ", "", "list item")
			},
			{
				key: "numberedList",
				label: () => i("numberedList"),
				icon: zr,
				action: () => d("1. ", "", "list item")
			},
			{
				key: "quote",
				label: () => i("quote"),
				icon: Vr,
				action: () => d("> ", "", "quoted text")
			}
		];
		return (t, n) => (N(), y("div", { class: j([
			"markdown-input",
			`markdown-input--${e.size}`,
			{
				"markdown-input--error": !!e.error,
				"markdown-input--disabled": e.disabled,
				"markdown-input--readonly": e.readonly
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(a),
				class: j(["markdown-input__label", { "markdown-input__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "markdown-input__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, Qa)) : v("", !0)], 10, Za)) : v("", !0),
			b("div", $a, [
				!e.disabled && !e.readonly ? (N(), y("div", eo, [b("button", {
					role: "tab",
					"aria-selected": s.value === "write",
					"aria-controls": `${R(a)}-write-panel`,
					class: j(["markdown-input__tab", { "markdown-input__tab--active": s.value === "write" }]),
					type: "button",
					onClick: n[0] ||= (e) => o.value = "write"
				}, [w(H, {
					variant: "label",
					as: "span",
					color: "inherit"
				}, {
					default: z(() => [C(L(R(i)("write")), 1)]),
					_: 1
				})], 10, to), b("button", {
					role: "tab",
					"aria-selected": s.value === "preview",
					"aria-controls": `${R(a)}-preview-panel`,
					class: j(["markdown-input__tab", { "markdown-input__tab--active": s.value === "preview" }]),
					type: "button",
					onClick: n[1] ||= (e) => o.value = "preview"
				}, [w(H, {
					variant: "label",
					as: "span",
					color: "inherit"
				}, {
					default: z(() => [C(L(R(i)("preview")), 1)]),
					_: 1
				})], 10, no)])) : v("", !0),
				s.value === "write" ? (N(), y("div", {
					key: 1,
					class: "markdown-input__toolbar",
					role: "toolbar",
					"aria-label": e.label ?? "Markdown toolbar"
				}, [(N(), y(p, null, F(f, (t) => b("button", {
					key: t.key,
					type: "button",
					title: t.label(),
					"aria-label": t.label(),
					disabled: e.disabled,
					class: "markdown-input__tool",
					onClick: (e) => t.action()
				}, [(N(), _(le(t.icon), { size: "sm" }))], 8, io)), 64))], 8, ro)) : v("", !0),
				he(b("div", {
					id: `${R(a)}-write-panel`,
					role: "tabpanel",
					class: "markdown-input__panel"
				}, [b("textarea", {
					id: R(a),
					ref_key: "textareaRef",
					ref: c,
					value: e.modelValue,
					rows: e.rows,
					placeholder: e.placeholder,
					disabled: e.disabled,
					readonly: e.readonly,
					required: e.required,
					"aria-invalid": !!e.error || void 0,
					"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
					class: "markdown-input__field",
					onInput: u,
					onChange: n[2] ||= (e) => r("change", e),
					onBlur: n[3] ||= (e) => r("blur", e),
					onFocus: n[4] ||= (e) => r("focus", e)
				}, null, 40, oo)], 8, ao), [[fe, s.value === "write"]]),
				he(b("div", {
					id: `${R(a)}-preview-panel`,
					role: "tabpanel",
					class: "markdown-input__panel markdown-input__preview"
				}, [l.value ? (N(), y("article", {
					key: 0,
					class: "markdown-input__preview-content",
					innerHTML: l.value
				}, null, 8, co)) : (N(), _(H, {
					key: 1,
					variant: "body-sm",
					as: "p",
					color: "tertiary",
					class: "markdown-input__preview-empty"
				}, {
					default: z(() => [C(L(R(i)("emptyPreview")), 1)]),
					_: 1
				}))], 8, so), [[fe, s.value === "preview"]])
			]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "markdown-input__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "markdown-input__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-0a47cf26"]]), uo = /* @__PURE__ */ T({
	__name: "BaseFormBuilderField",
	props: {
		field: {},
		value: {},
		error: {},
		disabled: { type: Boolean }
	},
	emits: ["update"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i(e) {
			r("update", n.field.key, e);
		}
		return (t, n) => !e.field.type || [
			"text",
			"email",
			"password",
			"number",
			"url",
			"tel"
		].includes(e.field.type) ? (N(), _(Bn, {
			key: 0,
			"model-value": e.value ?? "",
			type: e.field.type ?? "text",
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			placeholder: e.field.placeholder,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"type",
			"label",
			"hint",
			"error",
			"placeholder",
			"required",
			"disabled"
		])) : e.field.type === "textarea" ? (N(), _(ni, {
			key: 1,
			"model-value": e.value ?? "",
			rows: e.field.rows,
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			placeholder: e.field.placeholder,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"rows",
			"label",
			"hint",
			"error",
			"placeholder",
			"required",
			"disabled"
		])) : e.field.type === "markdown" ? (N(), _(lo, {
			key: 2,
			"model-value": e.value ?? "",
			rows: e.field.rows,
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			placeholder: e.field.placeholder,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"rows",
			"label",
			"hint",
			"error",
			"placeholder",
			"required",
			"disabled"
		])) : e.field.type === "checkbox" ? (N(), _(ui, {
			key: 3,
			"model-value": e.value ?? !1,
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"label",
			"hint",
			"error",
			"required",
			"disabled"
		])) : e.field.type === "switch" ? (N(), _(bi, {
			key: 4,
			"model-value": e.value ?? !1,
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"label",
			"hint",
			"error",
			"disabled"
		])) : e.field.type === "select" ? (N(), _(Qr, {
			key: 5,
			"model-value": e.value ?? "",
			options: e.field.options ?? [],
			label: e.field.label,
			hint: e.field.hint,
			error: e.error,
			placeholder: e.field.placeholder,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"options",
			"label",
			"hint",
			"error",
			"placeholder",
			"required",
			"disabled"
		])) : e.field.type === "radio" ? (N(), _(hi, {
			key: 6,
			"model-value": e.value ?? "",
			options: e.field.options ?? [],
			legend: e.field.label,
			hint: e.field.hint,
			error: e.error,
			required: e.field.required,
			disabled: e.disabled || e.field.disabled,
			class: "form-builder__field",
			"onUpdate:modelValue": i
		}, null, 8, [
			"model-value",
			"options",
			"legend",
			"hint",
			"error",
			"required",
			"disabled"
		])) : v("", !0);
	}
}), fo = { class: "form-builder__actions" }, po = {
	type: "reset",
	class: "form-builder__btn form-builder__btn--reset"
}, mo = {
	type: "submit",
	class: "form-builder__btn form-builder__btn--submit"
}, ho = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFormBuilderActions",
	props: {
		resetLabel: {},
		submitLabel: {}
	},
	setup(e) {
		return (t, n) => (N(), y("div", fo, [I(t.$slots, "default", {}, () => [b("button", po, L(e.resetLabel), 1), b("button", mo, L(e.submitLabel), 1)], !0)]));
	}
}), [["__scopeId", "data-v-3cf25ebe"]]);
//#endregion
//#region src/components/BaseFormBuilder/useFormSchema.ts
function go(e, t = {}) {
	let n = {};
	for (let t of e.fields) t.type === "checkbox" || t.type === "switch" ? n[t.key] = !1 : t.type === "number" ? n[t.key] = void 0 : n[t.key] = "";
	let r = oe({
		...n,
		...t
	}), i = oe({}), a = P(!1);
	function o() {
		for (let e of Object.keys(i)) delete i[e];
		let t = !0;
		if (e.zodSchema) {
			let n = e.zodSchema.safeParse(r);
			if (!n.success) {
				t = !1;
				for (let e of n.error.issues) {
					let t = e.path[0];
					t && !i[t] && (i[t] = e.message);
				}
			}
		} else for (let n of e.fields) {
			if (!n.schema) continue;
			let e = n.schema.safeParse(r[n.key]);
			e.success || (t = !1, i[n.key] = e.error.issues[0]?.message ?? "Invalid value");
		}
		return a.value = t, t;
	}
	function s() {
		let e = {
			...n,
			...t
		};
		for (let e of Object.keys(r)) delete r[e];
		Object.assign(r, e);
		for (let e of Object.keys(i)) delete i[e];
		a.value = !1;
	}
	return {
		values: r,
		errors: se(i),
		isValid: a,
		validate: o,
		reset: s
	};
}
//#endregion
//#region src/components/BaseFormBuilder/BaseFormBuilder.vue?vue&type=script&setup=true&lang.ts
var _o = { class: "form-builder__fields" }, vo = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFormBuilder",
	props: {
		schema: {},
		modelValue: { default: () => ({}) },
		disabled: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["update:modelValue", "submit"],
	setup(e, { expose: t, emit: n }) {
		let r = e, i = n, { t: a } = _e({
			inheritLocale: !0,
			messages: { en: {
				submit: "Submit",
				reset: "Reset"
			} }
		}), { values: o, errors: s, isValid: c, validate: l, reset: u } = go(r.schema, r.modelValue), d = g(() => r.schema.fields);
		function f(e, t) {
			o[e] = t, i("update:modelValue", { ...o });
		}
		function m() {
			let e = l();
			i("submit", { ...o }, e);
		}
		function h() {
			u(), i("update:modelValue", { ...o });
		}
		return t({
			values: o,
			errors: s,
			isValid: c,
			validate: l,
			reset: u
		}), (t, n) => (N(), y("form", {
			class: "form-builder",
			novalidate: "",
			onSubmit: B(m, ["prevent"]),
			onReset: B(h, ["prevent"])
		}, [b("div", _o, [(N(!0), y(p, null, F(d.value, (t) => (N(), _(uo, {
			key: t.key,
			field: t,
			value: R(o)[t.key],
			error: R(s)[t.key],
			disabled: e.disabled,
			onUpdate: f
		}, null, 8, [
			"field",
			"value",
			"error",
			"disabled"
		]))), 128))]), w(ho, {
			"reset-label": R(a)("reset"),
			"submit-label": R(a)("submit")
		}, x({ _: 2 }, [t.$slots.actions ? {
			name: "default",
			fn: z(() => [I(t.$slots, "actions", {}, void 0, !0)]),
			key: "0"
		} : void 0]), 1032, ["reset-label", "submit-label"])], 32));
	}
}), [["__scopeId", "data-v-e54c486e"]]), yo = ["aria-label"], bo = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTag",
	props: {
		label: {},
		size: { default: "md" },
		variant: { default: "neutral" },
		disabled: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["remove"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("span", { class: j([
			"base-tag",
			`base-tag--${e.size}`,
			`base-tag--${e.variant}`,
			{ "base-tag--disabled": e.disabled }
		]) }, [w(H, {
			variant: "caption",
			weight: "medium",
			as: "span",
			color: "inherit",
			class: "base-tag__label"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		}), e.disabled ? v("", !0) : (N(), y("button", {
			key: 0,
			type: "button",
			class: "base-tag__remove",
			"aria-label": `Remove ${e.label}`,
			onClick: r[0] ||= B((e) => n("remove"), ["stop"])
		}, [w(R(Zn), { size: "2xs" })], 8, yo))], 2));
	}
}), [["__scopeId", "data-v-035fbb11"]]), xo = ["for"], So = ["title"], Co = ["aria-expanded", "aria-owns"], wo = { class: "base-multiselect__control" }, To = { class: "base-multiselect__tags" }, Eo = [
	"id",
	"placeholder",
	"disabled",
	"required",
	"aria-invalid",
	"aria-describedby"
], Do = {
	class: "base-multiselect__chevron",
	"aria-hidden": "true"
}, Oo = ["aria-disabled", "onMousedown"], ko = {
	key: 0,
	class: "base-multiselect__empty",
	role: "option",
	"aria-selected": "false",
	"aria-disabled": "true"
}, Ao = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMultiselect",
	props: {
		modelValue: { default: () => [] },
		options: { default: () => [] },
		size: { default: "md" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		placeholder: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: {
				required: "required",
				placeholder: "Select options…"
			} }
		}), { id: a } = Fn(n.id), o = P(!1), s = P(null), c = P(""), l = g(() => n.options.filter((e) => n.modelValue.includes(e.value))), u = g(() => n.options.filter((e) => {
			let t = !n.modelValue.includes(e.value), r = !c.value || e.label.toLowerCase().includes(c.value.toLowerCase());
			return t && r;
		}));
		function d() {
			n.disabled || (o.value = !0, s.value?.focus());
		}
		function f() {
			o.value = !1, c.value = "";
		}
		function m(e) {
			if (e.disabled) return;
			let t = [...n.modelValue, e.value];
			r("update:modelValue", t), r("change", t), c.value = "", s.value?.focus();
		}
		function h(e) {
			let t = n.modelValue.filter((t) => t !== e);
			r("update:modelValue", t), r("change", t);
		}
		function x(e) {
			if (e.key === "Escape") f();
			else if (e.key === "Backspace" && !c.value && l.value.length > 0) {
				let e = l.value[l.value.length - 1];
				h(e.value);
			}
		}
		function S(e) {
			let t = e.relatedTarget, n = e.currentTarget?.closest(".base-multiselect__wrapper");
			n && t && n.contains(t) || (f(), r("blur", e));
		}
		function T(e) {
			o.value = !0, r("focus", e);
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-multiselect",
			`base-multiselect--${e.size}`,
			{
				"base-multiselect--error": !!e.error,
				"base-multiselect--disabled": e.disabled,
				"base-multiselect--open": o.value
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(a),
				class: j(["base-multiselect__label", { "base-multiselect__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-multiselect__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, So)) : v("", !0)], 10, xo)) : v("", !0),
			w(Ur, {
				open: o.value,
				"onUpdate:open": n[1] ||= (e) => {
					e || f();
				},
				onClose: f
			}, {
				trigger: z(() => [b("div", {
					class: "base-multiselect__wrapper",
					role: "combobox",
					"aria-expanded": o.value,
					"aria-haspopup": "listbox",
					"aria-owns": `${R(a)}-listbox`,
					onClick: d,
					onBlurCapture: S
				}, [b("div", wo, [b("div", To, [(N(!0), y(p, null, F(l.value, (t) => (N(), _(bo, {
					key: t.value,
					label: t.label,
					size: e.size === "lg" ? "md" : "sm",
					variant: "primary",
					disabled: e.disabled,
					onRemove: (e) => h(t.value)
				}, null, 8, [
					"label",
					"size",
					"disabled",
					"onRemove"
				]))), 128)), he(b("input", {
					id: R(a),
					ref_key: "inputRef",
					ref: s,
					"onUpdate:modelValue": n[0] ||= (e) => c.value = e,
					type: "text",
					class: "base-multiselect__input",
					placeholder: l.value.length === 0 ? e.placeholder ?? R(i)("placeholder") : void 0,
					disabled: e.disabled,
					required: e.required && e.modelValue.length === 0,
					"aria-invalid": !!e.error || void 0,
					"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
					"aria-autocomplete": "list",
					autocomplete: "off",
					onFocus: T,
					onKeydown: x
				}, null, 40, Eo), [[de, c.value]])]), b("span", Do, [w(R(qn), {
					size: "sm",
					direction: o.value ? "up" : "down"
				}, null, 8, ["direction"])])])], 40, Co)]),
				default: z(() => [(N(!0), y(p, null, F(u.value, (e) => (N(), y("li", {
					key: e.value,
					class: j(["base-multiselect__option", { "base-multiselect__option--disabled": e.disabled }]),
					role: "option",
					"aria-selected": !1,
					"aria-disabled": e.disabled || void 0,
					onMousedown: B((t) => m(e), ["prevent"])
				}, L(e.label), 43, Oo))), 128)), u.value.length === 0 ? (N(), y("li", ko, L(c.value ? `No results for "${c.value}"` : "No options available"), 1)) : v("", !0)]),
				_: 1
			}, 8, ["open"]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-multiselect__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-multiselect__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-4ae6fff2"]]), jo = ["open"], Mo = { class: "base-collapse__summary" }, No = { class: "base-collapse__content" }, Po = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseCollapse",
	props: {
		summary: { default: "Details" },
		open: {
			type: Boolean,
			default: !1
		},
		disabled: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["toggle"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(n.open);
		function a(e) {
			let t = e.target;
			i.value = t.open, r("toggle", t.open);
		}
		return (t, n) => (N(), y("details", {
			open: e.open,
			class: j(["base-collapse", { "base-collapse--disabled": e.disabled }]),
			onToggle: a
		}, [b("summary", Mo, [I(t.$slots, "summary", {}, () => [C(L(e.summary), 1)], !0), w(R(qn), {
			class: "base-collapse__chevron",
			size: "sm",
			direction: i.value ? "up" : "down"
		}, null, 8, ["direction"])]), b("div", No, [I(t.$slots, "default", {}, void 0, !0)])], 42, jo));
	}
}), [["__scopeId", "data-v-e1de1d9f"]]), Fo = { class: "base-accordion" }, Io = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseAccordion",
	props: { exclusive: {
		type: Boolean,
		default: !0
	} },
	emits: ["change"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(/* @__PURE__ */ new Set());
		function a(e) {
			if (n.exclusive) i.value.has(e) ? i.value = /* @__PURE__ */ new Set() : i.value = new Set([e]);
			else {
				let t = new Set(i.value);
				t.has(e) ? t.delete(e) : t.add(e), i.value = t;
			}
			r("change", [...i.value]);
		}
		return ae("accordion", {
			openIds: i,
			toggle: a
		}), (e, t) => (N(), y("div", Fo, [I(e.$slots, "default", {}, void 0, !0)]));
	}
}), [["__scopeId", "data-v-0b7a1b41"]]), Lo = ["open", "aria-disabled"], Ro = { class: "base-accordion__summary" }, zo = {
	key: 0,
	class: "base-accordion__content"
}, Bo = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseAccordionItem",
	props: {
		id: {},
		disabled: { type: Boolean }
	},
	setup(e) {
		let t = e, n = k("accordion");
		function r() {
			t.disabled || n?.toggle(t.id);
		}
		function i() {
			return n?.openIds.value.has(t.id) ?? !1;
		}
		return (t, n) => (N(), y("details", {
			open: i(),
			class: j(["base-accordion__item", { "base-accordion__item--disabled": e.disabled }]),
			"aria-disabled": e.disabled || void 0,
			onToggle: n[0] ||= B(() => {}, ["prevent"]),
			onClick: B(r, ["prevent"])
		}, [b("summary", Ro, [w(H, {
			variant: "body-md",
			weight: "medium",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [I(t.$slots, "summary", {}, void 0, !0)]),
			_: 3
		}), w(R(qn), {
			class: "base-accordion__chevron",
			direction: i() ? "up" : "down",
			size: 16
		}, null, 8, ["direction"])]), i() ? (N(), y("div", zo, [I(t.$slots, "default", {}, void 0, !0)])) : v("", !0)], 42, Lo));
	}
}), [["__scopeId", "data-v-1de70dc3"]]), Vo = { class: "base-dialog__header" }, Ho = ["aria-label"], Uo = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDialogHeader",
	props: {
		title: {},
		closeLabel: {}
	},
	emits: ["close"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("header", Vo, [I(t.$slots, "default", {}, () => [e.title ? (N(), _(H, {
			key: 0,
			variant: "h5",
			as: "h2",
			color: "primary",
			class: "base-dialog__title"
		}, {
			default: z(() => [C(L(e.title), 1)]),
			_: 1
		})) : v("", !0)], !0), b("button", {
			type: "button",
			class: "base-dialog__close",
			"aria-label": e.closeLabel,
			onClick: r[0] ||= (e) => n("close")
		}, [w(R(Zn), { size: "md" })], 8, Ho)]));
	}
}), [["__scopeId", "data-v-40f33958"]]), Wo = {}, Go = { class: "base-dialog__body" };
function Ko(e, t) {
	return N(), y("div", Go, [I(e.$slots, "default", {}, void 0, !0)]);
}
var qo = /* @__PURE__ */ V(Wo, [["render", Ko], ["__scopeId", "data-v-6d7ed34e"]]), Jo = {}, Yo = { class: "base-dialog__footer" };
function Xo(e, t) {
	return N(), y("footer", Yo, [I(e.$slots, "default", {}, void 0, !0)]);
}
var Zo = /* @__PURE__ */ V(Jo, [["render", Xo], ["__scopeId", "data-v-1768efd7"]]), Qo = typeof document < "u", $o = () => {}, es = Array.isArray;
function ts(e) {
	let t = Array.from(arguments).slice(1);
	console.warn.apply(console, ["[Vue Router warn]: " + e].concat(t));
}
function ns(e, t) {
	return (e.aliasOf || e) === (t.aliasOf || t);
}
function rs(e, t) {
	if (Object.keys(e).length !== Object.keys(t).length) return !1;
	for (var n in e) if (!is(e[n], t[n])) return !1;
	return !0;
}
function is(e, t) {
	return es(e) ? as(e, t) : es(t) ? as(t, e) : e?.valueOf() === t?.valueOf();
}
function as(e, t) {
	return es(t) ? e.length === t.length && e.every((e, n) => e === t[n]) : e.length === 1 && e[0] === t;
}
function os(e) {
	return typeof e == "string" || e && typeof e == "object";
}
var ss = /* @__PURE__ */ function(e) {
	return e[e.MATCHER_NOT_FOUND = 1] = "MATCHER_NOT_FOUND", e[e.NAVIGATION_GUARD_REDIRECT = 2] = "NAVIGATION_GUARD_REDIRECT", e[e.NAVIGATION_ABORTED = 4] = "NAVIGATION_ABORTED", e[e.NAVIGATION_CANCELLED = 8] = "NAVIGATION_CANCELLED", e[e.NAVIGATION_DUPLICATED = 16] = "NAVIGATION_DUPLICATED", e;
}({});
Symbol(process.env.NODE_ENV === "production" ? "" : "navigation failure"), ss.MATCHER_NOT_FOUND, ss.NAVIGATION_GUARD_REDIRECT, ss.NAVIGATION_ABORTED, ss.NAVIGATION_CANCELLED, ss.NAVIGATION_DUPLICATED, Symbol(process.env.NODE_ENV === "production" ? "" : "router view location matched"), Symbol(process.env.NODE_ENV === "production" ? "" : "router view depth");
var cs = Symbol(process.env.NODE_ENV === "production" ? "" : "router"), ls = Symbol(process.env.NODE_ENV === "production" ? "" : "route location");
Symbol(process.env.NODE_ENV === "production" ? "" : "router view location"), (/* @__PURE__ */ function(e) {
	return e[e.Static = 0] = "Static", e[e.Param = 1] = "Param", e[e.Group = 2] = "Group", e;
}({})).Static;
function us(e) {
	let t = k(cs), n = k(ls), r = !1, i = null, a = g(() => {
		let n = R(e.to);
		return process.env.NODE_ENV !== "production" && (!r || n !== i) && (os(n) || (r ? ts("Invalid value for prop \"to\" in useLink()\n- to:", n, "\n- previous to:", i, "\n- props:", e) : ts("Invalid value for prop \"to\" in useLink()\n- to:", n, "\n- props:", e)), i = n, r = !0), t.resolve(n);
	}), o = g(() => {
		let { matched: e } = a.value, { length: t } = e, r = e[t - 1], i = n.matched;
		if (!r || !i.length) return -1;
		let o = i.findIndex(ns.bind(null, r));
		if (o > -1) return o;
		let s = hs(e[t - 2]);
		return t > 1 && hs(r) === s && i[i.length - 1].path !== s ? i.findIndex(ns.bind(null, e[t - 2])) : o;
	}), s = g(() => o.value > -1 && ms(n.params, a.value.params)), c = g(() => o.value > -1 && o.value === n.matched.length - 1 && rs(n.params, a.value.params));
	function l(n = {}) {
		if (ps(n)) {
			let n = t[R(e.replace) ? "replace" : "push"](R(e.to)).catch($o);
			return e.viewTransition && typeof document < "u" && "startViewTransition" in document && document.startViewTransition(() => n), n;
		}
		return Promise.resolve();
	}
	if (process.env.NODE_ENV !== "production" && Qo) {
		let t = E();
		if (t) {
			let n = {
				route: a.value,
				isActive: s.value,
				isExactActive: c.value,
				error: null
			};
			t.__vrl_devtools = t.__vrl_devtools || [], t.__vrl_devtools.push(n), me(() => {
				n.route = a.value, n.isActive = s.value, n.isExactActive = c.value, n.error = os(R(e.to)) ? null : "Invalid \"to\" value";
			}, { flush: "post" });
		}
	}
	return {
		route: a,
		href: g(() => a.value.href),
		isActive: s,
		isExactActive: c,
		navigate: l
	};
}
function ds(e) {
	return e.length === 1 ? e[0] : e;
}
var fs = /* @__PURE__ */ T({
	name: "RouterLink",
	compatConfig: { MODE: 3 },
	props: {
		to: {
			type: [String, Object],
			required: !0
		},
		replace: Boolean,
		activeClass: String,
		exactActiveClass: String,
		custom: Boolean,
		ariaCurrentValue: {
			type: String,
			default: "page"
		},
		viewTransition: Boolean
	},
	useLink: us,
	setup(e, { slots: t }) {
		let n = oe(us(e)), { options: r } = k(cs), i = g(() => ({
			[gs(e.activeClass, r.linkActiveClass, "router-link-active")]: n.isActive,
			[gs(e.exactActiveClass, r.linkExactActiveClass, "router-link-exact-active")]: n.isExactActive
		}));
		return () => {
			let r = t.default && ds(t.default(n));
			return e.custom ? r : O("a", {
				"aria-current": n.isExactActive ? e.ariaCurrentValue : null,
				href: n.href,
				onClick: n.navigate,
				class: i.value
			}, r);
		};
	}
});
function ps(e) {
	if (!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) && !e.defaultPrevented && !(e.button !== void 0 && e.button !== 0)) {
		if (e.currentTarget && e.currentTarget.getAttribute) {
			let t = e.currentTarget.getAttribute("target");
			if (/\b_blank\b/i.test(t)) return;
		}
		return e.preventDefault && e.preventDefault(), !0;
	}
}
function ms(e, t) {
	for (let n in t) {
		let r = t[n], i = e[n];
		if (typeof r == "string") {
			if (r !== i) return !1;
		} else if (!es(i) || i.length !== r.length || r.some((e, t) => e.valueOf() !== i[t].valueOf())) return !1;
	}
	return !0;
}
function hs(e) {
	return e ? e.aliasOf ? e.aliasOf.path : e.path : "";
}
var gs = (e, t, n) => e ?? t ?? n;
function _s() {
	return k(cs);
}
//#endregion
//#region src/composables/useRouterClose.ts
function vs(e) {
	let t;
	try {
		t = _s();
	} catch {}
	t && pe(() => t.currentRoute.value.fullPath, (t, n) => {
		n !== void 0 && e();
	});
}
//#endregion
//#region src/components/BaseDialog/BaseDialog.vue
var ys = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDialog",
	props: {
		open: {
			type: Boolean,
			default: !1
		},
		title: { default: void 0 },
		closeOnBackdrop: {
			type: Boolean,
			default: !0
		},
		closeOnRouteChange: {
			type: Boolean,
			default: !0
		}
	},
	emits: ["update:open", "close"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { close: "Close" } }
		}), a = P(null);
		pe(() => n.open, (e) => {
			a.value && (e ? a.value.showModal() : a.value.close());
		}, {
			immediate: !0,
			flush: "post"
		});
		function o() {
			r("update:open", !1), r("close");
		}
		function s(e) {
			if (!n.closeOnBackdrop) return;
			let t = a.value?.getBoundingClientRect();
			if (!t) return;
			let { clientX: r, clientY: i } = e;
			(r < t.left || r > t.right || i < t.top || i > t.bottom) && o();
		}
		return vs(() => {
			n.closeOnRouteChange && o();
		}), (t, n) => (N(), y("dialog", {
			ref_key: "dialogRef",
			ref: a,
			class: "base-dialog",
			onClose: o,
			onClick: s
		}, [b("div", {
			class: "base-dialog__panel",
			onClick: n[0] ||= B(() => {}, ["stop"])
		}, [
			e.title || t.$slots.header ? (N(), _(Uo, {
				key: 0,
				title: e.title,
				"close-label": R(i)("close"),
				onClose: o
			}, x({ _: 2 }, [t.$slots.header ? {
				name: "default",
				fn: z(() => [I(t.$slots, "header", {}, void 0, !0)]),
				key: "0"
			} : void 0]), 1032, ["title", "close-label"])) : v("", !0),
			w(qo, null, {
				default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
				_: 3
			}),
			t.$slots.footer ? (N(), _(Zo, { key: 1 }, {
				default: z(() => [I(t.$slots, "footer", {}, void 0, !0)]),
				_: 3
			})) : v("", !0)
		])], 544));
	}
}), [["__scopeId", "data-v-baa5ad31"]]), bs = {
	class: "base-breadcrumb",
	"aria-label": "Breadcrumb"
}, xs = { class: "base-breadcrumb__list" }, Ss = {
	key: 0,
	class: "base-breadcrumb__separator",
	"aria-hidden": "true"
}, Cs = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseBreadcrumb",
	props: {
		items: {},
		separator: { default: "/" }
	},
	setup(e) {
		return (t, n) => (N(), y("nav", bs, [b("ol", xs, [(N(!0), y(p, null, F(e.items, (t, n) => (N(), y("li", {
			key: n,
			class: "base-breadcrumb__item"
		}, [n > 0 ? (N(), y("span", Ss, L(e.separator), 1)) : v("", !0), t.to && n < e.items.length - 1 ? (N(), _(R(fs), {
			key: 1,
			to: t.to,
			class: "base-breadcrumb__link"
		}, {
			default: z(() => [C(L(t.label), 1)]),
			_: 2
		}, 1032, ["to"])) : t.href && n < e.items.length - 1 ? (N(), _(H, {
			key: 2,
			variant: "body-sm",
			as: "a",
			color: "secondary",
			href: t.href,
			class: "base-breadcrumb__link"
		}, {
			default: z(() => [C(L(t.label), 1)]),
			_: 2
		}, 1032, ["href"])) : (N(), _(H, {
			key: 3,
			variant: "body-sm",
			weight: "medium",
			as: "span",
			color: "secondary",
			class: "base-breadcrumb__current",
			"aria-current": n === e.items.length - 1 ? "page" : void 0
		}, {
			default: z(() => [C(L(t.label), 1)]),
			_: 2
		}, 1032, ["aria-current"]))]))), 128))])]));
	}
}), [["__scopeId", "data-v-c927da78"]]), ws = { class: "base-sidebar__header" }, Ts = ["aria-label"], Es = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSidebarHeader",
	props: {
		title: {},
		closeLabel: {}
	},
	emits: ["close"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("header", ws, [I(t.$slots, "default", {}, () => [e.title ? (N(), _(H, {
			key: 0,
			variant: "h5",
			as: "h2",
			color: "primary",
			class: "base-sidebar__title"
		}, {
			default: z(() => [C(L(e.title), 1)]),
			_: 1
		})) : v("", !0)], !0), b("button", {
			type: "button",
			class: "base-sidebar__close",
			"aria-label": e.closeLabel,
			onClick: r[0] ||= (e) => n("close")
		}, [w(R(Zn), { size: "md" })], 8, Ts)]));
	}
}), [["__scopeId", "data-v-9a8d1298"]]), Ds = {}, Os = { class: "base-sidebar__body" };
function ks(e, t) {
	return N(), y("div", Os, [I(e.$slots, "default", {}, void 0, !0)]);
}
var As = /* @__PURE__ */ V(Ds, [["render", ks], ["__scopeId", "data-v-660b15bd"]]), js = {}, Ms = { class: "base-sidebar__footer" };
function Ns(e, t) {
	return N(), y("footer", Ms, [I(e.$slots, "default", {}, void 0, !0)]);
}
var Ps = /* @__PURE__ */ V(js, [["render", Ns], ["__scopeId", "data-v-e02c05ef"]]), Fs = ["aria-label"], Is = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSidebar",
	props: {
		open: {
			type: Boolean,
			default: !1
		},
		side: { default: "left" },
		size: { default: "md" },
		title: { default: void 0 },
		closeOnBackdrop: {
			type: Boolean,
			default: !0
		},
		closeOnRouteChange: {
			type: Boolean,
			default: !0
		}
	},
	emits: ["update:open", "close"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { close: "Close sidebar" } }
		});
		function a() {
			r("update:open", !1), r("close");
		}
		return vs(() => {
			n.closeOnRouteChange && a();
		}), (t, n) => (N(), _(m, { to: "body" }, [w(h, { name: "base-sidebar-fade" }, {
			default: z(() => [e.open ? (N(), y("div", {
				key: 0,
				class: "base-sidebar-backdrop",
				"aria-hidden": "true",
				onClick: n[0] ||= (t) => e.closeOnBackdrop && a()
			})) : v("", !0)]),
			_: 1
		}), w(h, { name: `base-sidebar-slide-${e.side}` }, {
			default: z(() => [e.open ? (N(), y("aside", {
				key: 0,
				class: j([
					"base-sidebar",
					`base-sidebar--${e.side}`,
					`base-sidebar--${e.size}`
				]),
				"aria-label": e.title
			}, [
				e.title || t.$slots.header ? (N(), _(Es, {
					key: 0,
					title: e.title,
					"close-label": R(i)("close"),
					onClose: a
				}, x({ _: 2 }, [t.$slots.header ? {
					name: "default",
					fn: z(() => [I(t.$slots, "header", {}, void 0, !0)]),
					key: "0"
				} : void 0]), 1032, ["title", "close-label"])) : v("", !0),
				w(As, null, {
					default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
					_: 3
				}),
				t.$slots.footer ? (N(), _(Ps, { key: 1 }, {
					default: z(() => [I(t.$slots, "footer", {}, void 0, !0)]),
					_: 3
				})) : v("", !0)
			], 10, Fs)) : v("", !0)]),
			_: 3
		}, 8, ["name"])]));
	}
}), [["__scopeId", "data-v-29f083b3"]]), Ls = ["for"], Rs = ["title"], zs = { class: "base-file-input__drop-text" }, Bs = ["for"], Vs = {
	key: 0,
	class: "base-file-input__file-name"
}, Hs = {
	key: 2,
	class: "base-file-input__row"
}, Us = ["for"], Ws = { class: "base-file-input__name" }, Gs = [
	"id",
	"multiple",
	"accept",
	"disabled",
	"required",
	"aria-invalid",
	"aria-describedby"
], Ks = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFileInput",
	props: {
		modelValue: { default: null },
		multiple: {
			type: Boolean,
			default: !1
		},
		accept: { default: void 0 },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 },
		dragDrop: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: {
				required: "required",
				browse: "Browse files",
				drag: "Drag & drop files here or",
				noFile: "No file chosen"
			} }
		}), { id: a } = Fn(n.id), o = P(!1), s = P("");
		function c(e) {
			if (!e || e.length === 0) {
				r("update:modelValue", null), r("change", null), s.value = "";
				return;
			}
			r("update:modelValue", n.multiple ? Array.from(e) : e[0]), r("change", e), s.value = n.multiple ? `${e.length} file${e.length > 1 ? "s" : ""} selected` : e[0].name;
		}
		function l(e) {
			let t = e.target;
			c(t.files);
		}
		function u(e) {
			e.preventDefault(), o.value = !1, !n.disabled && c(e.dataTransfer?.files ?? null);
		}
		function d(e) {
			e.preventDefault(), n.disabled || (o.value = !0);
		}
		function f() {
			o.value = !1;
		}
		return (t, n) => (N(), y("div", { class: j(["base-file-input", {
			"base-file-input--error": !!e.error,
			"base-file-input--disabled": e.disabled
		}]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(a),
				class: j(["base-file-input__label", { "base-file-input__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", {
				key: 0,
				class: "base-file-input__required",
				title: R(i)("required"),
				"aria-hidden": "true"
			}, "*", 8, Rs)) : v("", !0)], 10, Ls)) : v("", !0),
			e.dragDrop ? (N(), y("div", {
				key: 1,
				class: j(["base-file-input__dropzone", { "base-file-input__dropzone--active": o.value }]),
				onDrop: u,
				onDragover: d,
				onDragleave: f
			}, [
				w(R(Tr), {
					size: "xl",
					class: "base-file-input__icon"
				}),
				b("p", zs, [C(L(R(i)("drag")) + " ", 1), b("label", {
					for: R(a),
					class: "base-file-input__browse-link"
				}, L(R(i)("browse")), 9, Bs)]),
				s.value ? (N(), y("p", Vs, L(s.value), 1)) : v("", !0)
			], 34)) : (N(), y("div", Hs, [b("label", {
				for: R(a),
				class: j(["base-file-input__button", { "base-file-input__button--disabled": e.disabled }])
			}, L(R(i)("browse")), 11, Us), b("span", Ws, L(s.value || R(i)("noFile")), 1)])),
			b("input", {
				id: R(a),
				type: "file",
				multiple: e.multiple,
				accept: e.accept,
				disabled: e.disabled,
				required: e.required,
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(a)}-error` : e.hint ? `${R(a)}-hint` : void 0,
				class: "base-file-input__native",
				onChange: l
			}, null, 40, Gs),
			e.error ? (N(), _(H, {
				key: 3,
				id: `${R(a)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-file-input__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 4,
				id: `${R(a)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-file-input__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-b23843e3"]]), qs = { class: "base-search-input__wrapper" }, Js = {
	class: "base-search-input__search-icon",
	"aria-hidden": "true"
}, Ys = ["aria-label"], Xs = [
	"id",
	"value",
	"placeholder",
	"disabled",
	"aria-busy"
], Zs = ["aria-label"], Qs = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSearchInput",
	props: {
		modelValue: { default: "" },
		placeholder: { default: "Search…" },
		size: { default: "md" },
		disabled: {
			type: Boolean,
			default: !1
		},
		loading: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: [
		"update:modelValue",
		"search",
		"clear"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: {
				clear: "Clear search",
				loading: "Searching…"
			} }
		}), { id: a } = Fn(n.id), o = P(null), s = g(() => n.modelValue.length > 0);
		function c(e) {
			let t = e.target;
			r("update:modelValue", t.value);
		}
		function l(e) {
			e.key === "Enter" ? r("search", n.modelValue) : e.key === "Escape" && u();
		}
		function u() {
			r("update:modelValue", ""), r("clear"), o.value?.focus();
		}
		return (t, n) => (N(), y("div", { class: j([
			"base-search-input",
			`base-search-input--${e.size}`,
			{ "base-search-input--disabled": e.disabled }
		]) }, [b("div", qs, [
			b("span", Js, [e.loading ? (N(), y("span", {
				key: 1,
				class: "base-search-input__spinner",
				role: "status",
				"aria-label": R(i)("loading")
			}, null, 8, Ys)) : (N(), _(R($n), {
				key: 0,
				size: "sm"
			}))]),
			b("input", {
				id: R(a),
				ref_key: "inputRef",
				ref: o,
				type: "search",
				value: e.modelValue,
				placeholder: e.placeholder,
				disabled: e.disabled,
				"aria-busy": e.loading,
				class: "base-search-input__field",
				onInput: c,
				onKeydown: l
			}, null, 40, Xs),
			s.value ? (N(), y("button", {
				key: 0,
				type: "button",
				class: "base-search-input__clear",
				"aria-label": R(i)("clear"),
				onClick: u
			}, [w(R(Zn), { size: "xs" })], 8, Zs)) : v("", !0)
		])], 2));
	}
}), [["__scopeId", "data-v-2265fa3d"]]), $s = { class: "base-list__term" }, ec = { class: "base-list__detail" }, tc = { class: "base-list__item" }, nc = { class: "base-list__item" }, rc = { class: "base-list__item" }, ic = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseList",
	props: {
		items: { default: () => [] },
		variant: { default: "unordered" },
		size: { default: "md" },
		divided: {
			type: Boolean,
			default: !1
		}
	},
	setup(e) {
		return (t, n) => e.variant === "description" ? (N(), y("dl", {
			key: 0,
			class: j([
				"base-list",
				"base-list--description",
				`base-list--${e.size}`,
				{ "base-list--divided": e.divided }
			])
		}, [(N(!0), y(p, null, F(e.items, (e, n) => I(t.$slots, "item", {
			key: n,
			item: e,
			index: n
		}, () => [b("dt", $s, [w(H, {
			variant: "body-md",
			weight: "semibold",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.term ?? e.label), 1)]),
			_: 2
		}, 1024)]), b("dd", ec, [w(H, {
			variant: "body-md",
			as: "span",
			color: "secondary"
		}, {
			default: z(() => [C(L(e.content ?? e.description), 1)]),
			_: 2
		}, 1024)])], !0)), 128)), I(t.$slots, "default", {}, void 0, !0)], 2)) : e.variant === "ordered" ? (N(), y("ol", {
			key: 1,
			class: j([
				"base-list",
				"base-list--ordered",
				`base-list--${e.size}`,
				{ "base-list--divided": e.divided }
			])
		}, [(N(!0), y(p, null, F(e.items, (e, n) => I(t.$slots, "item", {
			key: n,
			item: e,
			index: n
		}, () => [b("li", tc, [w(H, {
			variant: "body-md",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 2
		}, 1024)])], !0)), 128)), I(t.$slots, "default", {}, void 0, !0)], 2)) : e.variant === "none" ? (N(), y("ul", {
			key: 2,
			class: j([
				"base-list",
				"base-list--none",
				`base-list--${e.size}`,
				{ "base-list--divided": e.divided }
			])
		}, [(N(!0), y(p, null, F(e.items, (e, n) => I(t.$slots, "item", {
			key: n,
			item: e,
			index: n
		}, () => [b("li", nc, [w(H, {
			variant: "body-md",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 2
		}, 1024)])], !0)), 128)), I(t.$slots, "default", {}, void 0, !0)], 2)) : (N(), y("ul", {
			key: 3,
			class: j([
				"base-list",
				"base-list--unordered",
				`base-list--${e.size}`,
				{ "base-list--divided": e.divided }
			])
		}, [(N(!0), y(p, null, F(e.items, (e, n) => I(t.$slots, "item", {
			key: n,
			item: e,
			index: n
		}, () => [b("li", rc, [w(H, {
			variant: "body-md",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 2
		}, 1024)])], !0)), 128)), I(t.$slots, "default", {}, void 0, !0)], 2));
	}
}), [["__scopeId", "data-v-7416e854"]]), ac = ["aria-label"], oc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSpinner",
	props: {
		size: { default: "md" },
		variant: { default: "primary" },
		label: { default: void 0 }
	},
	setup(e) {
		let { t } = _e({
			inheritLocale: !0,
			messages: { en: { loading: "Loading…" } }
		});
		return (n, r) => (N(), y("span", {
			class: j([
				"base-spinner",
				`base-spinner--${e.size}`,
				`base-spinner--${e.variant}`
			]),
			role: "status",
			"aria-label": e.label ?? R(t)("loading")
		}, null, 10, ac));
	}
}), [["__scopeId", "data-v-9c81022d"]]), sc = {
	key: 0,
	class: "base-progress-bar__header"
}, cc = [
	"value",
	"max",
	"aria-label"
], lc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseProgressBar",
	props: {
		value: { default: 0 },
		max: { default: 100 },
		variant: { default: "primary" },
		size: { default: "md" },
		label: { default: void 0 },
		showLabel: {
			type: Boolean,
			default: !1
		},
		indeterminate: {
			type: Boolean,
			default: !1
		}
	},
	setup(e) {
		let t = e, n = g(() => t.indeterminate ? 0 : Math.min(100, Math.max(0, t.value / t.max * 100)));
		return (t, r) => (N(), y("div", { class: j(["base-progress-bar", `base-progress-bar--${e.size}`]) }, [e.label || e.showLabel ? (N(), y("div", sc, [e.label ? (N(), _(H, {
			key: 0,
			variant: "body-sm",
			weight: "medium",
			as: "span",
			color: "primary",
			class: "base-progress-bar__label"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		})) : v("", !0), e.showLabel && !e.indeterminate ? (N(), _(H, {
			key: 1,
			variant: "body-sm",
			as: "span",
			color: "secondary",
			class: "base-progress-bar__value"
		}, {
			default: z(() => [C(L(Math.round(n.value)) + "%", 1)]),
			_: 1
		})) : v("", !0)])) : v("", !0), b("progress", {
			class: j(["base-progress-bar__track", [`base-progress-bar__track--${e.variant}`, { "base-progress-bar__track--indeterminate": e.indeterminate }]]),
			value: e.indeterminate ? void 0 : e.value,
			max: e.max,
			"aria-label": e.label
		}, null, 10, cc)], 2));
	}
}), [["__scopeId", "data-v-50308389"]]), uc = ["aria-orientation"], dc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenuList",
	props: { orientation: {} },
	setup(e) {
		return (t, n) => (N(), y("menu", {
			class: "base-menu__list",
			role: "menubar",
			"aria-orientation": e.orientation
		}, [I(t.$slots, "default", {}, void 0, !0)], 8, uc));
	}
}), [["__scopeId", "data-v-3f9b2910"]]), fc = {
	key: 0,
	class: "base-menu__icon",
	"aria-hidden": "true"
}, pc = { class: "base-menu__label" }, mc = [
	"href",
	"aria-disabled",
	"tabindex"
], hc = {
	key: 0,
	class: "base-menu__icon",
	"aria-hidden": "true"
}, gc = { class: "base-menu__label" }, _c = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenuItemLink",
	props: { item: {} },
	setup(e) {
		return (t, n) => e.item.to && !e.item.disabled ? (N(), _(R(fs), {
			key: 0,
			to: e.item.to,
			class: "base-menu__link",
			role: "menuitem",
			tabindex: e.item.disabled ? -1 : 0
		}, {
			default: z(() => [e.item.icon ? (N(), y("span", fc, L(e.item.icon), 1)) : v("", !0), b("span", pc, L(e.item.label), 1)]),
			_: 1
		}, 8, ["to", "tabindex"])) : (N(), y("a", {
			key: 1,
			href: e.item.disabled ? void 0 : e.item.href,
			class: "base-menu__link",
			role: "menuitem",
			"aria-disabled": e.item.disabled || void 0,
			tabindex: e.item.disabled ? -1 : 0
		}, [e.item.icon ? (N(), y("span", hc, L(e.item.icon), 1)) : v("", !0), b("span", gc, L(e.item.label), 1)], 8, mc));
	}
}), [["__scopeId", "data-v-8c81f9ce"]]), vc = [
	"aria-disabled",
	"aria-haspopup",
	"aria-expanded",
	"disabled"
], yc = {
	key: 0,
	class: "base-menu__icon",
	"aria-hidden": "true"
}, bc = { class: "base-menu__label" }, xc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenuItemButton",
	props: {
		item: {},
		isOpen: { type: Boolean },
		nested: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["click"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => n.nested ? n.isOpen ? "left" : "right" : n.isOpen ? "up" : "down");
		return (t, n) => (N(), y("button", {
			class: "base-menu__link",
			type: "button",
			role: "menuitem",
			"aria-disabled": e.item.disabled || void 0,
			"aria-haspopup": e.item.children && e.item.children.length > 0 ? "menu" : void 0,
			"aria-expanded": e.item.children && e.item.children.length > 0 ? e.isOpen : void 0,
			disabled: e.item.disabled,
			onClick: n[0] ||= (e) => r("click")
		}, [
			e.item.icon ? (N(), y("span", yc, L(e.item.icon), 1)) : v("", !0),
			b("span", bc, L(e.item.label), 1),
			e.item.children && e.item.children.length > 0 ? (N(), _(R(qn), {
				key: 1,
				class: "base-menu__chevron",
				direction: i.value,
				size: "sm"
			}, null, 8, ["direction"])) : v("", !0)
		], 8, vc));
	}
}), [["__scopeId", "data-v-60c3f427"]]), Sc = ["aria-label"], Cc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenuSubmenu",
	props: {
		items: {},
		label: {},
		dropdown: {
			type: Boolean,
			default: !1
		},
		nested: {
			type: Boolean,
			default: !1
		}
	},
	setup(e) {
		let t = P(/* @__PURE__ */ new Set());
		function n(e) {
			return t.value.has(e);
		}
		function r(e) {
			t.value.has(e) ? t.value.delete(e) : (t.value.clear(), t.value.add(e));
		}
		function i(e, t) {
			if (!e.disabled) {
				if (e.children && e.children.length > 0) {
					r(t);
					return;
				}
				e.onClick && e.onClick();
			}
		}
		return (t, r) => {
			let a = ce("BaseMenuSubmenu", !0);
			return N(), y("menu", {
				class: j(["base-menu__submenu", {
					"base-menu__submenu--dropdown": e.dropdown,
					"base-menu__submenu--nested": e.nested
				}]),
				role: "menu",
				"aria-label": e.label
			}, [(N(!0), y(p, null, F(e.items, (t, r) => (N(), y("li", {
				key: r,
				class: j(["base-menu__item base-menu__item--child", {
					"base-menu__item--disabled": t.disabled,
					"base-menu__item--has-children": t.children && t.children.length > 0,
					"base-menu__item--open": n(r)
				}]),
				role: "none"
			}, [t.href && !t.children?.length ? (N(), _(_c, {
				key: 0,
				item: t
			}, null, 8, ["item"])) : (N(), _(xc, {
				key: 1,
				item: t,
				"is-open": n(r),
				nested: !!(t.children && t.children.length > 0),
				onClick: (e) => i(t, r)
			}, null, 8, [
				"item",
				"is-open",
				"nested",
				"onClick"
			])), t.children && t.children.length > 0 && n(r) ? (N(), _(a, {
				key: 2,
				items: t.children,
				label: t.label,
				nested: e.dropdown || e.nested
			}, null, 8, [
				"items",
				"label",
				"nested"
			])) : v("", !0)], 2))), 128))], 10, Sc);
		};
	}
}), [["__scopeId", "data-v-09e4319f"]]), wc = ["aria-label"], Tc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenu",
	props: {
		items: {},
		orientation: { default: "vertical" }
	},
	setup(e) {
		let t = P(null), n = P(/* @__PURE__ */ new Set());
		function r() {
			n.value.clear();
		}
		function i(e) {
			n.value.has(e) ? n.value.delete(e) : (n.value.clear(), n.value.add(e));
		}
		function a(e) {
			return n.value.has(e);
		}
		function o(e, t) {
			if (!e.disabled) {
				if (e.children && e.children.length > 0) {
					i(t);
					return;
				}
				e.onClick && e.onClick();
			}
		}
		function s(e) {
			t.value && !t.value.contains(e.target) && r();
		}
		function c(e) {
			e.key === "Escape" && r();
		}
		return re(() => {
			document.addEventListener("mousedown", s), document.addEventListener("keydown", c);
		}), ie(() => {
			document.removeEventListener("mousedown", s), document.removeEventListener("keydown", c);
		}), (n, r) => (N(), y("nav", {
			ref_key: "navRef",
			ref: t,
			class: j(["base-menu", [`base-menu--${e.orientation}`]]),
			"aria-label": n.$attrs["aria-label"]
		}, [w(dc, { orientation: e.orientation }, {
			default: z(() => [(N(!0), y(p, null, F(e.items, (e, t) => (N(), y("li", {
				key: t,
				class: j(["base-menu__item", {
					"base-menu__item--has-children": e.children && e.children.length > 0,
					"base-menu__item--open": a(t),
					"base-menu__item--disabled": e.disabled
				}]),
				role: "none"
			}, [(e.to || e.href) && !e.children?.length ? (N(), _(_c, {
				key: 0,
				item: e
			}, null, 8, ["item"])) : (N(), _(xc, {
				key: 1,
				item: e,
				"is-open": a(t),
				onClick: (n) => o(e, t)
			}, null, 8, [
				"item",
				"is-open",
				"onClick"
			])), e.children && e.children.length > 0 && a(t) ? (N(), _(Cc, {
				key: 2,
				items: e.children,
				label: e.label,
				dropdown: !1
			}, null, 8, ["items", "label"])) : v("", !0)], 2))), 128))]),
			_: 1
		}, 8, ["orientation"])], 10, wc));
	}
}), [["__scopeId", "data-v-4d7ff72a"]]), Ec = ["aria-label"], Dc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenubar",
	props: {
		label: { default: "Menu" },
		bordered: {
			type: Boolean,
			default: !1
		},
		items: { default: void 0 }
	},
	setup(e) {
		let t = P(null), n = P(/* @__PURE__ */ new Set());
		function r() {
			n.value.clear();
		}
		function i(e) {
			n.value.has(e) ? n.value.delete(e) : (n.value.clear(), n.value.add(e));
		}
		function a(e) {
			return n.value.has(e);
		}
		function o(e, t) {
			if (!e.disabled) {
				if (e.children && e.children.length > 0) {
					i(t);
					return;
				}
				e.onClick && e.onClick();
			}
		}
		function s(e) {
			t.value && !t.value.contains(e.target) && r();
		}
		function c(e) {
			e.key === "Escape" && r();
		}
		return re(() => {
			document.addEventListener("mousedown", s), document.addEventListener("keydown", c);
		}), ie(() => {
			document.removeEventListener("mousedown", s), document.removeEventListener("keydown", c);
		}), (n, r) => (N(), y("menu", {
			ref_key: "menubarRef",
			ref: t,
			class: j(["base-menubar", { "base-menubar--bordered": e.bordered }]),
			role: "menubar",
			"aria-label": e.label
		}, [e.items ? (N(!0), y(p, { key: 0 }, F(e.items, (e, t) => (N(), y("li", {
			key: t,
			class: j(["base-menubar__item", {
				"base-menubar__item--has-children": e.children && e.children.length > 0,
				"base-menubar__item--open": a(t),
				"base-menubar__item--disabled": e.disabled
			}]),
			role: "none"
		}, [e.href && !e.children?.length ? (N(), _(_c, {
			key: 0,
			item: e
		}, null, 8, ["item"])) : (N(), _(xc, {
			key: 1,
			item: e,
			"is-open": a(t),
			onClick: (n) => o(e, t)
		}, null, 8, [
			"item",
			"is-open",
			"onClick"
		])), e.children && e.children.length > 0 && a(t) ? (N(), _(Cc, {
			key: 2,
			items: e.children,
			label: e.label,
			dropdown: !0
		}, null, 8, ["items", "label"])) : v("", !0)], 2))), 128)) : I(n.$slots, "default", { key: 1 }, void 0, !0)], 10, Ec));
	}
}), [["__scopeId", "data-v-77287773"]]), Oc = ["href", "tabindex"], kc = ["aria-disabled", "tabindex"], Ac = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMenuItem",
	props: {
		label: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		variant: { default: "default" },
		icon: { default: void 0 },
		active: {
			type: Boolean,
			default: !1
		},
		href: { default: void 0 },
		to: { default: void 0 }
	},
	emits: ["click"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => !n.disabled && (!!n.to || !!n.href));
		function a(e) {
			r("click", e);
		}
		return (t, n) => (N(), y("li", {
			class: j([
				"base-menu-item",
				`base-menu-item--${e.variant}`,
				{
					"base-menu-item--disabled": e.disabled,
					"base-menu-item--active": e.active
				}
			]),
			role: "none"
		}, [i.value && e.to ? (N(), _(R(fs), {
			key: 0,
			to: e.to,
			role: "menuitem",
			class: "base-menu-item__link",
			tabindex: e.disabled ? -1 : 0
		}, {
			default: z(() => [I(t.$slots, "icon", {}, void 0, !0), I(t.$slots, "default", {}, () => [w(H, {
				variant: "body-sm",
				as: "span",
				color: "inherit"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			})], !0)]),
			_: 3
		}, 8, ["to", "tabindex"])) : i.value && e.href ? (N(), y("a", {
			key: 1,
			href: e.href,
			role: "menuitem",
			class: "base-menu-item__link",
			tabindex: e.disabled ? -1 : 0
		}, [I(t.$slots, "icon", {}, void 0, !0), I(t.$slots, "default", {}, () => [w(H, {
			variant: "body-sm",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		})], !0)], 8, Oc)) : (N(), y("span", {
			key: 2,
			role: "menuitem",
			"aria-disabled": e.disabled ? "true" : void 0,
			tabindex: e.disabled ? -1 : 0,
			class: "base-menu-item__button",
			onClick: n[0] ||= (t) => !e.disabled && a(t),
			onKeydown: [n[1] ||= ge(B((t) => !e.disabled && a(t), ["prevent"]), ["enter"]), n[2] ||= ge(B((t) => !e.disabled && a(t), ["prevent"]), ["space"])]
		}, [I(t.$slots, "icon", {}, void 0, !0), I(t.$slots, "default", {}, () => [w(H, {
			variant: "body-sm",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [C(L(e.label), 1)]),
			_: 1
		})], !0)], 40, kc))], 2));
	}
}), [["__scopeId", "data-v-170bb7ab"]]), jc = { class: "base-modal__header" }, Mc = ["aria-label"], Nc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseModalHeader",
	props: {
		title: {},
		closeLabel: {}
	},
	emits: ["close"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("header", jc, [I(t.$slots, "default", {}, () => [e.title ? (N(), _(H, {
			key: 0,
			variant: "h5",
			as: "h2",
			color: "primary",
			class: "base-modal__title"
		}, {
			default: z(() => [C(L(e.title), 1)]),
			_: 1
		})) : v("", !0)], !0), b("button", {
			type: "button",
			class: "base-modal__close",
			"aria-label": e.closeLabel,
			onClick: r[0] ||= (e) => n("close")
		}, [w(R(Zn), { size: "md" })], 8, Mc)]));
	}
}), [["__scopeId", "data-v-d5f8166c"]]), Pc = {}, Fc = { class: "base-modal__body" };
function Ic(e, t) {
	return N(), y("div", Fc, [I(e.$slots, "default", {}, void 0, !0)]);
}
var Lc = /* @__PURE__ */ V(Pc, [["render", Ic], ["__scopeId", "data-v-69927e58"]]), Rc = {}, zc = { class: "base-modal__footer" };
function Bc(e, t) {
	return N(), y("footer", zc, [I(e.$slots, "default", {}, void 0, !0)]);
}
var Vc = /* @__PURE__ */ V(Rc, [["render", Bc], ["__scopeId", "data-v-dab5cab8"]]), Hc = ["aria-label"], Uc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseModal",
	props: {
		open: {
			type: Boolean,
			default: !1
		},
		title: { default: void 0 },
		size: { default: "md" },
		closeOnBackdrop: {
			type: Boolean,
			default: !0
		},
		closeOnEsc: {
			type: Boolean,
			default: !0
		},
		closeOnRouteChange: {
			type: Boolean,
			default: !0
		}
	},
	emits: ["update:open", "close"],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: { close: "Close" } }
		});
		pe(() => n.open, (e) => {
			document.body.style.overflow = e ? "hidden" : "";
		});
		function a() {
			r("update:open", !1), r("close");
		}
		function o() {
			n.closeOnBackdrop && a();
		}
		function s(e) {
			n.closeOnEsc && e.key === "Escape" && a();
		}
		return vs(() => {
			n.closeOnRouteChange && a();
		}), (t, n) => (N(), _(m, { to: "body" }, [w(h, { name: "base-modal-fade" }, {
			default: z(() => [e.open ? (N(), y("div", {
				key: 0,
				class: "base-modal-overlay",
				onClick: B(o, ["self"]),
				onKeydown: s
			}, [w(h, { name: "base-modal-scale" }, {
				default: z(() => [e.open ? (N(), y("dialog", {
					key: 0,
					"aria-label": e.title,
					class: j(["base-modal", `base-modal--${e.size}`]),
					onClick: n[0] ||= B(() => {}, ["stop"])
				}, [
					e.title || t.$slots.header ? (N(), _(Nc, {
						key: 0,
						title: e.title,
						"close-label": R(i)("close"),
						onClose: a
					}, x({ _: 2 }, [t.$slots.header ? {
						name: "default",
						fn: z(() => [I(t.$slots, "header", {}, void 0, !0)]),
						key: "0"
					} : void 0]), 1032, ["title", "close-label"])) : v("", !0),
					w(Lc, null, {
						default: z(() => [I(t.$slots, "default", {}, void 0, !0)]),
						_: 3
					}),
					t.$slots.footer ? (N(), _(Vc, { key: 1 }, {
						default: z(() => [I(t.$slots, "footer", {}, void 0, !0)]),
						_: 3
					})) : v("", !0)
				], 10, Hc)) : v("", !0)]),
				_: 3
			})], 32)) : v("", !0)]),
			_: 3
		})]));
	}
}), [["__scopeId", "data-v-159a0268"]]), Wc = {
	class: "base-navbar__container",
	"aria-label": "Main navigation"
}, Gc = { class: "base-navbar__start" }, Kc = { class: "base-navbar__center" }, qc = { class: "base-navbar__end" }, Jc = ["aria-label", "aria-expanded"], Yc = {
	class: "base-navbar__mobile-nav",
	"aria-label": "Mobile navigation"
}, Xc = { class: "base-navbar__mobile-nav-items" }, Zc = { class: "base-navbar__mobile-nav-end" }, Qc = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseNavbar",
	props: {
		brand: { default: void 0 },
		sticky: {
			type: Boolean,
			default: !1
		},
		mobileTitle: { default: void 0 }
	},
	setup(e) {
		let t = P(!1);
		return (n, r) => (N(), y(p, null, [b("header", { class: j(["base-navbar", { "base-navbar--sticky": e.sticky }]) }, [b("nav", Wc, [
			b("div", Gc, [I(n.$slots, "brand", {}, () => [e.brand ? (N(), _(H, {
				key: 0,
				variant: "h6",
				as: "span",
				color: "primary",
				class: "base-navbar__brand"
			}, {
				default: z(() => [C(L(e.brand), 1)]),
				_: 1
			})) : v("", !0)], !0)]),
			b("div", Kc, [I(n.$slots, "default", {}, void 0, !0)]),
			b("div", qc, [I(n.$slots, "end", {}, void 0, !0)]),
			b("button", {
				class: "base-navbar__hamburger",
				type: "button",
				"aria-label": t.value ? "Close menu" : "Open menu",
				"aria-expanded": t.value,
				onClick: r[0] ||= (e) => t.value = !t.value
			}, [...r[2] ||= [
				b("span", { class: "base-navbar__hamburger-bar" }, null, -1),
				b("span", { class: "base-navbar__hamburger-bar" }, null, -1),
				b("span", { class: "base-navbar__hamburger-bar" }, null, -1)
			]], 8, Jc)
		])], 2), w(Is, {
			open: t.value,
			"onUpdate:open": r[1] ||= (e) => t.value = e,
			side: "left",
			size: "sm",
			title: e.mobileTitle || e.brand
		}, {
			default: z(() => [b("nav", Yc, [b("div", Xc, [I(n.$slots, "default", {}, void 0, !0)]), b("div", Zc, [I(n.$slots, "end", {}, void 0, !0)])])]),
			_: 3
		}, 8, ["open", "title"])], 64));
	}
}), [["__scopeId", "data-v-34790255"]]), $c = [
	"disabled",
	"aria-disabled",
	"aria-current",
	"aria-expanded"
], el = {
	class: "base-navbar-item__dropdown-list",
	role: "menu"
}, tl = {
	key: 0,
	class: "base-navbar-item__dropdown-icon",
	"aria-hidden": "true"
}, nl = ["href"], rl = {
	key: 0,
	class: "base-navbar-item__dropdown-icon",
	"aria-hidden": "true"
}, il = [
	"disabled",
	"aria-disabled",
	"onClick"
], al = {
	key: 0,
	class: "base-navbar-item__dropdown-icon",
	"aria-hidden": "true"
}, ol = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseNavbarItem",
	props: {
		label: { default: void 0 },
		href: { default: void 0 },
		to: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		active: {
			type: Boolean,
			default: !1
		},
		variant: { default: "default" },
		children: { default: void 0 }
	},
	emits: ["click"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => n.to && !n.disabled ? fs : n.href ? "a" : "button"), a = g(() => !!n.children && n.children.length > 0), o = P(!1);
		function s(e) {
			if (!n.disabled) {
				if (a.value) {
					o.value = !o.value;
					return;
				}
				r("click", e);
			}
		}
		function c(e) {
			e.disabled || (o.value = !1, e.onClick && e.onClick());
		}
		return (t, n) => a.value ? (N(), _(Ur, {
			key: 0,
			open: o.value,
			"onUpdate:open": n[2] ||= (e) => o.value = e,
			placement: "bottom-start",
			"match-trigger-width": !1,
			"max-height": "320px",
			class: "base-navbar-item-dropdown-host"
		}, {
			trigger: z(() => [b("button", {
				type: "button",
				class: j([
					"base-navbar-item",
					`base-navbar-item--${e.variant}`,
					{
						"base-navbar-item--active": e.active,
						"base-navbar-item--disabled": e.disabled,
						"base-navbar-item--open": o.value
					}
				]),
				disabled: e.disabled || void 0,
				"aria-disabled": e.disabled ? "true" : void 0,
				"aria-current": e.active ? "page" : void 0,
				"aria-haspopup": !0,
				"aria-expanded": o.value,
				onClick: s
			}, [
				I(t.$slots, "icon", {}, void 0, !0),
				I(t.$slots, "default", {}, () => [C(L(e.label), 1)], !0),
				w(R(qn), {
					class: "base-navbar-item__chevron",
					direction: o.value ? "up" : "down",
					size: "sm"
				}, null, 8, ["direction"])
			], 10, $c)]),
			default: z(() => [b("ul", el, [(N(!0), y(p, null, F(e.children, (e, t) => (N(), y("li", {
				key: t,
				role: "none",
				class: "base-navbar-item__dropdown-item-wrapper"
			}, [e.to && !e.disabled ? (N(), _(R(fs), {
				key: 0,
				to: e.to,
				role: "menuitem",
				class: "base-navbar-item__dropdown-item",
				onClick: n[0] ||= (e) => o.value = !1
			}, {
				default: z(() => [e.icon ? (N(), y("span", tl, L(e.icon), 1)) : v("", !0), b("span", null, L(e.label), 1)]),
				_: 2
			}, 1032, ["to"])) : e.href && !e.disabled ? (N(), y("a", {
				key: 1,
				href: e.href,
				role: "menuitem",
				class: "base-navbar-item__dropdown-item",
				onClick: n[1] ||= (e) => o.value = !1
			}, [e.icon ? (N(), y("span", rl, L(e.icon), 1)) : v("", !0), b("span", null, L(e.label), 1)], 8, nl)) : (N(), y("button", {
				key: 2,
				type: "button",
				role: "menuitem",
				disabled: e.disabled || void 0,
				"aria-disabled": e.disabled ? "true" : void 0,
				class: j(["base-navbar-item__dropdown-item", { "base-navbar-item__dropdown-item--disabled": e.disabled }]),
				onClick: (t) => c(e)
			}, [e.icon ? (N(), y("span", al, L(e.icon), 1)) : v("", !0), b("span", null, L(e.label), 1)], 10, il))]))), 128))])]),
			_: 3
		}, 8, ["open"])) : (N(), _(le(i.value), {
			key: 1,
			class: j([
				"base-navbar-item",
				`base-navbar-item--${e.variant}`,
				{
					"base-navbar-item--active": e.active,
					"base-navbar-item--disabled": e.disabled
				}
			]),
			to: i.value === R(fs) ? e.to : void 0,
			href: i.value === "a" ? e.disabled ? void 0 : e.href : void 0,
			type: i.value === "button" ? "button" : void 0,
			disabled: i.value === "button" && e.disabled || void 0,
			"aria-disabled": e.disabled ? "true" : void 0,
			"aria-current": e.active ? "page" : void 0,
			tabindex: e.disabled ? -1 : void 0,
			onClick: s
		}, {
			default: z(() => [I(t.$slots, "icon", {}, void 0, !0), I(t.$slots, "default", {}, () => [C(L(e.label), 1)], !0)]),
			_: 3
		}, 8, [
			"class",
			"to",
			"href",
			"type",
			"disabled",
			"aria-disabled",
			"aria-current",
			"tabindex"
		]));
	}
}), [["__scopeId", "data-v-7d8fd821"]]), sl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseSkeleton",
	props: {
		shape: { default: "line" },
		width: { default: void 0 },
		height: { default: void 0 },
		animated: {
			type: Boolean,
			default: !0
		}
	},
	setup(e) {
		return (t, n) => (N(), y("span", {
			class: j([
				"base-skeleton",
				`base-skeleton--${e.shape}`,
				{ "base-skeleton--animated": e.animated }
			]),
			style: M({
				width: e.width,
				height: e.height
			}),
			"aria-hidden": "true"
		}, null, 6));
	}
}), [["__scopeId", "data-v-e7fca844"]]), cl = ["aria-label", "aria-hidden"], ll = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseStatusIcon",
	props: {
		status: { default: "neutral" },
		size: { default: "md" },
		label: { default: void 0 }
	},
	setup(e) {
		let t = e, n = g(() => ({
			sm: "sm",
			md: "md",
			lg: "lg"
		})[t.size]);
		return (t, r) => (N(), y("span", {
			class: j([
				"base-status-icon",
				`base-status-icon--${e.status}`,
				`base-status-icon--${e.size}`
			]),
			"aria-label": e.label,
			"aria-hidden": !e.label,
			role: "img"
		}, [e.status === "success" ? (N(), _(R(ar), {
			key: 0,
			size: n.value
		}, null, 8, ["size"])) : e.status === "warning" ? (N(), _(R(lr), {
			key: 1,
			size: n.value
		}, null, 8, ["size"])) : e.status === "error" ? (N(), _(R(dr), {
			key: 2,
			size: n.value
		}, null, 8, ["size"])) : e.status === "info" ? (N(), _(R(sr), {
			key: 3,
			size: n.value
		}, null, 8, ["size"])) : (N(), _(R(Cr), {
			key: 4,
			size: n.value
		}, null, 8, ["size"]))], 10, cl));
	}
}), [["__scopeId", "data-v-d9bd575e"]]), ul = {
	class: "base-form-wizard__steps",
	"aria-label": "Progress"
}, dl = { class: "base-form-wizard__step-list" }, fl = ["aria-current"], pl = [
	"disabled",
	"aria-label",
	"onClick"
], ml = { class: "base-form-wizard__step-circle" }, hl = { class: "base-form-wizard__step-label" }, gl = {
	key: 0,
	class: "base-form-wizard__connector",
	"aria-hidden": "true"
}, _l = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFormWizardSteps",
	props: {
		steps: {},
		currentIndex: {},
		linear: { type: Boolean }
	},
	emits: ["goTo"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i(e) {
			return e < n.currentIndex ? "complete" : e === n.currentIndex ? "current" : "upcoming";
		}
		return (t, n) => (N(), y("nav", ul, [b("ol", dl, [(N(!0), y(p, null, F(e.steps, (t, n) => (N(), y("li", {
			key: t.id,
			class: j(["base-form-wizard__step", `base-form-wizard__step--${i(n)}`]),
			"aria-current": n === e.currentIndex ? "step" : void 0
		}, [b("button", {
			type: "button",
			class: "base-form-wizard__step-btn",
			disabled: e.linear && n > e.currentIndex + 1,
			"aria-label": `Step ${n + 1}: ${t.title}`,
			onClick: (e) => r("goTo", n)
		}, [b("span", ml, [i(n) === "complete" ? (N(), _(R(ar), {
			key: 0,
			size: "xs"
		})) : (N(), _(H, {
			key: 1,
			variant: "body-sm",
			weight: "semibold",
			as: "span",
			color: "inherit",
			class: "base-form-wizard__step-number"
		}, {
			default: z(() => [C(L(n + 1), 1)]),
			_: 2
		}, 1024))]), b("span", hl, [w(H, {
			variant: "body-sm",
			weight: "medium",
			as: "span",
			color: "primary",
			class: "base-form-wizard__step-title"
		}, {
			default: z(() => [C(L(t.title), 1)]),
			_: 2
		}, 1024), t.description ? (N(), _(H, {
			key: 0,
			variant: "caption",
			as: "span",
			color: "secondary",
			class: "base-form-wizard__step-desc"
		}, {
			default: z(() => [C(L(t.description), 1)]),
			_: 2
		}, 1024)) : v("", !0)])], 8, pl), n < e.steps.length - 1 ? (N(), y("div", gl)) : v("", !0)], 10, fl))), 128))])]));
	}
}), [["__scopeId", "data-v-678c0d54"]]), vl = { class: "base-form-wizard__content" }, yl = /* @__PURE__ */ T({
	__name: "BaseFormWizardContent",
	props: {
		step: {},
		index: {}
	},
	setup(e) {
		return (t, n) => (N(), y("div", vl, [I(t.$slots, "default", {
			step: e.step,
			index: e.index
		})]));
	}
}), bl = { class: "base-form-wizard__footer" }, xl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFormWizardFooter",
	props: {
		isFirst: { type: Boolean },
		isLast: { type: Boolean },
		backLabel: {},
		nextLabel: {},
		finishLabel: {}
	},
	emits: ["prev", "next"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("footer", bl, [I(t.$slots, "default", {
			prev: () => n("prev"),
			next: () => n("next"),
			isFirst: e.isFirst,
			isLast: e.isLast
		}, () => [e.isFirst ? v("", !0) : (N(), y("button", {
			key: 0,
			type: "button",
			class: "base-form-wizard__btn base-form-wizard__btn--secondary",
			onClick: r[0] ||= (e) => n("prev")
		}, [w(H, {
			variant: "body-md",
			weight: "medium",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [C(L(e.backLabel), 1)]),
			_: 1
		})])), b("button", {
			type: "button",
			class: "base-form-wizard__btn base-form-wizard__btn--primary",
			onClick: r[1] ||= (e) => n("next")
		}, [w(H, {
			variant: "body-md",
			weight: "medium",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [C(L(e.isLast ? e.finishLabel : e.nextLabel), 1)]),
			_: 1
		})])], !0)]));
	}
}), [["__scopeId", "data-v-608a9967"]]), Sl = { class: "base-form-wizard" }, Cl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseFormWizard",
	props: {
		steps: {},
		modelValue: { default: 0 },
		linear: {
			type: Boolean,
			default: !0
		}
	},
	emits: [
		"update:modelValue",
		"complete",
		"next",
		"prev"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, { t: i } = _e({
			inheritLocale: !0,
			messages: { en: {
				back: "Back",
				next: "Next",
				finish: "Finish"
			} }
		}), a = g(() => n.modelValue), o = g(() => a.value === 0), s = g(() => a.value === n.steps.length - 1);
		function c(e) {
			n.linear && e > a.value + 1 || e < 0 || e >= n.steps.length || r("update:modelValue", e);
		}
		function l() {
			if (s.value) r("complete");
			else {
				let e = a.value + 1;
				r("update:modelValue", e), r("next", e);
			}
		}
		function u() {
			if (!o.value) {
				let e = a.value - 1;
				r("update:modelValue", e), r("prev", e);
			}
		}
		return (t, n) => (N(), y("div", Sl, [
			w(_l, {
				steps: e.steps,
				"current-index": a.value,
				linear: e.linear,
				onGoTo: c
			}, null, 8, [
				"steps",
				"current-index",
				"linear"
			]),
			w(yl, {
				step: e.steps[a.value],
				index: a.value
			}, {
				default: z(() => [I(t.$slots, "default", {
					step: e.steps[a.value],
					index: a.value
				}, () => [I(t.$slots, e.steps[a.value]?.id, {
					step: e.steps[a.value],
					index: a.value
				}, void 0, !0)], !0)]),
				_: 3
			}, 8, ["step", "index"]),
			w(xl, {
				"is-first": o.value,
				"is-last": s.value,
				"back-label": R(i)("back"),
				"next-label": R(i)("next"),
				"finish-label": R(i)("finish"),
				onPrev: u,
				onNext: l
			}, x({ _: 2 }, [t.$slots.footer ? {
				name: "default",
				fn: z((e) => [I(t.$slots, "footer", A(e, { currentIndex: a.value }), void 0, !0)]),
				key: "0"
			} : void 0]), 1032, [
				"is-first",
				"is-last",
				"back-label",
				"next-label",
				"finish-label"
			])
		]));
	}
}), [["__scopeId", "data-v-0a1b075d"]]), wl = [
	"id",
	"data-tab-id",
	"aria-selected",
	"aria-controls",
	"tabindex",
	"disabled",
	"onClick",
	"onDblclick",
	"onKeydown"
], Tl = {
	key: 0,
	class: "base-tabs__close-icon",
	"aria-hidden": "true"
}, El = [
	"aria-label",
	"data-close-tab-id",
	"onClick"
], Dl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTabList",
	props: {
		tabs: {},
		activeId: {},
		variant: {},
		closable: {
			type: Boolean,
			default: !1
		},
		addable: {
			type: Boolean,
			default: !1
		}
	},
	emits: [
		"select",
		"close",
		"add",
		"rename",
		"keydown"
	],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("div", { class: j(["base-tabs__bar", `base-tabs__bar--${e.variant}`]) }, [
			b("div", {
				role: "tablist",
				class: j(["base-tabs__list", `base-tabs__list--${e.variant}`])
			}, [(N(!0), y(p, null, F(e.tabs, (t) => (N(), y("button", {
				key: t.id,
				id: `tab-${t.id}`,
				"data-tab-id": t.id,
				type: "button",
				role: "tab",
				"aria-selected": e.activeId === t.id,
				"aria-controls": `panel-${t.id}`,
				tabindex: e.activeId === t.id ? 0 : -1,
				disabled: t.disabled,
				class: j([
					"base-tabs__tab",
					`base-tabs__tab--${e.variant}`,
					{
						"base-tabs__tab--active": e.activeId === t.id,
						"base-tabs__tab--disabled": t.disabled,
						"base-tabs__tab--closable": e.closable
					}
				]),
				onClick: (e) => n("select", t.id),
				onDblclick: (e) => n("rename", t.id),
				onKeydown: (e) => n("keydown", e, t.id)
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "inherit"
			}, {
				default: z(() => [C(L(t.label), 1)]),
				_: 2
			}, 1024), e.closable ? (N(), y("span", Tl, [w(R(Zn), { size: "xs" })])) : v("", !0)], 42, wl))), 128))], 2),
			e.closable ? (N(!0), y(p, { key: 0 }, F(e.tabs, (e) => (N(), y("button", {
				key: e.id,
				type: "button",
				class: "base-tabs__close",
				"aria-label": `Close ${e.label}`,
				"data-close-tab-id": e.id,
				onClick: B((t) => n("close", e.id), ["stop"])
			}, [w(R(Zn), { size: "xs" })], 8, El))), 128)) : v("", !0),
			e.addable ? (N(), y("button", {
				key: 1,
				type: "button",
				class: j(["base-tabs__add", `base-tabs__add--${e.variant}`]),
				"aria-label": "New tab",
				onClick: r[0] ||= (e) => n("add")
			}, [w(R(xr), { size: "sm" })], 2)) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-012653b3"]]), Ol = [
	"id",
	"aria-labelledby",
	"hidden"
], kl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTabPanel",
	props: {
		tab: {},
		activeId: {}
	},
	setup(e) {
		return (t, n) => (N(), y("div", {
			id: `panel-${e.tab.id}`,
			role: "tabpanel",
			"aria-labelledby": `tab-${e.tab.id}`,
			hidden: e.activeId !== e.tab.id,
			class: "base-tabs__panel"
		}, [I(t.$slots, "default", { tab: e.tab }, void 0, !0)], 8, Ol));
	}
}), [["__scopeId", "data-v-405f91fe"]]), Al = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTabs",
	props: {
		tabs: {},
		modelValue: { default: void 0 },
		variant: { default: "line" },
		closable: {
			type: Boolean,
			default: !1
		},
		addable: {
			type: Boolean,
			default: !1
		}
	},
	emits: [
		"update:modelValue",
		"change",
		"close",
		"add",
		"rename"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(n.modelValue ?? n.tabs[0]?.id ?? "");
		function o(e) {
			let t = n.tabs.find((t) => t.id === e);
			!t || t.disabled || (a.value = e, r("update:modelValue", e), r("change", e));
		}
		function s(e, t) {
			let r = n.tabs.filter((e) => !e.disabled), a = r.findIndex((e) => e.id === t), s = a;
			if (e.key === "ArrowRight") s = (a + 1) % r.length;
			else if (e.key === "ArrowLeft") s = (a - 1 + r.length) % r.length;
			else if (e.key === "Home") s = 0;
			else if (e.key === "End") s = r.length - 1;
			else return;
			e.preventDefault();
			let c = r[s];
			o(c.id), (i.value?.$el?.querySelector(`[data-tab-id="${c.id}"]`))?.focus();
		}
		return (t, n) => (N(), y("div", { class: j(["base-tabs", `base-tabs--${e.variant}`]) }, [w(Dl, {
			ref_key: "tablistRef",
			ref: i,
			tabs: e.tabs,
			"active-id": a.value,
			variant: e.variant,
			closable: e.closable,
			addable: e.addable,
			onSelect: o,
			onClose: n[0] ||= (e) => r("close", e),
			onAdd: n[1] ||= (e) => r("add"),
			onRename: n[2] ||= (e) => r("rename", e),
			onKeydown: s
		}, null, 8, [
			"tabs",
			"active-id",
			"variant",
			"closable",
			"addable"
		]), (N(!0), y(p, null, F(e.tabs, (e) => (N(), _(kl, {
			key: e.id,
			tab: e,
			"active-id": a.value
		}, {
			default: z((n) => [I(t.$slots, e.id, A({ ref_for: !0 }, n), void 0, !0)]),
			_: 2
		}, 1032, ["tab", "active-id"]))), 128))], 2));
	}
}), [["__scopeId", "data-v-f4dda4d8"]]), jl = ["id", "aria-labelledby"], Ml = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseVirtualTabs",
	props: {
		tabs: {},
		modelValue: { default: void 0 },
		variant: { default: "line" },
		closable: {
			type: Boolean,
			default: !1
		},
		addable: {
			type: Boolean,
			default: !1
		}
	},
	emits: [
		"update:modelValue",
		"change",
		"close",
		"add",
		"rename"
	],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(n.modelValue ?? n.tabs[0]?.id ?? "");
		function o(e) {
			let t = n.tabs.find((t) => t.id === e);
			!t || t.disabled || (a.value = e, r("update:modelValue", e), r("change", e));
		}
		function s(e, t) {
			let r = n.tabs.filter((e) => !e.disabled), a = r.findIndex((e) => e.id === t), s = a;
			if (e.key === "ArrowRight") s = (a + 1) % r.length;
			else if (e.key === "ArrowLeft") s = (a - 1 + r.length) % r.length;
			else if (e.key === "Home") s = 0;
			else if (e.key === "End") s = r.length - 1;
			else return;
			e.preventDefault();
			let c = r[s];
			o(c.id), (i.value?.$el?.querySelector(`[data-tab-id="${c.id}"]`))?.focus();
		}
		let c = () => n.tabs.find((e) => e.id === a.value);
		return (t, n) => (N(), y("div", { class: j(["base-virtual-tabs", `base-virtual-tabs--${e.variant}`]) }, [w(Dl, {
			ref_key: "tablistRef",
			ref: i,
			tabs: e.tabs,
			"active-id": a.value,
			variant: e.variant,
			closable: e.closable,
			addable: e.addable,
			onSelect: o,
			onClose: n[0] ||= (e) => r("close", e),
			onAdd: n[1] ||= (e) => r("add"),
			onRename: n[2] ||= (e) => r("rename", e),
			onKeydown: s
		}, null, 8, [
			"tabs",
			"active-id",
			"variant",
			"closable",
			"addable"
		]), c() ? (N(), y("div", {
			key: 0,
			id: `panel-${c().id}`,
			role: "tabpanel",
			"aria-labelledby": `tab-${c().id}`,
			class: "base-virtual-tabs__panel"
		}, [I(t.$slots, c().id, { tab: c() }, void 0, !0)], 8, jl)) : v("", !0)], 2));
	}
}), [["__scopeId", "data-v-9bb98186"]]), Nl = { class: "base-table__head" }, Pl = ["aria-sort", "onClick"], Fl = { class: "base-table__th-content" }, Il = {
	key: 0,
	class: "base-table__sort-icon"
}, Ll = /* @__PURE__ */ T({
	__name: "BaseTableHead",
	props: {
		columns: {},
		sortKey: {},
		sortDir: {}
	},
	emits: ["sort"],
	setup(e, { emit: t }) {
		let n = t;
		function r(e, t, n) {
			return !e.sortable || t !== e.key ? "none" : n === "asc" ? "ascending" : "descending";
		}
		return (t, i) => (N(), y("thead", Nl, [b("tr", null, [(N(!0), y(p, null, F(e.columns, (t) => (N(), y("th", {
			key: t.key,
			scope: "col",
			class: j([
				"base-table__th",
				`base-table__th--align-${t.align ?? "left"}`,
				{ "base-table__th--sortable": t.sortable }
			]),
			"aria-sort": t.sortable ? r(t, e.sortKey, e.sortDir) : void 0,
			onClick: (e) => n("sort", t)
		}, [b("span", Fl, [w(H, {
			variant: "caption",
			weight: "semibold",
			as: "span",
			color: "secondary"
		}, {
			default: z(() => [C(L(t.label), 1)]),
			_: 2
		}, 1024), t.sortable ? (N(), y("span", Il, [w(R(rr), {
			active: e.sortKey === t.key,
			direction: e.sortDir,
			size: "xs"
		}, null, 8, ["active", "direction"])])) : v("", !0)])], 10, Pl))), 128))])]));
	}
}), Rl = ["colspan"], zl = /* @__PURE__ */ T({
	__name: "BaseTableEmptyState",
	props: {
		colspan: {},
		text: {}
	},
	setup(e) {
		return (t, n) => (N(), y("tr", null, [b("td", {
			colspan: e.colspan,
			class: "base-table__empty"
		}, [w(H, {
			variant: "body-md",
			as: "span",
			color: "tertiary"
		}, {
			default: z(() => [C(L(e.text), 1)]),
			_: 1
		})], 8, Rl)]));
	}
}), Bl = ["aria-busy"], Vl = /* @__PURE__ */ T({
	__name: "BaseTableBody",
	props: {
		rows: {},
		columns: {},
		loading: { type: Boolean },
		emptyText: {}
	},
	setup(e) {
		function t(e, t) {
			let n = e[t.key];
			return t.render ? t.render(n, e) : n;
		}
		return (n, r) => (N(), y("tbody", {
			class: j(["base-table__body", { "base-table__body--loading": e.loading }]),
			"aria-busy": e.loading
		}, [!e.loading && e.rows.length === 0 ? (N(), _(zl, {
			key: 0,
			colspan: e.columns.length,
			text: e.emptyText
		}, null, 8, ["colspan", "text"])) : (N(!0), y(p, { key: 1 }, F(e.rows, (r, i) => (N(), y("tr", {
			key: i,
			class: "base-table__row"
		}, [I(n.$slots, "row", {
			row: r,
			index: i
		}, () => [(N(!0), y(p, null, F(e.columns, (e) => (N(), y("td", {
			key: e.key,
			class: j(["base-table__td", `base-table__td--align-${e.align ?? "left"}`])
		}, [I(n.$slots, "cell", {
			row: r,
			col: e,
			value: t(r, e)
		}, () => [w(H, {
			variant: "body-sm",
			as: "span",
			color: "primary"
		}, {
			default: z(() => [C(L(t(r, e)), 1)]),
			_: 2
		}, 1024)])], 2))), 128))])]))), 128))], 10, Bl));
	}
}), Hl = { class: "base-table-wrapper" }, Ul = {
	key: 0,
	class: "base-table__loading",
	"aria-busy": "true",
	"aria-label": "Loading table data"
}, Wl = {
	key: 0,
	class: "base-table__caption"
}, Gl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTable",
	props: {
		columns: {},
		rows: {},
		caption: { default: void 0 },
		striped: {
			type: Boolean,
			default: !1
		},
		bordered: {
			type: Boolean,
			default: !1
		},
		hoverable: {
			type: Boolean,
			default: !0
		},
		loading: {
			type: Boolean,
			default: !1
		},
		emptyText: { default: "No data available" }
	},
	emits: ["sort"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(null), o = g(() => !i.value || a.value === null ? n.rows : [...n.rows].sort((e, t) => {
			let n = e[i.value], r = t[i.value], o = String(n).localeCompare(String(r), void 0, { numeric: !0 });
			return a.value === "asc" ? o : -o;
		}));
		function s(e) {
			e.sortable && (i.value === e.key ? a.value === "asc" ? a.value = "desc" : (i.value = null, a.value = null) : (i.value = e.key, a.value = "asc"), r("sort", e.key, a.value));
		}
		return (t, n) => (N(), y("div", Hl, [e.loading ? (N(), y("div", Ul, [...n[0] ||= [b("span", {
			class: "base-table__spinner",
			role: "status",
			"aria-label": "Loading…"
		}, null, -1)]])) : v("", !0), b("table", { class: j(["base-table", {
			"base-table--striped": e.striped,
			"base-table--bordered": e.bordered,
			"base-table--hoverable": e.hoverable
		}]) }, [
			e.caption ? (N(), y("caption", Wl, [w(H, {
				variant: "body-md",
				weight: "semibold",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.caption), 1)]),
				_: 1
			})])) : v("", !0),
			w(Ll, {
				columns: e.columns,
				"sort-key": i.value,
				"sort-dir": a.value,
				onSort: s
			}, null, 8, [
				"columns",
				"sort-key",
				"sort-dir"
			]),
			w(Vl, {
				rows: o.value,
				columns: e.columns,
				loading: e.loading,
				"empty-text": e.emptyText
			}, x({ _: 2 }, [F(e.columns, (e) => ({
				name: `cell-${e.key}`,
				fn: z((n) => [I(t.$slots, `cell-${e.key}`, te(D(n)), void 0, !0)])
			}))]), 1032, [
				"rows",
				"columns",
				"loading",
				"empty-text"
			])
		], 2)]));
	}
}), [["__scopeId", "data-v-1a3005af"]]), Kl = ["aria-describedby"], ql = ["id"], Jl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTooltip",
	props: {
		content: {},
		placement: { default: "top" },
		disabled: {
			type: Boolean,
			default: !1
		},
		delay: { default: 0 }
	},
	setup(e) {
		let t = e, { id: n } = Fn(void 0), r = P(!1), i = null, a = P(null), o = P(null), s = P(null), { floatingStyles: c, middlewareData: l, placement: u } = Cn(a, o, {
			placement: t.placement,
			whileElementsMounted: on,
			middleware: [
				sn(8),
				ln(),
				cn({ padding: 4 }),
				bn({ element: s })
			]
		});
		function d(e) {
			i && clearTimeout(i), i = setTimeout(() => {
				r.value = !0;
			}, e);
		}
		function f() {
			i && clearTimeout(i), r.value = !1;
		}
		function p() {
			let e = l.value.arrow;
			if (!e) return {};
			let { x: t, y: n } = e, r = u.value.split("-")[0];
			return {
				left: t == null ? "" : `${t}px`,
				top: n == null ? "" : `${n}px`,
				[{
					top: "bottom",
					bottom: "top",
					left: "right",
					right: "left"
				}[r]]: "-4px"
			};
		}
		return (t, i) => (N(), y("span", {
			class: "base-tooltip-wrapper",
			onMouseenter: i[0] ||= (t) => !e.disabled && d(e.delay),
			onMouseleave: f,
			onFocusin: i[1] ||= (t) => !e.disabled && d(0),
			onFocusout: f
		}, [b("span", {
			ref_key: "referenceEl",
			ref: a,
			"aria-describedby": r.value && !e.disabled ? R(n) : void 0,
			class: "base-tooltip-trigger"
		}, [I(t.$slots, "default", {}, void 0, !0)], 8, Kl), w(h, { name: "base-tooltip-fade" }, {
			default: z(() => [r.value && !e.disabled ? (N(), y("span", {
				key: 0,
				id: R(n),
				ref_key: "floatingEl",
				ref: o,
				class: j(["base-tooltip", `base-tooltip--${R(u).split("-")[0]}`]),
				role: "tooltip",
				style: M(R(c))
			}, [w(H, {
				variant: "caption",
				as: "span",
				color: "inherit"
			}, {
				default: z(() => [C(L(e.content), 1)]),
				_: 1
			}), b("span", {
				ref_key: "arrowEl",
				ref: s,
				class: "base-tooltip__arrow",
				style: M(p()),
				"aria-hidden": "true"
			}, null, 4)], 14, ql)) : v("", !0)]),
			_: 1
		})], 32));
	}
}), [["__scopeId", "data-v-cf879db2"]]), Yl = { class: "base-popover-host" }, Xl = ["data-placement", "aria-label"], Zl = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BasePopover",
	props: {
		open: {
			type: Boolean,
			default: !1
		},
		placement: { default: "bottom-start" },
		offset: { default: 6 },
		closeOnOutsideClick: {
			type: Boolean,
			default: !0
		},
		label: { default: void 0 }
	},
	emits: ["update:open", "close"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(null), o = P(null), { floatingStyles: s, middlewareData: c, placement: l } = Cn(i, a, {
			placement: n.placement,
			whileElementsMounted: on,
			middleware: [
				sn(n.offset),
				ln({ padding: 8 }),
				cn({ padding: 8 }),
				bn({ element: o })
			]
		});
		function u() {
			let e = c.value.arrow;
			if (!e) return {};
			let { x: t, y: n } = e, r = l.value.split("-")[0];
			return {
				left: t == null ? "" : `${t}px`,
				top: n == null ? "" : `${n}px`,
				[{
					top: "bottom",
					bottom: "top",
					left: "right",
					right: "left"
				}[r]]: "-4px"
			};
		}
		function d(e) {
			if (!n.closeOnOutsideClick || !n.open) return;
			let t = e.target;
			i.value?.contains(t) || a.value?.contains(t) || (r("update:open", !1), r("close"));
		}
		return pe(() => n.open, (e) => {
			e ? document.addEventListener("mousedown", d) : document.removeEventListener("mousedown", d);
		}, { immediate: !0 }), (t, n) => (N(), y("div", Yl, [b("div", {
			ref_key: "referenceEl",
			ref: i,
			class: "base-popover-trigger"
		}, [I(t.$slots, "trigger", {}, void 0, !0)], 512), w(h, { name: "base-popover-fade" }, {
			default: z(() => [e.open ? (N(), y("dialog", {
				key: 0,
				ref_key: "floatingEl",
				ref: a,
				class: "base-popover",
				"data-placement": R(l),
				style: M(R(s)),
				"aria-label": e.label
			}, [I(t.$slots, "default", {}, void 0, !0), b("span", {
				ref_key: "arrowEl",
				ref: o,
				class: "base-popover__arrow",
				style: M(u()),
				"aria-hidden": "true"
			}, null, 4)], 12, Xl)) : v("", !0)]),
			_: 3
		})]));
	}
}), [["__scopeId", "data-v-9a8b5c75"]]), Ql = { class: "base-window-popout" }, $l = {
	key: 0,
	class: "base-window-popout__inline"
}, eu = {
	key: 1,
	class: "base-window-popout__placeholder",
	"aria-live": "polite"
}, tu = { class: "base-window-popout__controls" }, nu = ["aria-pressed"], ru = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseWindowPopout",
	props: {
		title: { default: void 0 },
		width: { default: 800 },
		height: { default: 600 }
	},
	emits: ["open", "close"],
	setup(e, { expose: t, emit: n }) {
		let r = e, i = n, { t: a } = _e({
			inheritLocale: !0,
			messages: { en: {
				popout: "Pop out",
				popin: "Pop back in"
			} }
		}), o = P(!1), s = P(null), c = P(null), l = null;
		function u(e, t) {
			Array.from(e.querySelectorAll("link[rel=\"stylesheet\"], style")).forEach((e) => {
				t.head.appendChild(e.cloneNode(!0));
			});
		}
		function d() {
			let e = `width=${r.width},height=${r.height},resizable=yes,scrollbars=yes`, t = window.open("", "_blank", e);
			if (!t) return;
			t.document.title = r.title ?? document.title, t.document.body.style.margin = "0";
			let n = t.document.createElement("div");
			n.setAttribute("id", "mp-popout-root"), n.style.height = "100%", t.document.body.appendChild(n), u(document, t.document), s.value = t, c.value = n, o.value = !0, i("open"), l = setInterval(() => {
				t.closed && (f(), i("close"));
			}, 250), t.addEventListener("beforeunload", () => {
				f(), i("close");
			});
		}
		function f() {
			l &&= (clearInterval(l), null), s.value = null, c.value = null, o.value = !1;
		}
		function p() {
			s.value && !s.value.closed && s.value.close(), f(), i("close");
		}
		return ne(() => {
			l && clearInterval(l), s.value && !s.value.closed && s.value.close();
		}), t({
			openPopout: d,
			closePopout: p,
			isPopped: o
		}), (e, t) => (N(), y("div", Ql, [
			o.value ? (N(), y("output", eu, [I(e.$slots, "placeholder", {}, () => [w(H, {
				variant: "body-sm",
				as: "p",
				color: "secondary",
				class: "base-window-popout__placeholder-text"
			}, {
				default: z(() => [I(e.$slots, "placeholder-text", {}, () => [t[1] ||= C("Content is open in a separate window.", -1)], !0)]),
				_: 3
			})], !0)])) : (N(), y("div", $l, [I(e.$slots, "default", {}, void 0, !0)])),
			o.value && c.value ? (N(), _(m, {
				key: 2,
				to: c.value
			}, [I(e.$slots, "default", {}, void 0, !0)], 8, ["to"])) : v("", !0),
			b("div", tu, [I(e.$slots, "controls", {
				isPopped: o.value,
				open: d,
				close: p
			}, () => [b("button", {
				type: "button",
				class: "base-window-popout__toggle",
				"aria-pressed": o.value,
				onClick: t[0] ||= (e) => o.value ? p() : d()
			}, [o.value ? (N(), _(R(Yn), {
				key: 1,
				size: "sm",
				direction: "left"
			})) : (N(), _(R(_r), {
				key: 0,
				size: "sm"
			})), w(H, {
				variant: "body-sm",
				as: "span",
				color: "inherit",
				class: "base-window-popout__toggle-label"
			}, {
				default: z(() => [C(L(o.value ? R(a)("popin") : R(a)("popout")), 1)]),
				_: 1
			})], 8, nu)], !0)])
		]));
	}
}), [["__scopeId", "data-v-3276b792"]]), iu = { class: "application-layout" }, au = ["aria-hidden", "role"], ou = {
	role: "none",
	class: "application-layout__header"
}, su = { class: "application-layout__content" }, cu = {
	role: "none",
	class: "application-layout__footer"
}, lu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseApplicationLayout",
	props: { statusLevel: { default: "none" } },
	setup(e) {
		let t = e, n = g(() => {
			switch (t.statusLevel) {
				case "info": return "var(--mp-color-info-default)";
				case "warning": return "var(--mp-color-warning-default)";
				case "error": return "var(--mp-color-danger-default)";
				default: return "transparent";
			}
		}), r = g(() => t.statusLevel === "none" ? void 0 : "var(--mp-color-text-on-primary)"), i = g(() => {
			if (t.statusLevel === "error") return "alert";
			if (t.statusLevel !== "none") return "status";
		});
		return (t, a) => (N(), y("div", iu, [
			b("div", {
				class: "application-layout__status",
				style: M({
					backgroundColor: n.value,
					color: r.value
				}),
				"aria-hidden": e.statusLevel === "none" || void 0,
				role: i.value
			}, [I(t.$slots, "status", {}, void 0, !0)], 12, au),
			b("div", ou, [I(t.$slots, "navbar", {}, void 0, !0)]),
			b("main", su, [I(t.$slots, "content", {}, void 0, !0)]),
			b("div", cu, [I(t.$slots, "footer", {}, void 0, !0)])
		]));
	}
}), [["__scopeId", "data-v-71cac112"]]), uu = {
	none: "none",
	info: "info",
	warning: "warning",
	error: "error"
}, du = {
	class: "avatar",
	style: {
		position: "relative",
		display: "inline-flex"
	}
}, fu = ["src", "alt"], pu = {
	key: 1,
	class: "avatar__initials"
}, mu = ["aria-label"], hu = /* @__PURE__ */ T({
	__name: "BaseAvatar",
	props: {
		src: { default: void 0 },
		alt: { default: "" },
		initials: { default: void 0 },
		size: { default: "md" },
		shape: { default: "circle" },
		status: { default: void 0 },
		color: { default: void 0 }
	},
	setup(e) {
		let t = e, n = {
			xs: "24px",
			sm: "32px",
			md: "40px",
			lg: "56px",
			xl: "80px"
		}, r = {
			xs: "var(--mp-font-size-xs)",
			sm: "var(--mp-font-size-sm)",
			md: "var(--mp-font-size-md)",
			lg: "var(--mp-font-size-lg)",
			xl: "var(--mp-font-size-2xl)"
		}, i = {
			xs: "6px",
			sm: "8px",
			md: "10px",
			lg: "13px",
			xl: "18px"
		}, a = {
			online: "var(--mp-color-success-default)",
			offline: "var(--mp-color-border-default)",
			away: "var(--mp-color-warning-default)",
			busy: "var(--mp-color-danger-default)"
		}, o = g(() => n[t.size]), s = g(() => r[t.size]), c = g(() => i[t.size]), l = g(() => t.status ? a[t.status] : void 0), u = g(() => ({
			width: o.value,
			height: o.value,
			borderRadius: t.shape === "circle" ? "50%" : "var(--mp-radius-md)",
			backgroundColor: t.src ? void 0 : t.color ?? "var(--mp-color-primary-default)",
			fontSize: s.value,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			overflow: "hidden",
			flexShrink: "0",
			color: "var(--mp-color-text-on-primary)",
			fontWeight: "var(--mp-font-weight-semibold)",
			fontFamily: "var(--mp-font-family-sans)",
			userSelect: "none"
		}));
		return (t, n) => (N(), y("div", du, [b("div", {
			style: M([u.value]),
			class: j([
				"avatar__image",
				`avatar--${e.size}`,
				`avatar--${e.shape}`
			])
		}, [e.src ? (N(), y("img", {
			key: 0,
			src: e.src,
			alt: e.alt,
			style: {
				width: "100%",
				height: "100%",
				"object-fit": "cover"
			}
		}, null, 8, fu)) : e.initials ? (N(), y("span", pu, L(e.initials), 1)) : I(t.$slots, "default", { key: 2 })], 6), e.status ? (N(), y("span", {
			key: 0,
			class: "avatar__status",
			role: "status",
			"aria-atomic": "false",
			"aria-live": "off",
			"aria-label": e.status,
			style: M({
				position: "absolute",
				bottom: "0",
				right: "0",
				width: c.value,
				height: c.value,
				borderRadius: "50%",
				backgroundColor: l.value,
				border: "2px solid var(--mp-color-bg-surface)",
				display: "block"
			})
		}, null, 12, mu)) : v("", !0)]));
	}
}), gu = /* @__PURE__ */ T({
	__name: "BaseInView",
	props: {
		threshold: { default: .15 },
		rootMargin: { default: "0px" },
		animation: { default: "fade" },
		duration: { default: 500 },
		delay: { default: 0 },
		once: {
			type: Boolean,
			default: !0
		},
		tag: { default: "div" }
	},
	emits: ["enter", "leave"],
	setup(e, { expose: t, emit: n }) {
		let r = e, i = n, a = P(null), o = P(!1), s = P(!1), c = g(() => {
			switch (r.animation) {
				case "fade": return { opacity: "0" };
				case "slide-up": return {
					opacity: "0",
					transform: "translateY(24px)"
				};
				case "slide-left": return {
					opacity: "0",
					transform: "translateX(24px)"
				};
				case "slide-right": return {
					opacity: "0",
					transform: "translateX(-24px)"
				};
				case "scale": return {
					opacity: "0",
					transform: "scale(0.92)"
				};
				default: return {};
			}
		}), l = g(() => r.animation === "none" ? {} : {
			opacity: "1",
			transform: "none"
		}), u = g(() => {
			let e = r.animation === "none" ? {} : { transition: `opacity ${r.duration}ms ease ${r.delay}ms, transform ${r.duration}ms ease ${r.delay}ms` };
			return {
				...o.value ? l.value : c.value,
				...e
			};
		}), d = null;
		function f() {
			a.value && (d = new IntersectionObserver((e) => {
				e[0].isIntersecting ? (o.value = !0, s.value = !0, i("enter"), r.once && (d?.disconnect(), d = null)) : r.once || (o.value = !1, i("leave"));
			}, {
				threshold: r.threshold,
				rootMargin: r.rootMargin
			}), d.observe(a.value));
		}
		return re(f), ie(() => d?.disconnect()), t({
			inView: o,
			hasBeenInView: s
		}), (t, n) => (N(), _(le(e.tag), {
			ref_key: "wrapperRef",
			ref: a,
			class: "in-view",
			style: M(u.value)
		}, {
			default: z(() => [I(t.$slots, "default", {
				inView: o.value,
				hasBeenInView: s.value
			})]),
			_: 3
		}, 8, ["style"]));
	}
}), _u = /* @__PURE__ */ T({
	__name: "BaseVirtualList",
	props: {
		items: {},
		itemHeight: {},
		overscan: { default: 3 },
		height: { default: 400 }
	},
	setup(e) {
		let t = e, n = P(0), r = P(null), i = g(() => t.items.length * t.itemHeight), a = g(() => {
			let e = Math.floor(n.value / t.itemHeight) - t.overscan;
			return Math.max(0, e);
		}), o = g(() => {
			let e = Math.ceil(t.height / t.itemHeight), r = Math.floor(n.value / t.itemHeight) + e + t.overscan;
			return Math.min(t.items.length - 1, r);
		}), s = g(() => t.items.slice(a.value, o.value + 1).map((e, t) => ({
			item: e,
			index: a.value + t
		}))), c = g(() => a.value * t.itemHeight);
		function l(e) {
			n.value = e.target.scrollTop;
		}
		return re(() => {
			r.value?.addEventListener("scroll", l, { passive: !0 });
		}), ie(() => {
			r.value?.removeEventListener("scroll", l);
		}), (t, n) => (N(), y("div", {
			ref_key: "containerRef",
			ref: r,
			class: "virtual-list",
			role: "list",
			tabindex: "0",
			style: M({
				height: `${e.height}px`,
				overflowY: "auto",
				position: "relative"
			})
		}, [b("div", {
			style: M({
				height: `${i.value}px`,
				position: "relative",
				pointerEvents: "none"
			}),
			"aria-hidden": "true"
		}, null, 4), b("div", { style: M({
			position: "absolute",
			top: `${c.value}px`,
			left: 0,
			right: 0
		}) }, [(N(!0), y(p, null, F(s.value, ({ item: n, index: r }) => (N(), y("div", {
			key: r,
			role: "listitem",
			style: M({
				height: `${e.itemHeight}px`,
				boxSizing: "border-box"
			})
		}, [I(t.$slots, "default", {
			item: n,
			index: r
		})], 4))), 128))], 4)], 4));
	}
}), vu = {
	role: "row",
	style: {
		display: "flex",
		width: "100%"
	}
}, yu = [
	"aria-sort",
	"tabindex",
	"onClick",
	"onKeydown"
], bu = /* @__PURE__ */ T({
	__name: "BaseVirtualTableHead",
	props: {
		columns: {},
		sortKey: {},
		sortDir: {},
		bordered: { type: Boolean },
		headerHeight: {}
	},
	emits: ["sort"],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("div", {
			class: "virtual-table__head",
			role: "rowgroup",
			style: M({
				height: `${e.headerHeight}px`,
				flexShrink: "0",
				display: "flex",
				alignItems: "center",
				borderBottom: "2px solid var(--mp-color-border-strong)",
				background: "var(--mp-color-bg-sunken)",
				overflow: "hidden"
			})
		}, [b("div", vu, [(N(!0), y(p, null, F(e.columns, (t) => (N(), y("div", {
			key: t.key,
			role: "columnheader",
			style: M({
				flex: t.width ? `0 0 ${t.width}` : "1",
				minWidth: t.width ?? "80px",
				padding: "0 var(--mp-spacing-3)",
				fontSize: "var(--mp-font-size-xs)",
				fontWeight: "var(--mp-font-weight-semibold)",
				color: "var(--mp-color-text-secondary)",
				letterSpacing: "0.04em",
				textTransform: "uppercase",
				textAlign: t.align ?? "left",
				cursor: t.sortable ? "pointer" : "default",
				userSelect: "none",
				display: "flex",
				alignItems: "center",
				gap: "var(--mp-spacing-1)",
				borderRight: e.bordered ? "1px solid var(--mp-color-border-default)" : void 0
			}),
			"aria-sort": t.sortable && e.sortKey === t.key ? e.sortDir === "asc" ? "ascending" : "descending" : void 0,
			tabindex: t.sortable ? 0 : void 0,
			onClick: (e) => n("sort", t),
			onKeydown: [ge(B((e) => n("sort", t), ["prevent"]), ["enter"]), ge(B((e) => n("sort", t), ["prevent"]), ["space"])]
		}, [b("span", null, L(t.label), 1), t.sortable ? (N(), _(R(rr), {
			key: 0,
			active: e.sortKey === t.key,
			direction: e.sortDir,
			size: "xs"
		}, null, 8, ["active", "direction"])) : v("", !0)], 44, yu))), 128))])], 4));
	}
}), xu = ["aria-rowindex"], Su = /* @__PURE__ */ T({
	__name: "BaseVirtualTableRow",
	props: {
		row: {},
		index: {},
		columns: {},
		rowHeight: {},
		striped: { type: Boolean },
		bordered: { type: Boolean }
	},
	emits: ["rowClick"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i(e) {
			let t = n.row[e.key];
			return e.render ? e.render(t, n.row) : t == null ? "" : String(t);
		}
		function a() {
			return n.striped && n.index % 2 != 0 ? "var(--mp-color-bg-sunken)" : "var(--mp-color-bg-surface)";
		}
		function o(e) {
			e.style.backgroundColor = "var(--mp-color-bg-muted)";
		}
		function s(e) {
			e.style.backgroundColor = a();
		}
		return (t, n) => (N(), y("div", {
			class: "virtual-table__row",
			role: "row",
			"aria-rowindex": e.index + 1,
			style: M({
				display: "flex",
				alignItems: "center",
				height: `${e.rowHeight}px`,
				borderBottom: "1px solid var(--mp-color-border-default)",
				backgroundColor: a(),
				cursor: "default",
				transition: "background-color 80ms ease"
			}),
			onClick: n[0] ||= (t) => r("rowClick", e.row, e.index),
			onMouseover: n[1] ||= (e) => o(e.currentTarget),
			onMouseleave: n[2] ||= (e) => s(e.currentTarget)
		}, [(N(!0), y(p, null, F(e.columns, (n) => (N(), y("div", {
			key: n.key,
			role: "gridcell",
			style: M({
				flex: n.width ? `0 0 ${n.width}` : "1",
				minWidth: n.width ?? "80px",
				padding: "0 var(--mp-spacing-3)",
				fontSize: "var(--mp-font-size-sm)",
				color: "var(--mp-color-text-primary)",
				textAlign: n.align ?? "left",
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				borderRight: e.bordered ? "1px solid var(--mp-color-border-default)" : void 0
			})
		}, [I(t.$slots, `cell-${n.key}`, {
			value: e.row[n.key],
			row: e.row,
			index: e.index
		}, () => [C(L(i(n)), 1)])], 4))), 128))], 44, xu));
	}
}), Cu = {
	class: "virtual-table__footer",
	style: {
		flexShrink: "0",
		padding: "var(--mp-spacing-2) var(--mp-spacing-4)",
		borderTop: "1px solid var(--mp-color-border-default)",
		background: "var(--mp-color-bg-sunken)",
		fontSize: "var(--mp-font-size-xs)",
		color: "var(--mp-color-text-tertiary)",
		display: "flex",
		justifyContent: "space-between"
	}
}, wu = { key: 0 }, Tu = { style: { color: "var(--mp-color-text-primary)" } }, Eu = /* @__PURE__ */ T({
	__name: "BaseVirtualTableFooter",
	props: {
		rowCount: {},
		sortKey: {},
		sortDir: {}
	},
	setup(e) {
		return (t, n) => (N(), y("div", Cu, [I(t.$slots, "default", {}, () => [b("span", null, L(e.rowCount.toLocaleString()) + " rows", 1), e.sortKey ? (N(), y("span", wu, [
			n[0] ||= C(" Sorted by ", -1),
			b("strong", Tu, L(e.sortKey), 1),
			C(" (" + L(e.sortDir) + ") ", 1)
		])) : v("", !0)])]));
	}
}), Du = ["aria-label", "aria-rowcount"], Ou = ["aria-colspan"], ku = 44, Au = /* @__PURE__ */ T({
	__name: "BaseVirtualTable",
	props: {
		columns: {},
		rows: {},
		rowHeight: { default: 48 },
		height: { default: 480 },
		overscan: { default: 3 },
		striped: {
			type: Boolean,
			default: !1
		},
		bordered: {
			type: Boolean,
			default: !1
		},
		caption: { default: void 0 },
		emptyText: { default: "No data available" }
	},
	emits: ["sort", "rowClick"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P(null), a = P(null), o = g(() => !i.value || !a.value ? n.rows : [...n.rows].sort((e, t) => {
			let n = e[i.value], r = t[i.value], o = String(n).localeCompare(String(r), void 0, { numeric: !0 });
			return a.value === "asc" ? o : -o;
		}));
		function s(e) {
			e.sortable && (i.value === e.key ? a.value === "asc" ? a.value = "desc" : (i.value = null, a.value = null) : (i.value = e.key, a.value = "asc"), r("sort", e.key, a.value));
		}
		let c = P(0), l = P(null), u = g(() => n.height - ku), d = g(() => o.value.length * n.rowHeight), f = g(() => {
			let e = Math.floor(c.value / n.rowHeight) - n.overscan;
			return Math.max(0, e);
		}), m = g(() => {
			let e = Math.ceil(u.value / n.rowHeight), t = Math.floor(c.value / n.rowHeight) + e + n.overscan;
			return Math.min(o.value.length - 1, t);
		}), h = g(() => o.value.slice(f.value, m.value + 1).map((e, t) => ({
			row: e,
			index: f.value + t
		}))), S = g(() => f.value * n.rowHeight);
		function C(e) {
			c.value = e.target.scrollTop;
		}
		return re(() => {
			l.value?.addEventListener("scroll", C, { passive: !0 });
		}), ie(() => {
			l.value?.removeEventListener("scroll", C);
		}), (t, n) => (N(), y("div", {
			class: "virtual-table",
			role: "table",
			"aria-label": e.caption || void 0,
			"aria-rowcount": o.value.length,
			style: M({
				height: `${e.height}px`,
				display: "flex",
				flexDirection: "column",
				border: "1px solid var(--mp-color-border-default)",
				borderRadius: "var(--mp-radius-md)",
				overflow: "hidden",
				background: "var(--mp-color-bg-surface)"
			})
		}, [
			w(bu, {
				columns: e.columns,
				"sort-key": i.value,
				"sort-dir": a.value,
				bordered: e.bordered,
				"header-height": ku,
				onSort: s
			}, null, 8, [
				"columns",
				"sort-key",
				"sort-dir",
				"bordered"
			]),
			b("div", {
				ref_key: "bodyRef",
				ref: l,
				class: "virtual-table__body",
				role: "rowgroup",
				tabindex: "0",
				style: {
					flex: "1",
					overflowY: "auto",
					position: "relative",
					WebkitOverflowScrolling: "touch"
				}
			}, [o.value.length === 0 ? (N(), y("div", {
				key: 0,
				role: "row",
				"aria-rowindex": "1",
				style: M({
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: `${u.value}px`,
					color: "var(--mp-color-text-tertiary)",
					fontSize: "var(--mp-font-size-sm)"
				})
			}, [b("span", {
				role: "gridcell",
				"aria-colspan": e.columns.length
			}, L(e.emptyText), 9, Ou)], 4)) : (N(), y("div", {
				key: 1,
				style: M({
					height: `${d.value}px`,
					position: "relative",
					pointerEvents: "none"
				}),
				"aria-hidden": "true"
			}, null, 4)), o.value.length > 0 ? (N(), y("div", {
				key: 2,
				style: M({
					position: "absolute",
					top: `${S.value}px`,
					left: 0,
					right: 0
				})
			}, [(N(!0), y(p, null, F(h.value, ({ row: i, index: a }) => (N(), _(Su, {
				key: a,
				row: i,
				index: a,
				columns: e.columns,
				"row-height": e.rowHeight,
				striped: e.striped,
				bordered: e.bordered,
				onRowClick: n[0] ||= (e, t) => r("rowClick", e, t)
			}, x({ _: 2 }, [F(e.columns, (e) => ({
				name: `cell-${e.key}`,
				fn: z((n) => [I(t.$slots, `cell-${e.key}`, A({ ref_for: !0 }, n))])
			}))]), 1032, [
				"row",
				"index",
				"columns",
				"row-height",
				"striped",
				"bordered"
			]))), 128))], 4)) : v("", !0)], 512),
			w(Eu, {
				"row-count": o.value.length,
				"sort-key": i.value,
				"sort-dir": a.value
			}, x({ _: 2 }, [t.$slots.footer ? {
				name: "default",
				fn: z(() => [I(t.$slots, "footer")]),
				key: "0"
			} : void 0]), 1032, [
				"row-count",
				"sort-key",
				"sort-dir"
			])
		], 12, Du));
	}
}), ju = ["aria-expanded"], Mu = ["aria-label"], Nu = {
	key: 1,
	class: "tree-node__spacer"
}, Pu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTreeNodeLabel",
	props: {
		node: {},
		depth: {},
		isOpen: { type: Boolean },
		hasChildren: { type: Boolean }
	},
	emits: [
		"toggle",
		"select",
		"keydown"
	],
	setup(e, { emit: t }) {
		let n = t;
		return (t, r) => (N(), y("span", {
			class: "tree-node__label",
			role: "treeitem",
			tabindex: "0",
			"aria-expanded": e.hasChildren ? e.isOpen : void 0,
			style: M({ paddingLeft: `${e.depth * 20}px` }),
			onClick: r[1] ||= (e) => n("select"),
			onKeydown: r[2] ||= (e) => n("keydown", e)
		}, [e.hasChildren ? (N(), y("button", {
			key: 0,
			class: j(["tree-node__toggle", { "tree-node__toggle--open": e.isOpen }]),
			"aria-label": e.isOpen ? "Collapse" : "Expand",
			onClick: r[0] ||= B((e) => n("toggle"), ["stop"])
		}, [w(R(qn), {
			direction: e.isOpen ? "up" : "right",
			size: "xs"
		}, null, 8, ["direction"])], 10, Mu)) : (N(), y("span", Nu)), I(t.$slots, "default", {}, () => [w(H, {
			variant: "body-sm",
			as: "span",
			color: "inherit"
		}, {
			default: z(() => [C(L(e.node.label), 1)]),
			_: 1
		})], !0)], 44, ju));
	}
}), [["__scopeId", "data-v-98f1e817"]]), Fu = {
	class: "tree-node",
	role: "none"
}, Iu = {
	key: 0,
	class: "tree-node__children",
	role: "group"
}, Lu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTreeNode",
	props: {
		node: {},
		depth: {},
		isOpenFn: { type: Function }
	},
	emits: ["toggle", "select"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i(e) {
			return Array.isArray(e.children) && e.children.length > 0;
		}
		function a() {
			r("select", n.node);
		}
		function o(e) {
			(e.key === "Enter" || e.key === " ") && (e.preventDefault(), r("select", n.node)), e.key === "ArrowRight" && i(n.node) && !n.isOpenFn(n.node) && r("toggle", n.node), e.key === "ArrowLeft" && i(n.node) && n.isOpenFn(n.node) && r("toggle", n.node);
		}
		return (t, n) => {
			let s = ce("BaseTreeNode", !0);
			return N(), y("li", Fu, [w(Pu, {
				node: e.node,
				depth: e.depth,
				"is-open": e.isOpenFn(e.node),
				"has-children": i(e.node),
				onToggle: n[0] ||= (t) => r("toggle", e.node),
				onSelect: a,
				onKeydown: o
			}, {
				default: z(() => [I(t.$slots, "label", {
					node: e.node,
					depth: e.depth
				}, void 0, !0)]),
				_: 3
			}, 8, [
				"node",
				"depth",
				"is-open",
				"has-children"
			]), i(e.node) && e.isOpenFn(e.node) ? (N(), y("ul", Iu, [(N(!0), y(p, null, F(e.node.children, (i) => (N(), _(s, {
				key: i.id,
				node: i,
				depth: e.depth + 1,
				"is-open-fn": e.isOpenFn,
				onToggle: n[1] ||= (e) => r("toggle", e),
				onSelect: n[2] ||= (e) => r("select", e)
			}, x({ _: 2 }, [t.$slots.label ? {
				name: "label",
				fn: z((e) => [I(t.$slots, "label", A({ ref_for: !0 }, e), void 0, !0)]),
				key: "0"
			} : void 0]), 1032, [
				"node",
				"depth",
				"is-open-fn"
			]))), 128))])) : v("", !0)]);
		};
	}
}), [["__scopeId", "data-v-6dace8a3"]]), Ru = {
	class: "tree-view",
	role: "tree"
}, zu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTreeView",
	props: {
		nodes: {},
		defaultOpen: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["select", "toggle"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P({});
		function a(e) {
			return e.id in i.value ? i.value[e.id] : n.defaultOpen;
		}
		function o(e) {
			i.value = {
				...i.value,
				[e.id]: !a(e)
			}, r("toggle", e);
		}
		function s(e) {
			r("select", e);
		}
		return (t, n) => (N(), y("ul", Ru, [(N(!0), y(p, null, F(e.nodes, (e) => (N(), _(Lu, {
			key: e.id,
			node: e,
			depth: 0,
			"is-open-fn": a,
			onToggle: o,
			onSelect: s
		}, x({ _: 2 }, [t.$slots.label ? {
			name: "label",
			fn: z((e) => [I(t.$slots, "label", A({ ref_for: !0 }, e), void 0, !0)]),
			key: "0"
		} : void 0]), 1032, ["node"]))), 128))]));
	}
}), [["__scopeId", "data-v-6bc59c9f"]]), Bu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseVirtualTreeView",
	props: {
		nodes: {},
		itemHeight: { default: 32 },
		overscan: { default: 3 },
		height: { default: 400 },
		defaultOpen: {
			type: Boolean,
			default: !1
		}
	},
	emits: ["select", "toggle"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = P({});
		function a(e) {
			return e.id in i.value ? i.value[e.id] : n.defaultOpen;
		}
		function o(e) {
			i.value = {
				...i.value,
				[e.id]: !a(e)
			}, r("toggle", e);
		}
		function s(e) {
			r("select", e);
		}
		function c(e, t) {
			let n = [];
			for (let r of e) n.push({
				node: r,
				depth: t
			}), a(r) && Array.isArray(r.children) && r.children.length > 0 && n.push(...c(r.children, t + 1));
			return n;
		}
		let l = g(() => c(n.nodes, 0)), u = P(0), d = P(null), f = g(() => l.value.length * n.itemHeight), m = g(() => {
			let e = Math.floor(u.value / n.itemHeight) - n.overscan;
			return Math.max(0, e);
		}), h = g(() => {
			let e = Math.ceil(n.height / n.itemHeight), t = Math.floor(u.value / n.itemHeight) + e + n.overscan;
			return Math.min(l.value.length - 1, t);
		}), _ = g(() => l.value.slice(m.value, h.value + 1).map((e, t) => ({
			...e,
			index: m.value + t
		}))), v = g(() => m.value * n.itemHeight);
		function x(e) {
			u.value = e.target.scrollTop;
		}
		return re(() => {
			d.value?.addEventListener("scroll", x, { passive: !0 });
		}), ie(() => {
			d.value?.removeEventListener("scroll", x);
		}), (t, n) => (N(), y("div", {
			ref_key: "containerRef",
			ref: d,
			class: "virtual-tree",
			role: "tree",
			tabindex: "0",
			style: M({
				height: `${e.height}px`,
				overflowY: "auto",
				position: "relative"
			})
		}, [b("div", {
			style: M({
				height: `${f.value}px`,
				position: "relative",
				pointerEvents: "none"
			}),
			"aria-hidden": "true"
		}, null, 4), b("div", { style: M({
			position: "absolute",
			top: `${v.value}px`,
			left: 0,
			right: 0
		}) }, [(N(!0), y(p, null, F(_.value, ({ node: n, depth: r }) => (N(), y("div", {
			key: n.id,
			class: "virtual-tree__row",
			role: "none",
			style: M({
				height: `${e.itemHeight}px`,
				boxSizing: "border-box"
			})
		}, [I(t.$slots, "default", {
			node: n,
			depth: r,
			isOpen: a(n),
			toggle: () => o(n),
			select: () => s(n)
		}, () => [w(Pu, {
			node: n,
			depth: r,
			"is-open": a(n),
			"has-children": !!n.children?.length,
			onToggle: (e) => o(n),
			onSelect: (e) => s(n),
			onKeydown: (e) => {
				(e.key === "Enter" || e.key === " ") && (e.preventDefault(), s(n));
			}
		}, null, 8, [
			"node",
			"depth",
			"is-open",
			"has-children",
			"onToggle",
			"onSelect",
			"onKeydown"
		])], !0)], 4))), 128))], 4)], 4));
	}
}), [["__scopeId", "data-v-d238e88e"]]), Vu = { class: "log-viewer__toolbar" }, Hu = { class: "log-viewer__filter-badge" }, Uu = /* @__PURE__ */ T({
	__name: "BaseLogViewerToolbar",
	props: {
		filteredCount: {},
		totalCount: {}
	},
	setup(e) {
		return (t, n) => (N(), y("div", Vu, [b("span", Hu, L(e.filteredCount.toLocaleString()) + " / " + L(e.totalCount.toLocaleString()) + " entries ", 1)]));
	}
}), Wu = /* @__PURE__ */ T({
	__name: "BaseLogViewerRow",
	props: {
		entry: {},
		index: {},
		itemHeight: {},
		showLevel: { type: Boolean },
		showTimestamp: { type: Boolean }
	},
	emits: ["select"],
	setup(e, { emit: t }) {
		let n = t, r = {
			debug: "var(--mp-color-text-secondary)",
			info: "var(--mp-color-info-default)",
			warn: "var(--mp-color-warning-default)",
			error: "var(--mp-color-danger-default)",
			fatal: "var(--mp-color-danger-emphasis)"
		}, i = {
			debug: hr,
			info: sr,
			warn: lr,
			error: dr,
			fatal: pr
		};
		return (t, a) => (N(), y("div", {
			class: j(["log-viewer__row", `log-viewer__row--${e.entry.level}`]),
			style: M({
				height: `${e.itemHeight}px`,
				boxSizing: "border-box"
			}),
			tabindex: "0",
			onClick: a[0] ||= (t) => n("select", e.entry),
			onKeydown: a[1] ||= ge(B((t) => n("select", e.entry), ["prevent"]), ["enter"])
		}, [
			w(H, {
				variant: "code",
				as: "span",
				color: "tertiary",
				class: "log-viewer__line-no"
			}, {
				default: z(() => [C(L(e.index + 1), 1)]),
				_: 1
			}),
			e.showTimestamp && e.entry.timestamp ? (N(), _(H, {
				key: 0,
				variant: "code",
				as: "span",
				color: "tertiary",
				class: "log-viewer__timestamp"
			}, {
				default: z(() => [C(L(e.entry.timestamp), 1)]),
				_: 1
			})) : v("", !0),
			e.showLevel ? (N(), y("span", {
				key: 1,
				class: "log-viewer__level",
				style: M({ color: r[e.entry.level] })
			}, [(N(), _(le(i[e.entry.level]), {
				size: "xs",
				"aria-label": e.entry.level
			}, null, 8, ["aria-label"])), w(H, {
				variant: "code",
				as: "span",
				color: "inherit",
				class: "log-viewer__level-label"
			}, {
				default: z(() => [C(L(e.entry.level.toUpperCase()), 1)]),
				_: 1
			})], 4)) : v("", !0),
			w(H, {
				variant: "code",
				as: "span",
				color: "inherit",
				class: "log-viewer__message"
			}, {
				default: z(() => [C(L(e.entry.message), 1)]),
				_: 1
			})
		], 38));
	}
}), Gu = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseVirtualLogViewer",
	props: {
		entries: {},
		itemHeight: { default: 24 },
		overscan: { default: 5 },
		height: { default: 400 },
		showLevel: {
			type: Boolean,
			default: !0
		},
		showTimestamp: {
			type: Boolean,
			default: !0
		},
		followTail: {
			type: Boolean,
			default: !0
		},
		filter: { default: "" }
	},
	emits: ["select"],
	setup(e, { emit: t }) {
		let n = e, r = t, i = g(() => {
			let e = n.filter.trim().toLowerCase();
			return e ? n.entries.filter((t) => t.message.toLowerCase().includes(e)) : n.entries;
		}), a = P(0), o = P(null), s = !1, c = g(() => i.value.length * n.itemHeight), l = g(() => {
			let e = Math.floor(a.value / n.itemHeight) - n.overscan;
			return Math.max(0, e);
		}), u = g(() => {
			let e = Math.ceil(n.height / n.itemHeight), t = Math.floor(a.value / n.itemHeight) + e + n.overscan;
			return Math.min(i.value.length - 1, t);
		}), d = g(() => i.value.slice(l.value, u.value + 1).map((e, t) => ({
			entry: e,
			index: l.value + t
		}))), f = g(() => l.value * n.itemHeight);
		function m(e) {
			let t = e.target;
			a.value = t.scrollTop, s = !(t.scrollHeight - t.scrollTop - t.clientHeight < n.itemHeight * 2);
		}
		async function h() {
			await ee(), o.value && (o.value.scrollTop = o.value.scrollHeight);
		}
		return pe(() => n.entries.length, () => {
			n.followTail && !s && h();
		}), re(() => {
			o.value?.addEventListener("scroll", m, { passive: !0 }), n.followTail && h();
		}), ie(() => {
			o.value?.removeEventListener("scroll", m);
		}), (t, n) => (N(), y("div", {
			class: "log-viewer",
			style: M({ height: `${e.height}px` })
		}, [e.filter ? (N(), _(Uu, {
			key: 0,
			"filtered-count": i.value.length,
			"total-count": e.entries.length
		}, null, 8, ["filtered-count", "total-count"])) : v("", !0), b("div", {
			ref_key: "containerRef",
			ref: o,
			class: "log-viewer__scroll",
			style: M({
				height: e.filter ? `calc(${e.height}px - 32px)` : `${e.height}px`,
				overflowY: "auto",
				position: "relative"
			})
		}, [b("div", {
			style: M({
				height: `${c.value}px`,
				position: "relative",
				pointerEvents: "none"
			}),
			"aria-hidden": "true"
		}, null, 4), b("div", {
			style: M({
				position: "absolute",
				top: `${f.value}px`,
				left: 0,
				right: 0
			}),
			role: "log",
			"aria-atomic": "false",
			"aria-live": "polite"
		}, [(N(!0), y(p, null, F(d.value, ({ entry: t, index: n }) => (N(), _(Wu, {
			key: t.id,
			entry: t,
			index: n,
			"item-height": e.itemHeight,
			"show-level": e.showLevel,
			"show-timestamp": e.showTimestamp,
			onSelect: (e) => r("select", t)
		}, null, 8, [
			"entry",
			"index",
			"item-height",
			"show-level",
			"show-timestamp",
			"onSelect"
		]))), 128))], 4)], 4)], 4));
	}
}), [["__scopeId", "data-v-7d574d0e"]]), Ku = class extends Error {}, qu = class extends Ku {
	constructor(e) {
		super(`Invalid DateTime: ${e.toMessage()}`);
	}
}, Ju = class extends Ku {
	constructor(e) {
		super(`Invalid Interval: ${e.toMessage()}`);
	}
}, Yu = class extends Ku {
	constructor(e) {
		super(`Invalid Duration: ${e.toMessage()}`);
	}
}, Xu = class extends Ku {}, Zu = class extends Ku {
	constructor(e) {
		super(`Invalid unit ${e}`);
	}
}, Qu = class extends Ku {}, $u = class extends Ku {
	constructor() {
		super("Zone is an abstract class");
	}
}, G = "numeric", ed = "short", td = "long", nd = {
	year: G,
	month: G,
	day: G
}, rd = {
	year: G,
	month: ed,
	day: G
}, id = {
	year: G,
	month: ed,
	day: G,
	weekday: ed
}, ad = {
	year: G,
	month: td,
	day: G
}, od = {
	year: G,
	month: td,
	day: G,
	weekday: td
}, sd = {
	hour: G,
	minute: G
}, cd = {
	hour: G,
	minute: G,
	second: G
}, ld = {
	hour: G,
	minute: G,
	second: G,
	timeZoneName: ed
}, ud = {
	hour: G,
	minute: G,
	second: G,
	timeZoneName: td
}, dd = {
	hour: G,
	minute: G,
	hourCycle: "h23"
}, fd = {
	hour: G,
	minute: G,
	second: G,
	hourCycle: "h23"
}, pd = {
	hour: G,
	minute: G,
	second: G,
	hourCycle: "h23",
	timeZoneName: ed
}, md = {
	hour: G,
	minute: G,
	second: G,
	hourCycle: "h23",
	timeZoneName: td
}, hd = {
	year: G,
	month: G,
	day: G,
	hour: G,
	minute: G
}, gd = {
	year: G,
	month: G,
	day: G,
	hour: G,
	minute: G,
	second: G
}, _d = {
	year: G,
	month: ed,
	day: G,
	hour: G,
	minute: G
}, vd = {
	year: G,
	month: ed,
	day: G,
	hour: G,
	minute: G,
	second: G
}, yd = {
	year: G,
	month: ed,
	day: G,
	weekday: ed,
	hour: G,
	minute: G
}, bd = {
	year: G,
	month: td,
	day: G,
	hour: G,
	minute: G,
	timeZoneName: ed
}, xd = {
	year: G,
	month: td,
	day: G,
	hour: G,
	minute: G,
	second: G,
	timeZoneName: ed
}, Sd = {
	year: G,
	month: td,
	day: G,
	weekday: td,
	hour: G,
	minute: G,
	timeZoneName: td
}, Cd = {
	year: G,
	month: td,
	day: G,
	weekday: td,
	hour: G,
	minute: G,
	second: G,
	timeZoneName: td
}, wd = class {
	get type() {
		throw new $u();
	}
	get name() {
		throw new $u();
	}
	get ianaName() {
		return this.name;
	}
	get isUniversal() {
		throw new $u();
	}
	offsetName(e, t) {
		throw new $u();
	}
	formatOffset(e, t) {
		throw new $u();
	}
	offset(e) {
		throw new $u();
	}
	equals(e) {
		throw new $u();
	}
	get isValid() {
		throw new $u();
	}
}, Td = null, Ed = class e extends wd {
	static get instance() {
		return Td === null && (Td = new e()), Td;
	}
	get type() {
		return "system";
	}
	get name() {
		return new Intl.DateTimeFormat().resolvedOptions().timeZone;
	}
	get isUniversal() {
		return !1;
	}
	offsetName(e, { format: t, locale: n }) {
		return mp(e, t, n);
	}
	formatOffset(e, t) {
		return vp(this.offset(e), t);
	}
	offset(e) {
		return -new Date(e).getTimezoneOffset();
	}
	equals(e) {
		return e.type === "system";
	}
	get isValid() {
		return !0;
	}
}, Dd = /* @__PURE__ */ new Map();
function Od(e) {
	let t = Dd.get(e);
	return t === void 0 && (t = new Intl.DateTimeFormat("en-US", {
		hour12: !1,
		timeZone: e,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		era: "short"
	}), Dd.set(e, t)), t;
}
var kd = {
	year: 0,
	month: 1,
	day: 2,
	era: 3,
	hour: 4,
	minute: 5,
	second: 6
};
function Ad(e, t) {
	let n = e.format(t).replace(/\u200E/g, ""), [, r, i, a, o, s, c, l] = /(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(n);
	return [
		a,
		r,
		i,
		o,
		s,
		c,
		l
	];
}
function jd(e, t) {
	let n = e.formatToParts(t), r = [];
	for (let e = 0; e < n.length; e++) {
		let { type: t, value: i } = n[e], a = kd[t];
		t === "era" ? r[a] = i : K(a) || (r[a] = parseInt(i, 10));
	}
	return r;
}
var Md = /* @__PURE__ */ new Map(), Nd = class e extends wd {
	static create(t) {
		let n = Md.get(t);
		return n === void 0 && Md.set(t, n = new e(t)), n;
	}
	static resetCache() {
		Md.clear(), Dd.clear();
	}
	static isValidSpecifier(e) {
		return this.isValidZone(e);
	}
	static isValidZone(e) {
		if (!e) return !1;
		try {
			return new Intl.DateTimeFormat("en-US", { timeZone: e }).format(), !0;
		} catch {
			return !1;
		}
	}
	constructor(t) {
		super(), this.zoneName = t, this.valid = e.isValidZone(t);
	}
	get type() {
		return "iana";
	}
	get name() {
		return this.zoneName;
	}
	get isUniversal() {
		return !1;
	}
	offsetName(e, { format: t, locale: n }) {
		return mp(e, t, n, this.name);
	}
	formatOffset(e, t) {
		return vp(this.offset(e), t);
	}
	offset(e) {
		if (!this.valid) return NaN;
		let t = new Date(e);
		if (isNaN(t)) return NaN;
		let n = Od(this.name), [r, i, a, o, s, c, l] = n.formatToParts ? jd(n, t) : Ad(n, t);
		o === "BC" && (r = -Math.abs(r) + 1);
		let u = up({
			year: r,
			month: i,
			day: a,
			hour: s === 24 ? 0 : s,
			minute: c,
			second: l,
			millisecond: 0
		}), d = +t, f = d % 1e3;
		return d -= f >= 0 ? f : 1e3 + f, (u - d) / (60 * 1e3);
	}
	equals(e) {
		return e.type === "iana" && e.name === this.name;
	}
	get isValid() {
		return this.valid;
	}
}, Pd = {};
function Fd(e, t = {}) {
	let n = JSON.stringify([e, t]), r = Pd[n];
	return r || (r = new Intl.ListFormat(e, t), Pd[n] = r), r;
}
var Id = /* @__PURE__ */ new Map();
function Ld(e, t = {}) {
	let n = JSON.stringify([e, t]), r = Id.get(n);
	return r === void 0 && (r = new Intl.DateTimeFormat(e, t), Id.set(n, r)), r;
}
var Rd = /* @__PURE__ */ new Map();
function zd(e, t = {}) {
	let n = JSON.stringify([e, t]), r = Rd.get(n);
	return r === void 0 && (r = new Intl.NumberFormat(e, t), Rd.set(n, r)), r;
}
var Bd = /* @__PURE__ */ new Map();
function Vd(e, t = {}) {
	let { base: n, ...r } = t, i = JSON.stringify([e, r]), a = Bd.get(i);
	return a === void 0 && (a = new Intl.RelativeTimeFormat(e, t), Bd.set(i, a)), a;
}
var Hd = null;
function Ud() {
	return Hd || (Hd = new Intl.DateTimeFormat().resolvedOptions().locale, Hd);
}
var Wd = /* @__PURE__ */ new Map();
function Gd(e) {
	let t = Wd.get(e);
	return t === void 0 && (t = new Intl.DateTimeFormat(e).resolvedOptions(), Wd.set(e, t)), t;
}
var Kd = /* @__PURE__ */ new Map();
function qd(e) {
	let t = Kd.get(e);
	if (!t) {
		let n = new Intl.Locale(e);
		t = "getWeekInfo" in n ? n.getWeekInfo() : n.weekInfo, "minimalDays" in t || (t = {
			...rf,
			...t
		}), Kd.set(e, t);
	}
	return t;
}
function Jd(e) {
	let t = e.indexOf("-x-");
	t !== -1 && (e = e.substring(0, t));
	let n = e.indexOf("-u-");
	if (n === -1) return [e];
	{
		let t, r;
		try {
			t = Ld(e).resolvedOptions(), r = e;
		} catch {
			let i = e.substring(0, n);
			t = Ld(i).resolvedOptions(), r = i;
		}
		let { numberingSystem: i, calendar: a } = t;
		return [
			r,
			i,
			a
		];
	}
}
function Yd(e, t, n) {
	return n || t ? (e.includes("-u-") || (e += "-u"), n && (e += `-ca-${n}`), t && (e += `-nu-${t}`), e) : e;
}
function Xd(e) {
	let t = [];
	for (let n = 1; n <= 12; n++) {
		let r = J.utc(2009, n, 1);
		t.push(e(r));
	}
	return t;
}
function Zd(e) {
	let t = [];
	for (let n = 1; n <= 7; n++) {
		let r = J.utc(2016, 11, 13 + n);
		t.push(e(r));
	}
	return t;
}
function Qd(e, t, n, r) {
	let i = e.listingMode();
	return i === "error" ? null : i === "en" ? n(t) : r(t);
}
function $d(e) {
	return e.numberingSystem && e.numberingSystem !== "latn" ? !1 : e.numberingSystem === "latn" || !e.locale || e.locale.startsWith("en") || Gd(e.locale).numberingSystem === "latn";
}
var ef = class {
	constructor(e, t, n) {
		this.padTo = n.padTo || 0, this.floor = n.floor || !1;
		let { padTo: r, floor: i, ...a } = n;
		if (!t || Object.keys(a).length > 0) {
			let t = {
				useGrouping: !1,
				...n
			};
			n.padTo > 0 && (t.minimumIntegerDigits = n.padTo), this.inf = zd(e, t);
		}
	}
	format(e) {
		if (this.inf) {
			let t = this.floor ? Math.floor(e) : e;
			return this.inf.format(t);
		} else return np(this.floor ? Math.floor(e) : op(e, 3), this.padTo);
	}
}, tf = class {
	constructor(e, t, n) {
		this.opts = n, this.originalZone = void 0;
		let r;
		if (this.opts.timeZone) this.dt = e;
		else if (e.zone.type === "fixed") {
			let t = -1 * (e.offset / 60), n = t >= 0 ? `Etc/GMT+${t}` : `Etc/GMT${t}`;
			e.offset !== 0 && Nd.create(n).valid ? (r = n, this.dt = e) : (r = "UTC", this.dt = e.offset === 0 ? e : e.setZone("UTC").plus({ minutes: e.offset }), this.originalZone = e.zone);
		} else e.zone.type === "system" ? this.dt = e : e.zone.type === "iana" ? (this.dt = e, r = e.zone.name) : (r = "UTC", this.dt = e.setZone("UTC").plus({ minutes: e.offset }), this.originalZone = e.zone);
		let i = { ...this.opts };
		i.timeZone = i.timeZone || r, this.dtf = Ld(t, i);
	}
	format() {
		return this.originalZone ? this.formatToParts().map(({ value: e }) => e).join("") : this.dtf.format(this.dt.toJSDate());
	}
	formatToParts() {
		let e = this.dtf.formatToParts(this.dt.toJSDate());
		return this.originalZone ? e.map((e) => {
			if (e.type === "timeZoneName") {
				let t = this.originalZone.offsetName(this.dt.ts, {
					locale: this.dt.locale,
					format: this.opts.timeZoneName
				});
				return {
					...e,
					value: t
				};
			} else return e;
		}) : e;
	}
	resolvedOptions() {
		return this.dtf.resolvedOptions();
	}
}, nf = class {
	constructor(e, t, n) {
		this.opts = {
			style: "long",
			...n
		}, !t && qf() && (this.rtf = Vd(e, n));
	}
	format(e, t) {
		return this.rtf ? this.rtf.format(e, t) : Lp(t, e, this.opts.numeric, this.opts.style !== "long");
	}
	formatToParts(e, t) {
		return this.rtf ? this.rtf.formatToParts(e, t) : [];
	}
}, rf = {
	firstDay: 1,
	minimalDays: 4,
	weekend: [6, 7]
}, af = class e {
	static fromOpts(t) {
		return e.create(t.locale, t.numberingSystem, t.outputCalendar, t.weekSettings, t.defaultToEN);
	}
	static create(t, n, r, i, a = !1) {
		let o = t || Tf.defaultLocale;
		return new e(o || (a ? "en-US" : Ud()), n || Tf.defaultNumberingSystem, r || Tf.defaultOutputCalendar, $f(i) || Tf.defaultWeekSettings, o);
	}
	static resetCache() {
		Hd = null, Id.clear(), Rd.clear(), Bd.clear(), Wd.clear(), Kd.clear();
	}
	static fromObject({ locale: t, numberingSystem: n, outputCalendar: r, weekSettings: i } = {}) {
		return e.create(t, n, r, i);
	}
	constructor(e, t, n, r, i) {
		let [a, o, s] = Jd(e);
		this.locale = a, this.numberingSystem = t || o || null, this.outputCalendar = n || s || null, this.weekSettings = r, this.intl = Yd(this.locale, this.numberingSystem, this.outputCalendar), this.weekdaysCache = {
			format: {},
			standalone: {}
		}, this.monthsCache = {
			format: {},
			standalone: {}
		}, this.meridiemCache = null, this.eraCache = {}, this.specifiedLocale = i, this.fastNumbersCached = null;
	}
	get fastNumbers() {
		return this.fastNumbersCached ??= $d(this), this.fastNumbersCached;
	}
	listingMode() {
		let e = this.isEnglish(), t = (this.numberingSystem === null || this.numberingSystem === "latn") && (this.outputCalendar === null || this.outputCalendar === "gregory");
		return e && t ? "en" : "intl";
	}
	clone(t) {
		return !t || Object.getOwnPropertyNames(t).length === 0 ? this : e.create(t.locale || this.specifiedLocale, t.numberingSystem || this.numberingSystem, t.outputCalendar || this.outputCalendar, $f(t.weekSettings) || this.weekSettings, t.defaultToEN || !1);
	}
	redefaultToEN(e = {}) {
		return this.clone({
			...e,
			defaultToEN: !0
		});
	}
	redefaultToSystem(e = {}) {
		return this.clone({
			...e,
			defaultToEN: !1
		});
	}
	months(e, t = !1) {
		return Qd(this, e, Cp, () => {
			let n = this.intl === "ja" || this.intl.startsWith("ja-");
			t &= !n;
			let r = t ? {
				month: e,
				day: "numeric"
			} : { month: e }, i = t ? "format" : "standalone";
			if (!this.monthsCache[i][e]) {
				let t = n ? (e) => this.dtFormatter(e, r).format() : (e) => this.extract(e, r, "month");
				this.monthsCache[i][e] = Xd(t);
			}
			return this.monthsCache[i][e];
		});
	}
	weekdays(e, t = !1) {
		return Qd(this, e, Dp, () => {
			let n = t ? {
				weekday: e,
				year: "numeric",
				month: "long",
				day: "numeric"
			} : { weekday: e }, r = t ? "format" : "standalone";
			return this.weekdaysCache[r][e] || (this.weekdaysCache[r][e] = Zd((e) => this.extract(e, n, "weekday"))), this.weekdaysCache[r][e];
		});
	}
	meridiems() {
		return Qd(this, void 0, () => Op, () => {
			if (!this.meridiemCache) {
				let e = {
					hour: "numeric",
					hourCycle: "h12"
				};
				this.meridiemCache = [J.utc(2016, 11, 13, 9), J.utc(2016, 11, 13, 19)].map((t) => this.extract(t, e, "dayperiod"));
			}
			return this.meridiemCache;
		});
	}
	eras(e) {
		return Qd(this, e, Mp, () => {
			let t = { era: e };
			return this.eraCache[e] || (this.eraCache[e] = [J.utc(-40, 1, 1), J.utc(2017, 1, 1)].map((e) => this.extract(e, t, "era"))), this.eraCache[e];
		});
	}
	extract(e, t, n) {
		let r = this.dtFormatter(e, t).formatToParts().find((e) => e.type.toLowerCase() === n);
		return r ? r.value : null;
	}
	numberFormatter(e = {}) {
		return new ef(this.intl, e.forceSimple || this.fastNumbers, e);
	}
	dtFormatter(e, t = {}) {
		return new tf(e, this.intl, t);
	}
	relFormatter(e = {}) {
		return new nf(this.intl, this.isEnglish(), e);
	}
	listFormatter(e = {}) {
		return Fd(this.intl, e);
	}
	isEnglish() {
		return this.locale === "en" || this.locale.toLowerCase() === "en-us" || Gd(this.intl).locale.startsWith("en-us");
	}
	getWeekSettings() {
		return this.weekSettings ? this.weekSettings : Jf() ? qd(this.locale) : rf;
	}
	getStartOfWeek() {
		return this.getWeekSettings().firstDay;
	}
	getMinDaysInFirstWeek() {
		return this.getWeekSettings().minimalDays;
	}
	getWeekendDays() {
		return this.getWeekSettings().weekend;
	}
	equals(e) {
		return this.locale === e.locale && this.numberingSystem === e.numberingSystem && this.outputCalendar === e.outputCalendar;
	}
	toString() {
		return `Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`;
	}
}, of = null, sf = class e extends wd {
	static get utcInstance() {
		return of === null && (of = new e(0)), of;
	}
	static instance(t) {
		return t === 0 ? e.utcInstance : new e(t);
	}
	static parseSpecifier(t) {
		if (t) {
			let n = t.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);
			if (n) return new e(hp(n[1], n[2]));
		}
		return null;
	}
	constructor(e) {
		super(), this.fixed = e;
	}
	get type() {
		return "fixed";
	}
	get name() {
		return this.fixed === 0 ? "UTC" : `UTC${vp(this.fixed, "narrow")}`;
	}
	get ianaName() {
		return this.fixed === 0 ? "Etc/UTC" : `Etc/GMT${vp(-this.fixed, "narrow")}`;
	}
	offsetName() {
		return this.name;
	}
	formatOffset(e, t) {
		return vp(this.fixed, t);
	}
	get isUniversal() {
		return !0;
	}
	offset() {
		return this.fixed;
	}
	equals(e) {
		return e.type === "fixed" && e.fixed === this.fixed;
	}
	get isValid() {
		return !0;
	}
}, cf = class extends wd {
	constructor(e) {
		super(), this.zoneName = e;
	}
	get type() {
		return "invalid";
	}
	get name() {
		return this.zoneName;
	}
	get isUniversal() {
		return !1;
	}
	offsetName() {
		return null;
	}
	formatOffset() {
		return "";
	}
	offset() {
		return NaN;
	}
	equals() {
		return !1;
	}
	get isValid() {
		return !1;
	}
};
function lf(e, t) {
	if (K(e) || e === null) return t;
	if (e instanceof wd) return e;
	if (Gf(e)) {
		let n = e.toLowerCase();
		return n === "default" ? t : n === "local" || n === "system" ? Ed.instance : n === "utc" || n === "gmt" ? sf.utcInstance : sf.parseSpecifier(n) || Nd.create(e);
	} else if (Uf(e)) return sf.instance(e);
	else if (typeof e == "object" && "offset" in e && typeof e.offset == "function") return e;
	else return new cf(e);
}
var uf = {
	arab: "[٠-٩]",
	arabext: "[۰-۹]",
	bali: "[᭐-᭙]",
	beng: "[০-৯]",
	deva: "[०-९]",
	fullwide: "[０-９]",
	gujr: "[૦-૯]",
	hanidec: "[〇|一|二|三|四|五|六|七|八|九]",
	khmr: "[០-៩]",
	knda: "[೦-೯]",
	laoo: "[໐-໙]",
	limb: "[᥆-᥏]",
	mlym: "[൦-൯]",
	mong: "[᠐-᠙]",
	mymr: "[၀-၉]",
	orya: "[୦-୯]",
	tamldec: "[௦-௯]",
	telu: "[౦-౯]",
	thai: "[๐-๙]",
	tibt: "[༠-༩]",
	latn: "\\d"
}, df = {
	arab: [1632, 1641],
	arabext: [1776, 1785],
	bali: [6992, 7001],
	beng: [2534, 2543],
	deva: [2406, 2415],
	fullwide: [65296, 65303],
	gujr: [2790, 2799],
	khmr: [6112, 6121],
	knda: [3302, 3311],
	laoo: [3792, 3801],
	limb: [6470, 6479],
	mlym: [3430, 3439],
	mong: [6160, 6169],
	mymr: [4160, 4169],
	orya: [2918, 2927],
	tamldec: [3046, 3055],
	telu: [3174, 3183],
	thai: [3664, 3673],
	tibt: [3872, 3881]
}, ff = uf.hanidec.replace(/[\[|\]]/g, "").split("");
function pf(e) {
	let t = parseInt(e, 10);
	if (isNaN(t)) {
		t = "";
		for (let n = 0; n < e.length; n++) {
			let r = e.charCodeAt(n);
			if (e[n].search(uf.hanidec) !== -1) t += ff.indexOf(e[n]);
			else for (let e in df) {
				let [n, i] = df[e];
				r >= n && r <= i && (t += r - n);
			}
		}
		return parseInt(t, 10);
	} else return t;
}
var mf = /* @__PURE__ */ new Map();
function hf() {
	mf.clear();
}
function gf({ numberingSystem: e }, t = "") {
	let n = e || "latn", r = mf.get(n);
	r === void 0 && (r = /* @__PURE__ */ new Map(), mf.set(n, r));
	let i = r.get(t);
	return i === void 0 && (i = RegExp(`${uf[n]}${t}`), r.set(t, i)), i;
}
var _f = () => Date.now(), vf = "system", yf = null, bf = null, xf = null, Sf = 60, Cf, wf = null, Tf = class {
	static get now() {
		return _f;
	}
	static set now(e) {
		_f = e;
	}
	static set defaultZone(e) {
		vf = e;
	}
	static get defaultZone() {
		return lf(vf, Ed.instance);
	}
	static get defaultLocale() {
		return yf;
	}
	static set defaultLocale(e) {
		yf = e;
	}
	static get defaultNumberingSystem() {
		return bf;
	}
	static set defaultNumberingSystem(e) {
		bf = e;
	}
	static get defaultOutputCalendar() {
		return xf;
	}
	static set defaultOutputCalendar(e) {
		xf = e;
	}
	static get defaultWeekSettings() {
		return wf;
	}
	static set defaultWeekSettings(e) {
		wf = $f(e);
	}
	static get twoDigitCutoffYear() {
		return Sf;
	}
	static set twoDigitCutoffYear(e) {
		Sf = e % 100;
	}
	static get throwOnInvalid() {
		return Cf;
	}
	static set throwOnInvalid(e) {
		Cf = e;
	}
	static resetCaches() {
		af.resetCache(), Nd.resetCache(), J.resetCache(), hf();
	}
}, Ef = class {
	constructor(e, t) {
		this.reason = e, this.explanation = t;
	}
	toMessage() {
		return this.explanation ? `${this.reason}: ${this.explanation}` : this.reason;
	}
}, Df = [
	0,
	31,
	59,
	90,
	120,
	151,
	181,
	212,
	243,
	273,
	304,
	334
], Of = [
	0,
	31,
	60,
	91,
	121,
	152,
	182,
	213,
	244,
	274,
	305,
	335
];
function kf(e, t) {
	return new Ef("unit out of range", `you specified ${t} (of type ${typeof t}) as a ${e}, which is invalid`);
}
function Af(e, t, n) {
	let r = new Date(Date.UTC(e, t - 1, n));
	e < 100 && e >= 0 && r.setUTCFullYear(r.getUTCFullYear() - 1900);
	let i = r.getUTCDay();
	return i === 0 ? 7 : i;
}
function jf(e, t, n) {
	return n + (sp(e) ? Of : Df)[t - 1];
}
function Mf(e, t) {
	let n = sp(e) ? Of : Df, r = n.findIndex((e) => e < t), i = t - n[r];
	return {
		month: r + 1,
		day: i
	};
}
function Nf(e, t) {
	return (e - t + 7) % 7 + 1;
}
function Pf(e, t = 4, n = 1) {
	let { year: r, month: i, day: a } = e, o = jf(r, i, a), s = Nf(Af(r, i, a), n), c = Math.floor((o - s + 14 - t) / 7), l;
	return c < 1 ? (l = r - 1, c = fp(l, t, n)) : c > fp(r, t, n) ? (l = r + 1, c = 1) : l = r, {
		weekYear: l,
		weekNumber: c,
		weekday: s,
		...yp(e)
	};
}
function Ff(e, t = 4, n = 1) {
	let { weekYear: r, weekNumber: i, weekday: a } = e, o = Nf(Af(r, 1, t), n), s = cp(r), c = i * 7 + a - o - 7 + t, l;
	c < 1 ? (l = r - 1, c += cp(l)) : c > s ? (l = r + 1, c -= cp(r)) : l = r;
	let { month: u, day: d } = Mf(l, c);
	return {
		year: l,
		month: u,
		day: d,
		...yp(e)
	};
}
function If(e) {
	let { year: t, month: n, day: r } = e;
	return {
		year: t,
		ordinal: jf(t, n, r),
		...yp(e)
	};
}
function Lf(e) {
	let { year: t, ordinal: n } = e, { month: r, day: i } = Mf(t, n);
	return {
		year: t,
		month: r,
		day: i,
		...yp(e)
	};
}
function Rf(e, t) {
	if (!K(e.localWeekday) || !K(e.localWeekNumber) || !K(e.localWeekYear)) {
		if (!K(e.weekday) || !K(e.weekNumber) || !K(e.weekYear)) throw new Xu("Cannot mix locale-based week fields with ISO-based week fields");
		return K(e.localWeekday) || (e.weekday = e.localWeekday), K(e.localWeekNumber) || (e.weekNumber = e.localWeekNumber), K(e.localWeekYear) || (e.weekYear = e.localWeekYear), delete e.localWeekday, delete e.localWeekNumber, delete e.localWeekYear, {
			minDaysInFirstWeek: t.getMinDaysInFirstWeek(),
			startOfWeek: t.getStartOfWeek()
		};
	} else return {
		minDaysInFirstWeek: 4,
		startOfWeek: 1
	};
}
function zf(e, t = 4, n = 1) {
	let r = Wf(e.weekYear), i = ep(e.weekNumber, 1, fp(e.weekYear, t, n)), a = ep(e.weekday, 1, 7);
	return r ? i ? a ? !1 : kf("weekday", e.weekday) : kf("week", e.weekNumber) : kf("weekYear", e.weekYear);
}
function Bf(e) {
	let t = Wf(e.year), n = ep(e.ordinal, 1, cp(e.year));
	return t ? n ? !1 : kf("ordinal", e.ordinal) : kf("year", e.year);
}
function Vf(e) {
	let t = Wf(e.year), n = ep(e.month, 1, 12), r = ep(e.day, 1, lp(e.year, e.month));
	return t ? n ? r ? !1 : kf("day", e.day) : kf("month", e.month) : kf("year", e.year);
}
function Hf(e) {
	let { hour: t, minute: n, second: r, millisecond: i } = e, a = ep(t, 0, 23) || t === 24 && n === 0 && r === 0 && i === 0, o = ep(n, 0, 59), s = ep(r, 0, 59), c = ep(i, 0, 999);
	return a ? o ? s ? c ? !1 : kf("millisecond", i) : kf("second", r) : kf("minute", n) : kf("hour", t);
}
function K(e) {
	return e === void 0;
}
function Uf(e) {
	return typeof e == "number";
}
function Wf(e) {
	return typeof e == "number" && e % 1 == 0;
}
function Gf(e) {
	return typeof e == "string";
}
function Kf(e) {
	return Object.prototype.toString.call(e) === "[object Date]";
}
function qf() {
	try {
		return typeof Intl < "u" && !!Intl.RelativeTimeFormat;
	} catch {
		return !1;
	}
}
function Jf() {
	try {
		return typeof Intl < "u" && !!Intl.Locale && ("weekInfo" in Intl.Locale.prototype || "getWeekInfo" in Intl.Locale.prototype);
	} catch {
		return !1;
	}
}
function Yf(e) {
	return Array.isArray(e) ? e : [e];
}
function Xf(e, t, n) {
	if (e.length !== 0) return e.reduce((e, r) => {
		let i = [t(r), r];
		return e && n(e[0], i[0]) === e[0] ? e : i;
	}, null)[1];
}
function Zf(e, t) {
	return t.reduce((t, n) => (t[n] = e[n], t), {});
}
function Qf(e, t) {
	return Object.prototype.hasOwnProperty.call(e, t);
}
function $f(e) {
	if (e == null) return null;
	if (typeof e != "object") throw new Qu("Week settings must be an object");
	if (!ep(e.firstDay, 1, 7) || !ep(e.minimalDays, 1, 7) || !Array.isArray(e.weekend) || e.weekend.some((e) => !ep(e, 1, 7))) throw new Qu("Invalid week settings");
	return {
		firstDay: e.firstDay,
		minimalDays: e.minimalDays,
		weekend: Array.from(e.weekend)
	};
}
function ep(e, t, n) {
	return Wf(e) && e >= t && e <= n;
}
function tp(e, t) {
	return e - t * Math.floor(e / t);
}
function np(e, t = 2) {
	let n = e < 0, r;
	return r = n ? "-" + ("" + -e).padStart(t, "0") : ("" + e).padStart(t, "0"), r;
}
function rp(e) {
	if (!(K(e) || e === null || e === "")) return parseInt(e, 10);
}
function ip(e) {
	if (!(K(e) || e === null || e === "")) return parseFloat(e);
}
function ap(e) {
	if (!(K(e) || e === null || e === "")) {
		let t = parseFloat("0." + e) * 1e3;
		return Math.floor(t);
	}
}
function op(e, t, n = "round") {
	let r = 10 ** t;
	switch (n) {
		case "expand": return e > 0 ? Math.ceil(e * r) / r : Math.floor(e * r) / r;
		case "trunc": return Math.trunc(e * r) / r;
		case "round": return Math.round(e * r) / r;
		case "floor": return Math.floor(e * r) / r;
		case "ceil": return Math.ceil(e * r) / r;
		default: throw RangeError(`Value rounding ${n} is out of range`);
	}
}
function sp(e) {
	return e % 4 == 0 && (e % 100 != 0 || e % 400 == 0);
}
function cp(e) {
	return sp(e) ? 366 : 365;
}
function lp(e, t) {
	let n = tp(t - 1, 12) + 1, r = e + (t - n) / 12;
	return n === 2 ? sp(r) ? 29 : 28 : [
		31,
		null,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31
	][n - 1];
}
function up(e) {
	let t = Date.UTC(e.year, e.month - 1, e.day, e.hour, e.minute, e.second, e.millisecond);
	return e.year < 100 && e.year >= 0 && (t = new Date(t), t.setUTCFullYear(e.year, e.month - 1, e.day)), +t;
}
function dp(e, t, n) {
	return -Nf(Af(e, 1, t), n) + t - 1;
}
function fp(e, t = 4, n = 1) {
	let r = dp(e, t, n), i = dp(e + 1, t, n);
	return (cp(e) - r + i) / 7;
}
function pp(e) {
	return e > 99 ? e : e > Tf.twoDigitCutoffYear ? 1900 + e : 2e3 + e;
}
function mp(e, t, n, r = null) {
	let i = new Date(e), a = {
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	};
	r && (a.timeZone = r);
	let o = {
		timeZoneName: t,
		...a
	}, s = new Intl.DateTimeFormat(n, o).formatToParts(i).find((e) => e.type.toLowerCase() === "timezonename");
	return s ? s.value : null;
}
function hp(e, t) {
	let n = parseInt(e, 10);
	Number.isNaN(n) && (n = 0);
	let r = parseInt(t, 10) || 0, i = n < 0 || Object.is(n, -0) ? -r : r;
	return n * 60 + i;
}
function gp(e) {
	let t = Number(e);
	if (typeof e == "boolean" || e === "" || !Number.isFinite(t)) throw new Qu(`Invalid unit value ${e}`);
	return t;
}
function _p(e, t) {
	let n = {};
	for (let r in e) if (Qf(e, r)) {
		let i = e[r];
		if (i == null) continue;
		n[t(r)] = gp(i);
	}
	return n;
}
function vp(e, t) {
	let n = Math.trunc(Math.abs(e / 60)), r = Math.trunc(Math.abs(e % 60)), i = e >= 0 ? "+" : "-";
	switch (t) {
		case "short": return `${i}${np(n, 2)}:${np(r, 2)}`;
		case "narrow": return `${i}${n}${r > 0 ? `:${r}` : ""}`;
		case "techie": return `${i}${np(n, 2)}${np(r, 2)}`;
		default: throw RangeError(`Value format ${t} is out of range for property format`);
	}
}
function yp(e) {
	return Zf(e, [
		"hour",
		"minute",
		"second",
		"millisecond"
	]);
}
var bp = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
], xp = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
], Sp = [
	"J",
	"F",
	"M",
	"A",
	"M",
	"J",
	"J",
	"A",
	"S",
	"O",
	"N",
	"D"
];
function Cp(e) {
	switch (e) {
		case "narrow": return [...Sp];
		case "short": return [...xp];
		case "long": return [...bp];
		case "numeric": return [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12"
		];
		case "2-digit": return [
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
			"07",
			"08",
			"09",
			"10",
			"11",
			"12"
		];
		default: return null;
	}
}
var wp = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday"
], Tp = [
	"Mon",
	"Tue",
	"Wed",
	"Thu",
	"Fri",
	"Sat",
	"Sun"
], Ep = [
	"M",
	"T",
	"W",
	"T",
	"F",
	"S",
	"S"
];
function Dp(e) {
	switch (e) {
		case "narrow": return [...Ep];
		case "short": return [...Tp];
		case "long": return [...wp];
		case "numeric": return [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7"
		];
		default: return null;
	}
}
var Op = ["AM", "PM"], kp = ["Before Christ", "Anno Domini"], Ap = ["BC", "AD"], jp = ["B", "A"];
function Mp(e) {
	switch (e) {
		case "narrow": return [...jp];
		case "short": return [...Ap];
		case "long": return [...kp];
		default: return null;
	}
}
function Np(e) {
	return Op[e.hour < 12 ? 0 : 1];
}
function Pp(e, t) {
	return Dp(t)[e.weekday - 1];
}
function Fp(e, t) {
	return Cp(t)[e.month - 1];
}
function Ip(e, t) {
	return Mp(t)[e.year < 0 ? 0 : 1];
}
function Lp(e, t, n = "always", r = !1) {
	let i = {
		years: ["year", "yr."],
		quarters: ["quarter", "qtr."],
		months: ["month", "mo."],
		weeks: ["week", "wk."],
		days: [
			"day",
			"day",
			"days"
		],
		hours: ["hour", "hr."],
		minutes: ["minute", "min."],
		seconds: ["second", "sec."]
	}, a = [
		"hours",
		"minutes",
		"seconds"
	].indexOf(e) === -1;
	if (n === "auto" && a) {
		let n = e === "days";
		switch (t) {
			case 1: return n ? "tomorrow" : `next ${i[e][0]}`;
			case -1: return n ? "yesterday" : `last ${i[e][0]}`;
			case 0: return n ? "today" : `this ${i[e][0]}`;
		}
	}
	let o = Object.is(t, -0) || t < 0, s = Math.abs(t), c = s === 1, l = i[e], u = r ? c ? l[1] : l[2] || l[1] : c ? i[e][0] : e;
	return o ? `${s} ${u} ago` : `in ${s} ${u}`;
}
function Rp(e, t) {
	let n = "";
	for (let r of e) r.literal ? n += r.val : n += t(r.val);
	return n;
}
var zp = {
	D: nd,
	DD: rd,
	DDD: ad,
	DDDD: od,
	t: sd,
	tt: cd,
	ttt: ld,
	tttt: ud,
	T: dd,
	TT: fd,
	TTT: pd,
	TTTT: md,
	f: hd,
	ff: _d,
	fff: bd,
	ffff: Sd,
	F: gd,
	FF: vd,
	FFF: xd,
	FFFF: Cd
}, Bp = class e {
	static create(t, n = {}) {
		return new e(t, n);
	}
	static parseFormat(e) {
		let t = null, n = "", r = !1, i = [];
		for (let a = 0; a < e.length; a++) {
			let o = e.charAt(a);
			o === "'" ? ((n.length > 0 || r) && i.push({
				literal: r || /^\s+$/.test(n),
				val: n === "" ? "'" : n
			}), t = null, n = "", r = !r) : r || o === t ? n += o : (n.length > 0 && i.push({
				literal: /^\s+$/.test(n),
				val: n
			}), n = o, t = o);
		}
		return n.length > 0 && i.push({
			literal: r || /^\s+$/.test(n),
			val: n
		}), i;
	}
	static macroTokenToFormatOpts(e) {
		return zp[e];
	}
	constructor(e, t) {
		this.opts = t, this.loc = e, this.systemLoc = null;
	}
	formatWithSystemDefault(e, t) {
		return this.systemLoc === null && (this.systemLoc = this.loc.redefaultToSystem()), this.systemLoc.dtFormatter(e, {
			...this.opts,
			...t
		}).format();
	}
	dtFormatter(e, t = {}) {
		return this.loc.dtFormatter(e, {
			...this.opts,
			...t
		});
	}
	formatDateTime(e, t) {
		return this.dtFormatter(e, t).format();
	}
	formatDateTimeParts(e, t) {
		return this.dtFormatter(e, t).formatToParts();
	}
	formatInterval(e, t) {
		return this.dtFormatter(e.start, t).dtf.formatRange(e.start.toJSDate(), e.end.toJSDate());
	}
	resolvedOptions(e, t) {
		return this.dtFormatter(e, t).resolvedOptions();
	}
	num(e, t = 0, n = void 0) {
		if (this.opts.forceSimple) return np(e, t);
		let r = { ...this.opts };
		return t > 0 && (r.padTo = t), n && (r.signDisplay = n), this.loc.numberFormatter(r).format(e);
	}
	formatDateTimeFromString(t, n) {
		let r = this.loc.listingMode() === "en", i = this.loc.outputCalendar && this.loc.outputCalendar !== "gregory", a = (e, n) => this.loc.extract(t, e, n), o = (e) => t.isOffsetFixed && t.offset === 0 && e.allowZ ? "Z" : t.isValid ? t.zone.formatOffset(t.ts, e.format) : "", s = () => r ? Np(t) : a({
			hour: "numeric",
			hourCycle: "h12"
		}, "dayperiod"), c = (e, n) => r ? Fp(t, e) : a(n ? { month: e } : {
			month: e,
			day: "numeric"
		}, "month"), l = (e, n) => r ? Pp(t, e) : a(n ? { weekday: e } : {
			weekday: e,
			month: "long",
			day: "numeric"
		}, "weekday"), u = (n) => {
			let r = e.macroTokenToFormatOpts(n);
			return r ? this.formatWithSystemDefault(t, r) : n;
		}, d = (e) => r ? Ip(t, e) : a({ era: e }, "era");
		return Rp(e.parseFormat(n), (e) => {
			switch (e) {
				case "S": return this.num(t.millisecond);
				case "u":
				case "SSS": return this.num(t.millisecond, 3);
				case "s": return this.num(t.second);
				case "ss": return this.num(t.second, 2);
				case "uu": return this.num(Math.floor(t.millisecond / 10), 2);
				case "uuu": return this.num(Math.floor(t.millisecond / 100));
				case "m": return this.num(t.minute);
				case "mm": return this.num(t.minute, 2);
				case "h": return this.num(t.hour % 12 == 0 ? 12 : t.hour % 12);
				case "hh": return this.num(t.hour % 12 == 0 ? 12 : t.hour % 12, 2);
				case "H": return this.num(t.hour);
				case "HH": return this.num(t.hour, 2);
				case "Z": return o({
					format: "narrow",
					allowZ: this.opts.allowZ
				});
				case "ZZ": return o({
					format: "short",
					allowZ: this.opts.allowZ
				});
				case "ZZZ": return o({
					format: "techie",
					allowZ: this.opts.allowZ
				});
				case "ZZZZ": return t.zone.offsetName(t.ts, {
					format: "short",
					locale: this.loc.locale
				});
				case "ZZZZZ": return t.zone.offsetName(t.ts, {
					format: "long",
					locale: this.loc.locale
				});
				case "z": return t.zoneName;
				case "a": return s();
				case "d": return i ? a({ day: "numeric" }, "day") : this.num(t.day);
				case "dd": return i ? a({ day: "2-digit" }, "day") : this.num(t.day, 2);
				case "c": return this.num(t.weekday);
				case "ccc": return l("short", !0);
				case "cccc": return l("long", !0);
				case "ccccc": return l("narrow", !0);
				case "E": return this.num(t.weekday);
				case "EEE": return l("short", !1);
				case "EEEE": return l("long", !1);
				case "EEEEE": return l("narrow", !1);
				case "L": return i ? a({
					month: "numeric",
					day: "numeric"
				}, "month") : this.num(t.month);
				case "LL": return i ? a({
					month: "2-digit",
					day: "numeric"
				}, "month") : this.num(t.month, 2);
				case "LLL": return c("short", !0);
				case "LLLL": return c("long", !0);
				case "LLLLL": return c("narrow", !0);
				case "M": return i ? a({ month: "numeric" }, "month") : this.num(t.month);
				case "MM": return i ? a({ month: "2-digit" }, "month") : this.num(t.month, 2);
				case "MMM": return c("short", !1);
				case "MMMM": return c("long", !1);
				case "MMMMM": return c("narrow", !1);
				case "y": return i ? a({ year: "numeric" }, "year") : this.num(t.year);
				case "yy": return i ? a({ year: "2-digit" }, "year") : this.num(t.year.toString().slice(-2), 2);
				case "yyyy": return i ? a({ year: "numeric" }, "year") : this.num(t.year, 4);
				case "yyyyyy": return i ? a({ year: "numeric" }, "year") : this.num(t.year, 6);
				case "G": return d("short");
				case "GG": return d("long");
				case "GGGGG": return d("narrow");
				case "kk": return this.num(t.weekYear.toString().slice(-2), 2);
				case "kkkk": return this.num(t.weekYear, 4);
				case "W": return this.num(t.weekNumber);
				case "WW": return this.num(t.weekNumber, 2);
				case "n": return this.num(t.localWeekNumber);
				case "nn": return this.num(t.localWeekNumber, 2);
				case "ii": return this.num(t.localWeekYear.toString().slice(-2), 2);
				case "iiii": return this.num(t.localWeekYear, 4);
				case "o": return this.num(t.ordinal);
				case "ooo": return this.num(t.ordinal, 3);
				case "q": return this.num(t.quarter);
				case "qq": return this.num(t.quarter, 2);
				case "X": return this.num(Math.floor(t.ts / 1e3));
				case "x": return this.num(t.ts);
				default: return u(e);
			}
		});
	}
	formatDurationFromString(t, n) {
		let r = this.opts.signMode === "negativeLargestOnly" ? -1 : 1, i = (e) => {
			switch (e[0]) {
				case "S": return "milliseconds";
				case "s": return "seconds";
				case "m": return "minutes";
				case "h": return "hours";
				case "d": return "days";
				case "w": return "weeks";
				case "M": return "months";
				case "y": return "years";
				default: return null;
			}
		}, a = (e, t) => (n) => {
			let a = i(n);
			if (a) {
				let i = t.isNegativeDuration && a !== t.largestUnit ? r : 1, o;
				return o = this.opts.signMode === "negativeLargestOnly" && a !== t.largestUnit ? "never" : this.opts.signMode === "all" ? "always" : "auto", this.num(e.get(a) * i, n.length, o);
			} else return n;
		}, o = e.parseFormat(n), s = o.reduce((e, { literal: t, val: n }) => t ? e : e.concat(n), []), c = t.shiftTo(...s.map(i).filter((e) => e));
		return Rp(o, a(c, {
			isNegativeDuration: c < 0,
			largestUnit: Object.keys(c.values)[0]
		}));
	}
}, Vp = /[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;
function Hp(...e) {
	let t = e.reduce((e, t) => e + t.source, "");
	return RegExp(`^${t}$`);
}
function Up(...e) {
	return (t) => e.reduce(([e, n, r], i) => {
		let [a, o, s] = i(t, r);
		return [
			{
				...e,
				...a
			},
			o || n,
			s
		];
	}, [
		{},
		null,
		1
	]).slice(0, 2);
}
function Wp(e, ...t) {
	if (e == null) return [null, null];
	for (let [n, r] of t) {
		let t = n.exec(e);
		if (t) return r(t);
	}
	return [null, null];
}
function Gp(...e) {
	return (t, n) => {
		let r = {}, i;
		for (i = 0; i < e.length; i++) r[e[i]] = rp(t[n + i]);
		return [
			r,
			null,
			n + i
		];
	};
}
var Kp = /(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/, qp = `(?:${Kp.source}?(?:\\[(${Vp.source})\\])?)?`, Jp = /(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/, Yp = RegExp(`${Jp.source}${qp}`), Xp = RegExp(`(?:[Tt]${Yp.source})?`), Zp = /([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/, Qp = /(\d{4})-?W(\d\d)(?:-?(\d))?/, $p = /(\d{4})-?(\d{3})/, em = Gp("weekYear", "weekNumber", "weekDay"), tm = Gp("year", "ordinal"), nm = /(\d{4})-(\d\d)-(\d\d)/, rm = RegExp(`${Jp.source} ?(?:${Kp.source}|(${Vp.source}))?`), im = RegExp(`(?: ${rm.source})?`);
function am(e, t, n) {
	let r = e[t];
	return K(r) ? n : rp(r);
}
function om(e, t) {
	return [
		{
			year: am(e, t),
			month: am(e, t + 1, 1),
			day: am(e, t + 2, 1)
		},
		null,
		t + 3
	];
}
function sm(e, t) {
	return [
		{
			hours: am(e, t, 0),
			minutes: am(e, t + 1, 0),
			seconds: am(e, t + 2, 0),
			milliseconds: ap(e[t + 3])
		},
		null,
		t + 4
	];
}
function cm(e, t) {
	let n = !e[t] && !e[t + 1], r = hp(e[t + 1], e[t + 2]);
	return [
		{},
		n ? null : sf.instance(r),
		t + 3
	];
}
function lm(e, t) {
	return [
		{},
		e[t] ? Nd.create(e[t]) : null,
		t + 1
	];
}
var um = RegExp(`^T?${Jp.source}$`), dm = /^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;
function fm(e) {
	let [t, n, r, i, a, o, s, c, l] = e, u = t[0] === "-", d = c && c[0] === "-", f = (e, t = !1) => e !== void 0 && (t || e && u) ? -e : e;
	return [{
		years: f(ip(n)),
		months: f(ip(r)),
		weeks: f(ip(i)),
		days: f(ip(a)),
		hours: f(ip(o)),
		minutes: f(ip(s)),
		seconds: f(ip(c), c === "-0"),
		milliseconds: f(ap(l), d)
	}];
}
var pm = {
	GMT: 0,
	EDT: -240,
	EST: -300,
	CDT: -300,
	CST: -360,
	MDT: -360,
	MST: -420,
	PDT: -420,
	PST: -480
};
function mm(e, t, n, r, i, a, o) {
	let s = {
		year: t.length === 2 ? pp(rp(t)) : rp(t),
		month: xp.indexOf(n) + 1,
		day: rp(r),
		hour: rp(i),
		minute: rp(a)
	};
	return o && (s.second = rp(o)), e && (s.weekday = e.length > 3 ? wp.indexOf(e) + 1 : Tp.indexOf(e) + 1), s;
}
var hm = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;
function gm(e) {
	let [, t, n, r, i, a, o, s, c, l, u, d] = e, f = mm(t, i, r, n, a, o, s), p;
	return p = c ? pm[c] : l ? 0 : hp(u, d), [f, new sf(p)];
}
function _m(e) {
	return e.replace(/\([^()]*\)|[\n\t]/g, " ").replace(/(\s\s+)/g, " ").trim();
}
var vm = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/, ym = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/, bm = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;
function xm(e) {
	let [, t, n, r, i, a, o, s] = e;
	return [mm(t, i, r, n, a, o, s), sf.utcInstance];
}
function Sm(e) {
	let [, t, n, r, i, a, o, s] = e;
	return [mm(t, s, n, r, i, a, o), sf.utcInstance];
}
var Cm = Hp(Zp, Xp), wm = Hp(Qp, Xp), Tm = Hp($p, Xp), Em = Hp(Yp), Dm = Up(om, sm, cm, lm), Om = Up(em, sm, cm, lm), km = Up(tm, sm, cm, lm), Am = Up(sm, cm, lm);
function jm(e) {
	return Wp(e, [Cm, Dm], [wm, Om], [Tm, km], [Em, Am]);
}
function Mm(e) {
	return Wp(_m(e), [hm, gm]);
}
function Nm(e) {
	return Wp(e, [vm, xm], [ym, xm], [bm, Sm]);
}
function Pm(e) {
	return Wp(e, [dm, fm]);
}
var Fm = Up(sm);
function Im(e) {
	return Wp(e, [um, Fm]);
}
var Lm = Hp(nm, im), Rm = Hp(rm), zm = Up(sm, cm, lm);
function Bm(e) {
	return Wp(e, [Lm, Dm], [Rm, zm]);
}
var Vm = "Invalid Duration", Hm = {
	weeks: {
		days: 7,
		hours: 168,
		minutes: 10080,
		seconds: 10080 * 60,
		milliseconds: 10080 * 60 * 1e3
	},
	days: {
		hours: 24,
		minutes: 1440,
		seconds: 1440 * 60,
		milliseconds: 1440 * 60 * 1e3
	},
	hours: {
		minutes: 60,
		seconds: 3600,
		milliseconds: 3600 * 1e3
	},
	minutes: {
		seconds: 60,
		milliseconds: 60 * 1e3
	},
	seconds: { milliseconds: 1e3 }
}, Um = {
	years: {
		quarters: 4,
		months: 12,
		weeks: 52,
		days: 365,
		hours: 365 * 24,
		minutes: 365 * 24 * 60,
		seconds: 365 * 24 * 60 * 60,
		milliseconds: 365 * 24 * 60 * 60 * 1e3
	},
	quarters: {
		months: 3,
		weeks: 13,
		days: 91,
		hours: 2184,
		minutes: 2184 * 60,
		seconds: 2184 * 60 * 60,
		milliseconds: 2184 * 60 * 60 * 1e3
	},
	months: {
		weeks: 4,
		days: 30,
		hours: 720,
		minutes: 720 * 60,
		seconds: 720 * 60 * 60,
		milliseconds: 720 * 60 * 60 * 1e3
	},
	...Hm
}, Wm = 146097 / 400, Gm = 146097 / 4800, Km = {
	years: {
		quarters: 4,
		months: 12,
		weeks: Wm / 7,
		days: Wm,
		hours: Wm * 24,
		minutes: Wm * 24 * 60,
		seconds: Wm * 24 * 60 * 60,
		milliseconds: Wm * 24 * 60 * 60 * 1e3
	},
	quarters: {
		months: 3,
		weeks: Wm / 28,
		days: Wm / 4,
		hours: Wm * 24 / 4,
		minutes: Wm * 24 * 60 / 4,
		seconds: Wm * 24 * 60 * 60 / 4,
		milliseconds: Wm * 24 * 60 * 60 * 1e3 / 4
	},
	months: {
		weeks: Gm / 7,
		days: Gm,
		hours: Gm * 24,
		minutes: Gm * 24 * 60,
		seconds: Gm * 24 * 60 * 60,
		milliseconds: Gm * 24 * 60 * 60 * 1e3
	},
	...Hm
}, qm = [
	"years",
	"quarters",
	"months",
	"weeks",
	"days",
	"hours",
	"minutes",
	"seconds",
	"milliseconds"
], Jm = qm.slice(0).reverse();
function Ym(e, t, n = !1) {
	return new $m({
		values: n ? t.values : {
			...e.values,
			...t.values || {}
		},
		loc: e.loc.clone(t.loc),
		conversionAccuracy: t.conversionAccuracy || e.conversionAccuracy,
		matrix: t.matrix || e.matrix
	});
}
function Xm(e, t) {
	let n = t.milliseconds ?? 0;
	for (let r of Jm.slice(1)) t[r] && (n += t[r] * e[r].milliseconds);
	return n;
}
function Zm(e, t) {
	let n = Xm(e, t) < 0 ? -1 : 1;
	qm.reduceRight((r, i) => {
		if (K(t[i])) return r;
		if (r) {
			let a = t[r] * n, o = e[i][r], s = Math.floor(a / o);
			t[i] += s * n, t[r] -= s * o * n;
		}
		return i;
	}, null), qm.reduce((n, r) => {
		if (K(t[r])) return n;
		if (n) {
			let i = t[n] % 1;
			t[n] -= i, t[r] += i * e[n][r];
		}
		return r;
	}, null);
}
function Qm(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) r !== 0 && (t[n] = r);
	return t;
}
var $m = class e {
	constructor(e) {
		let t = e.conversionAccuracy === "longterm" || !1, n = t ? Km : Um;
		e.matrix && (n = e.matrix), this.values = e.values, this.loc = e.loc || af.create(), this.conversionAccuracy = t ? "longterm" : "casual", this.invalid = e.invalid || null, this.matrix = n, this.isLuxonDuration = !0;
	}
	static fromMillis(t, n) {
		return e.fromObject({ milliseconds: t }, n);
	}
	static fromObject(t, n = {}) {
		if (typeof t != "object" || !t) throw new Qu(`Duration.fromObject: argument expected to be an object, got ${t === null ? "null" : typeof t}`);
		return new e({
			values: _p(t, e.normalizeUnit),
			loc: af.fromObject(n),
			conversionAccuracy: n.conversionAccuracy,
			matrix: n.matrix
		});
	}
	static fromDurationLike(t) {
		if (Uf(t)) return e.fromMillis(t);
		if (e.isDuration(t)) return t;
		if (typeof t == "object") return e.fromObject(t);
		throw new Qu(`Unknown duration argument ${t} of type ${typeof t}`);
	}
	static fromISO(t, n) {
		let [r] = Pm(t);
		return r ? e.fromObject(r, n) : e.invalid("unparsable", `the input "${t}" can't be parsed as ISO 8601`);
	}
	static fromISOTime(t, n) {
		let [r] = Im(t);
		return r ? e.fromObject(r, n) : e.invalid("unparsable", `the input "${t}" can't be parsed as ISO 8601`);
	}
	static invalid(t, n = null) {
		if (!t) throw new Qu("need to specify a reason the Duration is invalid");
		let r = t instanceof Ef ? t : new Ef(t, n);
		if (Tf.throwOnInvalid) throw new Yu(r);
		return new e({ invalid: r });
	}
	static normalizeUnit(e) {
		let t = {
			year: "years",
			years: "years",
			quarter: "quarters",
			quarters: "quarters",
			month: "months",
			months: "months",
			week: "weeks",
			weeks: "weeks",
			day: "days",
			days: "days",
			hour: "hours",
			hours: "hours",
			minute: "minutes",
			minutes: "minutes",
			second: "seconds",
			seconds: "seconds",
			millisecond: "milliseconds",
			milliseconds: "milliseconds"
		}[e && e.toLowerCase()];
		if (!t) throw new Zu(e);
		return t;
	}
	static isDuration(e) {
		return e && e.isLuxonDuration || !1;
	}
	get locale() {
		return this.isValid ? this.loc.locale : null;
	}
	get numberingSystem() {
		return this.isValid ? this.loc.numberingSystem : null;
	}
	toFormat(e, t = {}) {
		let n = {
			...t,
			floor: t.round !== !1 && t.floor !== !1
		};
		return this.isValid ? Bp.create(this.loc, n).formatDurationFromString(this, e) : Vm;
	}
	toHuman(e = {}) {
		if (!this.isValid) return Vm;
		let t = e.showZeros !== !1, n = qm.map((n) => {
			let r = this.values[n];
			return K(r) || r === 0 && !t ? null : this.loc.numberFormatter({
				style: "unit",
				unitDisplay: "long",
				...e,
				unit: n.slice(0, -1)
			}).format(r);
		}).filter((e) => e);
		return this.loc.listFormatter({
			type: "conjunction",
			style: e.listStyle || "narrow",
			...e
		}).format(n);
	}
	toObject() {
		return this.isValid ? { ...this.values } : {};
	}
	toISO() {
		if (!this.isValid) return null;
		let e = "P";
		return this.years !== 0 && (e += this.years + "Y"), (this.months !== 0 || this.quarters !== 0) && (e += this.months + this.quarters * 3 + "M"), this.weeks !== 0 && (e += this.weeks + "W"), this.days !== 0 && (e += this.days + "D"), (this.hours !== 0 || this.minutes !== 0 || this.seconds !== 0 || this.milliseconds !== 0) && (e += "T"), this.hours !== 0 && (e += this.hours + "H"), this.minutes !== 0 && (e += this.minutes + "M"), (this.seconds !== 0 || this.milliseconds !== 0) && (e += op(this.seconds + this.milliseconds / 1e3, 3) + "S"), e === "P" && (e += "T0S"), e;
	}
	toISOTime(e = {}) {
		if (!this.isValid) return null;
		let t = this.toMillis();
		return t < 0 || t >= 864e5 ? null : (e = {
			suppressMilliseconds: !1,
			suppressSeconds: !1,
			includePrefix: !1,
			format: "extended",
			...e,
			includeOffset: !1
		}, J.fromMillis(t, { zone: "UTC" }).toISOTime(e));
	}
	toJSON() {
		return this.toISO();
	}
	toString() {
		return this.toISO();
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.isValid ? `Duration { values: ${JSON.stringify(this.values)} }` : `Duration { Invalid, reason: ${this.invalidReason} }`;
	}
	toMillis() {
		return this.isValid ? Xm(this.matrix, this.values) : NaN;
	}
	valueOf() {
		return this.toMillis();
	}
	plus(t) {
		if (!this.isValid) return this;
		let n = e.fromDurationLike(t), r = {};
		for (let e of qm) (Qf(n.values, e) || Qf(this.values, e)) && (r[e] = n.get(e) + this.get(e));
		return Ym(this, { values: r }, !0);
	}
	minus(t) {
		if (!this.isValid) return this;
		let n = e.fromDurationLike(t);
		return this.plus(n.negate());
	}
	mapUnits(e) {
		if (!this.isValid) return this;
		let t = {};
		for (let n of Object.keys(this.values)) t[n] = gp(e(this.values[n], n));
		return Ym(this, { values: t }, !0);
	}
	get(t) {
		return this[e.normalizeUnit(t)];
	}
	set(t) {
		if (!this.isValid) return this;
		let n = {
			...this.values,
			..._p(t, e.normalizeUnit)
		};
		return Ym(this, { values: n });
	}
	reconfigure({ locale: e, numberingSystem: t, conversionAccuracy: n, matrix: r } = {}) {
		let i = {
			loc: this.loc.clone({
				locale: e,
				numberingSystem: t
			}),
			matrix: r,
			conversionAccuracy: n
		};
		return Ym(this, i);
	}
	as(e) {
		return this.isValid ? this.shiftTo(e).get(e) : NaN;
	}
	normalize() {
		if (!this.isValid) return this;
		let e = this.toObject();
		return Zm(this.matrix, e), Ym(this, { values: e }, !0);
	}
	rescale() {
		if (!this.isValid) return this;
		let e = Qm(this.normalize().shiftToAll().toObject());
		return Ym(this, { values: e }, !0);
	}
	shiftTo(...t) {
		if (!this.isValid || t.length === 0) return this;
		t = t.map((t) => e.normalizeUnit(t));
		let n = {}, r = {}, i = this.toObject(), a;
		for (let e of qm) if (t.indexOf(e) >= 0) {
			a = e;
			let t = 0;
			for (let n in r) t += this.matrix[n][e] * r[n], r[n] = 0;
			Uf(i[e]) && (t += i[e]);
			let o = Math.trunc(t);
			n[e] = o, r[e] = (t * 1e3 - o * 1e3) / 1e3;
		} else Uf(i[e]) && (r[e] = i[e]);
		for (let e in r) r[e] !== 0 && (n[a] += e === a ? r[e] : r[e] / this.matrix[a][e]);
		return Zm(this.matrix, n), Ym(this, { values: n }, !0);
	}
	shiftToAll() {
		return this.isValid ? this.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds") : this;
	}
	negate() {
		if (!this.isValid) return this;
		let e = {};
		for (let t of Object.keys(this.values)) e[t] = this.values[t] === 0 ? 0 : -this.values[t];
		return Ym(this, { values: e }, !0);
	}
	removeZeros() {
		if (!this.isValid) return this;
		let e = Qm(this.values);
		return Ym(this, { values: e }, !0);
	}
	get years() {
		return this.isValid ? this.values.years || 0 : NaN;
	}
	get quarters() {
		return this.isValid ? this.values.quarters || 0 : NaN;
	}
	get months() {
		return this.isValid ? this.values.months || 0 : NaN;
	}
	get weeks() {
		return this.isValid ? this.values.weeks || 0 : NaN;
	}
	get days() {
		return this.isValid ? this.values.days || 0 : NaN;
	}
	get hours() {
		return this.isValid ? this.values.hours || 0 : NaN;
	}
	get minutes() {
		return this.isValid ? this.values.minutes || 0 : NaN;
	}
	get seconds() {
		return this.isValid ? this.values.seconds || 0 : NaN;
	}
	get milliseconds() {
		return this.isValid ? this.values.milliseconds || 0 : NaN;
	}
	get isValid() {
		return this.invalid === null;
	}
	get invalidReason() {
		return this.invalid ? this.invalid.reason : null;
	}
	get invalidExplanation() {
		return this.invalid ? this.invalid.explanation : null;
	}
	equals(e) {
		if (!this.isValid || !e.isValid || !this.loc.equals(e.loc)) return !1;
		function t(e, t) {
			return e === void 0 || e === 0 ? t === void 0 || t === 0 : e === t;
		}
		for (let n of qm) if (!t(this.values[n], e.values[n])) return !1;
		return !0;
	}
}, eh = "Invalid Interval";
function th(e, t) {
	return !e || !e.isValid ? nh.invalid("missing or invalid start") : !t || !t.isValid ? nh.invalid("missing or invalid end") : t < e ? nh.invalid("end before start", `The end of an interval must be after its start, but you had start=${e.toISO()} and end=${t.toISO()}`) : null;
}
var nh = class e {
	constructor(e) {
		this.s = e.start, this.e = e.end, this.invalid = e.invalid || null, this.isLuxonInterval = !0;
	}
	static invalid(t, n = null) {
		if (!t) throw new Qu("need to specify a reason the Interval is invalid");
		let r = t instanceof Ef ? t : new Ef(t, n);
		if (Tf.throwOnInvalid) throw new Ju(r);
		return new e({ invalid: r });
	}
	static fromDateTimes(t, n) {
		let r = ig(t), i = ig(n);
		return th(r, i) ?? new e({
			start: r,
			end: i
		});
	}
	static after(t, n) {
		let r = $m.fromDurationLike(n), i = ig(t);
		return e.fromDateTimes(i, i.plus(r));
	}
	static before(t, n) {
		let r = $m.fromDurationLike(n), i = ig(t);
		return e.fromDateTimes(i.minus(r), i);
	}
	static fromISO(t, n) {
		let [r, i] = (t || "").split("/", 2);
		if (r && i) {
			let t, a;
			try {
				t = J.fromISO(r, n), a = t.isValid;
			} catch {
				a = !1;
			}
			let o, s;
			try {
				o = J.fromISO(i, n), s = o.isValid;
			} catch {
				s = !1;
			}
			if (a && s) return e.fromDateTimes(t, o);
			if (a) {
				let r = $m.fromISO(i, n);
				if (r.isValid) return e.after(t, r);
			} else if (s) {
				let t = $m.fromISO(r, n);
				if (t.isValid) return e.before(o, t);
			}
		}
		return e.invalid("unparsable", `the input "${t}" can't be parsed as ISO 8601`);
	}
	static isInterval(e) {
		return e && e.isLuxonInterval || !1;
	}
	get start() {
		return this.isValid ? this.s : null;
	}
	get end() {
		return this.isValid ? this.e : null;
	}
	get lastDateTime() {
		return this.isValid && this.e ? this.e.minus(1) : null;
	}
	get isValid() {
		return this.invalidReason === null;
	}
	get invalidReason() {
		return this.invalid ? this.invalid.reason : null;
	}
	get invalidExplanation() {
		return this.invalid ? this.invalid.explanation : null;
	}
	length(e = "milliseconds") {
		return this.isValid ? this.toDuration(e).get(e) : NaN;
	}
	count(e = "milliseconds", t) {
		if (!this.isValid) return NaN;
		let n = this.start.startOf(e, t), r;
		return r = t?.useLocaleWeeks ? this.end.reconfigure({ locale: n.locale }) : this.end, r = r.startOf(e, t), Math.floor(r.diff(n, e).get(e)) + (r.valueOf() !== this.end.valueOf());
	}
	hasSame(e) {
		return this.isValid ? this.isEmpty() || this.e.minus(1).hasSame(this.s, e) : !1;
	}
	isEmpty() {
		return this.s.valueOf() === this.e.valueOf();
	}
	isAfter(e) {
		return this.isValid ? this.s > e : !1;
	}
	isBefore(e) {
		return this.isValid ? this.e <= e : !1;
	}
	contains(e) {
		return this.isValid ? this.s <= e && this.e > e : !1;
	}
	set({ start: t, end: n } = {}) {
		return this.isValid ? e.fromDateTimes(t || this.s, n || this.e) : this;
	}
	splitAt(...t) {
		if (!this.isValid) return [];
		let n = t.map(ig).filter((e) => this.contains(e)).sort((e, t) => e.toMillis() - t.toMillis()), r = [], { s: i } = this, a = 0;
		for (; i < this.e;) {
			let t = n[a] || this.e, o = +t > +this.e ? this.e : t;
			r.push(e.fromDateTimes(i, o)), i = o, a += 1;
		}
		return r;
	}
	splitBy(t) {
		let n = $m.fromDurationLike(t);
		if (!this.isValid || !n.isValid || n.as("milliseconds") === 0) return [];
		let { s: r } = this, i = 1, a, o = [];
		for (; r < this.e;) {
			let t = this.start.plus(n.mapUnits((e) => e * i));
			a = +t > +this.e ? this.e : t, o.push(e.fromDateTimes(r, a)), r = a, i += 1;
		}
		return o;
	}
	divideEqually(e) {
		return this.isValid ? this.splitBy(this.length() / e).slice(0, e) : [];
	}
	overlaps(e) {
		return this.e > e.s && this.s < e.e;
	}
	abutsStart(e) {
		return this.isValid ? +this.e == +e.s : !1;
	}
	abutsEnd(e) {
		return this.isValid ? +e.e == +this.s : !1;
	}
	engulfs(e) {
		return this.isValid ? this.s <= e.s && this.e >= e.e : !1;
	}
	equals(e) {
		return !this.isValid || !e.isValid ? !1 : this.s.equals(e.s) && this.e.equals(e.e);
	}
	intersection(t) {
		if (!this.isValid) return this;
		let n = this.s > t.s ? this.s : t.s, r = this.e < t.e ? this.e : t.e;
		return n >= r ? null : e.fromDateTimes(n, r);
	}
	union(t) {
		if (!this.isValid) return this;
		let n = this.s < t.s ? this.s : t.s, r = this.e > t.e ? this.e : t.e;
		return e.fromDateTimes(n, r);
	}
	static merge(e) {
		let [t, n] = e.sort((e, t) => e.s - t.s).reduce(([e, t], n) => t ? t.overlaps(n) || t.abutsStart(n) ? [e, t.union(n)] : [e.concat([t]), n] : [e, n], [[], null]);
		return n && t.push(n), t;
	}
	static xor(t) {
		let n = null, r = 0, i = [], a = t.map((e) => [{
			time: e.s,
			type: "s"
		}, {
			time: e.e,
			type: "e"
		}]), o = Array.prototype.concat(...a).sort((e, t) => e.time - t.time);
		for (let t of o) r += t.type === "s" ? 1 : -1, r === 1 ? n = t.time : (n && +n != +t.time && i.push(e.fromDateTimes(n, t.time)), n = null);
		return e.merge(i);
	}
	difference(...t) {
		return e.xor([this].concat(t)).map((e) => this.intersection(e)).filter((e) => e && !e.isEmpty());
	}
	toString() {
		return this.isValid ? `[${this.s.toISO()} – ${this.e.toISO()})` : eh;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.isValid ? `Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }` : `Interval { Invalid, reason: ${this.invalidReason} }`;
	}
	toLocaleString(e = nd, t = {}) {
		return this.isValid ? Bp.create(this.s.loc.clone(t), e).formatInterval(this) : eh;
	}
	toISO(e) {
		return this.isValid ? `${this.s.toISO(e)}/${this.e.toISO(e)}` : eh;
	}
	toISODate() {
		return this.isValid ? `${this.s.toISODate()}/${this.e.toISODate()}` : eh;
	}
	toISOTime(e) {
		return this.isValid ? `${this.s.toISOTime(e)}/${this.e.toISOTime(e)}` : eh;
	}
	toFormat(e, { separator: t = " – " } = {}) {
		return this.isValid ? `${this.s.toFormat(e)}${t}${this.e.toFormat(e)}` : eh;
	}
	toDuration(e, t) {
		return this.isValid ? this.e.diff(this.s, e, t) : $m.invalid(this.invalidReason);
	}
	mapEndpoints(t) {
		return e.fromDateTimes(t(this.s), t(this.e));
	}
}, rh = class {
	static hasDST(e = Tf.defaultZone) {
		let t = J.now().setZone(e).set({ month: 12 });
		return !e.isUniversal && t.offset !== t.set({ month: 6 }).offset;
	}
	static isValidIANAZone(e) {
		return Nd.isValidZone(e);
	}
	static normalizeZone(e) {
		return lf(e, Tf.defaultZone);
	}
	static getStartOfWeek({ locale: e = null, locObj: t = null } = {}) {
		return (t || af.create(e)).getStartOfWeek();
	}
	static getMinimumDaysInFirstWeek({ locale: e = null, locObj: t = null } = {}) {
		return (t || af.create(e)).getMinDaysInFirstWeek();
	}
	static getWeekendWeekdays({ locale: e = null, locObj: t = null } = {}) {
		return (t || af.create(e)).getWeekendDays().slice();
	}
	static months(e = "long", { locale: t = null, numberingSystem: n = null, locObj: r = null, outputCalendar: i = "gregory" } = {}) {
		return (r || af.create(t, n, i)).months(e);
	}
	static monthsFormat(e = "long", { locale: t = null, numberingSystem: n = null, locObj: r = null, outputCalendar: i = "gregory" } = {}) {
		return (r || af.create(t, n, i)).months(e, !0);
	}
	static weekdays(e = "long", { locale: t = null, numberingSystem: n = null, locObj: r = null } = {}) {
		return (r || af.create(t, n, null)).weekdays(e);
	}
	static weekdaysFormat(e = "long", { locale: t = null, numberingSystem: n = null, locObj: r = null } = {}) {
		return (r || af.create(t, n, null)).weekdays(e, !0);
	}
	static meridiems({ locale: e = null } = {}) {
		return af.create(e).meridiems();
	}
	static eras(e = "short", { locale: t = null } = {}) {
		return af.create(t, null, "gregory").eras(e);
	}
	static features() {
		return {
			relative: qf(),
			localeWeek: Jf()
		};
	}
};
function ih(e, t) {
	let n = (e) => e.toUTC(0, { keepLocalTime: !0 }).startOf("day").valueOf(), r = n(t) - n(e);
	return Math.floor($m.fromMillis(r).as("days"));
}
function ah(e, t, n) {
	let r = [
		["years", (e, t) => t.year - e.year],
		["quarters", (e, t) => t.quarter - e.quarter + (t.year - e.year) * 4],
		["months", (e, t) => t.month - e.month + (t.year - e.year) * 12],
		["weeks", (e, t) => {
			let n = ih(e, t);
			return (n - n % 7) / 7;
		}],
		["days", ih]
	], i = {}, a = e, o, s;
	for (let [c, l] of r) n.indexOf(c) >= 0 && (o = c, i[c] = l(e, t), s = a.plus(i), s > t ? (i[c]--, e = a.plus(i), e > t && (s = e, i[c]--, e = a.plus(i))) : e = s);
	return [
		e,
		i,
		s,
		o
	];
}
function oh(e, t, n, r) {
	let [i, a, o, s] = ah(e, t, n), c = t - i, l = n.filter((e) => [
		"hours",
		"minutes",
		"seconds",
		"milliseconds"
	].indexOf(e) >= 0);
	l.length === 0 && (o < t && (o = i.plus({ [s]: 1 })), o !== i && (a[s] = (a[s] || 0) + c / (o - i)));
	let u = $m.fromObject(a, r);
	return l.length > 0 ? $m.fromMillis(c, r).shiftTo(...l).plus(u) : u;
}
var sh = "missing Intl.DateTimeFormat.formatToParts support";
function q(e, t = (e) => e) {
	return {
		regex: e,
		deser: ([e]) => t(pf(e))
	};
}
var ch = "[ \xA0]", lh = new RegExp(ch, "g");
function uh(e) {
	return e.replace(/\./g, "\\.?").replace(lh, ch);
}
function dh(e) {
	return e.replace(/\./g, "").replace(lh, " ").toLowerCase();
}
function fh(e, t) {
	return e === null ? null : {
		regex: RegExp(e.map(uh).join("|")),
		deser: ([n]) => e.findIndex((e) => dh(n) === dh(e)) + t
	};
}
function ph(e, t) {
	return {
		regex: e,
		deser: ([, e, t]) => hp(e, t),
		groups: t
	};
}
function mh(e) {
	return {
		regex: e,
		deser: ([e]) => e
	};
}
function hh(e) {
	return e.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
function gh(e, t) {
	let n = gf(t), r = gf(t, "{2}"), i = gf(t, "{3}"), a = gf(t, "{4}"), o = gf(t, "{6}"), s = gf(t, "{1,2}"), c = gf(t, "{1,3}"), l = gf(t, "{1,6}"), u = gf(t, "{1,9}"), d = gf(t, "{2,4}"), f = gf(t, "{4,6}"), p = (e) => ({
		regex: RegExp(hh(e.val)),
		deser: ([e]) => e,
		literal: !0
	}), m = ((m) => {
		if (e.literal) return p(m);
		switch (m.val) {
			case "G": return fh(t.eras("short"), 0);
			case "GG": return fh(t.eras("long"), 0);
			case "y": return q(l);
			case "yy": return q(d, pp);
			case "yyyy": return q(a);
			case "yyyyy": return q(f);
			case "yyyyyy": return q(o);
			case "M": return q(s);
			case "MM": return q(r);
			case "MMM": return fh(t.months("short", !0), 1);
			case "MMMM": return fh(t.months("long", !0), 1);
			case "L": return q(s);
			case "LL": return q(r);
			case "LLL": return fh(t.months("short", !1), 1);
			case "LLLL": return fh(t.months("long", !1), 1);
			case "d": return q(s);
			case "dd": return q(r);
			case "o": return q(c);
			case "ooo": return q(i);
			case "HH": return q(r);
			case "H": return q(s);
			case "hh": return q(r);
			case "h": return q(s);
			case "mm": return q(r);
			case "m": return q(s);
			case "q": return q(s);
			case "qq": return q(r);
			case "s": return q(s);
			case "ss": return q(r);
			case "S": return q(c);
			case "SSS": return q(i);
			case "u": return mh(u);
			case "uu": return mh(s);
			case "uuu": return q(n);
			case "a": return fh(t.meridiems(), 0);
			case "kkkk": return q(a);
			case "kk": return q(d, pp);
			case "W": return q(s);
			case "WW": return q(r);
			case "E":
			case "c": return q(n);
			case "EEE": return fh(t.weekdays("short", !1), 1);
			case "EEEE": return fh(t.weekdays("long", !1), 1);
			case "ccc": return fh(t.weekdays("short", !0), 1);
			case "cccc": return fh(t.weekdays("long", !0), 1);
			case "Z":
			case "ZZ": return ph(RegExp(`([+-]${s.source})(?::(${r.source}))?`), 2);
			case "ZZZ": return ph(RegExp(`([+-]${s.source})(${r.source})?`), 2);
			case "z": return mh(/[a-z_+-/]{1,256}?/i);
			case " ": return mh(/[^\S\n\r]/);
			default: return p(m);
		}
	})(e) || { invalidReason: sh };
	return m.token = e, m;
}
var _h = {
	year: {
		"2-digit": "yy",
		numeric: "yyyyy"
	},
	month: {
		numeric: "M",
		"2-digit": "MM",
		short: "MMM",
		long: "MMMM"
	},
	day: {
		numeric: "d",
		"2-digit": "dd"
	},
	weekday: {
		short: "EEE",
		long: "EEEE"
	},
	dayperiod: "a",
	dayPeriod: "a",
	hour12: {
		numeric: "h",
		"2-digit": "hh"
	},
	hour24: {
		numeric: "H",
		"2-digit": "HH"
	},
	minute: {
		numeric: "m",
		"2-digit": "mm"
	},
	second: {
		numeric: "s",
		"2-digit": "ss"
	},
	timeZoneName: {
		long: "ZZZZZ",
		short: "ZZZ"
	}
};
function vh(e, t, n) {
	let { type: r, value: i } = e;
	if (r === "literal") {
		let e = /^\s+$/.test(i);
		return {
			literal: !e,
			val: e ? " " : i
		};
	}
	let a = t[r], o = r;
	r === "hour" && (o = t.hour12 == null ? t.hourCycle == null ? n.hour12 ? "hour12" : "hour24" : t.hourCycle === "h11" || t.hourCycle === "h12" ? "hour12" : "hour24" : t.hour12 ? "hour12" : "hour24");
	let s = _h[o];
	if (typeof s == "object" && (s = s[a]), s) return {
		literal: !1,
		val: s
	};
}
function yh(e) {
	return [`^${e.map((e) => e.regex).reduce((e, t) => `${e}(${t.source})`, "")}$`, e];
}
function bh(e, t, n) {
	let r = e.match(t);
	if (r) {
		let e = {}, t = 1;
		for (let i in n) if (Qf(n, i)) {
			let a = n[i], o = a.groups ? a.groups + 1 : 1;
			!a.literal && a.token && (e[a.token.val[0]] = a.deser(r.slice(t, t + o))), t += o;
		}
		return [r, e];
	} else return [r, {}];
}
function xh(e) {
	let t = (e) => {
		switch (e) {
			case "S": return "millisecond";
			case "s": return "second";
			case "m": return "minute";
			case "h":
			case "H": return "hour";
			case "d": return "day";
			case "o": return "ordinal";
			case "L":
			case "M": return "month";
			case "y": return "year";
			case "E":
			case "c": return "weekday";
			case "W": return "weekNumber";
			case "k": return "weekYear";
			case "q": return "quarter";
			default: return null;
		}
	}, n = null, r;
	return K(e.z) || (n = Nd.create(e.z)), K(e.Z) || (n ||= new sf(e.Z), r = e.Z), K(e.q) || (e.M = (e.q - 1) * 3 + 1), K(e.h) || (e.h < 12 && e.a === 1 ? e.h += 12 : e.h === 12 && e.a === 0 && (e.h = 0)), e.G === 0 && e.y && (e.y = -e.y), K(e.u) || (e.S = ap(e.u)), [
		Object.keys(e).reduce((n, r) => {
			let i = t(r);
			return i && (n[i] = e[r]), n;
		}, {}),
		n,
		r
	];
}
var Sh = null;
function Ch() {
	return Sh ||= J.fromMillis(1555555555555), Sh;
}
function wh(e, t) {
	if (e.literal) return e;
	let n = kh(Bp.macroTokenToFormatOpts(e.val), t);
	return n == null || n.includes(void 0) ? e : n;
}
function Th(e, t) {
	return Array.prototype.concat(...e.map((e) => wh(e, t)));
}
var Eh = class {
	constructor(e, t) {
		if (this.locale = e, this.format = t, this.tokens = Th(Bp.parseFormat(t), e), this.units = this.tokens.map((t) => gh(t, e)), this.disqualifyingUnit = this.units.find((e) => e.invalidReason), !this.disqualifyingUnit) {
			let [e, t] = yh(this.units);
			this.regex = RegExp(e, "i"), this.handlers = t;
		}
	}
	explainFromTokens(e) {
		if (this.isValid) {
			let [t, n] = bh(e, this.regex, this.handlers), [r, i, a] = n ? xh(n) : [
				null,
				null,
				void 0
			];
			if (Qf(n, "a") && Qf(n, "H")) throw new Xu("Can't include meridiem when specifying 24-hour format");
			return {
				input: e,
				tokens: this.tokens,
				regex: this.regex,
				rawMatches: t,
				matches: n,
				result: r,
				zone: i,
				specificOffset: a
			};
		} else return {
			input: e,
			tokens: this.tokens,
			invalidReason: this.invalidReason
		};
	}
	get isValid() {
		return !this.disqualifyingUnit;
	}
	get invalidReason() {
		return this.disqualifyingUnit ? this.disqualifyingUnit.invalidReason : null;
	}
};
function Dh(e, t, n) {
	return new Eh(e, n).explainFromTokens(t);
}
function Oh(e, t, n) {
	let { result: r, zone: i, specificOffset: a, invalidReason: o } = Dh(e, t, n);
	return [
		r,
		i,
		a,
		o
	];
}
function kh(e, t) {
	if (!e) return null;
	let n = Bp.create(t, e).dtFormatter(Ch()), r = n.formatToParts(), i = n.resolvedOptions();
	return r.map((t) => vh(t, e, i));
}
var Ah = "Invalid DateTime", jh = 864e13;
function Mh(e) {
	return new Ef("unsupported zone", `the zone "${e.name}" is not supported`);
}
function Nh(e) {
	return e.weekData === null && (e.weekData = Pf(e.c)), e.weekData;
}
function Ph(e) {
	return e.localWeekData === null && (e.localWeekData = Pf(e.c, e.loc.getMinDaysInFirstWeek(), e.loc.getStartOfWeek())), e.localWeekData;
}
function Fh(e, t) {
	let n = {
		ts: e.ts,
		zone: e.zone,
		c: e.c,
		o: e.o,
		loc: e.loc,
		invalid: e.invalid
	};
	return new J({
		...n,
		...t,
		old: n
	});
}
function Ih(e, t, n) {
	let r = e - t * 60 * 1e3, i = n.offset(r);
	if (t === i) return [r, t];
	r -= (i - t) * 60 * 1e3;
	let a = n.offset(r);
	return i === a ? [r, i] : [e - Math.min(i, a) * 60 * 1e3, Math.max(i, a)];
}
function Lh(e, t) {
	e += t * 60 * 1e3;
	let n = new Date(e);
	return {
		year: n.getUTCFullYear(),
		month: n.getUTCMonth() + 1,
		day: n.getUTCDate(),
		hour: n.getUTCHours(),
		minute: n.getUTCMinutes(),
		second: n.getUTCSeconds(),
		millisecond: n.getUTCMilliseconds()
	};
}
function Rh(e, t, n) {
	return Ih(up(e), t, n);
}
function zh(e, t) {
	let n = e.o, r = e.c.year + Math.trunc(t.years), i = e.c.month + Math.trunc(t.months) + Math.trunc(t.quarters) * 3, a = {
		...e.c,
		year: r,
		month: i,
		day: Math.min(e.c.day, lp(r, i)) + Math.trunc(t.days) + Math.trunc(t.weeks) * 7
	}, o = $m.fromObject({
		years: t.years - Math.trunc(t.years),
		quarters: t.quarters - Math.trunc(t.quarters),
		months: t.months - Math.trunc(t.months),
		weeks: t.weeks - Math.trunc(t.weeks),
		days: t.days - Math.trunc(t.days),
		hours: t.hours,
		minutes: t.minutes,
		seconds: t.seconds,
		milliseconds: t.milliseconds
	}).as("milliseconds"), [s, c] = Ih(up(a), n, e.zone);
	return o !== 0 && (s += o, c = e.zone.offset(s)), {
		ts: s,
		o: c
	};
}
function Bh(e, t, n, r, i, a) {
	let { setZone: o, zone: s } = n;
	if (e && Object.keys(e).length !== 0 || t) {
		let r = t || s, i = J.fromObject(e, {
			...n,
			zone: r,
			specificOffset: a
		});
		return o ? i : i.setZone(s);
	} else return J.invalid(new Ef("unparsable", `the input "${i}" can't be parsed as ${r}`));
}
function Vh(e, t, n = !0) {
	return e.isValid ? Bp.create(af.create("en-US"), {
		allowZ: n,
		forceSimple: !0
	}).formatDateTimeFromString(e, t) : null;
}
function Hh(e, t, n) {
	let r = e.c.year > 9999 || e.c.year < 0, i = "";
	if (r && e.c.year >= 0 && (i += "+"), i += np(e.c.year, r ? 6 : 4), n === "year") return i;
	if (t) {
		if (i += "-", i += np(e.c.month), n === "month") return i;
		i += "-";
	} else if (i += np(e.c.month), n === "month") return i;
	return i += np(e.c.day), i;
}
function Uh(e, t, n, r, i, a, o) {
	let s = !n || e.c.millisecond !== 0 || e.c.second !== 0, c = "";
	switch (o) {
		case "day":
		case "month":
		case "year": break;
		default:
			if (c += np(e.c.hour), o === "hour") break;
			if (t) {
				if (c += ":", c += np(e.c.minute), o === "minute") break;
				s && (c += ":", c += np(e.c.second));
			} else {
				if (c += np(e.c.minute), o === "minute") break;
				s && (c += np(e.c.second));
			}
			if (o === "second") break;
			s && (!r || e.c.millisecond !== 0) && (c += ".", c += np(e.c.millisecond, 3));
	}
	return i && (e.isOffsetFixed && e.offset === 0 && !a ? c += "Z" : e.o < 0 ? (c += "-", c += np(Math.trunc(-e.o / 60)), c += ":", c += np(Math.trunc(-e.o % 60))) : (c += "+", c += np(Math.trunc(e.o / 60)), c += ":", c += np(Math.trunc(e.o % 60)))), a && (c += "[" + e.zone.ianaName + "]"), c;
}
var Wh = {
	month: 1,
	day: 1,
	hour: 0,
	minute: 0,
	second: 0,
	millisecond: 0
}, Gh = {
	weekNumber: 1,
	weekday: 1,
	hour: 0,
	minute: 0,
	second: 0,
	millisecond: 0
}, Kh = {
	ordinal: 1,
	hour: 0,
	minute: 0,
	second: 0,
	millisecond: 0
}, qh = [
	"year",
	"month",
	"day",
	"hour",
	"minute",
	"second",
	"millisecond"
], Jh = [
	"weekYear",
	"weekNumber",
	"weekday",
	"hour",
	"minute",
	"second",
	"millisecond"
], Yh = [
	"year",
	"ordinal",
	"hour",
	"minute",
	"second",
	"millisecond"
];
function Xh(e) {
	let t = {
		year: "year",
		years: "year",
		month: "month",
		months: "month",
		day: "day",
		days: "day",
		hour: "hour",
		hours: "hour",
		minute: "minute",
		minutes: "minute",
		quarter: "quarter",
		quarters: "quarter",
		second: "second",
		seconds: "second",
		millisecond: "millisecond",
		milliseconds: "millisecond",
		weekday: "weekday",
		weekdays: "weekday",
		weeknumber: "weekNumber",
		weeksnumber: "weekNumber",
		weeknumbers: "weekNumber",
		weekyear: "weekYear",
		weekyears: "weekYear",
		ordinal: "ordinal"
	}[e.toLowerCase()];
	if (!t) throw new Zu(e);
	return t;
}
function Zh(e) {
	switch (e.toLowerCase()) {
		case "localweekday":
		case "localweekdays": return "localWeekday";
		case "localweeknumber":
		case "localweeknumbers": return "localWeekNumber";
		case "localweekyear":
		case "localweekyears": return "localWeekYear";
		default: return Xh(e);
	}
}
function Qh(e) {
	if (ng === void 0 && (ng = Tf.now()), e.type !== "iana") return e.offset(ng);
	let t = e.name, n = rg.get(t);
	return n === void 0 && (n = e.offset(ng), rg.set(t, n)), n;
}
function $h(e, t) {
	let n = lf(t.zone, Tf.defaultZone);
	if (!n.isValid) return J.invalid(Mh(n));
	let r = af.fromObject(t), i, a;
	if (K(e.year)) i = Tf.now();
	else {
		for (let t of qh) K(e[t]) && (e[t] = Wh[t]);
		let t = Vf(e) || Hf(e);
		if (t) return J.invalid(t);
		let r = Qh(n);
		[i, a] = Rh(e, r, n);
	}
	return new J({
		ts: i,
		zone: n,
		loc: r,
		o: a
	});
}
function eg(e, t, n) {
	let r = K(n.round) ? !0 : n.round, i = K(n.rounding) ? "trunc" : n.rounding, a = (e, a) => (e = op(e, r || n.calendary ? 0 : 2, n.calendary ? "round" : i), t.loc.clone(n).relFormatter(n).format(e, a)), o = (r) => n.calendary ? t.hasSame(e, r) ? 0 : t.startOf(r).diff(e.startOf(r), r).get(r) : t.diff(e, r).get(r);
	if (n.unit) return a(o(n.unit), n.unit);
	for (let e of n.units) {
		let t = o(e);
		if (Math.abs(t) >= 1) return a(t, e);
	}
	return a(e > t ? -0 : 0, n.units[n.units.length - 1]);
}
function tg(e) {
	let t = {}, n;
	return e.length > 0 && typeof e[e.length - 1] == "object" ? (t = e[e.length - 1], n = Array.from(e).slice(0, e.length - 1)) : n = Array.from(e), [t, n];
}
var ng, rg = /* @__PURE__ */ new Map(), J = class e {
	constructor(e) {
		let t = e.zone || Tf.defaultZone, n = e.invalid || (Number.isNaN(e.ts) ? new Ef("invalid input") : null) || (t.isValid ? null : Mh(t));
		this.ts = K(e.ts) ? Tf.now() : e.ts;
		let r = null, i = null;
		if (!n) if (e.old && e.old.ts === this.ts && e.old.zone.equals(t)) [r, i] = [e.old.c, e.old.o];
		else {
			let a = Uf(e.o) && !e.old ? e.o : t.offset(this.ts);
			r = Lh(this.ts, a), n = Number.isNaN(r.year) ? new Ef("invalid input") : null, r = n ? null : r, i = n ? null : a;
		}
		this._zone = t, this.loc = e.loc || af.create(), this.invalid = n, this.weekData = null, this.localWeekData = null, this.c = r, this.o = i, this.isLuxonDateTime = !0;
	}
	static now() {
		return new e({});
	}
	static local() {
		let [e, t] = tg(arguments), [n, r, i, a, o, s, c] = t;
		return $h({
			year: n,
			month: r,
			day: i,
			hour: a,
			minute: o,
			second: s,
			millisecond: c
		}, e);
	}
	static utc() {
		let [e, t] = tg(arguments), [n, r, i, a, o, s, c] = t;
		return e.zone = sf.utcInstance, $h({
			year: n,
			month: r,
			day: i,
			hour: a,
			minute: o,
			second: s,
			millisecond: c
		}, e);
	}
	static fromJSDate(t, n = {}) {
		let r = Kf(t) ? t.valueOf() : NaN;
		if (Number.isNaN(r)) return e.invalid("invalid input");
		let i = lf(n.zone, Tf.defaultZone);
		return i.isValid ? new e({
			ts: r,
			zone: i,
			loc: af.fromObject(n)
		}) : e.invalid(Mh(i));
	}
	static fromMillis(t, n = {}) {
		if (!Uf(t)) throw new Qu(`fromMillis requires a numerical input, but received a ${typeof t} with value ${t}`);
		return t < -864e13 || t > jh ? e.invalid("Timestamp out of range") : new e({
			ts: t,
			zone: lf(n.zone, Tf.defaultZone),
			loc: af.fromObject(n)
		});
	}
	static fromSeconds(t, n = {}) {
		if (Uf(t)) return new e({
			ts: t * 1e3,
			zone: lf(n.zone, Tf.defaultZone),
			loc: af.fromObject(n)
		});
		throw new Qu("fromSeconds requires a numerical input");
	}
	static fromObject(t, n = {}) {
		t ||= {};
		let r = lf(n.zone, Tf.defaultZone);
		if (!r.isValid) return e.invalid(Mh(r));
		let i = af.fromObject(n), a = _p(t, Zh), { minDaysInFirstWeek: o, startOfWeek: s } = Rf(a, i), c = Tf.now(), l = K(n.specificOffset) ? r.offset(c) : n.specificOffset, u = !K(a.ordinal), d = !K(a.year), f = !K(a.month) || !K(a.day), p = d || f, m = a.weekYear || a.weekNumber;
		if ((p || u) && m) throw new Xu("Can't mix weekYear/weekNumber units with year/month/day or ordinals");
		if (f && u) throw new Xu("Can't mix ordinal dates with month/day");
		let h = m || a.weekday && !p, g, _, v = Lh(c, l);
		h ? (g = Jh, _ = Gh, v = Pf(v, o, s)) : u ? (g = Yh, _ = Kh, v = If(v)) : (g = qh, _ = Wh);
		let y = !1;
		for (let e of g) {
			let t = a[e];
			K(t) ? y ? a[e] = _[e] : a[e] = v[e] : y = !0;
		}
		let b = (h ? zf(a, o, s) : u ? Bf(a) : Vf(a)) || Hf(a);
		if (b) return e.invalid(b);
		let [x, S] = Rh(h ? Ff(a, o, s) : u ? Lf(a) : a, l, r), C = new e({
			ts: x,
			zone: r,
			o: S,
			loc: i
		});
		return a.weekday && p && t.weekday !== C.weekday ? e.invalid("mismatched weekday", `you can't specify both a weekday of ${a.weekday} and a date of ${C.toISO()}`) : C.isValid ? C : e.invalid(C.invalid);
	}
	static fromISO(e, t = {}) {
		let [n, r] = jm(e);
		return Bh(n, r, t, "ISO 8601", e);
	}
	static fromRFC2822(e, t = {}) {
		let [n, r] = Mm(e);
		return Bh(n, r, t, "RFC 2822", e);
	}
	static fromHTTP(e, t = {}) {
		let [n, r] = Nm(e);
		return Bh(n, r, t, "HTTP", t);
	}
	static fromFormat(t, n, r = {}) {
		if (K(t) || K(n)) throw new Qu("fromFormat requires an input string and a format");
		let { locale: i = null, numberingSystem: a = null } = r, [o, s, c, l] = Oh(af.fromOpts({
			locale: i,
			numberingSystem: a,
			defaultToEN: !0
		}), t, n);
		return l ? e.invalid(l) : Bh(o, s, r, `format ${n}`, t, c);
	}
	static fromString(t, n, r = {}) {
		return e.fromFormat(t, n, r);
	}
	static fromSQL(e, t = {}) {
		let [n, r] = Bm(e);
		return Bh(n, r, t, "SQL", e);
	}
	static invalid(t, n = null) {
		if (!t) throw new Qu("need to specify a reason the DateTime is invalid");
		let r = t instanceof Ef ? t : new Ef(t, n);
		if (Tf.throwOnInvalid) throw new qu(r);
		return new e({ invalid: r });
	}
	static isDateTime(e) {
		return e && e.isLuxonDateTime || !1;
	}
	static parseFormatForOpts(e, t = {}) {
		let n = kh(e, af.fromObject(t));
		return n ? n.map((e) => e ? e.val : null).join("") : null;
	}
	static expandFormat(e, t = {}) {
		return Th(Bp.parseFormat(e), af.fromObject(t)).map((e) => e.val).join("");
	}
	static resetCache() {
		ng = void 0, rg.clear();
	}
	get(e) {
		return this[e];
	}
	get isValid() {
		return this.invalid === null;
	}
	get invalidReason() {
		return this.invalid ? this.invalid.reason : null;
	}
	get invalidExplanation() {
		return this.invalid ? this.invalid.explanation : null;
	}
	get locale() {
		return this.isValid ? this.loc.locale : null;
	}
	get numberingSystem() {
		return this.isValid ? this.loc.numberingSystem : null;
	}
	get outputCalendar() {
		return this.isValid ? this.loc.outputCalendar : null;
	}
	get zone() {
		return this._zone;
	}
	get zoneName() {
		return this.isValid ? this.zone.name : null;
	}
	get year() {
		return this.isValid ? this.c.year : NaN;
	}
	get quarter() {
		return this.isValid ? Math.ceil(this.c.month / 3) : NaN;
	}
	get month() {
		return this.isValid ? this.c.month : NaN;
	}
	get day() {
		return this.isValid ? this.c.day : NaN;
	}
	get hour() {
		return this.isValid ? this.c.hour : NaN;
	}
	get minute() {
		return this.isValid ? this.c.minute : NaN;
	}
	get second() {
		return this.isValid ? this.c.second : NaN;
	}
	get millisecond() {
		return this.isValid ? this.c.millisecond : NaN;
	}
	get weekYear() {
		return this.isValid ? Nh(this).weekYear : NaN;
	}
	get weekNumber() {
		return this.isValid ? Nh(this).weekNumber : NaN;
	}
	get weekday() {
		return this.isValid ? Nh(this).weekday : NaN;
	}
	get isWeekend() {
		return this.isValid && this.loc.getWeekendDays().includes(this.weekday);
	}
	get localWeekday() {
		return this.isValid ? Ph(this).weekday : NaN;
	}
	get localWeekNumber() {
		return this.isValid ? Ph(this).weekNumber : NaN;
	}
	get localWeekYear() {
		return this.isValid ? Ph(this).weekYear : NaN;
	}
	get ordinal() {
		return this.isValid ? If(this.c).ordinal : NaN;
	}
	get monthShort() {
		return this.isValid ? rh.months("short", { locObj: this.loc })[this.month - 1] : null;
	}
	get monthLong() {
		return this.isValid ? rh.months("long", { locObj: this.loc })[this.month - 1] : null;
	}
	get weekdayShort() {
		return this.isValid ? rh.weekdays("short", { locObj: this.loc })[this.weekday - 1] : null;
	}
	get weekdayLong() {
		return this.isValid ? rh.weekdays("long", { locObj: this.loc })[this.weekday - 1] : null;
	}
	get offset() {
		return this.isValid ? +this.o : NaN;
	}
	get offsetNameShort() {
		return this.isValid ? this.zone.offsetName(this.ts, {
			format: "short",
			locale: this.locale
		}) : null;
	}
	get offsetNameLong() {
		return this.isValid ? this.zone.offsetName(this.ts, {
			format: "long",
			locale: this.locale
		}) : null;
	}
	get isOffsetFixed() {
		return this.isValid ? this.zone.isUniversal : null;
	}
	get isInDST() {
		return this.isOffsetFixed ? !1 : this.offset > this.set({
			month: 1,
			day: 1
		}).offset || this.offset > this.set({ month: 5 }).offset;
	}
	getPossibleOffsets() {
		if (!this.isValid || this.isOffsetFixed) return [this];
		let e = 864e5, t = 6e4, n = up(this.c), r = this.zone.offset(n - e), i = this.zone.offset(n + e), a = this.zone.offset(n - r * t), o = this.zone.offset(n - i * t);
		if (a === o) return [this];
		let s = n - a * t, c = n - o * t, l = Lh(s, a), u = Lh(c, o);
		return l.hour === u.hour && l.minute === u.minute && l.second === u.second && l.millisecond === u.millisecond ? [Fh(this, { ts: s }), Fh(this, { ts: c })] : [this];
	}
	get isInLeapYear() {
		return sp(this.year);
	}
	get daysInMonth() {
		return lp(this.year, this.month);
	}
	get daysInYear() {
		return this.isValid ? cp(this.year) : NaN;
	}
	get weeksInWeekYear() {
		return this.isValid ? fp(this.weekYear) : NaN;
	}
	get weeksInLocalWeekYear() {
		return this.isValid ? fp(this.localWeekYear, this.loc.getMinDaysInFirstWeek(), this.loc.getStartOfWeek()) : NaN;
	}
	resolvedLocaleOptions(e = {}) {
		let { locale: t, numberingSystem: n, calendar: r } = Bp.create(this.loc.clone(e), e).resolvedOptions(this);
		return {
			locale: t,
			numberingSystem: n,
			outputCalendar: r
		};
	}
	toUTC(e = 0, t = {}) {
		return this.setZone(sf.instance(e), t);
	}
	toLocal() {
		return this.setZone(Tf.defaultZone);
	}
	setZone(t, { keepLocalTime: n = !1, keepCalendarTime: r = !1 } = {}) {
		if (t = lf(t, Tf.defaultZone), t.equals(this.zone)) return this;
		if (t.isValid) {
			let e = this.ts;
			if (n || r) {
				let n = t.offset(this.ts), r = this.toObject();
				[e] = Rh(r, n, t);
			}
			return Fh(this, {
				ts: e,
				zone: t
			});
		} else return e.invalid(Mh(t));
	}
	reconfigure({ locale: e, numberingSystem: t, outputCalendar: n } = {}) {
		let r = this.loc.clone({
			locale: e,
			numberingSystem: t,
			outputCalendar: n
		});
		return Fh(this, { loc: r });
	}
	setLocale(e) {
		return this.reconfigure({ locale: e });
	}
	set(e) {
		if (!this.isValid) return this;
		let t = _p(e, Zh), { minDaysInFirstWeek: n, startOfWeek: r } = Rf(t, this.loc), i = !K(t.weekYear) || !K(t.weekNumber) || !K(t.weekday), a = !K(t.ordinal), o = !K(t.year), s = !K(t.month) || !K(t.day), c = o || s, l = t.weekYear || t.weekNumber;
		if ((c || a) && l) throw new Xu("Can't mix weekYear/weekNumber units with year/month/day or ordinals");
		if (s && a) throw new Xu("Can't mix ordinal dates with month/day");
		let u;
		i ? u = Ff({
			...Pf(this.c, n, r),
			...t
		}, n, r) : K(t.ordinal) ? (u = {
			...this.toObject(),
			...t
		}, K(t.day) && (u.day = Math.min(lp(u.year, u.month), u.day))) : u = Lf({
			...If(this.c),
			...t
		});
		let [d, f] = Rh(u, this.o, this.zone);
		return Fh(this, {
			ts: d,
			o: f
		});
	}
	plus(e) {
		if (!this.isValid) return this;
		let t = $m.fromDurationLike(e);
		return Fh(this, zh(this, t));
	}
	minus(e) {
		if (!this.isValid) return this;
		let t = $m.fromDurationLike(e).negate();
		return Fh(this, zh(this, t));
	}
	startOf(e, { useLocaleWeeks: t = !1 } = {}) {
		if (!this.isValid) return this;
		let n = {}, r = $m.normalizeUnit(e);
		switch (r) {
			case "years": n.month = 1;
			case "quarters":
			case "months": n.day = 1;
			case "weeks":
			case "days": n.hour = 0;
			case "hours": n.minute = 0;
			case "minutes": n.second = 0;
			case "seconds":
				n.millisecond = 0;
				break;
		}
		if (r === "weeks") if (t) {
			let e = this.loc.getStartOfWeek(), { weekday: t } = this;
			t < e && (n.weekNumber = this.weekNumber - 1), n.weekday = e;
		} else n.weekday = 1;
		return r === "quarters" && (n.month = (Math.ceil(this.month / 3) - 1) * 3 + 1), this.set(n);
	}
	endOf(e, t) {
		return this.isValid ? this.plus({ [e]: 1 }).startOf(e, t).minus(1) : this;
	}
	toFormat(e, t = {}) {
		return this.isValid ? Bp.create(this.loc.redefaultToEN(t)).formatDateTimeFromString(this, e) : Ah;
	}
	toLocaleString(e = nd, t = {}) {
		return this.isValid ? Bp.create(this.loc.clone(t), e).formatDateTime(this) : Ah;
	}
	toLocaleParts(e = {}) {
		return this.isValid ? Bp.create(this.loc.clone(e), e).formatDateTimeParts(this) : [];
	}
	toISO({ format: e = "extended", suppressSeconds: t = !1, suppressMilliseconds: n = !1, includeOffset: r = !0, extendedZone: i = !1, precision: a = "milliseconds" } = {}) {
		if (!this.isValid) return null;
		a = Xh(a);
		let o = e === "extended", s = Hh(this, o, a);
		return qh.indexOf(a) >= 3 && (s += "T"), s += Uh(this, o, t, n, r, i, a), s;
	}
	toISODate({ format: e = "extended", precision: t = "day" } = {}) {
		return this.isValid ? Hh(this, e === "extended", Xh(t)) : null;
	}
	toISOWeekDate() {
		return Vh(this, "kkkk-'W'WW-c");
	}
	toISOTime({ suppressMilliseconds: e = !1, suppressSeconds: t = !1, includeOffset: n = !0, includePrefix: r = !1, extendedZone: i = !1, format: a = "extended", precision: o = "milliseconds" } = {}) {
		return this.isValid ? (o = Xh(o), (r && qh.indexOf(o) >= 3 ? "T" : "") + Uh(this, a === "extended", t, e, n, i, o)) : null;
	}
	toRFC2822() {
		return Vh(this, "EEE, dd LLL yyyy HH:mm:ss ZZZ", !1);
	}
	toHTTP() {
		return Vh(this.toUTC(), "EEE, dd LLL yyyy HH:mm:ss 'GMT'");
	}
	toSQLDate() {
		return this.isValid ? Hh(this, !0) : null;
	}
	toSQLTime({ includeOffset: e = !0, includeZone: t = !1, includeOffsetSpace: n = !0 } = {}) {
		let r = "HH:mm:ss.SSS";
		return (t || e) && (n && (r += " "), t ? r += "z" : e && (r += "ZZ")), Vh(this, r, !0);
	}
	toSQL(e = {}) {
		return this.isValid ? `${this.toSQLDate()} ${this.toSQLTime(e)}` : null;
	}
	toString() {
		return this.isValid ? this.toISO() : Ah;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return this.isValid ? `DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }` : `DateTime { Invalid, reason: ${this.invalidReason} }`;
	}
	valueOf() {
		return this.toMillis();
	}
	toMillis() {
		return this.isValid ? this.ts : NaN;
	}
	toSeconds() {
		return this.isValid ? this.ts / 1e3 : NaN;
	}
	toUnixInteger() {
		return this.isValid ? Math.floor(this.ts / 1e3) : NaN;
	}
	toJSON() {
		return this.toISO();
	}
	toBSON() {
		return this.toJSDate();
	}
	toObject(e = {}) {
		if (!this.isValid) return {};
		let t = { ...this.c };
		return e.includeConfig && (t.outputCalendar = this.outputCalendar, t.numberingSystem = this.loc.numberingSystem, t.locale = this.loc.locale), t;
	}
	toJSDate() {
		return new Date(this.isValid ? this.ts : NaN);
	}
	diff(e, t = "milliseconds", n = {}) {
		if (!this.isValid || !e.isValid) return $m.invalid("created by diffing an invalid DateTime");
		let r = {
			locale: this.locale,
			numberingSystem: this.numberingSystem,
			...n
		}, i = Yf(t).map($m.normalizeUnit), a = e.valueOf() > this.valueOf(), o = oh(a ? this : e, a ? e : this, i, r);
		return a ? o.negate() : o;
	}
	diffNow(t = "milliseconds", n = {}) {
		return this.diff(e.now(), t, n);
	}
	until(e) {
		return this.isValid ? nh.fromDateTimes(this, e) : this;
	}
	hasSame(e, t, n) {
		if (!this.isValid) return !1;
		let r = e.valueOf(), i = this.setZone(e.zone, { keepLocalTime: !0 });
		return i.startOf(t, n) <= r && r <= i.endOf(t, n);
	}
	equals(e) {
		return this.isValid && e.isValid && this.valueOf() === e.valueOf() && this.zone.equals(e.zone) && this.loc.equals(e.loc);
	}
	toRelative(t = {}) {
		if (!this.isValid) return null;
		let n = t.base || e.fromObject({}, { zone: this.zone }), r = t.padding ? this < n ? -t.padding : t.padding : 0, i = [
			"years",
			"months",
			"days",
			"hours",
			"minutes",
			"seconds"
		], a = t.unit;
		return Array.isArray(t.unit) && (i = t.unit, a = void 0), eg(n, this.plus(r), {
			...t,
			numeric: "always",
			units: i,
			unit: a
		});
	}
	toRelativeCalendar(t = {}) {
		return this.isValid ? eg(t.base || e.fromObject({}, { zone: this.zone }), this, {
			...t,
			numeric: "auto",
			units: [
				"years",
				"months",
				"days"
			],
			calendary: !0
		}) : null;
	}
	static min(...t) {
		if (!t.every(e.isDateTime)) throw new Qu("min requires all arguments be DateTimes");
		return Xf(t, (e) => e.valueOf(), Math.min);
	}
	static max(...t) {
		if (!t.every(e.isDateTime)) throw new Qu("max requires all arguments be DateTimes");
		return Xf(t, (e) => e.valueOf(), Math.max);
	}
	static fromFormatExplain(e, t, n = {}) {
		let { locale: r = null, numberingSystem: i = null } = n;
		return Dh(af.fromOpts({
			locale: r,
			numberingSystem: i,
			defaultToEN: !0
		}), e, t);
	}
	static fromStringExplain(t, n, r = {}) {
		return e.fromFormatExplain(t, n, r);
	}
	static buildFormatParser(e, t = {}) {
		let { locale: n = null, numberingSystem: r = null } = t;
		return new Eh(af.fromOpts({
			locale: n,
			numberingSystem: r,
			defaultToEN: !0
		}), e);
	}
	static fromFormatParser(t, n, r = {}) {
		if (K(t) || K(n)) throw new Qu("fromFormatParser requires an input string and a format parser");
		let { locale: i = null, numberingSystem: a = null } = r, o = af.fromOpts({
			locale: i,
			numberingSystem: a,
			defaultToEN: !0
		});
		if (!o.equals(n.locale)) throw new Qu(`fromFormatParser called with a locale of ${o}, but the format parser was created for ${n.locale}`);
		let { result: s, zone: c, specificOffset: l, invalidReason: u } = n.explainFromTokens(t);
		return u ? e.invalid(u) : Bh(s, c, r, `format ${n.format}`, t, l);
	}
	static get DATE_SHORT() {
		return nd;
	}
	static get DATE_MED() {
		return rd;
	}
	static get DATE_MED_WITH_WEEKDAY() {
		return id;
	}
	static get DATE_FULL() {
		return ad;
	}
	static get DATE_HUGE() {
		return od;
	}
	static get TIME_SIMPLE() {
		return sd;
	}
	static get TIME_WITH_SECONDS() {
		return cd;
	}
	static get TIME_WITH_SHORT_OFFSET() {
		return ld;
	}
	static get TIME_WITH_LONG_OFFSET() {
		return ud;
	}
	static get TIME_24_SIMPLE() {
		return dd;
	}
	static get TIME_24_WITH_SECONDS() {
		return fd;
	}
	static get TIME_24_WITH_SHORT_OFFSET() {
		return pd;
	}
	static get TIME_24_WITH_LONG_OFFSET() {
		return md;
	}
	static get DATETIME_SHORT() {
		return hd;
	}
	static get DATETIME_SHORT_WITH_SECONDS() {
		return gd;
	}
	static get DATETIME_MED() {
		return _d;
	}
	static get DATETIME_MED_WITH_SECONDS() {
		return vd;
	}
	static get DATETIME_MED_WITH_WEEKDAY() {
		return yd;
	}
	static get DATETIME_FULL() {
		return bd;
	}
	static get DATETIME_FULL_WITH_SECONDS() {
		return xd;
	}
	static get DATETIME_HUGE() {
		return Sd;
	}
	static get DATETIME_HUGE_WITH_SECONDS() {
		return Cd;
	}
};
function ig(e) {
	if (J.isDateTime(e)) return e;
	if (e && e.valueOf && Uf(e.valueOf())) return J.fromJSDate(e);
	if (e && typeof e == "object") return J.fromObject(e);
	throw new Qu(`Unknown datetime argument: ${e}, of type ${typeof e}`);
}
//#endregion
//#region src/components/BaseCalendar/BaseCalendar.vue?vue&type=script&setup=true&lang.ts
var ag = ["aria-label"], og = { class: "base-calendar__header" }, sg = ["aria-label"], cg = {
	role: "row",
	class: "base-calendar__row"
}, lg = ["aria-label"], ug = [
	"disabled",
	"aria-selected",
	"aria-label",
	"aria-current",
	"onClick"
], dg = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseCalendar",
	props: {
		modelValue: { default: void 0 },
		min: { default: void 0 },
		max: { default: void 0 },
		disabledDates: { default: () => [] },
		size: { default: "md" },
		timezone: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t;
		function i() {
			return n.timezone ?? "local";
		}
		function a(e) {
			if (!e) return null;
			let t = J.fromISO(e, { zone: i() });
			return t.isValid ? t : null;
		}
		function o() {
			return J.now().setZone(i()).toISODate() ?? "";
		}
		let s = ((n.modelValue ? a(n.modelValue) : null) ?? J.now().setZone(i())).startOf("month"), c = P(s.year), l = P(s.month), u = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		], d = [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		], f = g(() => n.min ? a(n.min) : null), m = g(() => n.max ? a(n.max) : null), h = g(() => new Set(n.disabledDates ?? [])), _ = g(() => {
			let e = J.fromObject({
				year: c.value,
				month: l.value,
				day: 1
			}, { zone: i() }), t = e.toJSDate().getDay(), n = e.daysInMonth ?? 30, r = [];
			for (let e = 0; e < t; e++) r.push({
				day: null,
				iso: null,
				disabled: !0
			});
			for (let t = 1; t <= n; t++) {
				let n = e.set({ day: t }), i = n.toISODate() ?? "", a = !1;
				f.value && n < f.value.startOf("day") && (a = !0), m.value && n > m.value.startOf("day") && (a = !0), h.value.has(i) && (a = !0), r.push({
					day: t,
					iso: i,
					disabled: a
				});
			}
			return r;
		}), v = g(() => {
			let e = _.value, t = [];
			for (let n = 0; n < e.length; n += 7) t.push(e.slice(n, n + 7));
			return t;
		});
		function x() {
			let e = J.fromObject({
				year: c.value,
				month: l.value
			}, { zone: i() }).minus({ months: 1 });
			c.value = e.year, l.value = e.month;
		}
		function S() {
			let e = J.fromObject({
				year: c.value,
				month: l.value
			}, { zone: i() }).plus({ months: 1 });
			c.value = e.year, l.value = e.month;
		}
		function T(e, t) {
			!e || t || (r("update:modelValue", e), r("change", e));
		}
		let E = o();
		function D(e) {
			return !!e && e === n.modelValue;
		}
		function O(e) {
			return !!e && e === E;
		}
		return pe(() => n.modelValue, (e) => {
			if (!e) return;
			let t = a(e);
			t && (c.value = t.year, l.value = t.month);
		}), (t, n) => (N(), y("div", {
			class: j(["base-calendar", `base-calendar--${e.size}`]),
			role: "application",
			"aria-label": `Calendar, ${u[l.value - 1]} ${c.value}`
		}, [b("div", og, [
			b("button", {
				type: "button",
				class: "base-calendar__nav-btn",
				"aria-label": "Previous month",
				onClick: x
			}, [w(R(qn), {
				size: "xs",
				direction: "left"
			})]),
			w(H, {
				variant: "label",
				as: "span",
				color: "primary",
				class: "base-calendar__month-label"
			}, {
				default: z(() => [C(L(u[l.value - 1]) + " " + L(c.value), 1)]),
				_: 1
			}),
			b("button", {
				type: "button",
				class: "base-calendar__nav-btn",
				"aria-label": "Next month",
				onClick: S
			}, [w(R(qn), {
				size: "xs",
				direction: "right"
			})])
		]), b("div", {
			class: "base-calendar__grid",
			role: "grid",
			"aria-label": `${u[l.value - 1]} ${c.value}`
		}, [b("div", cg, [(N(), y(p, null, F(d, (e) => b("span", {
			key: e,
			class: "base-calendar__weekday",
			role: "columnheader",
			"aria-label": e
		}, L(e), 9, lg)), 64))]), (N(!0), y(p, null, F(v.value, (e, t) => (N(), y("div", {
			key: t,
			role: "row",
			class: "base-calendar__row"
		}, [(N(!0), y(p, null, F(e, (e, t) => (N(), y("button", {
			key: t,
			type: "button",
			role: "gridcell",
			disabled: !e.day || e.disabled,
			"aria-selected": D(e.iso),
			"aria-label": e.iso ?? void 0,
			"aria-current": O(e.iso) ? "date" : void 0,
			class: j(["base-calendar__day", {
				"base-calendar__day--empty": !e.day,
				"base-calendar__day--selected": D(e.iso),
				"base-calendar__day--today": O(e.iso) && !D(e.iso),
				"base-calendar__day--disabled": e.disabled && !!e.day
			}]),
			onClick: (t) => T(e.iso, e.disabled)
		}, L(e.day ?? ""), 11, ug))), 128))]))), 128))], 8, sg)], 10, ag));
	}
}), [["__scopeId", "data-v-b51d3418"]]), fg = ["for"], pg = {
	key: 0,
	class: "base-date-input__required",
	"aria-hidden": "true"
}, mg = [
	"id",
	"aria-expanded",
	"aria-label",
	"aria-invalid",
	"aria-describedby"
], hg = {
	class: "base-date-input__icon",
	"aria-hidden": "true"
}, gg = ["aria-label"], _g = { class: "base-date-input__cal-header" }, vg = { class: "base-date-input__cal-grid" }, yg = [
	"disabled",
	"aria-label",
	"aria-pressed",
	"onClick"
], bg = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDateInput",
	props: {
		modelValue: { default: "" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		placeholder: { default: "YYYY-MM-DD" },
		size: { default: "md" },
		min: { default: void 0 },
		max: { default: void 0 },
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id), a = P(!1), o = P(null), s = P(null), { floatingStyles: c } = Cn(s, o, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(4),
				ln({ padding: 8 }),
				cn({ padding: 8 })
			]
		}), l = P((/* @__PURE__ */ new Date()).getFullYear()), u = P((/* @__PURE__ */ new Date()).getMonth()), d = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		], f = [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		];
		function m(e) {
			if (!e) return null;
			let t = /* @__PURE__ */ new Date(e + "T00:00:00");
			return isNaN(t.getTime()) ? null : t;
		}
		let h = g(() => n.min ? m(n.min) : null), x = g(() => n.max ? m(n.max) : null), S = g(() => {
			let e = new Date(l.value, u.value, 1).getDay(), t = new Date(l.value, u.value + 1, 0).getDate(), n = [];
			for (let t = 0; t < e; t++) n.push({
				day: null,
				date: null,
				disabled: !0
			});
			for (let e = 1; e <= t; e++) {
				let t = `${l.value}-${String(u.value + 1).padStart(2, "0")}-${String(e).padStart(2, "0")}`, r = new Date(l.value, u.value, e), i = !1;
				h.value && r < h.value && (i = !0), x.value && r > x.value && (i = !0), n.push({
					day: e,
					date: t,
					disabled: i
				});
			}
			return n;
		});
		function T(e) {
			return !!e && e === n.modelValue;
		}
		function E(e) {
			if (!e) return !1;
			let t = /* @__PURE__ */ new Date();
			return e === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
		}
		function D(e, t) {
			!e || t || (r("update:modelValue", e), r("change", e), a.value = !1);
		}
		function O() {
			u.value === 0 ? (l.value--, u.value = 11) : u.value--;
		}
		function k() {
			u.value === 11 ? (l.value++, u.value = 0) : u.value++;
		}
		function A() {
			if (!n.disabled) {
				if (!a.value) {
					let e = m(n.modelValue);
					e && (l.value = e.getFullYear(), u.value = e.getMonth());
				}
				a.value = !a.value;
			}
		}
		function ee(e) {
			let t = e.target;
			o.value && !o.value.contains(t) && s.value && !s.value.contains(t) && (a.value = !1);
		}
		return pe(() => n.modelValue, (e) => {
			let t = m(e);
			t && (l.value = t.getFullYear(), u.value = t.getMonth());
		}), re(() => document.addEventListener("mousedown", ee)), ne(() => document.removeEventListener("mousedown", ee)), (t, n) => (N(), y("div", { class: j([
			"base-date-input",
			`base-date-input--${e.size}`,
			{
				"base-date-input--error": !!e.error,
				"base-date-input--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(i),
				class: j(["base-date-input__label", { "base-date-input__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", pg, "*")) : v("", !0)], 10, fg)) : v("", !0),
			b("button", {
				ref_key: "triggerRef",
				ref: s,
				id: R(i),
				type: "button",
				class: "base-date-input__trigger",
				"aria-expanded": a.value,
				"aria-haspopup": "dialog",
				"aria-label": e.label ?? "Date picker",
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
				onClick: A,
				onKeydown: n[0] ||= ge((e) => a.value = !1, ["escape"])
			}, [b("span", { class: j(["base-date-input__value", { "base-date-input__value--placeholder": !e.modelValue }]) }, L(e.modelValue || e.placeholder), 3), b("span", hg, [w(R(Dr), { size: "sm" })])], 40, mg),
			he(b("div", {
				ref_key: "calendarRef",
				ref: o,
				class: "base-date-input__calendar",
				role: "dialog",
				"aria-label": `${e.label ?? "Date"} calendar`,
				style: M(R(c))
			}, [b("div", _g, [
				b("button", {
					type: "button",
					class: "base-date-input__nav-btn",
					onClick: B(O, ["stop"]),
					"aria-label": "Previous month"
				}, [w(R(qn), {
					size: "xs",
					direction: "left"
				})]),
				w(H, {
					variant: "label",
					as: "span",
					color: "primary"
				}, {
					default: z(() => [C(L(d[u.value]) + " " + L(l.value), 1)]),
					_: 1
				}),
				b("button", {
					type: "button",
					class: "base-date-input__nav-btn",
					onClick: B(k, ["stop"]),
					"aria-label": "Next month"
				}, [w(R(qn), {
					size: "xs",
					direction: "right"
				})])
			]), b("div", vg, [(N(), y(p, null, F(f, (e) => b("span", {
				key: e,
				class: "base-date-input__weekday"
			}, L(e), 1)), 64)), (N(!0), y(p, null, F(S.value, (e, t) => (N(), y("button", {
				key: t,
				type: "button",
				disabled: !e.day || e.disabled,
				class: j(["base-date-input__day", {
					"base-date-input__day--empty": !e.day,
					"base-date-input__day--selected": T(e.date),
					"base-date-input__day--today": E(e.date) && !T(e.date),
					"base-date-input__day--disabled": e.disabled
				}]),
				"aria-label": e.date ?? void 0,
				"aria-pressed": T(e.date),
				onClick: B((t) => D(e.date, e.disabled), ["stop"])
			}, L(e.day ?? ""), 11, yg))), 128))])], 12, gg), [[fe, a.value]]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(i)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-date-input__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(i)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-date-input__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-f55d15e8"]]), xg = ["for"], Sg = {
	key: 0,
	class: "base-date-range__required",
	"aria-hidden": "true"
}, Cg = [
	"id",
	"aria-expanded",
	"aria-label",
	"aria-invalid",
	"aria-describedby"
], wg = {
	class: "base-date-range__icon",
	"aria-hidden": "true"
}, Tg = ["aria-label"], Eg = { class: "base-date-range__hint" }, Dg = { class: "base-date-range__panels" }, Og = { class: "base-date-range__panel" }, kg = { class: "base-date-range__cal-header" }, Ag = { class: "base-date-range__cal-grid" }, jg = [
	"disabled",
	"onClick",
	"onMouseenter"
], Mg = { class: "base-date-range__panel" }, Ng = { class: "base-date-range__cal-header" }, Pg = { class: "base-date-range__cal-grid" }, Fg = [
	"disabled",
	"onClick",
	"onMouseenter"
], Ig = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDateRangeInput",
	props: {
		modelValue: { default: () => ({
			start: "",
			end: ""
		}) },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		size: { default: "md" },
		min: { default: void 0 },
		max: { default: void 0 },
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id), a = P(!1), o = P(null), s = P(null), { floatingStyles: c } = Cn(s, o, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(4),
				ln({ padding: 8 }),
				cn({ padding: 8 })
			]
		}), l = P((/* @__PURE__ */ new Date()).getFullYear()), u = P((/* @__PURE__ */ new Date()).getMonth()), d = g(() => u.value === 11 ? l.value + 1 : l.value), f = g(() => u.value === 11 ? 0 : u.value + 1), m = P(null), h = P("start"), x = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		], S = [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		];
		function T(e) {
			if (!e) return null;
			let t = /* @__PURE__ */ new Date(e + "T00:00:00");
			return isNaN(t.getTime()) ? null : t;
		}
		let E = g(() => n.min ? T(n.min) : null), D = g(() => n.max ? T(n.max) : null), O = g(() => n.modelValue?.start ?? ""), k = g(() => n.modelValue?.end ?? "");
		function A(e, t) {
			let n = new Date(e, t, 1).getDay(), r = new Date(e, t + 1, 0).getDate(), i = [];
			for (let e = 0; e < n; e++) i.push({
				day: null,
				date: null,
				disabled: !0
			});
			for (let n = 1; n <= r; n++) {
				let r = `${e}-${String(t + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`, a = new Date(e, t, n), o = !1;
				E.value && a < E.value && (o = !0), D.value && a > D.value && (o = !0), i.push({
					day: n,
					date: r,
					disabled: o
				});
			}
			return i;
		}
		let ee = g(() => A(l.value, u.value)), te = g(() => A(d.value, f.value));
		function ie() {
			return k.value || m.value || null;
		}
		function ae(e) {
			if (!e || !O.value) return !1;
			let t = ie();
			return t ? O.value <= t ? e === O.value : e === t : e === O.value;
		}
		function oe(e) {
			if (!e || !O.value) return !1;
			let t = ie();
			return t ? O.value <= t ? e === t : e === O.value : !1;
		}
		function se(e) {
			if (!e || !O.value) return !1;
			let t = ie();
			if (!t) return !1;
			let [n, r] = O.value <= t ? [O.value, t] : [t, O.value];
			return e > n && e < r;
		}
		function I(e) {
			if (!e) return !1;
			let t = /* @__PURE__ */ new Date();
			return e === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
		}
		function ce(e, t) {
			if (!(!e || t)) if (h.value === "start" || k.value) r("update:modelValue", {
				start: e,
				end: ""
			}), r("change", {
				start: e,
				end: ""
			}), h.value = "end";
			else {
				let t = O.value, [n, i] = t <= e ? [t, e] : [e, t], o = {
					start: n,
					end: i
				};
				r("update:modelValue", o), r("change", o), h.value = "start", a.value = !1;
			}
		}
		function le() {
			u.value === 0 ? (l.value--, u.value = 11) : u.value--;
		}
		function ue() {
			u.value === 11 ? (l.value++, u.value = 0) : u.value++;
		}
		function de() {
			if (!n.disabled) {
				if (!a.value) {
					h.value = "start", m.value = null;
					let e = T(O.value);
					e && (l.value = e.getFullYear(), u.value = e.getMonth());
				}
				a.value = !a.value;
			}
		}
		function me(e) {
			let t = e.target;
			o.value && !o.value.contains(t) && s.value && !s.value.contains(t) && (a.value = !1);
		}
		pe(() => n.modelValue, (e) => {
			if (e?.start) {
				let t = T(e.start);
				t && (l.value = t.getFullYear(), u.value = t.getMonth());
			}
		}), re(() => document.addEventListener("mousedown", me)), ne(() => document.removeEventListener("mousedown", me));
		let _e = g(() => O.value && k.value ? `${O.value}  →  ${k.value}` : O.value ? `${O.value}  →  …` : ""), ve = g(() => `${x[u.value]} ${l.value}`), ye = g(() => `${x[f.value]} ${d.value}`);
		return (t, n) => (N(), y("div", { class: j([
			"base-date-range",
			`base-date-range--${e.size}`,
			{
				"base-date-range--error": !!e.error,
				"base-date-range--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(i),
				class: j(["base-date-range__label", { "base-date-range__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", Sg, "*")) : v("", !0)], 10, xg)) : v("", !0),
			b("button", {
				ref_key: "triggerRef",
				ref: s,
				id: R(i),
				type: "button",
				class: "base-date-range__trigger",
				"aria-expanded": a.value,
				"aria-haspopup": "dialog",
				"aria-label": e.label ?? "Date range picker",
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
				onClick: de,
				onKeydown: n[0] ||= ge((e) => a.value = !1, ["escape"])
			}, [b("span", { class: j(["base-date-range__value", { "base-date-range__value--placeholder": !_e.value }]) }, L(_e.value || "YYYY-MM-DD  →  YYYY-MM-DD"), 3), b("span", wg, [w(R(Dr), { size: "sm" })])], 40, Cg),
			he(b("div", {
				ref_key: "calendarRef",
				ref: o,
				class: "base-date-range__calendar",
				role: "dialog",
				"aria-label": `${e.label ?? "Date range"} calendar`,
				style: M(R(c))
			}, [b("div", Eg, [w(H, {
				variant: "caption",
				as: "span",
				color: "secondary"
			}, {
				default: z(() => [C(L(h.value === "start" ? "Select start date" : "Select end date"), 1)]),
				_: 1
			})]), b("div", Dg, [
				b("div", Og, [b("div", kg, [
					b("button", {
						type: "button",
						class: "base-date-range__nav-btn",
						onClick: B(le, ["stop"]),
						"aria-label": "Previous month"
					}, [w(R(qn), {
						size: "xs",
						direction: "left"
					})]),
					w(H, {
						variant: "label",
						as: "span",
						color: "primary"
					}, {
						default: z(() => [C(L(ve.value), 1)]),
						_: 1
					}),
					n[3] ||= b("span", { style: { width: "28px" } }, null, -1)
				]), b("div", Ag, [(N(), y(p, null, F(S, (e) => b("span", {
					key: `ld-${e}`,
					class: "base-date-range__weekday"
				}, L(e), 1)), 64)), (N(!0), y(p, null, F(ee.value, (e, t) => (N(), y("button", {
					key: `l-${t}`,
					type: "button",
					disabled: !e.day || e.disabled,
					class: j(["base-date-range__day", {
						"base-date-range__day--empty": !e.day,
						"base-date-range__day--range-start": ae(e.date),
						"base-date-range__day--range-end": oe(e.date),
						"base-date-range__day--in-range": se(e.date),
						"base-date-range__day--today": I(e.date) && !ae(e.date) && !oe(e.date),
						"base-date-range__day--disabled": e.disabled
					}]),
					onClick: B((t) => ce(e.date, e.disabled), ["stop"]),
					onMouseenter: (t) => m.value = e.date,
					onMouseleave: n[1] ||= (e) => m.value = null
				}, L(e.day ?? ""), 43, jg))), 128))])]),
				n[5] ||= b("div", { class: "base-date-range__sep" }, null, -1),
				b("div", Mg, [b("div", Ng, [
					n[4] ||= b("span", { style: { width: "28px" } }, null, -1),
					w(H, {
						variant: "label",
						as: "span",
						color: "primary"
					}, {
						default: z(() => [C(L(ye.value), 1)]),
						_: 1
					}),
					b("button", {
						type: "button",
						class: "base-date-range__nav-btn",
						onClick: B(ue, ["stop"]),
						"aria-label": "Next month"
					}, [w(R(qn), {
						size: "xs",
						direction: "right"
					})])
				]), b("div", Pg, [(N(), y(p, null, F(S, (e) => b("span", {
					key: `rd-${e}`,
					class: "base-date-range__weekday"
				}, L(e), 1)), 64)), (N(!0), y(p, null, F(te.value, (e, t) => (N(), y("button", {
					key: `r-${t}`,
					type: "button",
					disabled: !e.day || e.disabled,
					class: j(["base-date-range__day", {
						"base-date-range__day--empty": !e.day,
						"base-date-range__day--range-start": ae(e.date),
						"base-date-range__day--range-end": oe(e.date),
						"base-date-range__day--in-range": se(e.date),
						"base-date-range__day--today": I(e.date) && !ae(e.date) && !oe(e.date),
						"base-date-range__day--disabled": e.disabled
					}]),
					onClick: B((t) => ce(e.date, e.disabled), ["stop"]),
					onMouseenter: (t) => m.value = e.date,
					onMouseleave: n[2] ||= (e) => m.value = null
				}, L(e.day ?? ""), 43, Fg))), 128))])])
			])], 12, Tg), [[fe, a.value]]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(i)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-date-range__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(i)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-date-range__hint-text"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-a622f53c"]]), Lg = ["for"], Rg = {
	key: 0,
	class: "base-time-input__required",
	"aria-hidden": "true"
}, zg = [
	"id",
	"aria-expanded",
	"aria-label",
	"aria-invalid",
	"aria-describedby"
], Bg = ["aria-label"], Vg = { class: "base-time-input__columns" }, Hg = { class: "base-time-input__col" }, Ug = { class: "base-time-input__scroll" }, Wg = ["onClick"], Gg = { class: "base-time-input__col" }, Kg = { class: "base-time-input__scroll" }, qg = ["onClick"], Jg = { class: "base-time-input__col" }, Yg = { class: "base-time-input__scroll" }, Xg = ["onClick"], Zg = { class: "base-time-input__footer" }, Qg = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTimeInput",
	props: {
		modelValue: { default: "" },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		size: { default: "md" },
		showSeconds: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id), a = P(!1), o = P(null), s = P(null), { floatingStyles: c } = Cn(s, o, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(4),
				ln({ padding: 8 }),
				cn({ padding: 8 })
			]
		});
		function l(e) {
			let t = e ? e.split(":") : [];
			return {
				h: t[0] ? parseInt(t[0], 10) : 0,
				m: t[1] ? parseInt(t[1], 10) : 0,
				s: t[2] ? parseInt(t[2], 10) : 0
			};
		}
		let u = P(0), d = P(0), f = P(0);
		pe(() => n.modelValue, (e) => {
			let t = l(e);
			u.value = t.h, d.value = t.m, f.value = t.s;
		}, { immediate: !0 });
		function m(e) {
			return String(e).padStart(2, "0");
		}
		function h() {
			let e = n.showSeconds ? `${m(u.value)}:${m(d.value)}:${m(f.value)}` : `${m(u.value)}:${m(d.value)}`;
			r("update:modelValue", e), r("change", e);
		}
		function x(e, t, n) {
			return Math.min(n, Math.max(t, e));
		}
		function S(e) {
			u.value = x(e, 0, 23), h();
		}
		function T(e) {
			d.value = x(e, 0, 59), h();
		}
		function E(e) {
			f.value = x(e, 0, 59), h();
		}
		let D = Array.from({ length: 24 }, (e, t) => t), O = Array.from({ length: 60 }, (e, t) => t), k = Array.from({ length: 60 }, (e, t) => t);
		function A() {
			n.disabled || (a.value = !a.value);
		}
		function ee(e) {
			let t = e.target;
			o.value && !o.value.contains(t) && s.value && !s.value.contains(t) && (a.value = !1);
		}
		re(() => document.addEventListener("mousedown", ee)), ne(() => document.removeEventListener("mousedown", ee));
		let te = g(() => {
			if (!n.modelValue) return "";
			let e = l(n.modelValue);
			return n.showSeconds ? `${m(e.h)}:${m(e.m)}:${m(e.s)}` : `${m(e.h)}:${m(e.m)}`;
		}), ie = g(() => n.showSeconds ? "HH:MM:SS" : "HH:MM");
		return (t, n) => (N(), y("div", { class: j([
			"base-time-input",
			`base-time-input--${e.size}`,
			{
				"base-time-input--error": !!e.error,
				"base-time-input--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(i),
				class: j(["base-time-input__label", { "base-time-input__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", Rg, "*")) : v("", !0)], 10, Lg)) : v("", !0),
			b("button", {
				ref_key: "triggerRef",
				ref: s,
				id: R(i),
				type: "button",
				class: "base-time-input__trigger",
				"aria-expanded": a.value,
				"aria-haspopup": "dialog",
				"aria-label": e.label ?? "Time picker",
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
				onClick: A,
				onKeydown: n[0] ||= ge((e) => a.value = !1, ["escape"])
			}, [b("span", { class: j(["base-time-input__value", { "base-time-input__value--placeholder": !te.value }]) }, L(te.value || ie.value), 3), n[2] ||= b("span", {
				class: "base-time-input__icon",
				"aria-hidden": "true"
			}, [b("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg"
			}, [b("circle", {
				cx: "8",
				cy: "8",
				r: "6.5",
				stroke: "currentColor"
			}), b("path", {
				d: "M8 5V8.5L10.5 10",
				stroke: "currentColor",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			})])], -1)], 40, zg),
			he(b("div", {
				ref_key: "popoverRef",
				ref: o,
				class: "base-time-input__popover",
				role: "dialog",
				"aria-label": `${e.label ?? "Time"} picker`,
				style: M(R(c))
			}, [b("div", Vg, [
				b("div", Hg, [n[3] ||= b("div", { class: "base-time-input__col-header" }, "HH", -1), b("div", Ug, [(N(!0), y(p, null, F(R(D), (e) => (N(), y("button", {
					key: `h-${e}`,
					type: "button",
					class: j(["base-time-input__unit-btn", { "base-time-input__unit-btn--active": u.value === e }]),
					onClick: B((t) => S(e), ["stop"])
				}, L(m(e)), 11, Wg))), 128))])]),
				n[7] ||= b("span", { class: "base-time-input__sep" }, ":", -1),
				b("div", Gg, [n[4] ||= b("div", { class: "base-time-input__col-header" }, "MM", -1), b("div", Kg, [(N(!0), y(p, null, F(R(O), (e) => (N(), y("button", {
					key: `m-${e}`,
					type: "button",
					class: j(["base-time-input__unit-btn", { "base-time-input__unit-btn--active": d.value === e }]),
					onClick: B((t) => T(e), ["stop"])
				}, L(m(e)), 11, qg))), 128))])]),
				e.showSeconds ? (N(), y(p, { key: 0 }, [n[6] ||= b("span", { class: "base-time-input__sep" }, ":", -1), b("div", Jg, [n[5] ||= b("div", { class: "base-time-input__col-header" }, "SS", -1), b("div", Yg, [(N(!0), y(p, null, F(R(k), (e) => (N(), y("button", {
					key: `s-${e}`,
					type: "button",
					class: j(["base-time-input__unit-btn", { "base-time-input__unit-btn--active": f.value === e }]),
					onClick: B((t) => E(e), ["stop"])
				}, L(m(e)), 11, Xg))), 128))])])], 64)) : v("", !0)
			]), b("div", Zg, [b("button", {
				type: "button",
				class: "base-time-input__done-btn",
				onClick: n[1] ||= B((e) => a.value = !1, ["stop"])
			}, "Done")])], 12, Bg), [[fe, a.value]]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(i)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-time-input__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(i)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-time-input__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-f42e4e2b"]]), $g = ["for"], e_ = {
	key: 0,
	class: "base-time-range__required",
	"aria-hidden": "true"
}, t_ = [
	"id",
	"aria-expanded",
	"aria-label",
	"aria-invalid",
	"aria-describedby"
], n_ = ["aria-label"], r_ = { class: "base-time-range__panels" }, i_ = { class: "base-time-range__panel" }, a_ = { class: "base-time-range__columns" }, o_ = { class: "base-time-range__col" }, s_ = { class: "base-time-range__scroll" }, c_ = ["onClick"], l_ = { class: "base-time-range__col" }, u_ = { class: "base-time-range__scroll" }, d_ = ["onClick"], f_ = { class: "base-time-range__col" }, p_ = { class: "base-time-range__scroll" }, m_ = ["onClick"], h_ = { class: "base-time-range__divider" }, g_ = { class: "base-time-range__panel" }, __ = { class: "base-time-range__columns" }, v_ = { class: "base-time-range__col" }, y_ = { class: "base-time-range__scroll" }, b_ = ["onClick"], x_ = { class: "base-time-range__col" }, S_ = { class: "base-time-range__scroll" }, C_ = ["onClick"], w_ = { class: "base-time-range__col" }, T_ = { class: "base-time-range__scroll" }, E_ = ["onClick"], D_ = { class: "base-time-range__footer" }, O_ = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseTimeRangeInput",
	props: {
		modelValue: { default: () => ({
			start: "",
			end: ""
		}) },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		size: { default: "md" },
		showSeconds: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id), a = P(!1), o = P(null), s = P(null), { floatingStyles: c } = Cn(s, o, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(4),
				ln({ padding: 8 }),
				cn({ padding: 8 })
			]
		});
		function l(e) {
			let t = e ? e.split(":") : [];
			return {
				h: t[0] ? parseInt(t[0], 10) : 0,
				m: t[1] ? parseInt(t[1], 10) : 0,
				s: t[2] ? parseInt(t[2], 10) : 0
			};
		}
		function u(e) {
			return String(e).padStart(2, "0");
		}
		function d(e, t, n, r) {
			return r ? `${u(e)}:${u(t)}:${u(n)}` : `${u(e)}:${u(t)}`;
		}
		let f = P(0), m = P(0), h = P(0), x = P(0), S = P(0), T = P(0);
		pe(() => n.modelValue, (e) => {
			if (e?.start) {
				let t = l(e.start);
				f.value = t.h, m.value = t.m, h.value = t.s;
			}
			if (e?.end) {
				let t = l(e.end);
				x.value = t.h, S.value = t.m, T.value = t.s;
			}
		}, { immediate: !0 });
		function E(e, t, n) {
			return Math.min(n, Math.max(t, e));
		}
		function D() {
			let e = {
				start: d(f.value, m.value, h.value, n.showSeconds),
				end: d(x.value, S.value, T.value, n.showSeconds)
			};
			r("update:modelValue", e), r("change", e);
		}
		function O(e) {
			f.value = E(e, 0, 23), D();
		}
		function k(e) {
			m.value = E(e, 0, 59), D();
		}
		function A(e) {
			h.value = E(e, 0, 59), D();
		}
		function ee(e) {
			x.value = E(e, 0, 23), D();
		}
		function te(e) {
			S.value = E(e, 0, 59), D();
		}
		function ie(e) {
			T.value = E(e, 0, 59), D();
		}
		let ae = Array.from({ length: 24 }, (e, t) => t), oe = Array.from({ length: 60 }, (e, t) => t), se = Array.from({ length: 60 }, (e, t) => t);
		function I() {
			n.disabled || (a.value = !a.value);
		}
		function ce(e) {
			let t = e.target;
			o.value && !o.value.contains(t) && s.value && !s.value.contains(t) && (a.value = !1);
		}
		re(() => document.addEventListener("mousedown", ce)), ne(() => document.removeEventListener("mousedown", ce));
		let le = g(() => {
			let e = n.modelValue?.start, t = n.modelValue?.end;
			return e && t ? `${e}  →  ${t}` : e ? `${e}  →  …` : "";
		}), ue = g(() => n.showSeconds ? "HH:MM:SS" : "HH:MM");
		return (t, n) => (N(), y("div", { class: j([
			"base-time-range",
			`base-time-range--${e.size}`,
			{
				"base-time-range--error": !!e.error,
				"base-time-range--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(i),
				class: j(["base-time-range__label", { "base-time-range__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", e_, "*")) : v("", !0)], 10, $g)) : v("", !0),
			b("button", {
				ref_key: "triggerRef",
				ref: s,
				id: R(i),
				type: "button",
				class: "base-time-range__trigger",
				"aria-expanded": a.value,
				"aria-haspopup": "dialog",
				"aria-label": e.label ?? "Time range picker",
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
				onClick: I,
				onKeydown: n[0] ||= ge((e) => a.value = !1, ["escape"])
			}, [b("span", { class: j(["base-time-range__value", { "base-time-range__value--placeholder": !le.value }]) }, L(le.value || `${ue.value}  →  ${ue.value}`), 3), n[2] ||= b("span", {
				class: "base-time-range__icon",
				"aria-hidden": "true"
			}, [b("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg"
			}, [b("circle", {
				cx: "8",
				cy: "8",
				r: "6.5",
				stroke: "currentColor"
			}), b("path", {
				d: "M8 5V8.5L10.5 10",
				stroke: "currentColor",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			})])], -1)], 40, t_),
			he(b("div", {
				ref_key: "popoverRef",
				ref: o,
				class: "base-time-range__popover",
				role: "dialog",
				"aria-label": `${e.label ?? "Time range"} picker`,
				style: M(R(c))
			}, [b("div", r_, [
				b("div", i_, [w(H, {
					variant: "caption",
					as: "div",
					color: "secondary",
					class: "base-time-range__panel-title"
				}, {
					default: z(() => [...n[3] ||= [C("Start", -1)]]),
					_: 1
				}), b("div", a_, [
					b("div", o_, [n[4] ||= b("div", { class: "base-time-range__col-header" }, "HH", -1), b("div", s_, [(N(!0), y(p, null, F(R(ae), (e) => (N(), y("button", {
						key: `sh-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": f.value === e }]),
						onClick: B((t) => O(e), ["stop"])
					}, L(u(e)), 11, c_))), 128))])]),
					n[8] ||= b("span", { class: "base-time-range__sep" }, ":", -1),
					b("div", l_, [n[5] ||= b("div", { class: "base-time-range__col-header" }, "MM", -1), b("div", u_, [(N(!0), y(p, null, F(R(oe), (e) => (N(), y("button", {
						key: `sm-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": m.value === e }]),
						onClick: B((t) => k(e), ["stop"])
					}, L(u(e)), 11, d_))), 128))])]),
					e.showSeconds ? (N(), y(p, { key: 0 }, [n[7] ||= b("span", { class: "base-time-range__sep" }, ":", -1), b("div", f_, [n[6] ||= b("div", { class: "base-time-range__col-header" }, "SS", -1), b("div", p_, [(N(!0), y(p, null, F(R(se), (e) => (N(), y("button", {
						key: `ss-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": h.value === e }]),
						onClick: B((t) => A(e), ["stop"])
					}, L(u(e)), 11, m_))), 128))])])], 64)) : v("", !0)
				])]),
				b("div", h_, [w(R(Yn), {
					size: "sm",
					direction: "right"
				})]),
				b("div", g_, [w(H, {
					variant: "caption",
					as: "div",
					color: "secondary",
					class: "base-time-range__panel-title"
				}, {
					default: z(() => [...n[9] ||= [C("End", -1)]]),
					_: 1
				}), b("div", __, [
					b("div", v_, [n[10] ||= b("div", { class: "base-time-range__col-header" }, "HH", -1), b("div", y_, [(N(!0), y(p, null, F(R(ae), (e) => (N(), y("button", {
						key: `eh-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": x.value === e }]),
						onClick: B((t) => ee(e), ["stop"])
					}, L(u(e)), 11, b_))), 128))])]),
					n[14] ||= b("span", { class: "base-time-range__sep" }, ":", -1),
					b("div", x_, [n[11] ||= b("div", { class: "base-time-range__col-header" }, "MM", -1), b("div", S_, [(N(!0), y(p, null, F(R(oe), (e) => (N(), y("button", {
						key: `em-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": S.value === e }]),
						onClick: B((t) => te(e), ["stop"])
					}, L(u(e)), 11, C_))), 128))])]),
					e.showSeconds ? (N(), y(p, { key: 0 }, [n[13] ||= b("span", { class: "base-time-range__sep" }, ":", -1), b("div", w_, [n[12] ||= b("div", { class: "base-time-range__col-header" }, "SS", -1), b("div", T_, [(N(!0), y(p, null, F(R(se), (e) => (N(), y("button", {
						key: `es-${e}`,
						type: "button",
						class: j(["base-time-range__unit-btn", { "base-time-range__unit-btn--active": T.value === e }]),
						onClick: B((t) => ie(e), ["stop"])
					}, L(u(e)), 11, E_))), 128))])])], 64)) : v("", !0)
				])])
			]), b("div", D_, [b("button", {
				type: "button",
				class: "base-time-range__done-btn",
				onClick: n[1] ||= B((e) => a.value = !1, ["stop"])
			}, "Done")])], 12, n_), [[fe, a.value]]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(i)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-time-range__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(i)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-time-range__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-bd437b6a"]]), k_ = ["for"], A_ = {
	key: 0,
	class: "base-dtr__required",
	"aria-hidden": "true"
}, j_ = [
	"id",
	"aria-expanded",
	"aria-label",
	"aria-invalid",
	"aria-describedby"
], M_ = {
	class: "base-dtr__icon",
	"aria-hidden": "true"
}, N_ = ["aria-label"], P_ = { class: "base-dtr__tz-row" }, F_ = {
	class: "base-dtr__tz-toggle",
	role: "group",
	"aria-label": "Timezone selection"
}, I_ = { class: "base-dtr__phase-hint" }, L_ = {
	key: 0,
	class: "base-dtr__cal-panels"
}, R_ = { class: "base-dtr__cal-panel" }, z_ = { class: "base-dtr__cal-header" }, B_ = { class: "base-dtr__cal-grid" }, V_ = [
	"disabled",
	"onClick",
	"onMouseenter"
], H_ = { class: "base-dtr__cal-panel" }, U_ = { class: "base-dtr__cal-header" }, W_ = { class: "base-dtr__cal-grid" }, G_ = [
	"disabled",
	"onClick",
	"onMouseenter"
], K_ = {
	key: 1,
	class: "base-dtr__time-section"
}, q_ = { class: "base-dtr__time-columns" }, J_ = { class: "base-dtr__time-col" }, Y_ = { class: "base-dtr__time-scroll" }, X_ = ["onClick"], Z_ = { class: "base-dtr__time-col" }, Q_ = { class: "base-dtr__time-scroll" }, $_ = ["onClick"], ev = { class: "base-dtr__time-col" }, tv = { class: "base-dtr__time-scroll" }, nv = ["onClick"], rv = { class: "base-dtr__time-footer" }, iv = {
	key: 2,
	class: "base-dtr__time-section"
}, av = { class: "base-dtr__time-columns" }, ov = { class: "base-dtr__time-col" }, sv = { class: "base-dtr__time-scroll" }, cv = ["onClick"], lv = { class: "base-dtr__time-col" }, uv = { class: "base-dtr__time-scroll" }, dv = ["onClick"], fv = { class: "base-dtr__time-col" }, pv = { class: "base-dtr__time-scroll" }, mv = ["onClick"], hv = { class: "base-dtr__time-footer" }, gv = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseDateTimeRangeInput",
	props: {
		modelValue: { default: () => ({
			start: "",
			end: "",
			timezone: "browser"
		}) },
		label: { default: void 0 },
		labelHidden: {
			type: Boolean,
			default: !1
		},
		hint: { default: void 0 },
		error: { default: void 0 },
		disabled: {
			type: Boolean,
			default: !1
		},
		required: {
			type: Boolean,
			default: !1
		},
		size: { default: "md" },
		showSeconds: {
			type: Boolean,
			default: !1
		},
		id: { default: void 0 }
	},
	emits: ["update:modelValue", "change"],
	setup(e, { emit: t }) {
		let n = e, r = t, { id: i } = Fn(n.id), a = P(!1), o = P(null), s = P(null), { floatingStyles: c } = Cn(s, o, {
			placement: "bottom-start",
			whileElementsMounted: on,
			middleware: [
				sn(4),
				ln({ padding: 8 }),
				cn({ padding: 8 })
			]
		}), l = P(n.modelValue?.timezone ?? "browser"), u = g(() => {
			try {
				return Intl.DateTimeFormat().resolvedOptions().timeZone;
			} catch {
				return "Local";
			}
		}), d = P((/* @__PURE__ */ new Date()).getFullYear()), f = P((/* @__PURE__ */ new Date()).getMonth()), m = g(() => f.value === 11 ? d.value + 1 : d.value), h = g(() => f.value === 11 ? 0 : f.value + 1), x = P(null), S = P("start-date"), T = P(""), E = P(""), D = P(0), O = P(0), k = P(0), A = P(0), ee = P(0), te = P(0);
		function ie(e) {
			if (!e) return {
				date: "",
				h: 0,
				m: 0,
				s: 0
			};
			let [t, n] = e.includes("T") ? e.split("T") : e.split(" "), r = (n ?? "").replace("Z", "").split(":");
			return {
				date: t ?? "",
				h: r[0] ? parseInt(r[0], 10) : 0,
				m: r[1] ? parseInt(r[1], 10) : 0,
				s: r[2] ? parseInt(r[2], 10) : 0
			};
		}
		pe(() => n.modelValue, (e) => {
			if (e?.timezone && (l.value = e.timezone), e?.start) {
				let t = ie(e.start);
				T.value = t.date, D.value = t.h, O.value = t.m, k.value = t.s;
			}
			if (e?.end) {
				let t = ie(e.end);
				E.value = t.date, A.value = t.h, ee.value = t.m, te.value = t.s;
			}
		}, { immediate: !0 });
		function ae(e) {
			return String(e).padStart(2, "0");
		}
		function oe(e, t, r, i) {
			return e ? `${e} ${n.showSeconds ? `${ae(t)}:${ae(r)}:${ae(i)}` : `${ae(t)}:${ae(r)}`}` : "";
		}
		function se() {
			let e = {
				start: oe(T.value, D.value, O.value, k.value),
				end: oe(E.value, A.value, ee.value, te.value),
				timezone: l.value
			};
			r("update:modelValue", e), r("change", e);
		}
		function I(e, t, n) {
			return Math.min(n, Math.max(t, e));
		}
		function ce(e) {
			D.value = I(e, 0, 23), se();
		}
		function le(e) {
			O.value = I(e, 0, 59), se();
		}
		function ue(e) {
			k.value = I(e, 0, 59), se();
		}
		function de(e) {
			A.value = I(e, 0, 23), se();
		}
		function me(e) {
			ee.value = I(e, 0, 59), se();
		}
		function _e(e) {
			te.value = I(e, 0, 59), se();
		}
		function ve() {
			l.value = l.value === "browser" ? "utc" : "browser", se();
		}
		let ye = Array.from({ length: 24 }, (e, t) => t), be = Array.from({ length: 60 }, (e, t) => t), V = Array.from({ length: 60 }, (e, t) => t), xe = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		], Se = [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		];
		function Ce(e) {
			if (!e) return null;
			let t = /* @__PURE__ */ new Date(e + "T00:00:00");
			return isNaN(t.getTime()) ? null : t;
		}
		function we(e, t) {
			let n = new Date(e, t, 1).getDay(), r = new Date(e, t + 1, 0).getDate(), i = [];
			for (let e = 0; e < n; e++) i.push({
				day: null,
				date: null
			});
			for (let n = 1; n <= r; n++) i.push({
				day: n,
				date: `${e}-${String(t + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`
			});
			return i;
		}
		let Te = g(() => we(d.value, f.value)), Ee = g(() => we(m.value, h.value));
		function De() {
			return E.value || x.value || null;
		}
		function Oe(e) {
			if (!e || !T.value) return !1;
			let t = De();
			return t ? T.value <= t ? e === T.value : e === t : e === T.value;
		}
		function ke(e) {
			if (!e || !T.value) return !1;
			let t = De();
			return t ? T.value <= t ? e === t : e === T.value : !1;
		}
		function Ae(e) {
			if (!e || !T.value) return !1;
			let t = De();
			if (!t) return !1;
			let [n, r] = T.value <= t ? [T.value, t] : [t, T.value];
			return e > n && e < r;
		}
		function je(e) {
			if (!e) return !1;
			let t = /* @__PURE__ */ new Date();
			return e === `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
		}
		function Me(e) {
			if (e) if (S.value === "start-date" || E.value) T.value = e, E.value = "", S.value = "end-date";
			else {
				let t = T.value, [n, r] = t <= e ? [t, e] : [e, t];
				T.value = n, E.value = r, S.value = "start-time", se();
			}
		}
		function Ne() {
			f.value === 0 ? (d.value--, f.value = 11) : f.value--;
		}
		function Pe() {
			f.value === 11 ? (d.value++, f.value = 0) : f.value++;
		}
		function Fe() {
			if (!n.disabled) {
				if (!a.value) {
					S.value = "start-date", x.value = null;
					let e = Ce(T.value);
					e && (d.value = e.getFullYear(), f.value = e.getMonth());
				}
				a.value = !a.value;
			}
		}
		function Ie(e) {
			let t = e.target;
			o.value && !o.value.contains(t) && s.value && !s.value.contains(t) && (a.value = !1);
		}
		re(() => document.addEventListener("mousedown", Ie)), ne(() => document.removeEventListener("mousedown", Ie));
		let Le = g(() => {
			let e = n.modelValue?.start, t = n.modelValue?.end, r = (n.modelValue?.timezone ?? "browser") === "utc" ? "UTC" : u.value;
			return e && t ? `${e}  →  ${t}  (${r})` : e ? `${e}  →  …  (${r})` : "";
		}), Re = g(() => `${xe[f.value]} ${d.value}`), ze = g(() => `${xe[h.value]} ${m.value}`), Be = g(() => {
			switch (S.value) {
				case "start-date": return "Select start date";
				case "end-date": return "Select end date";
				case "start-time": return "Set start time";
				case "end-time": return "Set end time";
			}
		}), Ve = g(() => S.value === "start-date" || S.value === "end-date"), He = g(() => S.value === "start-time"), Ue = g(() => S.value === "end-time");
		return (t, n) => (N(), y("div", { class: j([
			"base-dtr",
			`base-dtr--${e.size}`,
			{
				"base-dtr--error": !!e.error,
				"base-dtr--disabled": e.disabled
			}
		]) }, [
			e.label ? (N(), y("label", {
				key: 0,
				for: R(i),
				class: j(["base-dtr__label", { "base-dtr__label--hidden": e.labelHidden }])
			}, [w(H, {
				variant: "label",
				as: "span",
				color: "primary"
			}, {
				default: z(() => [C(L(e.label), 1)]),
				_: 1
			}), e.required ? (N(), y("span", A_, "*")) : v("", !0)], 10, k_)) : v("", !0),
			b("button", {
				ref_key: "triggerRef",
				ref: s,
				id: R(i),
				type: "button",
				class: "base-dtr__trigger",
				"aria-expanded": a.value,
				"aria-haspopup": "dialog",
				"aria-label": e.label ?? "Date-time range picker",
				"aria-invalid": !!e.error || void 0,
				"aria-describedby": e.error ? `${R(i)}-error` : e.hint ? `${R(i)}-hint` : void 0,
				onClick: Fe,
				onKeydown: n[0] ||= ge((e) => a.value = !1, ["escape"])
			}, [b("span", { class: j(["base-dtr__value", { "base-dtr__value--placeholder": !Le.value }]) }, L(Le.value || "YYYY-MM-DD HH:MM  →  YYYY-MM-DD HH:MM"), 3), b("span", M_, [w(R(Dr), { size: "sm" })])], 40, j_),
			he(b("div", {
				ref_key: "popoverRef",
				ref: o,
				class: "base-dtr__popover",
				role: "dialog",
				"aria-label": `${e.label ?? "Date-time range"} picker`,
				style: M(R(c))
			}, [
				b("div", P_, [w(H, {
					variant: "caption",
					as: "span",
					color: "secondary"
				}, {
					default: z(() => [...n[8] ||= [C("Timezone:", -1)]]),
					_: 1
				}), b("div", F_, [b("button", {
					type: "button",
					class: j(["base-dtr__tz-btn", { "base-dtr__tz-btn--active": l.value === "browser" }]),
					onClick: n[1] ||= B((e) => l.value !== "browser" && ve(), ["stop"])
				}, [w(R(yr), { size: "xs" }), C(" " + L(u.value), 1)], 2), b("button", {
					type: "button",
					class: j(["base-dtr__tz-btn", { "base-dtr__tz-btn--active": l.value === "utc" }]),
					onClick: n[2] ||= B((e) => l.value !== "utc" && ve(), ["stop"])
				}, " UTC ", 2)])]),
				b("div", I_, [w(H, {
					variant: "caption",
					as: "span",
					color: "secondary"
				}, {
					default: z(() => [C(L(Be.value), 1)]),
					_: 1
				})]),
				Ve.value ? (N(), y("div", L_, [
					b("div", R_, [b("div", z_, [
						b("button", {
							type: "button",
							class: "base-dtr__nav-btn",
							onClick: B(Ne, ["stop"]),
							"aria-label": "Previous month"
						}, [w(R(qn), {
							size: "xs",
							direction: "left"
						})]),
						w(H, {
							variant: "label",
							as: "span",
							color: "primary"
						}, {
							default: z(() => [C(L(Re.value), 1)]),
							_: 1
						}),
						n[9] ||= b("span", { style: { width: "28px" } }, null, -1)
					]), b("div", B_, [(N(), y(p, null, F(Se, (e) => b("span", {
						key: `ld-${e}`,
						class: "base-dtr__weekday"
					}, L(e), 1)), 64)), (N(!0), y(p, null, F(Te.value, (e, t) => (N(), y("button", {
						key: `l-${t}`,
						type: "button",
						disabled: !e.day,
						class: j(["base-dtr__day", {
							"base-dtr__day--empty": !e.day,
							"base-dtr__day--range-start": Oe(e.date),
							"base-dtr__day--range-end": ke(e.date),
							"base-dtr__day--in-range": Ae(e.date),
							"base-dtr__day--today": je(e.date) && !Oe(e.date) && !ke(e.date)
						}]),
						onClick: B((t) => Me(e.date), ["stop"]),
						onMouseenter: (t) => x.value = e.date,
						onMouseleave: n[3] ||= (e) => x.value = null
					}, L(e.day ?? ""), 43, V_))), 128))])]),
					n[11] ||= b("div", { class: "base-dtr__cal-sep" }, null, -1),
					b("div", H_, [b("div", U_, [
						n[10] ||= b("span", { style: { width: "28px" } }, null, -1),
						w(H, {
							variant: "label",
							as: "span",
							color: "primary"
						}, {
							default: z(() => [C(L(ze.value), 1)]),
							_: 1
						}),
						b("button", {
							type: "button",
							class: "base-dtr__nav-btn",
							onClick: B(Pe, ["stop"]),
							"aria-label": "Next month"
						}, [w(R(qn), {
							size: "xs",
							direction: "right"
						})])
					]), b("div", W_, [(N(), y(p, null, F(Se, (e) => b("span", {
						key: `rd-${e}`,
						class: "base-dtr__weekday"
					}, L(e), 1)), 64)), (N(!0), y(p, null, F(Ee.value, (e, t) => (N(), y("button", {
						key: `r-${t}`,
						type: "button",
						disabled: !e.day,
						class: j(["base-dtr__day", {
							"base-dtr__day--empty": !e.day,
							"base-dtr__day--range-start": Oe(e.date),
							"base-dtr__day--range-end": ke(e.date),
							"base-dtr__day--in-range": Ae(e.date),
							"base-dtr__day--today": je(e.date) && !Oe(e.date) && !ke(e.date)
						}]),
						onClick: B((t) => Me(e.date), ["stop"]),
						onMouseenter: (t) => x.value = e.date,
						onMouseleave: n[4] ||= (e) => x.value = null
					}, L(e.day ?? ""), 43, G_))), 128))])])
				])) : v("", !0),
				He.value ? (N(), y("div", K_, [
					w(H, {
						variant: "label",
						as: "div",
						color: "primary",
						class: "base-dtr__time-date-label"
					}, {
						default: z(() => [C(L(T.value) + " — Start time ", 1)]),
						_: 1
					}),
					b("div", q_, [
						b("div", J_, [n[12] ||= b("div", { class: "base-dtr__time-col-header" }, "HH", -1), b("div", Y_, [(N(!0), y(p, null, F(R(ye), (e) => (N(), y("button", {
							key: `sh-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": D.value === e }]),
							onClick: B((t) => ce(e), ["stop"])
						}, L(ae(e)), 11, X_))), 128))])]),
						n[16] ||= b("span", { class: "base-dtr__time-sep" }, ":", -1),
						b("div", Z_, [n[13] ||= b("div", { class: "base-dtr__time-col-header" }, "MM", -1), b("div", Q_, [(N(!0), y(p, null, F(R(be), (e) => (N(), y("button", {
							key: `sm-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": O.value === e }]),
							onClick: B((t) => le(e), ["stop"])
						}, L(ae(e)), 11, $_))), 128))])]),
						e.showSeconds ? (N(), y(p, { key: 0 }, [n[15] ||= b("span", { class: "base-dtr__time-sep" }, ":", -1), b("div", ev, [n[14] ||= b("div", { class: "base-dtr__time-col-header" }, "SS", -1), b("div", tv, [(N(!0), y(p, null, F(R(V), (e) => (N(), y("button", {
							key: `ss-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": k.value === e }]),
							onClick: B((t) => ue(e), ["stop"])
						}, L(ae(e)), 11, nv))), 128))])])], 64)) : v("", !0)
					]),
					b("div", rv, [b("button", {
						type: "button",
						class: "base-dtr__next-btn",
						onClick: n[5] ||= B((e) => S.value = "end-time", ["stop"])
					}, "Next: End time →")])
				])) : v("", !0),
				Ue.value ? (N(), y("div", iv, [
					w(H, {
						variant: "label",
						as: "div",
						color: "primary",
						class: "base-dtr__time-date-label"
					}, {
						default: z(() => [C(L(E.value) + " — End time ", 1)]),
						_: 1
					}),
					b("div", av, [
						b("div", ov, [n[17] ||= b("div", { class: "base-dtr__time-col-header" }, "HH", -1), b("div", sv, [(N(!0), y(p, null, F(R(ye), (e) => (N(), y("button", {
							key: `eh-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": A.value === e }]),
							onClick: B((t) => de(e), ["stop"])
						}, L(ae(e)), 11, cv))), 128))])]),
						n[21] ||= b("span", { class: "base-dtr__time-sep" }, ":", -1),
						b("div", lv, [n[18] ||= b("div", { class: "base-dtr__time-col-header" }, "MM", -1), b("div", uv, [(N(!0), y(p, null, F(R(be), (e) => (N(), y("button", {
							key: `em-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": ee.value === e }]),
							onClick: B((t) => me(e), ["stop"])
						}, L(ae(e)), 11, dv))), 128))])]),
						e.showSeconds ? (N(), y(p, { key: 0 }, [n[20] ||= b("span", { class: "base-dtr__time-sep" }, ":", -1), b("div", fv, [n[19] ||= b("div", { class: "base-dtr__time-col-header" }, "SS", -1), b("div", pv, [(N(!0), y(p, null, F(R(V), (e) => (N(), y("button", {
							key: `es-${e}`,
							type: "button",
							class: j(["base-dtr__unit-btn", { "base-dtr__unit-btn--active": te.value === e }]),
							onClick: B((t) => _e(e), ["stop"])
						}, L(ae(e)), 11, mv))), 128))])])], 64)) : v("", !0)
					]),
					b("div", hv, [b("button", {
						type: "button",
						class: "base-dtr__back-btn",
						onClick: n[6] ||= B((e) => S.value = "start-time", ["stop"])
					}, "← Back"), b("button", {
						type: "button",
						class: "base-dtr__done-btn",
						onClick: n[7] ||= B((e) => {
							se(), a.value = !1;
						}, ["stop"])
					}, "Done")])
				])) : v("", !0)
			], 12, N_), [[fe, a.value]]),
			e.error ? (N(), _(H, {
				key: 1,
				id: `${R(i)}-error`,
				variant: "caption",
				as: "p",
				color: "inherit",
				class: "base-dtr__error",
				role: "alert"
			}, {
				default: z(() => [C(L(e.error), 1)]),
				_: 1
			}, 8, ["id"])) : e.hint ? (N(), _(H, {
				key: 2,
				id: `${R(i)}-hint`,
				variant: "caption",
				as: "p",
				color: "secondary",
				class: "base-dtr__hint"
			}, {
				default: z(() => [C(L(e.hint), 1)]),
				_: 1
			}, 8, ["id"])) : v("", !0)
		], 2));
	}
}), [["__scopeId", "data-v-b933aa39"]]), _v = (/* @__PURE__ */ n((/* @__PURE__ */ i(((e, t) => {
	function n(e) {
		return e instanceof Map ? e.clear = e.delete = e.set = function() {
			throw Error("map is read-only");
		} : e instanceof Set && (e.add = e.clear = e.delete = function() {
			throw Error("set is read-only");
		}), Object.freeze(e), Object.getOwnPropertyNames(e).forEach((t) => {
			let r = e[t], i = typeof r;
			(i === "object" || i === "function") && !Object.isFrozen(r) && n(r);
		}), e;
	}
	var r = class {
		constructor(e) {
			e.data === void 0 && (e.data = {}), this.data = e.data, this.isMatchIgnored = !1;
		}
		ignoreMatch() {
			this.isMatchIgnored = !0;
		}
	};
	function i(e) {
		return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
	}
	function a(e, ...t) {
		let n = Object.create(null);
		for (let t in e) n[t] = e[t];
		return t.forEach(function(e) {
			for (let t in e) n[t] = e[t];
		}), n;
	}
	var o = "</span>", s = (e) => !!e.scope, c = (e, { prefix: t }) => {
		if (e.startsWith("language:")) return e.replace("language:", "language-");
		if (e.includes(".")) {
			let n = e.split(".");
			return [`${t}${n.shift()}`, ...n.map((e, t) => `${e}${"_".repeat(t + 1)}`)].join(" ");
		}
		return `${t}${e}`;
	}, l = class {
		constructor(e, t) {
			this.buffer = "", this.classPrefix = t.classPrefix, e.walk(this);
		}
		addText(e) {
			this.buffer += i(e);
		}
		openNode(e) {
			if (!s(e)) return;
			let t = c(e.scope, { prefix: this.classPrefix });
			this.span(t);
		}
		closeNode(e) {
			s(e) && (this.buffer += o);
		}
		value() {
			return this.buffer;
		}
		span(e) {
			this.buffer += `<span class="${e}">`;
		}
	}, u = (e = {}) => {
		let t = { children: [] };
		return Object.assign(t, e), t;
	}, d = class e {
		constructor() {
			this.rootNode = u(), this.stack = [this.rootNode];
		}
		get top() {
			return this.stack[this.stack.length - 1];
		}
		get root() {
			return this.rootNode;
		}
		add(e) {
			this.top.children.push(e);
		}
		openNode(e) {
			let t = u({ scope: e });
			this.add(t), this.stack.push(t);
		}
		closeNode() {
			if (this.stack.length > 1) return this.stack.pop();
		}
		closeAllNodes() {
			for (; this.closeNode(););
		}
		toJSON() {
			return JSON.stringify(this.rootNode, null, 4);
		}
		walk(e) {
			return this.constructor._walk(e, this.rootNode);
		}
		static _walk(e, t) {
			return typeof t == "string" ? e.addText(t) : t.children && (e.openNode(t), t.children.forEach((t) => this._walk(e, t)), e.closeNode(t)), e;
		}
		static _collapse(t) {
			typeof t != "string" && t.children && (t.children.every((e) => typeof e == "string") ? t.children = [t.children.join("")] : t.children.forEach((t) => {
				e._collapse(t);
			}));
		}
	}, f = class extends d {
		constructor(e) {
			super(), this.options = e;
		}
		addText(e) {
			e !== "" && this.add(e);
		}
		startScope(e) {
			this.openNode(e);
		}
		endScope() {
			this.closeNode();
		}
		__addSublanguage(e, t) {
			let n = e.root;
			t && (n.scope = `language:${t}`), this.add(n);
		}
		toHTML() {
			return new l(this, this.options).value();
		}
		finalize() {
			return this.closeAllNodes(), !0;
		}
	};
	function p(e) {
		return e ? typeof e == "string" ? e : e.source : null;
	}
	function m(e) {
		return _("(?=", e, ")");
	}
	function h(e) {
		return _("(?:", e, ")*");
	}
	function g(e) {
		return _("(?:", e, ")?");
	}
	function _(...e) {
		return e.map((e) => p(e)).join("");
	}
	function v(e) {
		let t = e[e.length - 1];
		return typeof t == "object" && t.constructor === Object ? (e.splice(e.length - 1, 1), t) : {};
	}
	function y(...e) {
		return "(" + (v(e).capture ? "" : "?:") + e.map((e) => p(e)).join("|") + ")";
	}
	function b(e) {
		return RegExp(e.toString() + "|").exec("").length - 1;
	}
	function x(e, t) {
		let n = e && e.exec(t);
		return n && n.index === 0;
	}
	var S = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
	function C(e, { joinWith: t }) {
		let n = 0;
		return e.map((e) => {
			n += 1;
			let t = n, r = p(e), i = "";
			for (; r.length > 0;) {
				let e = S.exec(r);
				if (!e) {
					i += r;
					break;
				}
				i += r.substring(0, e.index), r = r.substring(e.index + e[0].length), e[0][0] === "\\" && e[1] ? i += "\\" + String(Number(e[1]) + t) : (i += e[0], e[0] === "(" && n++);
			}
			return i;
		}).map((e) => `(${e})`).join(t);
	}
	var w = /\b\B/, T = "[a-zA-Z]\\w*", E = "[a-zA-Z_]\\w*", D = "\\b\\d+(\\.\\d+)?", O = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)", k = "\\b(0b[01]+)", A = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~", ee = (e = {}) => {
		let t = /^#![ ]*\//;
		return e.binary && (e.begin = _(t, /.*\b/, e.binary, /\b.*/)), a({
			scope: "meta",
			begin: t,
			end: /$/,
			relevance: 0,
			"on:begin": (e, t) => {
				e.index !== 0 && t.ignoreMatch();
			}
		}, e);
	}, j = {
		begin: "\\\\[\\s\\S]",
		relevance: 0
	}, te = {
		scope: "string",
		begin: "'",
		end: "'",
		illegal: "\\n",
		contains: [j]
	}, M = {
		scope: "string",
		begin: "\"",
		end: "\"",
		illegal: "\\n",
		contains: [j]
	}, ne = { begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/ }, re = function(e, t, n = {}) {
		let r = a({
			scope: "comment",
			begin: e,
			end: t,
			contains: []
		}, n);
		r.contains.push({
			scope: "doctag",
			begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
			end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
			excludeBegin: !0,
			relevance: 0
		});
		let i = y("I", "a", "is", "so", "us", "to", "at", "if", "in", "it", "on", /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, /[A-Za-z]+[-][a-z]+/, /[A-Za-z][a-z]{2,}/);
		return r.contains.push({ begin: _(/[ ]+/, "(", i, /[.]?[:]?([.][ ]|[ ])/, "){3}") }), r;
	}, ie = re("//", "$"), N = re("/\\*", "\\*/"), ae = re("#", "$"), oe = /* @__PURE__ */ Object.freeze({
		__proto__: null,
		APOS_STRING_MODE: te,
		BACKSLASH_ESCAPE: j,
		BINARY_NUMBER_MODE: {
			scope: "number",
			begin: k,
			relevance: 0
		},
		BINARY_NUMBER_RE: k,
		COMMENT: re,
		C_BLOCK_COMMENT_MODE: N,
		C_LINE_COMMENT_MODE: ie,
		C_NUMBER_MODE: {
			scope: "number",
			begin: O,
			relevance: 0
		},
		C_NUMBER_RE: O,
		END_SAME_AS_BEGIN: function(e) {
			return Object.assign(e, {
				"on:begin": (e, t) => {
					t.data._beginMatch = e[1];
				},
				"on:end": (e, t) => {
					t.data._beginMatch !== e[1] && t.ignoreMatch();
				}
			});
		},
		HASH_COMMENT_MODE: ae,
		IDENT_RE: T,
		MATCH_NOTHING_RE: w,
		METHOD_GUARD: {
			begin: "\\.\\s*[a-zA-Z_]\\w*",
			relevance: 0
		},
		NUMBER_MODE: {
			scope: "number",
			begin: D,
			relevance: 0
		},
		NUMBER_RE: D,
		PHRASAL_WORDS_MODE: ne,
		QUOTE_STRING_MODE: M,
		REGEXP_MODE: {
			scope: "regexp",
			begin: /\/(?=[^/\n]*\/)/,
			end: /\/[gimuy]*/,
			contains: [j, {
				begin: /\[/,
				end: /\]/,
				relevance: 0,
				contains: [j]
			}]
		},
		RE_STARTERS_RE: A,
		SHEBANG: ee,
		TITLE_MODE: {
			scope: "title",
			begin: T,
			relevance: 0
		},
		UNDERSCORE_IDENT_RE: E,
		UNDERSCORE_TITLE_MODE: {
			scope: "title",
			begin: E,
			relevance: 0
		}
	});
	function se(e, t) {
		e.input[e.index - 1] === "." && t.ignoreMatch();
	}
	function P(e, t) {
		e.className !== void 0 && (e.scope = e.className, delete e.className);
	}
	function F(e, t) {
		t && e.beginKeywords && (e.begin = "\\b(" + e.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)", e.__beforeBegin = se, e.keywords = e.keywords || e.beginKeywords, delete e.beginKeywords, e.relevance === void 0 && (e.relevance = 0));
	}
	function I(e, t) {
		Array.isArray(e.illegal) && (e.illegal = y(...e.illegal));
	}
	function ce(e, t) {
		if (e.match) {
			if (e.begin || e.end) throw Error("begin & end are not supported with match");
			e.begin = e.match, delete e.match;
		}
	}
	function le(e, t) {
		e.relevance === void 0 && (e.relevance = 1);
	}
	var ue = (e, t) => {
		if (!e.beforeMatch) return;
		if (e.starts) throw Error("beforeMatch cannot be used with starts");
		let n = Object.assign({}, e);
		Object.keys(e).forEach((t) => {
			delete e[t];
		}), e.keywords = n.keywords, e.begin = _(n.beforeMatch, m(n.begin)), e.starts = {
			relevance: 0,
			contains: [Object.assign(n, { endsParent: !0 })]
		}, e.relevance = 0, delete n.beforeMatch;
	}, L = [
		"of",
		"and",
		"for",
		"in",
		"not",
		"or",
		"if",
		"then",
		"parent",
		"list",
		"value"
	], R = "keyword";
	function de(e, t, n = R) {
		let r = Object.create(null);
		return typeof e == "string" ? i(n, e.split(" ")) : Array.isArray(e) ? i(n, e) : Object.keys(e).forEach(function(n) {
			Object.assign(r, de(e[n], t, n));
		}), r;
		function i(e, n) {
			t && (n = n.map((e) => e.toLowerCase())), n.forEach(function(t) {
				let n = t.split("|");
				r[n[0]] = [e, fe(n[0], n[1])];
			});
		}
	}
	function fe(e, t) {
		return t ? Number(t) : +!pe(e);
	}
	function pe(e) {
		return L.includes(e.toLowerCase());
	}
	var me = {}, z = (e) => {
		console.error(e);
	}, he = (e, ...t) => {
		console.log(`WARN: ${e}`, ...t);
	}, ge = (e, t) => {
		me[`${e}/${t}`] || (console.log(`Deprecated as of ${e}. ${t}`), me[`${e}/${t}`] = !0);
	}, B = /* @__PURE__ */ Error();
	function _e(e, t, { key: n }) {
		let r = 0, i = e[n], a = {}, o = {};
		for (let e = 1; e <= t.length; e++) o[e + r] = i[e], a[e + r] = !0, r += b(t[e - 1]);
		e[n] = o, e[n]._emit = a, e[n]._multi = !0;
	}
	function ve(e) {
		if (Array.isArray(e.begin)) {
			if (e.skip || e.excludeBegin || e.returnBegin) throw z("skip, excludeBegin, returnBegin not compatible with beginScope: {}"), B;
			if (typeof e.beginScope != "object" || e.beginScope === null) throw z("beginScope must be object"), B;
			_e(e, e.begin, { key: "beginScope" }), e.begin = C(e.begin, { joinWith: "" });
		}
	}
	function ye(e) {
		if (Array.isArray(e.end)) {
			if (e.skip || e.excludeEnd || e.returnEnd) throw z("skip, excludeEnd, returnEnd not compatible with endScope: {}"), B;
			if (typeof e.endScope != "object" || e.endScope === null) throw z("endScope must be object"), B;
			_e(e, e.end, { key: "endScope" }), e.end = C(e.end, { joinWith: "" });
		}
	}
	function be(e) {
		e.scope && typeof e.scope == "object" && e.scope !== null && (e.beginScope = e.scope, delete e.scope);
	}
	function V(e) {
		be(e), typeof e.beginScope == "string" && (e.beginScope = { _wrap: e.beginScope }), typeof e.endScope == "string" && (e.endScope = { _wrap: e.endScope }), ve(e), ye(e);
	}
	function xe(e) {
		function t(t, n) {
			return new RegExp(p(t), "m" + (e.case_insensitive ? "i" : "") + (e.unicodeRegex ? "u" : "") + (n ? "g" : ""));
		}
		class n {
			constructor() {
				this.matchIndexes = {}, this.regexes = [], this.matchAt = 1, this.position = 0;
			}
			addRule(e, t) {
				t.position = this.position++, this.matchIndexes[this.matchAt] = t, this.regexes.push([t, e]), this.matchAt += b(e) + 1;
			}
			compile() {
				this.regexes.length === 0 && (this.exec = () => null);
				let e = this.regexes.map((e) => e[1]);
				this.matcherRe = t(C(e, { joinWith: "|" }), !0), this.lastIndex = 0;
			}
			exec(e) {
				this.matcherRe.lastIndex = this.lastIndex;
				let t = this.matcherRe.exec(e);
				if (!t) return null;
				let n = t.findIndex((e, t) => t > 0 && e !== void 0), r = this.matchIndexes[n];
				return t.splice(0, n), Object.assign(t, r);
			}
		}
		class r {
			constructor() {
				this.rules = [], this.multiRegexes = [], this.count = 0, this.lastIndex = 0, this.regexIndex = 0;
			}
			getMatcher(e) {
				if (this.multiRegexes[e]) return this.multiRegexes[e];
				let t = new n();
				return this.rules.slice(e).forEach(([e, n]) => t.addRule(e, n)), t.compile(), this.multiRegexes[e] = t, t;
			}
			resumingScanAtSamePosition() {
				return this.regexIndex !== 0;
			}
			considerAll() {
				this.regexIndex = 0;
			}
			addRule(e, t) {
				this.rules.push([e, t]), t.type === "begin" && this.count++;
			}
			exec(e) {
				let t = this.getMatcher(this.regexIndex);
				t.lastIndex = this.lastIndex;
				let n = t.exec(e);
				if (this.resumingScanAtSamePosition() && !(n && n.index === this.lastIndex)) {
					let t = this.getMatcher(0);
					t.lastIndex = this.lastIndex + 1, n = t.exec(e);
				}
				return n && (this.regexIndex += n.position + 1, this.regexIndex === this.count && this.considerAll()), n;
			}
		}
		function i(e) {
			let t = new r();
			return e.contains.forEach((e) => t.addRule(e.begin, {
				rule: e,
				type: "begin"
			})), e.terminatorEnd && t.addRule(e.terminatorEnd, { type: "end" }), e.illegal && t.addRule(e.illegal, { type: "illegal" }), t;
		}
		function o(n, r) {
			let a = n;
			if (n.isCompiled) return a;
			[
				P,
				ce,
				V,
				ue
			].forEach((e) => e(n, r)), e.compilerExtensions.forEach((e) => e(n, r)), n.__beforeBegin = null, [
				F,
				I,
				le
			].forEach((e) => e(n, r)), n.isCompiled = !0;
			let s = null;
			return typeof n.keywords == "object" && n.keywords.$pattern && (n.keywords = Object.assign({}, n.keywords), s = n.keywords.$pattern, delete n.keywords.$pattern), s ||= /\w+/, n.keywords &&= de(n.keywords, e.case_insensitive), a.keywordPatternRe = t(s, !0), r && (n.begin ||= /\B|\b/, a.beginRe = t(a.begin), !n.end && !n.endsWithParent && (n.end = /\B|\b/), n.end && (a.endRe = t(a.end)), a.terminatorEnd = p(a.end) || "", n.endsWithParent && r.terminatorEnd && (a.terminatorEnd += (n.end ? "|" : "") + r.terminatorEnd)), n.illegal && (a.illegalRe = t(n.illegal)), n.contains ||= [], n.contains = [].concat(...n.contains.map(function(e) {
				return Ce(e === "self" ? n : e);
			})), n.contains.forEach(function(e) {
				o(e, a);
			}), n.starts && o(n.starts, r), a.matcher = i(a), a;
		}
		if (e.compilerExtensions ||= [], e.contains && e.contains.includes("self")) throw Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
		return e.classNameAliases = a(e.classNameAliases || {}), o(e);
	}
	function Se(e) {
		return e ? e.endsWithParent || Se(e.starts) : !1;
	}
	function Ce(e) {
		return e.variants && !e.cachedVariants && (e.cachedVariants = e.variants.map(function(t) {
			return a(e, { variants: null }, t);
		})), e.cachedVariants ? e.cachedVariants : Se(e) ? a(e, { starts: e.starts ? a(e.starts) : null }) : Object.isFrozen(e) ? a(e) : e;
	}
	var we = "11.11.1", Te = class extends Error {
		constructor(e, t) {
			super(e), this.name = "HTMLInjectionError", this.html = t;
		}
	}, Ee = i, De = a, Oe = Symbol("nomatch"), ke = 7, Ae = function(e) {
		let t = Object.create(null), i = Object.create(null), a = [], o = !0, s = "Could not find the language '{}', did you forget to load/include a language module?", c = {
			disableAutodetect: !0,
			name: "Plain text",
			contains: []
		}, l = {
			ignoreUnescapedHTML: !1,
			throwUnescapedHTML: !1,
			noHighlightRe: /^(no-?highlight)$/i,
			languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
			classPrefix: "hljs-",
			cssSelector: "pre code",
			languages: null,
			__emitter: f
		};
		function u(e) {
			return l.noHighlightRe.test(e);
		}
		function d(e) {
			let t = e.className + " ";
			t += e.parentNode ? e.parentNode.className : "";
			let n = l.languageDetectRe.exec(t);
			if (n) {
				let t = te(n[1]);
				return t || (he(s.replace("{}", n[1])), he("Falling back to no-highlight mode for this block.", e)), t ? n[1] : "no-highlight";
			}
			return t.split(/\s+/).find((e) => u(e) || te(e));
		}
		function p(e, t, n) {
			let r = "", i = "";
			typeof t == "object" ? (r = e, n = t.ignoreIllegals, i = t.language) : (ge("10.7.0", "highlight(lang, code, ...args) has been deprecated."), ge("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277"), i = e, r = t), n === void 0 && (n = !0);
			let a = {
				code: r,
				language: i
			};
			ae("before:highlight", a);
			let o = a.result ? a.result : v(a.language, a.code, n);
			return o.code = a.code, ae("after:highlight", o), o;
		}
		function v(e, n, i, a) {
			let c = Object.create(null);
			function u(e, t) {
				return e.keywords[t];
			}
			function d() {
				if (!A.keywords) {
					j.addText(M);
					return;
				}
				let e = 0;
				A.keywordPatternRe.lastIndex = 0;
				let t = A.keywordPatternRe.exec(M), n = "";
				for (; t;) {
					n += M.substring(e, t.index);
					let r = D.case_insensitive ? t[0].toLowerCase() : t[0], i = u(A, r);
					if (i) {
						let [e, a] = i;
						if (j.addText(n), n = "", c[r] = (c[r] || 0) + 1, c[r] <= ke && (ne += a), e.startsWith("_")) n += t[0];
						else {
							let n = D.classNameAliases[e] || e;
							m(t[0], n);
						}
					} else n += t[0];
					e = A.keywordPatternRe.lastIndex, t = A.keywordPatternRe.exec(M);
				}
				n += M.substring(e), j.addText(n);
			}
			function f() {
				if (M === "") return;
				let e = null;
				if (typeof A.subLanguage == "string") {
					if (!t[A.subLanguage]) {
						j.addText(M);
						return;
					}
					e = v(A.subLanguage, M, !0, ee[A.subLanguage]), ee[A.subLanguage] = e._top;
				} else e = S(M, A.subLanguage.length ? A.subLanguage : null);
				A.relevance > 0 && (ne += e.relevance), j.__addSublanguage(e._emitter, e.language);
			}
			function p() {
				A.subLanguage == null ? d() : f(), M = "";
			}
			function m(e, t) {
				e !== "" && (j.startScope(t), j.addText(e), j.endScope());
			}
			function h(e, t) {
				let n = 1, r = t.length - 1;
				for (; n <= r;) {
					if (!e._emit[n]) {
						n++;
						continue;
					}
					let r = D.classNameAliases[e[n]] || e[n], i = t[n];
					r ? m(i, r) : (M = i, d(), M = ""), n++;
				}
			}
			function g(e, t) {
				return e.scope && typeof e.scope == "string" && j.openNode(D.classNameAliases[e.scope] || e.scope), e.beginScope && (e.beginScope._wrap ? (m(M, D.classNameAliases[e.beginScope._wrap] || e.beginScope._wrap), M = "") : e.beginScope._multi && (h(e.beginScope, t), M = "")), A = Object.create(e, { parent: { value: A } }), A;
			}
			function _(e, t, n) {
				let i = x(e.endRe, n);
				if (i) {
					if (e["on:end"]) {
						let n = new r(e);
						e["on:end"](t, n), n.isMatchIgnored && (i = !1);
					}
					if (i) {
						for (; e.endsParent && e.parent;) e = e.parent;
						return e;
					}
				}
				if (e.endsWithParent) return _(e.parent, t, n);
			}
			function y(e) {
				return A.matcher.regexIndex === 0 ? (M += e[0], 1) : (N = !0, 0);
			}
			function b(e) {
				let t = e[0], n = e.rule, i = new r(n), a = [n.__beforeBegin, n["on:begin"]];
				for (let n of a) if (n && (n(e, i), i.isMatchIgnored)) return y(t);
				return n.skip ? M += t : (n.excludeBegin && (M += t), p(), !n.returnBegin && !n.excludeBegin && (M = t)), g(n, e), n.returnBegin ? 0 : t.length;
			}
			function C(e) {
				let t = e[0], r = n.substring(e.index), i = _(A, e, r);
				if (!i) return Oe;
				let a = A;
				A.endScope && A.endScope._wrap ? (p(), m(t, A.endScope._wrap)) : A.endScope && A.endScope._multi ? (p(), h(A.endScope, e)) : a.skip ? M += t : (a.returnEnd || a.excludeEnd || (M += t), p(), a.excludeEnd && (M = t));
				do
					A.scope && j.closeNode(), !A.skip && !A.subLanguage && (ne += A.relevance), A = A.parent;
				while (A !== i.parent);
				return i.starts && g(i.starts, e), a.returnEnd ? 0 : t.length;
			}
			function w() {
				let e = [];
				for (let t = A; t !== D; t = t.parent) t.scope && e.unshift(t.scope);
				e.forEach((e) => j.openNode(e));
			}
			let T = {};
			function E(t, r) {
				let a = r && r[0];
				if (M += t, a == null) return p(), 0;
				if (T.type === "begin" && r.type === "end" && T.index === r.index && a === "") {
					if (M += n.slice(r.index, r.index + 1), !o) {
						let t = /* @__PURE__ */ Error(`0 width match regex (${e})`);
						throw t.languageName = e, t.badRule = T.rule, t;
					}
					return 1;
				}
				if (T = r, r.type === "begin") return b(r);
				if (r.type === "illegal" && !i) {
					let e = /* @__PURE__ */ Error("Illegal lexeme \"" + a + "\" for mode \"" + (A.scope || "<unnamed>") + "\"");
					throw e.mode = A, e;
				} else if (r.type === "end") {
					let e = C(r);
					if (e !== Oe) return e;
				}
				if (r.type === "illegal" && a === "") return M += "\n", 1;
				if (ie > 1e5 && ie > r.index * 3) throw /* @__PURE__ */ Error("potential infinite loop, way more iterations than matches");
				return M += a, a.length;
			}
			let D = te(e);
			if (!D) throw z(s.replace("{}", e)), Error("Unknown language: \"" + e + "\"");
			let O = xe(D), k = "", A = a || O, ee = {}, j = new l.__emitter(l);
			w();
			let M = "", ne = 0, re = 0, ie = 0, N = !1;
			try {
				if (D.__emitTokens) D.__emitTokens(n, j);
				else {
					for (A.matcher.considerAll();;) {
						ie++, N ? N = !1 : A.matcher.considerAll(), A.matcher.lastIndex = re;
						let e = A.matcher.exec(n);
						if (!e) break;
						let t = E(n.substring(re, e.index), e);
						re = e.index + t;
					}
					E(n.substring(re));
				}
				return j.finalize(), k = j.toHTML(), {
					language: e,
					value: k,
					relevance: ne,
					illegal: !1,
					_emitter: j,
					_top: A
				};
			} catch (t) {
				if (t.message && t.message.includes("Illegal")) return {
					language: e,
					value: Ee(n),
					illegal: !0,
					relevance: 0,
					_illegalBy: {
						message: t.message,
						index: re,
						context: n.slice(re - 100, re + 100),
						mode: t.mode,
						resultSoFar: k
					},
					_emitter: j
				};
				if (o) return {
					language: e,
					value: Ee(n),
					illegal: !1,
					relevance: 0,
					errorRaised: t,
					_emitter: j,
					_top: A
				};
				throw t;
			}
		}
		function b(e) {
			let t = {
				value: Ee(e),
				illegal: !1,
				relevance: 0,
				_top: c,
				_emitter: new l.__emitter(l)
			};
			return t._emitter.addText(e), t;
		}
		function S(e, n) {
			n = n || l.languages || Object.keys(t);
			let r = b(e), i = n.filter(te).filter(ne).map((t) => v(t, e, !1));
			i.unshift(r);
			let [a, o] = i.sort((e, t) => {
				if (e.relevance !== t.relevance) return t.relevance - e.relevance;
				if (e.language && t.language) {
					if (te(e.language).supersetOf === t.language) return 1;
					if (te(t.language).supersetOf === e.language) return -1;
				}
				return 0;
			}), s = a;
			return s.secondBest = o, s;
		}
		function C(e, t, n) {
			let r = t && i[t] || n;
			e.classList.add("hljs"), e.classList.add(`language-${r}`);
		}
		function w(e) {
			let t = null, n = d(e);
			if (u(n)) return;
			if (ae("before:highlightElement", {
				el: e,
				language: n
			}), e.dataset.highlighted) {
				console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", e);
				return;
			}
			if (e.children.length > 0 && (l.ignoreUnescapedHTML || (console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."), console.warn("https://github.com/highlightjs/highlight.js/wiki/security"), console.warn("The element with unescaped HTML:"), console.warn(e)), l.throwUnescapedHTML)) throw new Te("One of your code blocks includes unescaped HTML.", e.innerHTML);
			t = e;
			let r = t.textContent, i = n ? p(r, {
				language: n,
				ignoreIllegals: !0
			}) : S(r);
			e.innerHTML = i.value, e.dataset.highlighted = "yes", C(e, n, i.language), e.result = {
				language: i.language,
				re: i.relevance,
				relevance: i.relevance
			}, i.secondBest && (e.secondBest = {
				language: i.secondBest.language,
				relevance: i.secondBest.relevance
			}), ae("after:highlightElement", {
				el: e,
				result: i,
				text: r
			});
		}
		function T(e) {
			l = De(l, e);
		}
		let E = () => {
			k(), ge("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
		};
		function D() {
			k(), ge("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
		}
		let O = !1;
		function k() {
			function e() {
				k();
			}
			if (document.readyState === "loading") {
				O || window.addEventListener("DOMContentLoaded", e, !1), O = !0;
				return;
			}
			document.querySelectorAll(l.cssSelector).forEach(w);
		}
		function A(n, r) {
			let i = null;
			try {
				i = r(e);
			} catch (e) {
				if (z("Language definition for '{}' could not be registered.".replace("{}", n)), o) z(e);
				else throw e;
				i = c;
			}
			i.name ||= n, t[n] = i, i.rawDefinition = r.bind(null, e), i.aliases && M(i.aliases, { languageName: n });
		}
		function ee(e) {
			delete t[e];
			for (let t of Object.keys(i)) i[t] === e && delete i[t];
		}
		function j() {
			return Object.keys(t);
		}
		function te(e) {
			return e = (e || "").toLowerCase(), t[e] || t[i[e]];
		}
		function M(e, { languageName: t }) {
			typeof e == "string" && (e = [e]), e.forEach((e) => {
				i[e.toLowerCase()] = t;
			});
		}
		function ne(e) {
			let t = te(e);
			return t && !t.disableAutodetect;
		}
		function re(e) {
			e["before:highlightBlock"] && !e["before:highlightElement"] && (e["before:highlightElement"] = (t) => {
				e["before:highlightBlock"](Object.assign({ block: t.el }, t));
			}), e["after:highlightBlock"] && !e["after:highlightElement"] && (e["after:highlightElement"] = (t) => {
				e["after:highlightBlock"](Object.assign({ block: t.el }, t));
			});
		}
		function ie(e) {
			re(e), a.push(e);
		}
		function N(e) {
			let t = a.indexOf(e);
			t !== -1 && a.splice(t, 1);
		}
		function ae(e, t) {
			let n = e;
			a.forEach(function(e) {
				e[n] && e[n](t);
			});
		}
		function se(e) {
			return ge("10.7.0", "highlightBlock will be removed entirely in v12.0"), ge("10.7.0", "Please use highlightElement now."), w(e);
		}
		Object.assign(e, {
			highlight: p,
			highlightAuto: S,
			highlightAll: k,
			highlightElement: w,
			highlightBlock: se,
			configure: T,
			initHighlighting: E,
			initHighlightingOnLoad: D,
			registerLanguage: A,
			unregisterLanguage: ee,
			listLanguages: j,
			getLanguage: te,
			registerAliases: M,
			autoDetection: ne,
			inherit: De,
			addPlugin: ie,
			removePlugin: N
		}), e.debugMode = function() {
			o = !1;
		}, e.safeMode = function() {
			o = !0;
		}, e.versionString = we, e.regex = {
			concat: _,
			lookahead: m,
			either: y,
			optional: g,
			anyNumberOfTimes: h
		};
		for (let e in oe) typeof oe[e] == "object" && n(oe[e]);
		return Object.assign(e, oe), e;
	}, je = Ae({});
	je.newInstance = () => Ae({}), t.exports = je, je.HighlightJS = je, je.default = je;
})))())).default;
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/bash.js
function vv(e) {
	let t = e.regex, n = {}, r = {
		begin: /\$\{/,
		end: /\}/,
		contains: ["self", {
			begin: /:-/,
			contains: [n]
		}]
	};
	Object.assign(n, {
		className: "variable",
		variants: [{ begin: t.concat(/\$[\w\d#@][\w\d_]*/, "(?![\\w\\d])(?![$])") }, r]
	});
	let i = {
		className: "subst",
		begin: /\$\(/,
		end: /\)/,
		contains: [e.BACKSLASH_ESCAPE]
	}, a = e.inherit(e.COMMENT(), {
		match: [/(^|\s)/, /#.*$/],
		scope: { 2: "comment" }
	}), o = {
		begin: /<<-?\s*(?=\w+)/,
		starts: { contains: [e.END_SAME_AS_BEGIN({
			begin: /(\w+)/,
			end: /(\w+)/,
			className: "string"
		})] }
	}, s = {
		className: "string",
		begin: /"/,
		end: /"/,
		contains: [
			e.BACKSLASH_ESCAPE,
			n,
			i
		]
	};
	i.contains.push(s);
	let c = { match: /\\"/ }, l = {
		className: "string",
		begin: /'/,
		end: /'/
	}, u = { match: /\\'/ }, d = {
		begin: /\$?\(\(/,
		end: /\)\)/,
		contains: [
			{
				begin: /\d+#[0-9a-f]+/,
				className: "number"
			},
			e.NUMBER_MODE,
			n
		]
	}, f = e.SHEBANG({
		binary: `(${[
			"fish",
			"bash",
			"zsh",
			"sh",
			"csh",
			"ksh",
			"tcsh",
			"dash",
			"scsh"
		].join("|")})`,
		relevance: 10
	}), p = {
		className: "function",
		begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
		returnBegin: !0,
		contains: [e.inherit(e.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
		relevance: 0
	}, m = [
		"if",
		"then",
		"else",
		"elif",
		"fi",
		"time",
		"for",
		"while",
		"until",
		"in",
		"do",
		"done",
		"case",
		"esac",
		"coproc",
		"function",
		"select"
	], h = ["true", "false"], g = { match: /(\/[a-z._-]+)+/ }, _ = [
		"break",
		"cd",
		"continue",
		"eval",
		"exec",
		"exit",
		"export",
		"getopts",
		"hash",
		"pwd",
		"readonly",
		"return",
		"shift",
		"test",
		"times",
		"trap",
		"umask",
		"unset"
	], v = [
		"alias",
		"bind",
		"builtin",
		"caller",
		"command",
		"declare",
		"echo",
		"enable",
		"help",
		"let",
		"local",
		"logout",
		"mapfile",
		"printf",
		"read",
		"readarray",
		"source",
		"sudo",
		"type",
		"typeset",
		"ulimit",
		"unalias"
	], y = /* @__PURE__ */ "autoload.bg.bindkey.bye.cap.chdir.clone.comparguments.compcall.compctl.compdescribe.compfiles.compgroups.compquote.comptags.comptry.compvalues.dirs.disable.disown.echotc.echoti.emulate.fc.fg.float.functions.getcap.getln.history.integer.jobs.kill.limit.log.noglob.popd.print.pushd.pushln.rehash.sched.setcap.setopt.stat.suspend.ttyctl.unfunction.unhash.unlimit.unsetopt.vared.wait.whence.where.which.zcompile.zformat.zftp.zle.zmodload.zparseopts.zprof.zpty.zregexparse.zsocket.zstyle.ztcp".split("."), b = /* @__PURE__ */ "chcon.chgrp.chown.chmod.cp.dd.df.dir.dircolors.ln.ls.mkdir.mkfifo.mknod.mktemp.mv.realpath.rm.rmdir.shred.sync.touch.truncate.vdir.b2sum.base32.base64.cat.cksum.comm.csplit.cut.expand.fmt.fold.head.join.md5sum.nl.numfmt.od.paste.ptx.pr.sha1sum.sha224sum.sha256sum.sha384sum.sha512sum.shuf.sort.split.sum.tac.tail.tr.tsort.unexpand.uniq.wc.arch.basename.chroot.date.dirname.du.echo.env.expr.factor.groups.hostid.id.link.logname.nice.nohup.nproc.pathchk.pinky.printenv.printf.pwd.readlink.runcon.seq.sleep.stat.stdbuf.stty.tee.test.timeout.tty.uname.unlink.uptime.users.who.whoami.yes".split(".");
	return {
		name: "Bash",
		aliases: ["sh", "zsh"],
		keywords: {
			$pattern: /\b[a-z][a-z0-9._-]+\b/,
			keyword: m,
			literal: h,
			built_in: [
				..._,
				...v,
				"set",
				"shopt",
				...y,
				...b
			]
		},
		contains: [
			f,
			e.SHEBANG(),
			p,
			d,
			a,
			o,
			g,
			s,
			c,
			l,
			u,
			n
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/css.js
var yv = (e) => ({
	IMPORTANT: {
		scope: "meta",
		begin: "!important"
	},
	BLOCK_COMMENT: e.C_BLOCK_COMMENT_MODE,
	HEXCOLOR: {
		scope: "number",
		begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
	},
	FUNCTION_DISPATCH: {
		className: "built_in",
		begin: /[\w-]+(?=\()/
	},
	ATTRIBUTE_SELECTOR_MODE: {
		scope: "selector-attr",
		begin: /\[/,
		end: /\]/,
		illegal: "$",
		contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
	},
	CSS_NUMBER_MODE: {
		scope: "number",
		begin: e.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
		relevance: 0
	},
	CSS_VARIABLE: {
		className: "attr",
		begin: /--[A-Za-z_][A-Za-z0-9_-]*/
	}
}), bv = /* @__PURE__ */ "a.abbr.address.article.aside.audio.b.blockquote.body.button.canvas.caption.cite.code.dd.del.details.dfn.div.dl.dt.em.fieldset.figcaption.figure.footer.form.h1.h2.h3.h4.h5.h6.header.hgroup.html.i.iframe.img.input.ins.kbd.label.legend.li.main.mark.menu.nav.object.ol.optgroup.option.p.picture.q.quote.samp.section.select.source.span.strong.summary.sup.table.tbody.td.textarea.tfoot.th.thead.time.tr.ul.var.video".split("."), xv = /* @__PURE__ */ "defs.g.marker.mask.pattern.svg.switch.symbol.feBlend.feColorMatrix.feComponentTransfer.feComposite.feConvolveMatrix.feDiffuseLighting.feDisplacementMap.feFlood.feGaussianBlur.feImage.feMerge.feMorphology.feOffset.feSpecularLighting.feTile.feTurbulence.linearGradient.radialGradient.stop.circle.ellipse.image.line.path.polygon.polyline.rect.text.use.textPath.tspan.foreignObject.clipPath".split("."), Sv = [...bv, ...xv], Cv = (/* @__PURE__ */ "any-hover.any-pointer.aspect-ratio.color.color-gamut.color-index.device-aspect-ratio.device-height.device-width.display-mode.forced-colors.grid.height.hover.inverted-colors.monochrome.orientation.overflow-block.overflow-inline.pointer.prefers-color-scheme.prefers-contrast.prefers-reduced-motion.prefers-reduced-transparency.resolution.scan.scripting.update.width.min-width.max-width.min-height.max-height".split(".")).sort().reverse(), wv = (/* @__PURE__ */ "active.any-link.blank.checked.current.default.defined.dir.disabled.drop.empty.enabled.first.first-child.first-of-type.fullscreen.future.focus.focus-visible.focus-within.has.host.host-context.hover.indeterminate.in-range.invalid.is.lang.last-child.last-of-type.left.link.local-link.not.nth-child.nth-col.nth-last-child.nth-last-col.nth-last-of-type.nth-of-type.only-child.only-of-type.optional.out-of-range.past.placeholder-shown.read-only.read-write.required.right.root.scope.target.target-within.user-invalid.valid.visited.where".split(".")).sort().reverse(), Tv = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse(), Ev = (/* @__PURE__ */ "accent-color.align-content.align-items.align-self.alignment-baseline.all.anchor-name.animation.animation-composition.animation-delay.animation-direction.animation-duration.animation-fill-mode.animation-iteration-count.animation-name.animation-play-state.animation-range.animation-range-end.animation-range-start.animation-timeline.animation-timing-function.appearance.aspect-ratio.backdrop-filter.backface-visibility.background.background-attachment.background-blend-mode.background-clip.background-color.background-image.background-origin.background-position.background-position-x.background-position-y.background-repeat.background-size.baseline-shift.block-size.border.border-block.border-block-color.border-block-end.border-block-end-color.border-block-end-style.border-block-end-width.border-block-start.border-block-start-color.border-block-start-style.border-block-start-width.border-block-style.border-block-width.border-bottom.border-bottom-color.border-bottom-left-radius.border-bottom-right-radius.border-bottom-style.border-bottom-width.border-collapse.border-color.border-end-end-radius.border-end-start-radius.border-image.border-image-outset.border-image-repeat.border-image-slice.border-image-source.border-image-width.border-inline.border-inline-color.border-inline-end.border-inline-end-color.border-inline-end-style.border-inline-end-width.border-inline-start.border-inline-start-color.border-inline-start-style.border-inline-start-width.border-inline-style.border-inline-width.border-left.border-left-color.border-left-style.border-left-width.border-radius.border-right.border-right-color.border-right-style.border-right-width.border-spacing.border-start-end-radius.border-start-start-radius.border-style.border-top.border-top-color.border-top-left-radius.border-top-right-radius.border-top-style.border-top-width.border-width.bottom.box-align.box-decoration-break.box-direction.box-flex.box-flex-group.box-lines.box-ordinal-group.box-orient.box-pack.box-shadow.box-sizing.break-after.break-before.break-inside.caption-side.caret-color.clear.clip.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.color-scheme.column-count.column-fill.column-gap.column-rule.column-rule-color.column-rule-style.column-rule-width.column-span.column-width.columns.contain.contain-intrinsic-block-size.contain-intrinsic-height.contain-intrinsic-inline-size.contain-intrinsic-size.contain-intrinsic-width.container.container-name.container-type.content.content-visibility.counter-increment.counter-reset.counter-set.cue.cue-after.cue-before.cursor.cx.cy.direction.display.dominant-baseline.empty-cells.enable-background.field-sizing.fill.fill-opacity.fill-rule.filter.flex.flex-basis.flex-direction.flex-flow.flex-grow.flex-shrink.flex-wrap.float.flood-color.flood-opacity.flow.font.font-display.font-family.font-feature-settings.font-kerning.font-language-override.font-optical-sizing.font-palette.font-size.font-size-adjust.font-smooth.font-smoothing.font-stretch.font-style.font-synthesis.font-synthesis-position.font-synthesis-small-caps.font-synthesis-style.font-synthesis-weight.font-variant.font-variant-alternates.font-variant-caps.font-variant-east-asian.font-variant-emoji.font-variant-ligatures.font-variant-numeric.font-variant-position.font-variation-settings.font-weight.forced-color-adjust.gap.glyph-orientation-horizontal.glyph-orientation-vertical.grid.grid-area.grid-auto-columns.grid-auto-flow.grid-auto-rows.grid-column.grid-column-end.grid-column-start.grid-gap.grid-row.grid-row-end.grid-row-start.grid-template.grid-template-areas.grid-template-columns.grid-template-rows.hanging-punctuation.height.hyphenate-character.hyphenate-limit-chars.hyphens.icon.image-orientation.image-rendering.image-resolution.ime-mode.initial-letter.initial-letter-align.inline-size.inset.inset-area.inset-block.inset-block-end.inset-block-start.inset-inline.inset-inline-end.inset-inline-start.isolation.justify-content.justify-items.justify-self.kerning.left.letter-spacing.lighting-color.line-break.line-height.line-height-step.list-style.list-style-image.list-style-position.list-style-type.margin.margin-block.margin-block-end.margin-block-start.margin-bottom.margin-inline.margin-inline-end.margin-inline-start.margin-left.margin-right.margin-top.margin-trim.marker.marker-end.marker-mid.marker-start.marks.mask.mask-border.mask-border-mode.mask-border-outset.mask-border-repeat.mask-border-slice.mask-border-source.mask-border-width.mask-clip.mask-composite.mask-image.mask-mode.mask-origin.mask-position.mask-repeat.mask-size.mask-type.masonry-auto-flow.math-depth.math-shift.math-style.max-block-size.max-height.max-inline-size.max-width.min-block-size.min-height.min-inline-size.min-width.mix-blend-mode.nav-down.nav-index.nav-left.nav-right.nav-up.none.normal.object-fit.object-position.offset.offset-anchor.offset-distance.offset-path.offset-position.offset-rotate.opacity.order.orphans.outline.outline-color.outline-offset.outline-style.outline-width.overflow.overflow-anchor.overflow-block.overflow-clip-margin.overflow-inline.overflow-wrap.overflow-x.overflow-y.overlay.overscroll-behavior.overscroll-behavior-block.overscroll-behavior-inline.overscroll-behavior-x.overscroll-behavior-y.padding.padding-block.padding-block-end.padding-block-start.padding-bottom.padding-inline.padding-inline-end.padding-inline-start.padding-left.padding-right.padding-top.page.page-break-after.page-break-before.page-break-inside.paint-order.pause.pause-after.pause-before.perspective.perspective-origin.place-content.place-items.place-self.pointer-events.position.position-anchor.position-visibility.print-color-adjust.quotes.r.resize.rest.rest-after.rest-before.right.rotate.row-gap.ruby-align.ruby-position.scale.scroll-behavior.scroll-margin.scroll-margin-block.scroll-margin-block-end.scroll-margin-block-start.scroll-margin-bottom.scroll-margin-inline.scroll-margin-inline-end.scroll-margin-inline-start.scroll-margin-left.scroll-margin-right.scroll-margin-top.scroll-padding.scroll-padding-block.scroll-padding-block-end.scroll-padding-block-start.scroll-padding-bottom.scroll-padding-inline.scroll-padding-inline-end.scroll-padding-inline-start.scroll-padding-left.scroll-padding-right.scroll-padding-top.scroll-snap-align.scroll-snap-stop.scroll-snap-type.scroll-timeline.scroll-timeline-axis.scroll-timeline-name.scrollbar-color.scrollbar-gutter.scrollbar-width.shape-image-threshold.shape-margin.shape-outside.shape-rendering.speak.speak-as.src.stop-color.stop-opacity.stroke.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke-width.tab-size.table-layout.text-align.text-align-all.text-align-last.text-anchor.text-combine-upright.text-decoration.text-decoration-color.text-decoration-line.text-decoration-skip.text-decoration-skip-ink.text-decoration-style.text-decoration-thickness.text-emphasis.text-emphasis-color.text-emphasis-position.text-emphasis-style.text-indent.text-justify.text-orientation.text-overflow.text-rendering.text-shadow.text-size-adjust.text-transform.text-underline-offset.text-underline-position.text-wrap.text-wrap-mode.text-wrap-style.timeline-scope.top.touch-action.transform.transform-box.transform-origin.transform-style.transition.transition-behavior.transition-delay.transition-duration.transition-property.transition-timing-function.translate.unicode-bidi.user-modify.user-select.vector-effect.vertical-align.view-timeline.view-timeline-axis.view-timeline-inset.view-timeline-name.view-transition-name.visibility.voice-balance.voice-duration.voice-family.voice-pitch.voice-range.voice-rate.voice-stress.voice-volume.white-space.white-space-collapse.widows.width.will-change.word-break.word-spacing.word-wrap.writing-mode.x.y.z-index.zoom".split(".")).sort().reverse();
function Dv(e) {
	let t = e.regex, n = yv(e), r = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ }, i = /@-?\w[\w]*(-\w+)*/, a = [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE];
	return {
		name: "CSS",
		case_insensitive: !0,
		illegal: /[=|'\$]/,
		keywords: { keyframePosition: "from to" },
		classNameAliases: { keyframePosition: "selector-tag" },
		contains: [
			n.BLOCK_COMMENT,
			r,
			n.CSS_NUMBER_MODE,
			{
				className: "selector-id",
				begin: /#[A-Za-z0-9_-]+/,
				relevance: 0
			},
			{
				className: "selector-class",
				begin: "\\.[a-zA-Z-][a-zA-Z0-9_-]*",
				relevance: 0
			},
			n.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "selector-pseudo",
				variants: [{ begin: ":(" + wv.join("|") + ")" }, { begin: ":(:)?(" + Tv.join("|") + ")" }]
			},
			n.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + Ev.join("|") + ")\\b"
			},
			{
				begin: /:/,
				end: /[;}{]/,
				contains: [
					n.BLOCK_COMMENT,
					n.HEXCOLOR,
					n.IMPORTANT,
					n.CSS_NUMBER_MODE,
					...a,
					{
						begin: /(url|data-uri)\(/,
						end: /\)/,
						relevance: 0,
						keywords: { built_in: "url data-uri" },
						contains: [...a, {
							className: "string",
							begin: /[^)]/,
							endsWithParent: !0,
							excludeEnd: !0
						}]
					},
					n.FUNCTION_DISPATCH
				]
			},
			{
				begin: t.lookahead(/@/),
				end: "[{;]",
				relevance: 0,
				illegal: /:/,
				contains: [{
					className: "keyword",
					begin: i
				}, {
					begin: /\s/,
					endsWithParent: !0,
					excludeEnd: !0,
					relevance: 0,
					keywords: {
						$pattern: /[a-z-]+/,
						keyword: "and or not only",
						attribute: Cv.join(" ")
					},
					contains: [
						{
							begin: /[a-z-]+(?=:)/,
							className: "attribute"
						},
						...a,
						n.CSS_NUMBER_MODE
					]
				}]
			},
			{
				className: "selector-tag",
				begin: "\\b(" + Sv.join("|") + ")\\b"
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/dockerfile.js
function Ov(e) {
	return {
		name: "Dockerfile",
		aliases: ["docker"],
		case_insensitive: !0,
		keywords: [
			"from",
			"maintainer",
			"expose",
			"env",
			"arg",
			"user",
			"onbuild",
			"stopsignal"
		],
		contains: [
			e.HASH_COMMENT_MODE,
			e.APOS_STRING_MODE,
			e.QUOTE_STRING_MODE,
			e.NUMBER_MODE,
			{
				beginKeywords: "run cmd entrypoint volume add copy workdir label healthcheck shell",
				starts: {
					end: /[^\\]$/,
					subLanguage: "bash"
				}
			}
		],
		illegal: "</"
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/go.js
function kv(e) {
	let t = {
		keyword: [
			"break",
			"case",
			"chan",
			"const",
			"continue",
			"default",
			"defer",
			"else",
			"fallthrough",
			"for",
			"func",
			"go",
			"goto",
			"if",
			"import",
			"interface",
			"map",
			"package",
			"range",
			"return",
			"select",
			"struct",
			"switch",
			"type",
			"var"
		],
		type: [
			"bool",
			"byte",
			"complex64",
			"complex128",
			"error",
			"float32",
			"float64",
			"int8",
			"int16",
			"int32",
			"int64",
			"string",
			"uint8",
			"uint16",
			"uint32",
			"uint64",
			"int",
			"uint",
			"uintptr",
			"rune"
		],
		literal: [
			"true",
			"false",
			"iota",
			"nil"
		],
		built_in: [
			"append",
			"cap",
			"close",
			"complex",
			"copy",
			"imag",
			"len",
			"make",
			"new",
			"panic",
			"print",
			"println",
			"real",
			"recover",
			"delete"
		]
	};
	return {
		name: "Go",
		aliases: ["golang"],
		keywords: t,
		illegal: "</",
		contains: [
			e.C_LINE_COMMENT_MODE,
			e.C_BLOCK_COMMENT_MODE,
			{
				className: "string",
				variants: [
					e.QUOTE_STRING_MODE,
					e.APOS_STRING_MODE,
					{
						begin: "`",
						end: "`"
					}
				]
			},
			{
				className: "number",
				variants: [
					{
						match: /-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/,
						relevance: 0
					},
					{
						match: /-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					},
					{
						match: /-?\b0[oO](_?[0-7])*i?/,
						relevance: 0
					},
					{
						match: /-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					},
					{
						match: /-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/,
						relevance: 0
					}
				]
			},
			{ begin: /:=/ },
			{
				className: "function",
				beginKeywords: "func",
				end: "\\s*(\\{|$)",
				excludeEnd: !0,
				contains: [e.TITLE_MODE, {
					className: "params",
					begin: /\(/,
					end: /\)/,
					endsParent: !0,
					keywords: t,
					illegal: /["']/
				}]
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/ini.js
function Av(e) {
	let t = e.regex, n = {
		className: "number",
		relevance: 0,
		variants: [{ begin: /([+-]+)?[\d]+_[\d_]+/ }, { begin: e.NUMBER_RE }]
	}, r = e.COMMENT();
	r.variants = [{
		begin: /;/,
		end: /$/
	}, {
		begin: /#/,
		end: /$/
	}];
	let i = {
		className: "variable",
		variants: [{ begin: /\$[\w\d"][\w\d_]*/ }, { begin: /\$\{(.*?)\}/ }]
	}, a = {
		className: "literal",
		begin: /\bon|off|true|false|yes|no\b/
	}, o = {
		className: "string",
		contains: [e.BACKSLASH_ESCAPE],
		variants: [
			{
				begin: "'''",
				end: "'''",
				relevance: 10
			},
			{
				begin: "\"\"\"",
				end: "\"\"\"",
				relevance: 10
			},
			{
				begin: "\"",
				end: "\""
			},
			{
				begin: "'",
				end: "'"
			}
		]
	}, s = {
		begin: /\[/,
		end: /\]/,
		contains: [
			r,
			a,
			i,
			o,
			n,
			"self"
		],
		relevance: 0
	}, c = t.either(/[A-Za-z0-9_-]+/, /"(\\"|[^"])*"/, /'[^']*'/);
	return {
		name: "TOML, also INI",
		aliases: ["toml"],
		case_insensitive: !0,
		illegal: /\S/,
		contains: [
			r,
			{
				className: "section",
				begin: /\[+/,
				end: /\]+/
			},
			{
				begin: t.concat(c, "(\\s*\\.\\s*", c, ")*", t.lookahead(/\s*=\s*[^#\s]/)),
				className: "attr",
				starts: {
					end: /$/,
					contains: [
						r,
						s,
						a,
						i,
						o,
						n
					]
				}
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/javascript.js
var jv = "[A-Za-z$_][0-9A-Za-z$_]*", Mv = /* @__PURE__ */ "as.in.of.if.for.while.finally.var.new.function.do.return.void.else.break.catch.instanceof.with.throw.case.default.try.switch.continue.typeof.delete.let.yield.const.class.debugger.async.await.static.import.from.export.extends.using".split("."), Nv = [
	"true",
	"false",
	"null",
	"undefined",
	"NaN",
	"Infinity"
], Pv = /* @__PURE__ */ "Object.Function.Boolean.Symbol.Math.Date.Number.BigInt.String.RegExp.Array.Float32Array.Float64Array.Int8Array.Uint8Array.Uint8ClampedArray.Int16Array.Int32Array.Uint16Array.Uint32Array.BigInt64Array.BigUint64Array.Set.Map.WeakSet.WeakMap.ArrayBuffer.SharedArrayBuffer.Atomics.DataView.JSON.Promise.Generator.GeneratorFunction.AsyncFunction.Reflect.Proxy.Intl.WebAssembly".split("."), Fv = [
	"Error",
	"EvalError",
	"InternalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError"
], Iv = [
	"setInterval",
	"setTimeout",
	"clearInterval",
	"clearTimeout",
	"require",
	"exports",
	"eval",
	"isFinite",
	"isNaN",
	"parseFloat",
	"parseInt",
	"decodeURI",
	"decodeURIComponent",
	"encodeURI",
	"encodeURIComponent",
	"escape",
	"unescape"
], Lv = [
	"arguments",
	"this",
	"super",
	"console",
	"window",
	"document",
	"localStorage",
	"sessionStorage",
	"module",
	"global"
], Rv = [].concat(Iv, Pv, Fv);
function zv(e) {
	let t = e.regex, n = (e, { after: t }) => {
		let n = "</" + e[0].slice(1);
		return e.input.indexOf(n, t) !== -1;
	}, r = jv, i = {
		begin: "<>",
		end: "</>"
	}, a = /<[A-Za-z0-9\\._:-]+\s*\/>/, o = {
		begin: /<[A-Za-z0-9\\._:-]+/,
		end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
		isTrulyOpeningTag: (e, t) => {
			let r = e[0].length + e.index, i = e.input[r];
			if (i === "<" || i === ",") {
				t.ignoreMatch();
				return;
			}
			i === ">" && (n(e, { after: r }) || t.ignoreMatch());
			let a, o = e.input.substring(r);
			if (a = o.match(/^\s*=/)) {
				t.ignoreMatch();
				return;
			}
			if ((a = o.match(/^\s+extends\s+/)) && a.index === 0) {
				t.ignoreMatch();
				return;
			}
		}
	}, s = {
		$pattern: jv,
		keyword: Mv,
		literal: Nv,
		built_in: Rv,
		"variable.language": Lv
	}, c = "[0-9](_?[0-9])*", l = `\\.(${c})`, u = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*", d = {
		className: "number",
		variants: [
			{ begin: `(\\b(${u})((${l})|\\.)?|(${l}))[eE][+-]?(${c})\\b` },
			{ begin: `\\b(${u})\\b((${l})\\b|\\.)?|(${l})\\b` },
			{ begin: "\\b(0|[1-9](_?[0-9])*)n\\b" },
			{ begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
			{ begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
			{ begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
			{ begin: "\\b0[0-7]+n?\\b" }
		],
		relevance: 0
	}, f = {
		className: "subst",
		begin: "\\$\\{",
		end: "\\}",
		keywords: s,
		contains: []
	}, p = {
		begin: ".?html`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "xml"
		}
	}, m = {
		begin: ".?css`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "css"
		}
	}, h = {
		begin: ".?gql`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "graphql"
		}
	}, g = {
		className: "string",
		begin: "`",
		end: "`",
		contains: [e.BACKSLASH_ESCAPE, f]
	}, _ = {
		className: "comment",
		variants: [
			e.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
				relevance: 0,
				contains: [{
					begin: "(?=@[A-Za-z]+)",
					relevance: 0,
					contains: [
						{
							className: "doctag",
							begin: "@[A-Za-z]+"
						},
						{
							className: "type",
							begin: "\\{",
							end: "\\}",
							excludeEnd: !0,
							excludeBegin: !0,
							relevance: 0
						},
						{
							className: "variable",
							begin: "[A-Za-z$_][0-9A-Za-z$_]*(?=\\s*(-)|$)",
							endsParent: !0,
							relevance: 0
						},
						{
							begin: /(?=[^\n])\s/,
							relevance: 0
						}
					]
				}]
			}),
			e.C_BLOCK_COMMENT_MODE,
			e.C_LINE_COMMENT_MODE
		]
	}, v = [
		e.APOS_STRING_MODE,
		e.QUOTE_STRING_MODE,
		p,
		m,
		h,
		g,
		{ match: /\$\d+/ },
		d
	];
	f.contains = v.concat({
		begin: /\{/,
		end: /\}/,
		keywords: s,
		contains: ["self"].concat(v)
	});
	let y = [].concat(_, f.contains), b = y.concat([{
		begin: /(\s*)\(/,
		end: /\)/,
		keywords: s,
		contains: ["self"].concat(y)
	}]), x = {
		className: "params",
		begin: /(\s*)\(/,
		end: /\)/,
		excludeBegin: !0,
		excludeEnd: !0,
		keywords: s,
		contains: b
	}, S = { variants: [{
		match: [
			/class/,
			/\s+/,
			r,
			/\s+/,
			/extends/,
			/\s+/,
			t.concat(r, "(", t.concat(/\./, r), ")*")
		],
		scope: {
			1: "keyword",
			3: "title.class",
			5: "keyword",
			7: "title.class.inherited"
		}
	}, {
		match: [
			/class/,
			/\s+/,
			r
		],
		scope: {
			1: "keyword",
			3: "title.class"
		}
	}] }, C = {
		relevance: 0,
		match: t.either(/\bJSON/, /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/, /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/, /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),
		className: "title.class",
		keywords: { _: [...Pv, ...Fv] }
	}, w = {
		label: "use_strict",
		className: "meta",
		relevance: 10,
		begin: /^\s*['"]use (strict|asm)['"]/
	}, T = {
		variants: [{ match: [
			/function/,
			/\s+/,
			r,
			/(?=\s*\()/
		] }, { match: [/function/, /\s*(?=\()/] }],
		className: {
			1: "keyword",
			3: "title.function"
		},
		label: "func.def",
		contains: [x],
		illegal: /%/
	}, E = {
		relevance: 0,
		match: /\b[A-Z][A-Z_0-9]+\b/,
		className: "variable.constant"
	};
	function D(e) {
		return t.concat("(?!", e.join("|"), ")");
	}
	let O = {
		match: t.concat(/\b/, D([
			...Iv,
			"super",
			"import"
		].map((e) => `${e}\\s*\\(`)), r, t.lookahead(/\s*\(/)),
		className: "title.function",
		relevance: 0
	}, k = {
		begin: t.concat(/\./, t.lookahead(t.concat(r, /(?![0-9A-Za-z$_(])/))),
		end: r,
		excludeBegin: !0,
		keywords: "prototype",
		className: "property",
		relevance: 0
	}, A = {
		match: [
			/get|set/,
			/\s+/,
			r,
			/(?=\()/
		],
		className: {
			1: "keyword",
			3: "title.function"
		},
		contains: [{ begin: /\(\)/ }, x]
	}, ee = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + e.UNDERSCORE_IDENT_RE + ")\\s*=>", j = {
		match: [
			/const|var|let/,
			/\s+/,
			r,
			/\s*/,
			/=\s*/,
			/(async\s*)?/,
			t.lookahead(ee)
		],
		keywords: "async",
		className: {
			1: "keyword",
			3: "title.function"
		},
		contains: [x]
	};
	return {
		name: "JavaScript",
		aliases: [
			"js",
			"jsx",
			"mjs",
			"cjs"
		],
		keywords: s,
		exports: {
			PARAMS_CONTAINS: b,
			CLASS_REFERENCE: C
		},
		illegal: /#(?![$_A-z])/,
		contains: [
			e.SHEBANG({
				label: "shebang",
				binary: "node",
				relevance: 5
			}),
			w,
			e.APOS_STRING_MODE,
			e.QUOTE_STRING_MODE,
			p,
			m,
			h,
			g,
			_,
			{ match: /\$\d+/ },
			d,
			C,
			{
				scope: "attr",
				match: r + t.lookahead(":"),
				relevance: 0
			},
			j,
			{
				begin: "(" + e.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
				keywords: "return throw case",
				relevance: 0,
				contains: [
					_,
					e.REGEXP_MODE,
					{
						className: "function",
						begin: ee,
						returnBegin: !0,
						end: "\\s*=>",
						contains: [{
							className: "params",
							variants: [
								{
									begin: e.UNDERSCORE_IDENT_RE,
									relevance: 0
								},
								{
									className: null,
									begin: /\(\s*\)/,
									skip: !0
								},
								{
									begin: /(\s*)\(/,
									end: /\)/,
									excludeBegin: !0,
									excludeEnd: !0,
									keywords: s,
									contains: b
								}
							]
						}]
					},
					{
						begin: /,/,
						relevance: 0
					},
					{
						match: /\s+/,
						relevance: 0
					},
					{
						variants: [
							{
								begin: i.begin,
								end: i.end
							},
							{ match: a },
							{
								begin: o.begin,
								"on:begin": o.isTrulyOpeningTag,
								end: o.end
							}
						],
						subLanguage: "xml",
						contains: [{
							begin: o.begin,
							end: o.end,
							skip: !0,
							contains: ["self"]
						}]
					}
				]
			},
			T,
			{ beginKeywords: "while if switch catch for" },
			{
				begin: "\\b(?!function)" + e.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
				returnBegin: !0,
				label: "func.def",
				contains: [x, e.inherit(e.TITLE_MODE, {
					begin: r,
					className: "title.function"
				})]
			},
			{
				match: /\.\.\./,
				relevance: 0
			},
			k,
			{
				match: "\\$[A-Za-z$_][0-9A-Za-z$_]*",
				relevance: 0
			},
			{
				match: [/\bconstructor(?=\s*\()/],
				className: { 1: "title.function" },
				contains: [x]
			},
			O,
			E,
			S,
			A,
			{ match: /\$[(.]/ }
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/json.js
function Bv(e) {
	let t = {
		className: "attr",
		begin: /"(\\.|[^\\"\r\n])*"(?=\s*:)/,
		relevance: 1.01
	}, n = {
		match: /[{}[\],:]/,
		className: "punctuation",
		relevance: 0
	}, r = [
		"true",
		"false",
		"null"
	], i = {
		scope: "literal",
		beginKeywords: r.join(" ")
	};
	return {
		name: "JSON",
		aliases: ["jsonc"],
		keywords: { literal: r },
		contains: [
			t,
			n,
			e.QUOTE_STRING_MODE,
			i,
			e.C_NUMBER_MODE,
			e.C_LINE_COMMENT_MODE,
			e.C_BLOCK_COMMENT_MODE
		],
		illegal: "\\S"
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/markdown.js
function Vv(e) {
	let t = e.regex, n = {
		begin: /<\/?[A-Za-z_]/,
		end: ">",
		subLanguage: "xml",
		relevance: 0
	}, r = {
		begin: "^[-\\*]{3,}",
		end: "$"
	}, i = {
		className: "code",
		variants: [
			{ begin: "(`{3,})[^`](.|\\n)*?\\1`*[ ]*" },
			{ begin: "(~{3,})[^~](.|\\n)*?\\1~*[ ]*" },
			{
				begin: "```",
				end: "```+[ ]*$"
			},
			{
				begin: "~~~",
				end: "~~~+[ ]*$"
			},
			{ begin: "`.+?`" },
			{
				begin: "(?=^( {4}|\\t))",
				contains: [{
					begin: "^( {4}|\\t)",
					end: "(\\n)$"
				}],
				relevance: 0
			}
		]
	}, a = {
		className: "bullet",
		begin: "^[ 	]*([*+-]|(\\d+\\.))(?=\\s+)",
		end: "\\s+",
		excludeEnd: !0
	}, o = {
		begin: /^\[[^\n]+\]:/,
		returnBegin: !0,
		contains: [{
			className: "symbol",
			begin: /\[/,
			end: /\]/,
			excludeBegin: !0,
			excludeEnd: !0
		}, {
			className: "link",
			begin: /:\s*/,
			end: /$/,
			excludeBegin: !0
		}]
	}, s = {
		variants: [
			{
				begin: /\[.+?\]\[.*?\]/,
				relevance: 0
			},
			{
				begin: /\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
				relevance: 2
			},
			{
				begin: t.concat(/\[.+?\]\(/, /[A-Za-z][A-Za-z0-9+.-]*/, /:\/\/.*?\)/),
				relevance: 2
			},
			{
				begin: /\[.+?\]\([./?&#].*?\)/,
				relevance: 1
			},
			{
				begin: /\[.*?\]\(.*?\)/,
				relevance: 0
			}
		],
		returnBegin: !0,
		contains: [
			{ match: /\[(?=\])/ },
			{
				className: "string",
				relevance: 0,
				begin: "\\[",
				end: "\\]",
				excludeBegin: !0,
				returnEnd: !0
			},
			{
				className: "link",
				relevance: 0,
				begin: "\\]\\(",
				end: "\\)",
				excludeBegin: !0,
				excludeEnd: !0
			},
			{
				className: "symbol",
				relevance: 0,
				begin: "\\]\\[",
				end: "\\]",
				excludeBegin: !0,
				excludeEnd: !0
			}
		]
	}, c = {
		className: "strong",
		contains: [],
		variants: [{
			begin: /_{2}(?!\s)/,
			end: /_{2}/
		}, {
			begin: /\*{2}(?!\s)/,
			end: /\*{2}/
		}]
	}, l = {
		className: "emphasis",
		contains: [],
		variants: [{
			begin: /\*(?![*\s])/,
			end: /\*/
		}, {
			begin: /_(?![_\s])/,
			end: /_/,
			relevance: 0
		}]
	}, u = e.inherit(c, { contains: [] }), d = e.inherit(l, { contains: [] });
	c.contains.push(d), l.contains.push(u);
	let f = [n, s];
	return [
		c,
		l,
		u,
		d
	].forEach((e) => {
		e.contains = e.contains.concat(f);
	}), f = f.concat(c, l), {
		name: "Markdown",
		aliases: [
			"md",
			"mkdown",
			"mkd"
		],
		contains: [
			{
				className: "section",
				variants: [{
					begin: "^#{1,6}",
					end: "$",
					contains: f
				}, {
					begin: "(?=^.+?\\n[=-]{2,}$)",
					contains: [{ begin: "^[=-]*$" }, {
						begin: "^",
						end: "\\n",
						contains: f
					}]
				}]
			},
			n,
			a,
			c,
			l,
			{
				className: "quote",
				begin: "^>\\s+",
				contains: f,
				end: "$"
			},
			i,
			r,
			s,
			o,
			{
				scope: "literal",
				match: /&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/plaintext.js
function Hv(e) {
	return {
		name: "Plain text",
		aliases: ["text", "txt"],
		disableAutodetect: !0
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/python.js
function Uv(e) {
	let t = e.regex, n = /[\p{XID_Start}_]\p{XID_Continue}*/u, r = /* @__PURE__ */ "and.as.assert.async.await.break.case.class.continue.def.del.elif.else.except.finally.for.from.global.if.import.in.is.lambda.match.nonlocal|10.not.or.pass.raise.return.try.while.with.yield".split("."), i = {
		$pattern: /[A-Za-z]\w+|__\w+__/,
		keyword: r,
		built_in: /* @__PURE__ */ "__import__.abs.all.any.ascii.bin.bool.breakpoint.bytearray.bytes.callable.chr.classmethod.compile.complex.delattr.dict.dir.divmod.enumerate.eval.exec.filter.float.format.frozenset.getattr.globals.hasattr.hash.help.hex.id.input.int.isinstance.issubclass.iter.len.list.locals.map.max.memoryview.min.next.object.oct.open.ord.pow.print.property.range.repr.reversed.round.set.setattr.slice.sorted.staticmethod.str.sum.super.tuple.type.vars.zip".split("."),
		literal: [
			"__debug__",
			"Ellipsis",
			"False",
			"None",
			"NotImplemented",
			"True"
		],
		type: [
			"Any",
			"Callable",
			"Coroutine",
			"Dict",
			"List",
			"Literal",
			"Generic",
			"Optional",
			"Sequence",
			"Set",
			"Tuple",
			"Type",
			"Union"
		]
	}, a = {
		className: "meta",
		begin: /^(>>>|\.\.\.) /
	}, o = {
		className: "subst",
		begin: /\{/,
		end: /\}/,
		keywords: i,
		illegal: /#/
	}, s = {
		begin: /\{\{/,
		relevance: 0
	}, c = {
		className: "string",
		contains: [e.BACKSLASH_ESCAPE],
		variants: [
			{
				begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
				end: /'''/,
				contains: [e.BACKSLASH_ESCAPE, a],
				relevance: 10
			},
			{
				begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
				end: /"""/,
				contains: [e.BACKSLASH_ESCAPE, a],
				relevance: 10
			},
			{
				begin: /([fF][rR]|[rR][fF]|[fF])'''/,
				end: /'''/,
				contains: [
					e.BACKSLASH_ESCAPE,
					a,
					s,
					o
				]
			},
			{
				begin: /([fF][rR]|[rR][fF]|[fF])"""/,
				end: /"""/,
				contains: [
					e.BACKSLASH_ESCAPE,
					a,
					s,
					o
				]
			},
			{
				begin: /([uU]|[rR])'/,
				end: /'/,
				relevance: 10
			},
			{
				begin: /([uU]|[rR])"/,
				end: /"/,
				relevance: 10
			},
			{
				begin: /([bB]|[bB][rR]|[rR][bB])'/,
				end: /'/
			},
			{
				begin: /([bB]|[bB][rR]|[rR][bB])"/,
				end: /"/
			},
			{
				begin: /([fF][rR]|[rR][fF]|[fF])'/,
				end: /'/,
				contains: [
					e.BACKSLASH_ESCAPE,
					s,
					o
				]
			},
			{
				begin: /([fF][rR]|[rR][fF]|[fF])"/,
				end: /"/,
				contains: [
					e.BACKSLASH_ESCAPE,
					s,
					o
				]
			},
			e.APOS_STRING_MODE,
			e.QUOTE_STRING_MODE
		]
	}, l = "[0-9](_?[0-9])*", u = `(\\b(${l}))?\\.(${l})|\\b(${l})\\.`, d = `\\b|${r.join("|")}`, f = {
		className: "number",
		relevance: 0,
		variants: [
			{ begin: `(\\b(${l})|(${u}))[eE][+-]?(${l})[jJ]?(?=${d})` },
			{ begin: `(${u})[jJ]?` },
			{ begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${d})` },
			{ begin: `\\b0[bB](_?[01])+[lL]?(?=${d})` },
			{ begin: `\\b0[oO](_?[0-7])+[lL]?(?=${d})` },
			{ begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${d})` },
			{ begin: `\\b(${l})[jJ](?=${d})` }
		]
	}, p = {
		className: "comment",
		begin: t.lookahead(/# type:/),
		end: /$/,
		keywords: i,
		contains: [{ begin: /# type:/ }, {
			begin: /#/,
			end: /\b\B/,
			endsWithParent: !0
		}]
	}, m = {
		className: "params",
		variants: [{
			className: "",
			begin: /\(\s*\)/,
			skip: !0
		}, {
			begin: /\(/,
			end: /\)/,
			excludeBegin: !0,
			excludeEnd: !0,
			keywords: i,
			contains: [
				"self",
				a,
				f,
				c,
				e.HASH_COMMENT_MODE
			]
		}]
	};
	return o.contains = [
		c,
		f,
		a
	], {
		name: "Python",
		aliases: [
			"py",
			"gyp",
			"ipython"
		],
		unicodeRegex: !0,
		keywords: i,
		illegal: /(<\/|\?)|=>/,
		contains: [
			a,
			f,
			{
				scope: "variable.language",
				match: /\bself\b/
			},
			{
				beginKeywords: "if",
				relevance: 0
			},
			{
				match: /\bor\b/,
				scope: "keyword"
			},
			c,
			p,
			e.HASH_COMMENT_MODE,
			{
				match: [
					/\bdef/,
					/\s+/,
					n
				],
				scope: {
					1: "keyword",
					3: "title.function"
				},
				contains: [m]
			},
			{
				variants: [{ match: [
					/\bclass/,
					/\s+/,
					n,
					/\s*/,
					/\(\s*/,
					n,
					/\s*\)/
				] }, { match: [
					/\bclass/,
					/\s+/,
					n
				] }],
				scope: {
					1: "keyword",
					3: "title.class",
					6: "title.class.inherited"
				}
			},
			{
				className: "meta",
				begin: /^[\t ]*@/,
				end: /(?=#)|$/,
				contains: [
					f,
					m,
					c
				]
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/rust.js
function Wv(e) {
	let t = e.regex, n = /(r#)?/, r = t.concat(n, e.UNDERSCORE_IDENT_RE), i = t.concat(n, e.IDENT_RE), a = {
		className: "title.function.invoke",
		relevance: 0,
		begin: t.concat(/\b/, /(?!let|for|while|if|else|match\b)/, i, t.lookahead(/\s*\(/))
	}, o = /* @__PURE__ */ "abstract.as.async.await.become.box.break.const.continue.crate.do.dyn.else.enum.extern.false.final.fn.for.if.impl.in.let.loop.macro.match.mod.move.mut.override.priv.pub.ref.return.self.Self.static.struct.super.trait.true.try.type.typeof.union.unsafe.unsized.use.virtual.where.while.yield".split("."), s = [
		"true",
		"false",
		"Some",
		"None",
		"Ok",
		"Err"
	], c = /* @__PURE__ */ "drop .Copy.Send.Sized.Sync.Drop.Fn.FnMut.FnOnce.ToOwned.Clone.Debug.PartialEq.PartialOrd.Eq.Ord.AsRef.AsMut.Into.From.Default.Iterator.Extend.IntoIterator.DoubleEndedIterator.ExactSizeIterator.SliceConcatExt.ToString.assert!.assert_eq!.bitflags!.bytes!.cfg!.col!.concat!.concat_idents!.debug_assert!.debug_assert_eq!.env!.eprintln!.panic!.file!.format!.format_args!.include_bytes!.include_str!.line!.local_data_key!.module_path!.option_env!.print!.println!.select!.stringify!.try!.unimplemented!.unreachable!.vec!.write!.writeln!.macro_rules!.assert_ne!.debug_assert_ne!".split("."), l = [
		"i8",
		"i16",
		"i32",
		"i64",
		"i128",
		"isize",
		"u8",
		"u16",
		"u32",
		"u64",
		"u128",
		"usize",
		"f32",
		"f64",
		"str",
		"char",
		"bool",
		"Box",
		"Option",
		"Result",
		"String",
		"Vec"
	];
	return {
		name: "Rust",
		aliases: ["rs"],
		keywords: {
			$pattern: e.IDENT_RE + "!?",
			type: l,
			keyword: o,
			literal: s,
			built_in: c
		},
		illegal: "</",
		contains: [
			e.C_LINE_COMMENT_MODE,
			e.COMMENT("/\\*", "\\*/", { contains: ["self"] }),
			e.inherit(e.QUOTE_STRING_MODE, {
				begin: /b?"/,
				illegal: null
			}),
			{
				className: "symbol",
				begin: /'[a-zA-Z_][a-zA-Z0-9_]*(?!')/
			},
			{
				scope: "string",
				variants: [{ begin: /b?r(#*)"(.|\n)*?"\1(?!#)/ }, {
					begin: /b?'/,
					end: /'/,
					contains: [{
						scope: "char.escape",
						match: /\\('|\w|x\w{2}|u\w{4}|U\w{8})/
					}]
				}]
			},
			{
				className: "number",
				variants: [
					{ begin: "\\b0b([01_]+)([ui](8|16|32|64|128|size)|f(32|64))?" },
					{ begin: "\\b0o([0-7_]+)([ui](8|16|32|64|128|size)|f(32|64))?" },
					{ begin: "\\b0x([A-Fa-f0-9_]+)([ui](8|16|32|64|128|size)|f(32|64))?" },
					{ begin: "\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)([ui](8|16|32|64|128|size)|f(32|64))?" }
				],
				relevance: 0
			},
			{
				begin: [
					/fn/,
					/\s+/,
					r
				],
				className: {
					1: "keyword",
					3: "title.function"
				}
			},
			{
				className: "meta",
				begin: "#!?\\[",
				end: "\\]",
				contains: [{
					className: "string",
					begin: /"/,
					end: /"/,
					contains: [e.BACKSLASH_ESCAPE]
				}]
			},
			{
				begin: [
					/let/,
					/\s+/,
					/(?:mut\s+)?/,
					r
				],
				className: {
					1: "keyword",
					3: "keyword",
					4: "variable"
				}
			},
			{
				begin: [
					/for/,
					/\s+/,
					r,
					/\s+/,
					/in/
				],
				className: {
					1: "keyword",
					3: "variable",
					5: "keyword"
				}
			},
			{
				begin: [
					/type/,
					/\s+/,
					r
				],
				className: {
					1: "keyword",
					3: "title.class"
				}
			},
			{
				begin: [
					/(?:trait|enum|struct|union|impl|for)/,
					/\s+/,
					r
				],
				className: {
					1: "keyword",
					3: "title.class"
				}
			},
			{
				begin: e.IDENT_RE + "::",
				keywords: {
					keyword: "Self",
					built_in: c,
					type: l
				}
			},
			{
				className: "punctuation",
				begin: "->"
			},
			a
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/scss.js
var Gv = (e) => ({
	IMPORTANT: {
		scope: "meta",
		begin: "!important"
	},
	BLOCK_COMMENT: e.C_BLOCK_COMMENT_MODE,
	HEXCOLOR: {
		scope: "number",
		begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
	},
	FUNCTION_DISPATCH: {
		className: "built_in",
		begin: /[\w-]+(?=\()/
	},
	ATTRIBUTE_SELECTOR_MODE: {
		scope: "selector-attr",
		begin: /\[/,
		end: /\]/,
		illegal: "$",
		contains: [e.APOS_STRING_MODE, e.QUOTE_STRING_MODE]
	},
	CSS_NUMBER_MODE: {
		scope: "number",
		begin: e.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
		relevance: 0
	},
	CSS_VARIABLE: {
		className: "attr",
		begin: /--[A-Za-z_][A-Za-z0-9_-]*/
	}
}), Kv = /* @__PURE__ */ "a.abbr.address.article.aside.audio.b.blockquote.body.button.canvas.caption.cite.code.dd.del.details.dfn.div.dl.dt.em.fieldset.figcaption.figure.footer.form.h1.h2.h3.h4.h5.h6.header.hgroup.html.i.iframe.img.input.ins.kbd.label.legend.li.main.mark.menu.nav.object.ol.optgroup.option.p.picture.q.quote.samp.section.select.source.span.strong.summary.sup.table.tbody.td.textarea.tfoot.th.thead.time.tr.ul.var.video".split("."), qv = /* @__PURE__ */ "defs.g.marker.mask.pattern.svg.switch.symbol.feBlend.feColorMatrix.feComponentTransfer.feComposite.feConvolveMatrix.feDiffuseLighting.feDisplacementMap.feFlood.feGaussianBlur.feImage.feMerge.feMorphology.feOffset.feSpecularLighting.feTile.feTurbulence.linearGradient.radialGradient.stop.circle.ellipse.image.line.path.polygon.polyline.rect.text.use.textPath.tspan.foreignObject.clipPath".split("."), Jv = [...Kv, ...qv], Yv = (/* @__PURE__ */ "any-hover.any-pointer.aspect-ratio.color.color-gamut.color-index.device-aspect-ratio.device-height.device-width.display-mode.forced-colors.grid.height.hover.inverted-colors.monochrome.orientation.overflow-block.overflow-inline.pointer.prefers-color-scheme.prefers-contrast.prefers-reduced-motion.prefers-reduced-transparency.resolution.scan.scripting.update.width.min-width.max-width.min-height.max-height".split(".")).sort().reverse(), Xv = (/* @__PURE__ */ "active.any-link.blank.checked.current.default.defined.dir.disabled.drop.empty.enabled.first.first-child.first-of-type.fullscreen.future.focus.focus-visible.focus-within.has.host.host-context.hover.indeterminate.in-range.invalid.is.lang.last-child.last-of-type.left.link.local-link.not.nth-child.nth-col.nth-last-child.nth-last-col.nth-last-of-type.nth-of-type.only-child.only-of-type.optional.out-of-range.past.placeholder-shown.read-only.read-write.required.right.root.scope.target.target-within.user-invalid.valid.visited.where".split(".")).sort().reverse(), Zv = [
	"after",
	"backdrop",
	"before",
	"cue",
	"cue-region",
	"first-letter",
	"first-line",
	"grammar-error",
	"marker",
	"part",
	"placeholder",
	"selection",
	"slotted",
	"spelling-error"
].sort().reverse(), Qv = (/* @__PURE__ */ "accent-color.align-content.align-items.align-self.alignment-baseline.all.anchor-name.animation.animation-composition.animation-delay.animation-direction.animation-duration.animation-fill-mode.animation-iteration-count.animation-name.animation-play-state.animation-range.animation-range-end.animation-range-start.animation-timeline.animation-timing-function.appearance.aspect-ratio.backdrop-filter.backface-visibility.background.background-attachment.background-blend-mode.background-clip.background-color.background-image.background-origin.background-position.background-position-x.background-position-y.background-repeat.background-size.baseline-shift.block-size.border.border-block.border-block-color.border-block-end.border-block-end-color.border-block-end-style.border-block-end-width.border-block-start.border-block-start-color.border-block-start-style.border-block-start-width.border-block-style.border-block-width.border-bottom.border-bottom-color.border-bottom-left-radius.border-bottom-right-radius.border-bottom-style.border-bottom-width.border-collapse.border-color.border-end-end-radius.border-end-start-radius.border-image.border-image-outset.border-image-repeat.border-image-slice.border-image-source.border-image-width.border-inline.border-inline-color.border-inline-end.border-inline-end-color.border-inline-end-style.border-inline-end-width.border-inline-start.border-inline-start-color.border-inline-start-style.border-inline-start-width.border-inline-style.border-inline-width.border-left.border-left-color.border-left-style.border-left-width.border-radius.border-right.border-right-color.border-right-style.border-right-width.border-spacing.border-start-end-radius.border-start-start-radius.border-style.border-top.border-top-color.border-top-left-radius.border-top-right-radius.border-top-style.border-top-width.border-width.bottom.box-align.box-decoration-break.box-direction.box-flex.box-flex-group.box-lines.box-ordinal-group.box-orient.box-pack.box-shadow.box-sizing.break-after.break-before.break-inside.caption-side.caret-color.clear.clip.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.color-scheme.column-count.column-fill.column-gap.column-rule.column-rule-color.column-rule-style.column-rule-width.column-span.column-width.columns.contain.contain-intrinsic-block-size.contain-intrinsic-height.contain-intrinsic-inline-size.contain-intrinsic-size.contain-intrinsic-width.container.container-name.container-type.content.content-visibility.counter-increment.counter-reset.counter-set.cue.cue-after.cue-before.cursor.cx.cy.direction.display.dominant-baseline.empty-cells.enable-background.field-sizing.fill.fill-opacity.fill-rule.filter.flex.flex-basis.flex-direction.flex-flow.flex-grow.flex-shrink.flex-wrap.float.flood-color.flood-opacity.flow.font.font-display.font-family.font-feature-settings.font-kerning.font-language-override.font-optical-sizing.font-palette.font-size.font-size-adjust.font-smooth.font-smoothing.font-stretch.font-style.font-synthesis.font-synthesis-position.font-synthesis-small-caps.font-synthesis-style.font-synthesis-weight.font-variant.font-variant-alternates.font-variant-caps.font-variant-east-asian.font-variant-emoji.font-variant-ligatures.font-variant-numeric.font-variant-position.font-variation-settings.font-weight.forced-color-adjust.gap.glyph-orientation-horizontal.glyph-orientation-vertical.grid.grid-area.grid-auto-columns.grid-auto-flow.grid-auto-rows.grid-column.grid-column-end.grid-column-start.grid-gap.grid-row.grid-row-end.grid-row-start.grid-template.grid-template-areas.grid-template-columns.grid-template-rows.hanging-punctuation.height.hyphenate-character.hyphenate-limit-chars.hyphens.icon.image-orientation.image-rendering.image-resolution.ime-mode.initial-letter.initial-letter-align.inline-size.inset.inset-area.inset-block.inset-block-end.inset-block-start.inset-inline.inset-inline-end.inset-inline-start.isolation.justify-content.justify-items.justify-self.kerning.left.letter-spacing.lighting-color.line-break.line-height.line-height-step.list-style.list-style-image.list-style-position.list-style-type.margin.margin-block.margin-block-end.margin-block-start.margin-bottom.margin-inline.margin-inline-end.margin-inline-start.margin-left.margin-right.margin-top.margin-trim.marker.marker-end.marker-mid.marker-start.marks.mask.mask-border.mask-border-mode.mask-border-outset.mask-border-repeat.mask-border-slice.mask-border-source.mask-border-width.mask-clip.mask-composite.mask-image.mask-mode.mask-origin.mask-position.mask-repeat.mask-size.mask-type.masonry-auto-flow.math-depth.math-shift.math-style.max-block-size.max-height.max-inline-size.max-width.min-block-size.min-height.min-inline-size.min-width.mix-blend-mode.nav-down.nav-index.nav-left.nav-right.nav-up.none.normal.object-fit.object-position.offset.offset-anchor.offset-distance.offset-path.offset-position.offset-rotate.opacity.order.orphans.outline.outline-color.outline-offset.outline-style.outline-width.overflow.overflow-anchor.overflow-block.overflow-clip-margin.overflow-inline.overflow-wrap.overflow-x.overflow-y.overlay.overscroll-behavior.overscroll-behavior-block.overscroll-behavior-inline.overscroll-behavior-x.overscroll-behavior-y.padding.padding-block.padding-block-end.padding-block-start.padding-bottom.padding-inline.padding-inline-end.padding-inline-start.padding-left.padding-right.padding-top.page.page-break-after.page-break-before.page-break-inside.paint-order.pause.pause-after.pause-before.perspective.perspective-origin.place-content.place-items.place-self.pointer-events.position.position-anchor.position-visibility.print-color-adjust.quotes.r.resize.rest.rest-after.rest-before.right.rotate.row-gap.ruby-align.ruby-position.scale.scroll-behavior.scroll-margin.scroll-margin-block.scroll-margin-block-end.scroll-margin-block-start.scroll-margin-bottom.scroll-margin-inline.scroll-margin-inline-end.scroll-margin-inline-start.scroll-margin-left.scroll-margin-right.scroll-margin-top.scroll-padding.scroll-padding-block.scroll-padding-block-end.scroll-padding-block-start.scroll-padding-bottom.scroll-padding-inline.scroll-padding-inline-end.scroll-padding-inline-start.scroll-padding-left.scroll-padding-right.scroll-padding-top.scroll-snap-align.scroll-snap-stop.scroll-snap-type.scroll-timeline.scroll-timeline-axis.scroll-timeline-name.scrollbar-color.scrollbar-gutter.scrollbar-width.shape-image-threshold.shape-margin.shape-outside.shape-rendering.speak.speak-as.src.stop-color.stop-opacity.stroke.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke-width.tab-size.table-layout.text-align.text-align-all.text-align-last.text-anchor.text-combine-upright.text-decoration.text-decoration-color.text-decoration-line.text-decoration-skip.text-decoration-skip-ink.text-decoration-style.text-decoration-thickness.text-emphasis.text-emphasis-color.text-emphasis-position.text-emphasis-style.text-indent.text-justify.text-orientation.text-overflow.text-rendering.text-shadow.text-size-adjust.text-transform.text-underline-offset.text-underline-position.text-wrap.text-wrap-mode.text-wrap-style.timeline-scope.top.touch-action.transform.transform-box.transform-origin.transform-style.transition.transition-behavior.transition-delay.transition-duration.transition-property.transition-timing-function.translate.unicode-bidi.user-modify.user-select.vector-effect.vertical-align.view-timeline.view-timeline-axis.view-timeline-inset.view-timeline-name.view-transition-name.visibility.voice-balance.voice-duration.voice-family.voice-pitch.voice-range.voice-rate.voice-stress.voice-volume.white-space.white-space-collapse.widows.width.will-change.word-break.word-spacing.word-wrap.writing-mode.x.y.z-index.zoom".split(".")).sort().reverse();
function $v(e) {
	let t = Gv(e), n = Zv, r = Xv, i = "@[a-z-]+", a = {
		className: "variable",
		begin: "(\\$[a-zA-Z-][a-zA-Z0-9_-]*)\\b",
		relevance: 0
	};
	return {
		name: "SCSS",
		case_insensitive: !0,
		illegal: "[=/|']",
		contains: [
			e.C_LINE_COMMENT_MODE,
			e.C_BLOCK_COMMENT_MODE,
			t.CSS_NUMBER_MODE,
			{
				className: "selector-id",
				begin: "#[A-Za-z0-9_-]+",
				relevance: 0
			},
			{
				className: "selector-class",
				begin: "\\.[A-Za-z0-9_-]+",
				relevance: 0
			},
			t.ATTRIBUTE_SELECTOR_MODE,
			{
				className: "selector-tag",
				begin: "\\b(" + Jv.join("|") + ")\\b",
				relevance: 0
			},
			{
				className: "selector-pseudo",
				begin: ":(" + r.join("|") + ")"
			},
			{
				className: "selector-pseudo",
				begin: ":(:)?(" + n.join("|") + ")"
			},
			a,
			{
				begin: /\(/,
				end: /\)/,
				contains: [t.CSS_NUMBER_MODE]
			},
			t.CSS_VARIABLE,
			{
				className: "attribute",
				begin: "\\b(" + Qv.join("|") + ")\\b"
			},
			{ begin: "\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b" },
			{
				begin: /:/,
				end: /[;}{]/,
				relevance: 0,
				contains: [
					t.BLOCK_COMMENT,
					a,
					t.HEXCOLOR,
					t.CSS_NUMBER_MODE,
					e.QUOTE_STRING_MODE,
					e.APOS_STRING_MODE,
					t.IMPORTANT,
					t.FUNCTION_DISPATCH
				]
			},
			{
				begin: "@(page|font-face)",
				keywords: {
					$pattern: i,
					keyword: "@page @font-face"
				}
			},
			{
				begin: "@",
				end: "[{;]",
				returnBegin: !0,
				keywords: {
					$pattern: /[a-z-]+/,
					keyword: "and or not only",
					attribute: Yv.join(" ")
				},
				contains: [
					{
						begin: i,
						className: "keyword"
					},
					{
						begin: /[a-z-]+(?=:)/,
						className: "attribute"
					},
					a,
					e.QUOTE_STRING_MODE,
					e.APOS_STRING_MODE,
					t.HEXCOLOR,
					t.CSS_NUMBER_MODE
				]
			},
			t.FUNCTION_DISPATCH
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/shell.js
function ey(e) {
	return {
		name: "Shell Session",
		aliases: ["console", "shellsession"],
		contains: [{
			className: "meta.prompt",
			begin: /^\s{0,3}[/~\w\d[\]()@-]*[>%$#][ ]?/,
			starts: {
				end: /[^\\](?=\s*$)/,
				subLanguage: "bash"
			}
		}]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/sql.js
function ty(e) {
	let t = e.regex, n = e.COMMENT("--", "$"), r = {
		scope: "string",
		variants: [{
			begin: /'/,
			end: /'/,
			contains: [{ match: /''/ }]
		}]
	}, i = {
		begin: /"/,
		end: /"/,
		contains: [{ match: /""/ }]
	}, a = [
		"true",
		"false",
		"unknown"
	], o = [
		"double precision",
		"large object",
		"with timezone",
		"without timezone"
	], s = /* @__PURE__ */ "bigint.binary.blob.boolean.char.character.clob.date.dec.decfloat.decimal.float.int.integer.interval.nchar.nclob.national.numeric.real.row.smallint.time.timestamp.varchar.varying.varbinary".split("."), c = [
		"add",
		"asc",
		"collation",
		"desc",
		"final",
		"first",
		"last",
		"view"
	], l = /* @__PURE__ */ "abs.acos.all.allocate.alter.and.any.are.array.array_agg.array_max_cardinality.as.asensitive.asin.asymmetric.at.atan.atomic.authorization.avg.begin.begin_frame.begin_partition.between.bigint.binary.blob.boolean.both.by.call.called.cardinality.cascaded.case.cast.ceil.ceiling.char.char_length.character.character_length.check.classifier.clob.close.coalesce.collate.collect.column.commit.condition.connect.constraint.contains.convert.copy.corr.corresponding.cos.cosh.count.covar_pop.covar_samp.create.cross.cube.cume_dist.current.current_catalog.current_date.current_default_transform_group.current_path.current_role.current_row.current_schema.current_time.current_timestamp.current_path.current_role.current_transform_group_for_type.current_user.cursor.cycle.date.day.deallocate.dec.decimal.decfloat.declare.default.define.delete.dense_rank.deref.describe.deterministic.disconnect.distinct.double.drop.dynamic.each.element.else.empty.end.end_frame.end_partition.end-exec.equals.escape.every.except.exec.execute.exists.exp.external.extract.false.fetch.filter.first_value.float.floor.for.foreign.frame_row.free.from.full.function.fusion.get.global.grant.group.grouping.groups.having.hold.hour.identity.in.indicator.initial.inner.inout.insensitive.insert.int.integer.intersect.intersection.interval.into.is.join.json_array.json_arrayagg.json_exists.json_object.json_objectagg.json_query.json_table.json_table_primitive.json_value.lag.language.large.last_value.lateral.lead.leading.left.like.like_regex.listagg.ln.local.localtime.localtimestamp.log.log10.lower.match.match_number.match_recognize.matches.max.member.merge.method.min.minute.mod.modifies.module.month.multiset.national.natural.nchar.nclob.new.no.none.normalize.not.nth_value.ntile.null.nullif.numeric.octet_length.occurrences_regex.of.offset.old.omit.on.one.only.open.or.order.out.outer.over.overlaps.overlay.parameter.partition.pattern.per.percent.percent_rank.percentile_cont.percentile_disc.period.portion.position.position_regex.power.precedes.precision.prepare.primary.procedure.ptf.range.rank.reads.real.recursive.ref.references.referencing.regr_avgx.regr_avgy.regr_count.regr_intercept.regr_r2.regr_slope.regr_sxx.regr_sxy.regr_syy.release.result.return.returns.revoke.right.rollback.rollup.row.row_number.rows.running.savepoint.scope.scroll.search.second.seek.select.sensitive.session_user.set.show.similar.sin.sinh.skip.smallint.some.specific.specifictype.sql.sqlexception.sqlstate.sqlwarning.sqrt.start.static.stddev_pop.stddev_samp.submultiset.subset.substring.substring_regex.succeeds.sum.symmetric.system.system_time.system_user.table.tablesample.tan.tanh.then.time.timestamp.timezone_hour.timezone_minute.to.trailing.translate.translate_regex.translation.treat.trigger.trim.trim_array.true.truncate.uescape.union.unique.unknown.unnest.update.upper.user.using.value.values.value_of.var_pop.var_samp.varbinary.varchar.varying.versioning.when.whenever.where.width_bucket.window.with.within.without.year".split("."), u = /* @__PURE__ */ "abs.acos.array_agg.asin.atan.avg.cast.ceil.ceiling.coalesce.corr.cos.cosh.count.covar_pop.covar_samp.cume_dist.dense_rank.deref.element.exp.extract.first_value.floor.json_array.json_arrayagg.json_exists.json_object.json_objectagg.json_query.json_table.json_table_primitive.json_value.lag.last_value.lead.listagg.ln.log.log10.lower.max.min.mod.nth_value.ntile.nullif.percent_rank.percentile_cont.percentile_disc.position.position_regex.power.rank.regr_avgx.regr_avgy.regr_count.regr_intercept.regr_r2.regr_slope.regr_sxx.regr_sxy.regr_syy.row_number.sin.sinh.sqrt.stddev_pop.stddev_samp.substring.substring_regex.sum.tan.tanh.translate.translate_regex.treat.trim.trim_array.unnest.upper.value_of.var_pop.var_samp.width_bucket".split("."), d = [
		"current_catalog",
		"current_date",
		"current_default_transform_group",
		"current_path",
		"current_role",
		"current_schema",
		"current_transform_group_for_type",
		"current_user",
		"session_user",
		"system_time",
		"system_user",
		"current_time",
		"localtime",
		"current_timestamp",
		"localtimestamp"
	], f = [
		"create table",
		"insert into",
		"primary key",
		"foreign key",
		"not null",
		"alter table",
		"add constraint",
		"grouping sets",
		"on overflow",
		"character set",
		"respect nulls",
		"ignore nulls",
		"nulls first",
		"nulls last",
		"depth first",
		"breadth first"
	], p = u, m = [...l, ...c].filter((e) => !u.includes(e)), h = {
		scope: "variable",
		match: /@[a-z0-9][a-z0-9_]*/
	}, g = {
		scope: "operator",
		match: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
		relevance: 0
	}, _ = {
		match: t.concat(/\b/, t.either(...p), /\s*\(/),
		relevance: 0,
		keywords: { built_in: p }
	};
	function v(e) {
		return t.concat(/\b/, t.either(...e.map((e) => e.replace(/\s+/, "\\s+"))), /\b/);
	}
	let y = {
		scope: "keyword",
		match: v(f),
		relevance: 0
	};
	function b(e, { exceptions: t, when: n } = {}) {
		let r = n;
		return t ||= [], e.map((e) => e.match(/\|\d+$/) || t.includes(e) ? e : r(e) ? `${e}|0` : e);
	}
	return {
		name: "SQL",
		case_insensitive: !0,
		illegal: /[{}]|<\//,
		keywords: {
			$pattern: /\b[\w\.]+/,
			keyword: b(m, { when: (e) => e.length < 3 }),
			literal: a,
			type: s,
			built_in: d
		},
		contains: [
			{
				scope: "type",
				match: v(o)
			},
			y,
			_,
			h,
			r,
			i,
			e.C_NUMBER_MODE,
			e.C_BLOCK_COMMENT_MODE,
			n,
			g
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/typescript.js
var ny = "[A-Za-z$_][0-9A-Za-z$_]*", ry = /* @__PURE__ */ "as.in.of.if.for.while.finally.var.new.function.do.return.void.else.break.catch.instanceof.with.throw.case.default.try.switch.continue.typeof.delete.let.yield.const.class.debugger.async.await.static.import.from.export.extends.using".split("."), iy = [
	"true",
	"false",
	"null",
	"undefined",
	"NaN",
	"Infinity"
], ay = /* @__PURE__ */ "Object.Function.Boolean.Symbol.Math.Date.Number.BigInt.String.RegExp.Array.Float32Array.Float64Array.Int8Array.Uint8Array.Uint8ClampedArray.Int16Array.Int32Array.Uint16Array.Uint32Array.BigInt64Array.BigUint64Array.Set.Map.WeakSet.WeakMap.ArrayBuffer.SharedArrayBuffer.Atomics.DataView.JSON.Promise.Generator.GeneratorFunction.AsyncFunction.Reflect.Proxy.Intl.WebAssembly".split("."), oy = [
	"Error",
	"EvalError",
	"InternalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError"
], sy = [
	"setInterval",
	"setTimeout",
	"clearInterval",
	"clearTimeout",
	"require",
	"exports",
	"eval",
	"isFinite",
	"isNaN",
	"parseFloat",
	"parseInt",
	"decodeURI",
	"decodeURIComponent",
	"encodeURI",
	"encodeURIComponent",
	"escape",
	"unescape"
], cy = [
	"arguments",
	"this",
	"super",
	"console",
	"window",
	"document",
	"localStorage",
	"sessionStorage",
	"module",
	"global"
], ly = [].concat(sy, ay, oy);
function uy(e) {
	let t = e.regex, n = (e, { after: t }) => {
		let n = "</" + e[0].slice(1);
		return e.input.indexOf(n, t) !== -1;
	}, r = ny, i = {
		begin: "<>",
		end: "</>"
	}, a = /<[A-Za-z0-9\\._:-]+\s*\/>/, o = {
		begin: /<[A-Za-z0-9\\._:-]+/,
		end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
		isTrulyOpeningTag: (e, t) => {
			let r = e[0].length + e.index, i = e.input[r];
			if (i === "<" || i === ",") {
				t.ignoreMatch();
				return;
			}
			i === ">" && (n(e, { after: r }) || t.ignoreMatch());
			let a, o = e.input.substring(r);
			if (a = o.match(/^\s*=/)) {
				t.ignoreMatch();
				return;
			}
			if ((a = o.match(/^\s+extends\s+/)) && a.index === 0) {
				t.ignoreMatch();
				return;
			}
		}
	}, s = {
		$pattern: ny,
		keyword: ry,
		literal: iy,
		built_in: ly,
		"variable.language": cy
	}, c = "[0-9](_?[0-9])*", l = `\\.(${c})`, u = "0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*", d = {
		className: "number",
		variants: [
			{ begin: `(\\b(${u})((${l})|\\.)?|(${l}))[eE][+-]?(${c})\\b` },
			{ begin: `\\b(${u})\\b((${l})\\b|\\.)?|(${l})\\b` },
			{ begin: "\\b(0|[1-9](_?[0-9])*)n\\b" },
			{ begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
			{ begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
			{ begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
			{ begin: "\\b0[0-7]+n?\\b" }
		],
		relevance: 0
	}, f = {
		className: "subst",
		begin: "\\$\\{",
		end: "\\}",
		keywords: s,
		contains: []
	}, p = {
		begin: ".?html`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "xml"
		}
	}, m = {
		begin: ".?css`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "css"
		}
	}, h = {
		begin: ".?gql`",
		end: "",
		starts: {
			end: "`",
			returnEnd: !1,
			contains: [e.BACKSLASH_ESCAPE, f],
			subLanguage: "graphql"
		}
	}, g = {
		className: "string",
		begin: "`",
		end: "`",
		contains: [e.BACKSLASH_ESCAPE, f]
	}, _ = {
		className: "comment",
		variants: [
			e.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
				relevance: 0,
				contains: [{
					begin: "(?=@[A-Za-z]+)",
					relevance: 0,
					contains: [
						{
							className: "doctag",
							begin: "@[A-Za-z]+"
						},
						{
							className: "type",
							begin: "\\{",
							end: "\\}",
							excludeEnd: !0,
							excludeBegin: !0,
							relevance: 0
						},
						{
							className: "variable",
							begin: "[A-Za-z$_][0-9A-Za-z$_]*(?=\\s*(-)|$)",
							endsParent: !0,
							relevance: 0
						},
						{
							begin: /(?=[^\n])\s/,
							relevance: 0
						}
					]
				}]
			}),
			e.C_BLOCK_COMMENT_MODE,
			e.C_LINE_COMMENT_MODE
		]
	}, v = [
		e.APOS_STRING_MODE,
		e.QUOTE_STRING_MODE,
		p,
		m,
		h,
		g,
		{ match: /\$\d+/ },
		d
	];
	f.contains = v.concat({
		begin: /\{/,
		end: /\}/,
		keywords: s,
		contains: ["self"].concat(v)
	});
	let y = [].concat(_, f.contains), b = y.concat([{
		begin: /(\s*)\(/,
		end: /\)/,
		keywords: s,
		contains: ["self"].concat(y)
	}]), x = {
		className: "params",
		begin: /(\s*)\(/,
		end: /\)/,
		excludeBegin: !0,
		excludeEnd: !0,
		keywords: s,
		contains: b
	}, S = { variants: [{
		match: [
			/class/,
			/\s+/,
			r,
			/\s+/,
			/extends/,
			/\s+/,
			t.concat(r, "(", t.concat(/\./, r), ")*")
		],
		scope: {
			1: "keyword",
			3: "title.class",
			5: "keyword",
			7: "title.class.inherited"
		}
	}, {
		match: [
			/class/,
			/\s+/,
			r
		],
		scope: {
			1: "keyword",
			3: "title.class"
		}
	}] }, C = {
		relevance: 0,
		match: t.either(/\bJSON/, /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/, /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/, /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),
		className: "title.class",
		keywords: { _: [...ay, ...oy] }
	}, w = {
		label: "use_strict",
		className: "meta",
		relevance: 10,
		begin: /^\s*['"]use (strict|asm)['"]/
	}, T = {
		variants: [{ match: [
			/function/,
			/\s+/,
			r,
			/(?=\s*\()/
		] }, { match: [/function/, /\s*(?=\()/] }],
		className: {
			1: "keyword",
			3: "title.function"
		},
		label: "func.def",
		contains: [x],
		illegal: /%/
	}, E = {
		relevance: 0,
		match: /\b[A-Z][A-Z_0-9]+\b/,
		className: "variable.constant"
	};
	function D(e) {
		return t.concat("(?!", e.join("|"), ")");
	}
	let O = {
		match: t.concat(/\b/, D([
			...sy,
			"super",
			"import"
		].map((e) => `${e}\\s*\\(`)), r, t.lookahead(/\s*\(/)),
		className: "title.function",
		relevance: 0
	}, k = {
		begin: t.concat(/\./, t.lookahead(t.concat(r, /(?![0-9A-Za-z$_(])/))),
		end: r,
		excludeBegin: !0,
		keywords: "prototype",
		className: "property",
		relevance: 0
	}, A = {
		match: [
			/get|set/,
			/\s+/,
			r,
			/(?=\()/
		],
		className: {
			1: "keyword",
			3: "title.function"
		},
		contains: [{ begin: /\(\)/ }, x]
	}, ee = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + e.UNDERSCORE_IDENT_RE + ")\\s*=>", j = {
		match: [
			/const|var|let/,
			/\s+/,
			r,
			/\s*/,
			/=\s*/,
			/(async\s*)?/,
			t.lookahead(ee)
		],
		keywords: "async",
		className: {
			1: "keyword",
			3: "title.function"
		},
		contains: [x]
	};
	return {
		name: "JavaScript",
		aliases: [
			"js",
			"jsx",
			"mjs",
			"cjs"
		],
		keywords: s,
		exports: {
			PARAMS_CONTAINS: b,
			CLASS_REFERENCE: C
		},
		illegal: /#(?![$_A-z])/,
		contains: [
			e.SHEBANG({
				label: "shebang",
				binary: "node",
				relevance: 5
			}),
			w,
			e.APOS_STRING_MODE,
			e.QUOTE_STRING_MODE,
			p,
			m,
			h,
			g,
			_,
			{ match: /\$\d+/ },
			d,
			C,
			{
				scope: "attr",
				match: r + t.lookahead(":"),
				relevance: 0
			},
			j,
			{
				begin: "(" + e.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
				keywords: "return throw case",
				relevance: 0,
				contains: [
					_,
					e.REGEXP_MODE,
					{
						className: "function",
						begin: ee,
						returnBegin: !0,
						end: "\\s*=>",
						contains: [{
							className: "params",
							variants: [
								{
									begin: e.UNDERSCORE_IDENT_RE,
									relevance: 0
								},
								{
									className: null,
									begin: /\(\s*\)/,
									skip: !0
								},
								{
									begin: /(\s*)\(/,
									end: /\)/,
									excludeBegin: !0,
									excludeEnd: !0,
									keywords: s,
									contains: b
								}
							]
						}]
					},
					{
						begin: /,/,
						relevance: 0
					},
					{
						match: /\s+/,
						relevance: 0
					},
					{
						variants: [
							{
								begin: i.begin,
								end: i.end
							},
							{ match: a },
							{
								begin: o.begin,
								"on:begin": o.isTrulyOpeningTag,
								end: o.end
							}
						],
						subLanguage: "xml",
						contains: [{
							begin: o.begin,
							end: o.end,
							skip: !0,
							contains: ["self"]
						}]
					}
				]
			},
			T,
			{ beginKeywords: "while if switch catch for" },
			{
				begin: "\\b(?!function)" + e.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
				returnBegin: !0,
				label: "func.def",
				contains: [x, e.inherit(e.TITLE_MODE, {
					begin: r,
					className: "title.function"
				})]
			},
			{
				match: /\.\.\./,
				relevance: 0
			},
			k,
			{
				match: "\\$[A-Za-z$_][0-9A-Za-z$_]*",
				relevance: 0
			},
			{
				match: [/\bconstructor(?=\s*\()/],
				className: { 1: "title.function" },
				contains: [x]
			},
			O,
			E,
			S,
			A,
			{ match: /\$[(.]/ }
		]
	};
}
function dy(e) {
	let t = e.regex, n = uy(e), r = ny, i = [
		"any",
		"void",
		"number",
		"boolean",
		"string",
		"object",
		"never",
		"symbol",
		"bigint",
		"unknown"
	], a = {
		begin: [
			/namespace/,
			/\s+/,
			e.IDENT_RE
		],
		beginScope: {
			1: "keyword",
			3: "title.class"
		}
	}, o = {
		beginKeywords: "interface",
		end: /\{/,
		excludeEnd: !0,
		keywords: {
			keyword: "interface extends",
			built_in: i
		},
		contains: [n.exports.CLASS_REFERENCE]
	}, s = {
		className: "meta",
		relevance: 10,
		begin: /^\s*['"]use strict['"]/
	}, c = {
		$pattern: ny,
		keyword: ry.concat([
			"type",
			"interface",
			"public",
			"private",
			"protected",
			"implements",
			"declare",
			"abstract",
			"readonly",
			"enum",
			"override",
			"satisfies"
		]),
		literal: iy,
		built_in: ly.concat(i),
		"variable.language": cy
	}, l = {
		className: "meta",
		begin: "@[A-Za-z$_][0-9A-Za-z$_]*"
	}, u = (e, t, n) => {
		let r = e.contains.findIndex((e) => e.label === t);
		if (r === -1) throw Error("can not find mode to replace");
		e.contains.splice(r, 1, n);
	};
	Object.assign(n.keywords, c), n.exports.PARAMS_CONTAINS.push(l);
	let d = n.contains.find((e) => e.scope === "attr"), f = Object.assign({}, d, { match: t.concat(r, t.lookahead(/\s*\?:/)) });
	n.exports.PARAMS_CONTAINS.push([
		n.exports.CLASS_REFERENCE,
		d,
		f
	]), n.contains = n.contains.concat([
		l,
		a,
		o,
		f
	]), u(n, "shebang", e.SHEBANG()), u(n, "use_strict", s);
	let p = n.contains.find((e) => e.label === "func.def");
	return p.relevance = 0, Object.assign(n, {
		name: "TypeScript",
		aliases: [
			"ts",
			"tsx",
			"mts",
			"cts"
		]
	}), n;
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/xml.js
function fy(e) {
	let t = e.regex, n = t.concat(/[\p{L}_]/u, t.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u), r = /[\p{L}0-9._:-]+/u, i = {
		className: "symbol",
		begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
	}, a = {
		begin: /\s/,
		contains: [{
			className: "keyword",
			begin: /#?[a-z_][a-z1-9_-]+/,
			illegal: /\n/
		}]
	}, o = e.inherit(a, {
		begin: /\(/,
		end: /\)/
	}), s = e.inherit(e.APOS_STRING_MODE, { className: "string" }), c = e.inherit(e.QUOTE_STRING_MODE, { className: "string" }), l = {
		endsWithParent: !0,
		illegal: /</,
		relevance: 0,
		contains: [{
			className: "attr",
			begin: r,
			relevance: 0
		}, {
			begin: /=\s*/,
			relevance: 0,
			contains: [{
				className: "string",
				endsParent: !0,
				variants: [
					{
						begin: /"/,
						end: /"/,
						contains: [i]
					},
					{
						begin: /'/,
						end: /'/,
						contains: [i]
					},
					{ begin: /[^\s"'=<>`]+/ }
				]
			}]
		}]
	};
	return {
		name: "HTML, XML",
		aliases: [
			"html",
			"xhtml",
			"rss",
			"atom",
			"xjb",
			"xsd",
			"xsl",
			"plist",
			"wsf",
			"svg"
		],
		case_insensitive: !0,
		unicodeRegex: !0,
		contains: [
			{
				className: "meta",
				begin: /<![a-z]/,
				end: />/,
				relevance: 10,
				contains: [
					a,
					c,
					s,
					o,
					{
						begin: /\[/,
						end: /\]/,
						contains: [{
							className: "meta",
							begin: /<![a-z]/,
							end: />/,
							contains: [
								a,
								o,
								c,
								s
							]
						}]
					}
				]
			},
			e.COMMENT(/<!--/, /-->/, { relevance: 10 }),
			{
				begin: /<!\[CDATA\[/,
				end: /\]\]>/,
				relevance: 10
			},
			i,
			{
				className: "meta",
				end: /\?>/,
				variants: [{
					begin: /<\?xml/,
					relevance: 10,
					contains: [c]
				}, { begin: /<\?[a-z][a-z0-9]+/ }]
			},
			{
				className: "tag",
				begin: /<style(?=\s|>)/,
				end: />/,
				keywords: { name: "style" },
				contains: [l],
				starts: {
					end: /<\/style>/,
					returnEnd: !0,
					subLanguage: ["css", "xml"]
				}
			},
			{
				className: "tag",
				begin: /<script(?=\s|>)/,
				end: />/,
				keywords: { name: "script" },
				contains: [l],
				starts: {
					end: /<\/script>/,
					returnEnd: !0,
					subLanguage: [
						"javascript",
						"handlebars",
						"xml"
					]
				}
			},
			{
				className: "tag",
				begin: /<>|<\/>/
			},
			{
				className: "tag",
				begin: t.concat(/</, t.lookahead(t.concat(n, t.either(/\/>/, />/, /\s/)))),
				end: /\/?>/,
				contains: [{
					className: "name",
					begin: n,
					relevance: 0,
					starts: l
				}]
			},
			{
				className: "tag",
				begin: t.concat(/<\//, t.lookahead(t.concat(n, />/))),
				contains: [{
					className: "name",
					begin: n,
					relevance: 0
				}, {
					begin: />/,
					relevance: 0,
					endsParent: !0
				}]
			}
		]
	};
}
//#endregion
//#region ../../node_modules/.pnpm/highlight.js@11.11.1/node_modules/highlight.js/es/languages/yaml.js
function py(e) {
	let t = "true false yes no null", n = {
		className: "attr",
		variants: [
			{ begin: /[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/ },
			{ begin: /"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/ },
			{ begin: /'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/ }
		]
	}, r = {
		className: "template-variable",
		variants: [{
			begin: /\{\{/,
			end: /\}\}/
		}, {
			begin: /%\{/,
			end: /\}/
		}]
	}, i = {
		className: "string",
		relevance: 0,
		begin: /'/,
		end: /'/,
		contains: [{
			match: /''/,
			scope: "char.escape",
			relevance: 0
		}]
	}, a = {
		className: "string",
		relevance: 0,
		variants: [{
			begin: /"/,
			end: /"/
		}, { begin: /\S+/ }],
		contains: [e.BACKSLASH_ESCAPE, r]
	}, o = e.inherit(a, { variants: [
		{
			begin: /'/,
			end: /'/,
			contains: [{
				begin: /''/,
				relevance: 0
			}]
		},
		{
			begin: /"/,
			end: /"/
		},
		{ begin: /[^\s,{}[\]]+/ }
	] }), s = {
		className: "number",
		begin: "\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b"
	}, c = {
		end: ",",
		endsWithParent: !0,
		excludeEnd: !0,
		keywords: t,
		relevance: 0
	}, l = {
		begin: /\{/,
		end: /\}/,
		contains: [c],
		illegal: "\\n",
		relevance: 0
	}, u = {
		begin: "\\[",
		end: "\\]",
		contains: [c],
		illegal: "\\n",
		relevance: 0
	}, d = [
		n,
		{
			className: "meta",
			begin: "^---\\s*$",
			relevance: 10
		},
		{
			className: "string",
			begin: "[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"
		},
		{
			begin: "<%[%=-]?",
			end: "[%-]?%>",
			subLanguage: "ruby",
			excludeBegin: !0,
			excludeEnd: !0,
			relevance: 0
		},
		{
			className: "type",
			begin: "!\\w+![\\w#;/?:@&=+$,.~*'()[\\]]+"
		},
		{
			className: "type",
			begin: "!<[\\w#;/?:@&=+$,.~*'()[\\]]+>"
		},
		{
			className: "type",
			begin: "![\\w#;/?:@&=+$,.~*'()[\\]]+"
		},
		{
			className: "type",
			begin: "!![\\w#;/?:@&=+$,.~*'()[\\]]+"
		},
		{
			className: "meta",
			begin: "&" + e.UNDERSCORE_IDENT_RE + "$"
		},
		{
			className: "meta",
			begin: "\\*" + e.UNDERSCORE_IDENT_RE + "$"
		},
		{
			className: "bullet",
			begin: "-(?=[ ]|$)",
			relevance: 0
		},
		e.HASH_COMMENT_MODE,
		{
			beginKeywords: t,
			keywords: { literal: t }
		},
		s,
		{
			className: "number",
			begin: e.C_NUMBER_RE + "\\b",
			relevance: 0
		},
		l,
		u,
		i,
		a
	], f = [...d];
	return f.pop(), f.push(o), c.contains = f, {
		name: "YAML",
		case_insensitive: !0,
		aliases: ["yml"],
		contains: d
	};
}
//#endregion
//#region src/components/BaseCodeBlock/BaseCodeBlock.vue?vue&type=script&setup=true&lang.ts
var my = { class: "base-code-block" }, hy = {
	key: 0,
	class: "base-code-block__header"
}, gy = {
	key: 0,
	class: "base-code-block__filename"
}, _y = {
	key: 1,
	class: "base-code-block__language"
}, vy = ["aria-label"], yy = {
	key: 0,
	xmlns: "http://www.w3.org/2000/svg",
	width: "14",
	height: "14",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "2",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	"aria-hidden": "true"
}, by = {
	key: 1,
	xmlns: "http://www.w3.org/2000/svg",
	width: "14",
	height: "14",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "2",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	"aria-hidden": "true"
}, xy = {
	class: "base-code-block__body",
	tabindex: "0"
}, Sy = {
	key: 0,
	class: "base-code-block__table",
	"aria-hidden": "true"
}, Cy = { class: "base-code-block__line-no" }, wy = ["innerHTML"], Ty = {
	key: 1,
	class: "base-code-block__pre"
}, Ey = ["innerHTML"], Dy = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseCodeBlock",
	props: {
		code: {},
		language: { default: "plaintext" },
		filename: { default: void 0 },
		showLineNumbers: {
			type: Boolean,
			default: !1
		},
		showCopyButton: {
			type: Boolean,
			default: !0
		}
	},
	setup(e) {
		_v.registerLanguage("bash", vv), _v.registerLanguage("css", Dv), _v.registerLanguage("dockerfile", Ov), _v.registerLanguage("go", kv), _v.registerLanguage("ini", Av), _v.registerLanguage("javascript", zv), _v.registerLanguage("json", Bv), _v.registerLanguage("markdown", Vv), _v.registerLanguage("plaintext", Hv), _v.registerLanguage("python", Uv), _v.registerLanguage("rust", Wv), _v.registerLanguage("scss", $v), _v.registerLanguage("shell", ey), _v.registerLanguage("sql", ty), _v.registerLanguage("typescript", dy), _v.registerLanguage("xml", fy), _v.registerLanguage("yaml", py);
		let t = e, n = P(!1), r, i = g(() => {
			let e = t.language ?? "plaintext";
			return _v.getLanguage(e) ? _v.highlight(t.code, { language: e }).value : _v.highlightAuto(t.code).value;
		}), a = g(() => i.value.split("\n"));
		async function o() {
			await navigator.clipboard.writeText(t.code), n.value = !0, clearTimeout(r), r = setTimeout(() => {
				n.value = !1;
			}, 2e3);
		}
		return (t, r) => (N(), y("div", my, [e.filename || e.showCopyButton ? (N(), y("div", hy, [e.filename ? (N(), y("span", gy, L(e.filename), 1)) : (N(), y("span", _y, L(e.language), 1)), e.showCopyButton ? (N(), y("button", {
			key: 2,
			type: "button",
			class: "base-code-block__copy",
			"aria-label": n.value ? "Copied" : "Copy code",
			onClick: o
		}, [n.value ? (N(), y("svg", by, [...r[1] ||= [b("path", { d: "M20 6 9 17l-5-5" }, null, -1)]])) : (N(), y("svg", yy, [...r[0] ||= [b("rect", {
			width: "14",
			height: "14",
			x: "8",
			y: "8",
			rx: "2",
			ry: "2"
		}, null, -1), b("path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }, null, -1)]])), C(" " + L(n.value ? "Copied" : "Copy"), 1)], 8, vy)) : v("", !0)])) : v("", !0), b("div", xy, [e.showLineNumbers ? (N(), y("table", Sy, [b("tbody", null, [(N(!0), y(p, null, F(a.value, (e, t) => (N(), y("tr", {
			key: t,
			class: "base-code-block__line"
		}, [b("td", Cy, L(t + 1), 1), b("td", {
			class: "base-code-block__line-code",
			innerHTML: e || "\xA0"
		}, null, 8, wy)]))), 128))])])) : (N(), y("pre", Ty, [b("code", {
			class: "base-code-block__code hljs",
			innerHTML: i.value
		}, null, 8, Ey)]))])]));
	}
}), [["__scopeId", "data-v-ebbe1242"]]), Oy = /* @__PURE__ */ u({
	cssDefaults: () => My,
	lessDefaults: () => Py,
	scssDefaults: () => Ny
}), ky = class {
	constructor(e, t, n) {
		this._onDidChange = new l(), this._languageId = e, this.setOptions(t), this.setModeConfiguration(n);
	}
	get onDidChange() {
		return this._onDidChange.event;
	}
	get languageId() {
		return this._languageId;
	}
	get modeConfiguration() {
		return this._modeConfiguration;
	}
	get diagnosticsOptions() {
		return this.options;
	}
	get options() {
		return this._options;
	}
	setOptions(e) {
		this._options = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
	setDiagnosticsOptions(e) {
		this.setOptions(e);
	}
	setModeConfiguration(e) {
		this._modeConfiguration = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
}, Ay = {
	validate: !0,
	lint: {
		compatibleVendorPrefixes: "ignore",
		vendorPrefix: "warning",
		duplicateProperties: "warning",
		emptyRules: "warning",
		importStatement: "ignore",
		boxModel: "ignore",
		universalSelector: "ignore",
		zeroUnits: "ignore",
		fontFaceProperties: "warning",
		hexColorLength: "error",
		argumentsInColorFunction: "error",
		unknownProperties: "warning",
		ieHack: "ignore",
		unknownVendorSpecificProperties: "ignore",
		propertyIgnoredDueToDisplay: "warning",
		important: "ignore",
		float: "ignore",
		idSelector: "ignore"
	},
	data: { useDefaultDataProvider: !0 },
	format: {
		newlineBetweenSelectors: !0,
		newlineBetweenRules: !0,
		spaceAroundSelectorSeparator: !1,
		braceStyle: "collapse",
		maxPreserveNewLines: void 0,
		preserveNewLines: !0
	}
}, jy = {
	completionItems: !0,
	hovers: !0,
	documentSymbols: !0,
	definitions: !0,
	references: !0,
	documentHighlights: !0,
	rename: !0,
	colors: !0,
	foldingRanges: !0,
	diagnostics: !0,
	selectionRanges: !0,
	documentFormattingEdits: !0,
	documentRangeFormattingEdits: !0
}, My = new ky("css", Ay, jy), Ny = new ky("scss", Ay, jy), Py = new ky("less", Ay, jy);
function Fy() {
	return import("./cssMode-cj-riCUZ.js");
}
e.onLanguage("less", () => {
	Fy().then((e) => e.setupMode(Py));
}), e.onLanguage("scss", () => {
	Fy().then((e) => e.setupMode(Ny));
}), e.onLanguage("css", () => {
	Fy().then((e) => e.setupMode(My));
});
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/language/html/monaco.contribution.js
var Iy = /* @__PURE__ */ u({
	handlebarDefaults: () => Ky,
	handlebarLanguageService: () => Gy,
	htmlDefaults: () => Wy,
	htmlLanguageService: () => Uy,
	razorDefaults: () => Jy,
	razorLanguageService: () => qy,
	registerHTMLLanguageService: () => Xy
}), Ly = class {
	constructor(e, t, n) {
		this._onDidChange = new l(), this._languageId = e, this.setOptions(t), this.setModeConfiguration(n);
	}
	get onDidChange() {
		return this._onDidChange.event;
	}
	get languageId() {
		return this._languageId;
	}
	get options() {
		return this._options;
	}
	get modeConfiguration() {
		return this._modeConfiguration;
	}
	setOptions(e) {
		this._options = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
	setModeConfiguration(e) {
		this._modeConfiguration = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
}, Ry = {
	format: {
		tabSize: 4,
		insertSpaces: !1,
		wrapLineLength: 120,
		unformatted: "default\": \"a, abbr, acronym, b, bdo, big, br, button, cite, code, dfn, em, i, img, input, kbd, label, map, object, q, samp, select, small, span, strong, sub, sup, textarea, tt, var",
		contentUnformatted: "pre",
		indentInnerHtml: !1,
		preserveNewLines: !0,
		maxPreserveNewLines: void 0,
		indentHandlebars: !1,
		endWithNewline: !1,
		extraLiners: "head, body, /html",
		wrapAttributes: "auto"
	},
	suggest: {},
	data: { useDefaultDataProvider: !0 }
};
function zy(e) {
	return {
		completionItems: !0,
		hovers: !0,
		documentSymbols: !0,
		links: !0,
		documentHighlights: !0,
		rename: !0,
		colors: !0,
		foldingRanges: !0,
		selectionRanges: !0,
		diagnostics: e === By,
		documentFormattingEdits: e === By,
		documentRangeFormattingEdits: e === By
	};
}
var By = "html", Vy = "handlebars", Hy = "razor", Uy = Xy(By, Ry, zy(By)), Wy = Uy.defaults, Gy = Xy(Vy, Ry, zy(Vy)), Ky = Gy.defaults, qy = Xy(Hy, Ry, zy(Hy)), Jy = qy.defaults;
function Yy() {
	return import("./htmlMode-CT5E_M_K.js");
}
function Xy(t, n = Ry, r = zy(t)) {
	let i = new Ly(t, n, r), a, o = e.onLanguage(t, async () => {
		a = (await Yy()).setupMode(i);
	});
	return {
		defaults: i,
		dispose() {
			o.dispose(), a?.dispose(), a = void 0;
		}
	};
}
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/language/json/monaco.contribution.js
var Zy = /* @__PURE__ */ u({
	getWorker: () => $y,
	jsonDefaults: () => Qy
}), Qy = new class {
	constructor(e, t, n) {
		this._onDidChange = new l(), this._languageId = e, this.setDiagnosticsOptions(t), this.setModeConfiguration(n);
	}
	get onDidChange() {
		return this._onDidChange.event;
	}
	get languageId() {
		return this._languageId;
	}
	get modeConfiguration() {
		return this._modeConfiguration;
	}
	get diagnosticsOptions() {
		return this._diagnosticsOptions;
	}
	setDiagnosticsOptions(e) {
		this._diagnosticsOptions = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
	setModeConfiguration(e) {
		this._modeConfiguration = e || /* @__PURE__ */ Object.create(null), this._onDidChange.fire(this);
	}
}("json", {
	validate: !0,
	allowComments: !0,
	schemas: [],
	enableSchemaRequest: !1,
	schemaRequest: "warning",
	schemaValidation: "warning",
	comments: "error",
	trailingCommas: "error"
}, {
	documentFormattingEdits: !0,
	documentRangeFormattingEdits: !0,
	completionItems: !0,
	hovers: !0,
	documentSymbols: !0,
	tokens: !0,
	colors: !0,
	foldingRanges: !0,
	diagnostics: !0,
	selectionRanges: !0
}), $y = () => eb().then((e) => e.getWorker());
function eb() {
	return import("./jsonMode-C_B2HoY_.js");
}
e.register({
	id: "json",
	extensions: [
		".json",
		".bowerrc",
		".jshintrc",
		".jscsrc",
		".eslintrc",
		".babelrc",
		".har"
	],
	aliases: ["JSON", "json"],
	mimetypes: ["application/json"]
}), e.onLanguage("json", () => {
	eb().then((e) => e.setupMode(Qy));
});
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/basic-languages/_.contribution.js
var tb = {}, nb = {}, rb = class e {
	static getOrCreate(t) {
		return nb[t] || (nb[t] = new e(t)), nb[t];
	}
	constructor(e) {
		this._languageId = e, this._loadingTriggered = !1, this._lazyLoadPromise = new Promise((e, t) => {
			this._lazyLoadPromiseResolve = e, this._lazyLoadPromiseReject = t;
		});
	}
	load() {
		return this._loadingTriggered || (this._loadingTriggered = !0, tb[this._languageId].loader().then((e) => this._lazyLoadPromiseResolve(e), (e) => this._lazyLoadPromiseReject(e))), this._lazyLoadPromise;
	}
};
function Y(t) {
	let n = t.id;
	tb[n] = t, e.register(t);
	let r = rb.getOrCreate(n);
	e.registerTokensProviderFactory(n, { create: async () => (await r.load()).language }), e.onLanguageEncountered(n, async () => {
		let t = await r.load();
		e.setLanguageConfiguration(n, t.conf);
	});
}
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js
Y({
	id: "abap",
	extensions: [".abap"],
	aliases: ["abap", "ABAP"],
	loader: () => import("./abap-DITqzqhb.js")
}), Y({
	id: "apex",
	extensions: [".cls"],
	aliases: ["Apex", "apex"],
	mimetypes: ["text/x-apex-source", "text/x-apex"],
	loader: () => import("./apex-El5e4qCQ.js")
}), Y({
	id: "azcli",
	extensions: [".azcli"],
	aliases: ["Azure CLI", "azcli"],
	loader: () => import("./azcli-DuxqGO9h.js")
}), Y({
	id: "bat",
	extensions: [".bat", ".cmd"],
	aliases: ["Batch", "bat"],
	loader: () => import("./bat-DIgF08QN.js")
}), Y({
	id: "bicep",
	extensions: [".bicep"],
	aliases: ["Bicep"],
	loader: () => import("./bicep-B6UDBWZN.js")
}), Y({
	id: "cameligo",
	extensions: [".mligo"],
	aliases: ["Cameligo"],
	loader: () => import("./cameligo-CEqnWRSd.js")
}), Y({
	id: "clojure",
	extensions: [
		".clj",
		".cljs",
		".cljc",
		".edn"
	],
	aliases: ["clojure", "Clojure"],
	loader: () => import("./clojure-tM2nCRoU.js")
}), Y({
	id: "coffeescript",
	extensions: [".coffee"],
	aliases: [
		"CoffeeScript",
		"coffeescript",
		"coffee"
	],
	mimetypes: ["text/x-coffeescript", "text/coffeescript"],
	loader: () => import("./coffee-BZ5eIxJK.js")
}), Y({
	id: "c",
	extensions: [".c", ".h"],
	aliases: ["C", "c"],
	loader: () => import("./cpp-DssdVHV8.js")
}), Y({
	id: "cpp",
	extensions: [
		".cpp",
		".cc",
		".cxx",
		".hpp",
		".hh",
		".hxx"
	],
	aliases: [
		"C++",
		"Cpp",
		"cpp"
	],
	loader: () => import("./cpp-DssdVHV8.js")
}), Y({
	id: "csharp",
	extensions: [
		".cs",
		".csx",
		".cake"
	],
	aliases: ["C#", "csharp"],
	loader: () => import("./csharp-CzG-Jop7.js")
}), Y({
	id: "csp",
	extensions: [".csp"],
	aliases: ["CSP", "csp"],
	loader: () => import("./csp-t-trWNv5.js")
}), Y({
	id: "css",
	extensions: [".css"],
	aliases: ["CSS", "css"],
	mimetypes: ["text/css"],
	loader: () => import("./css-jRa-sq2v.js")
}), Y({
	id: "cypher",
	extensions: [".cypher", ".cyp"],
	aliases: ["Cypher", "OpenCypher"],
	loader: () => import("./cypher-DKG3uk5Q.js")
}), Y({
	id: "dart",
	extensions: [".dart"],
	aliases: ["Dart", "dart"],
	mimetypes: ["text/x-dart-source", "text/x-dart"],
	loader: () => import("./dart-Dt0Ds2JE.js")
}), Y({
	id: "dockerfile",
	extensions: [".dockerfile"],
	filenames: ["Dockerfile"],
	aliases: ["Dockerfile"],
	loader: () => import("./dockerfile-B7f_2-Gl.js")
}), Y({
	id: "ecl",
	extensions: [".ecl"],
	aliases: [
		"ECL",
		"Ecl",
		"ecl"
	],
	loader: () => import("./ecl-BG5IoyX6.js")
}), Y({
	id: "elixir",
	extensions: [".ex", ".exs"],
	aliases: [
		"Elixir",
		"elixir",
		"ex"
	],
	loader: () => import("./elixir-m9TBHpEz.js")
}), Y({
	id: "flow9",
	extensions: [".flow"],
	aliases: [
		"Flow9",
		"Flow",
		"flow9",
		"flow"
	],
	loader: () => import("./flow9-Y8AUzhmr.js")
}), Y({
	id: "fsharp",
	extensions: [
		".fs",
		".fsi",
		".ml",
		".mli",
		".fsx",
		".fsscript"
	],
	aliases: [
		"F#",
		"FSharp",
		"fsharp"
	],
	loader: () => import("./fsharp-D8gz2am9.js")
}), Y({
	id: "freemarker2",
	extensions: [
		".ftl",
		".ftlh",
		".ftlx"
	],
	aliases: ["FreeMarker2", "Apache FreeMarker2"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagAutoInterpolationDollar)
}), Y({
	id: "freemarker2.tag-angle.interpolation-dollar",
	aliases: ["FreeMarker2 (Angle/Dollar)", "Apache FreeMarker2 (Angle/Dollar)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagAngleInterpolationDollar)
}), Y({
	id: "freemarker2.tag-bracket.interpolation-dollar",
	aliases: ["FreeMarker2 (Bracket/Dollar)", "Apache FreeMarker2 (Bracket/Dollar)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagBracketInterpolationDollar)
}), Y({
	id: "freemarker2.tag-angle.interpolation-bracket",
	aliases: ["FreeMarker2 (Angle/Bracket)", "Apache FreeMarker2 (Angle/Bracket)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagAngleInterpolationBracket)
}), Y({
	id: "freemarker2.tag-bracket.interpolation-bracket",
	aliases: ["FreeMarker2 (Bracket/Bracket)", "Apache FreeMarker2 (Bracket/Bracket)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagBracketInterpolationBracket)
}), Y({
	id: "freemarker2.tag-auto.interpolation-dollar",
	aliases: ["FreeMarker2 (Auto/Dollar)", "Apache FreeMarker2 (Auto/Dollar)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagAutoInterpolationDollar)
}), Y({
	id: "freemarker2.tag-auto.interpolation-bracket",
	aliases: ["FreeMarker2 (Auto/Bracket)", "Apache FreeMarker2 (Auto/Bracket)"],
	loader: () => import("./freemarker2-9dlV2vwA.js").then((e) => e.TagAutoInterpolationBracket)
}), Y({
	id: "go",
	extensions: [".go"],
	aliases: ["Go"],
	loader: () => import("./go-Bc78f5_n.js")
}), Y({
	id: "graphql",
	extensions: [".graphql", ".gql"],
	aliases: [
		"GraphQL",
		"graphql",
		"gql"
	],
	mimetypes: ["application/graphql"],
	loader: () => import("./graphql-BfD0A3oq.js")
}), Y({
	id: "handlebars",
	extensions: [".handlebars", ".hbs"],
	aliases: [
		"Handlebars",
		"handlebars",
		"hbs"
	],
	mimetypes: ["text/x-handlebars-template"],
	loader: () => import("./handlebars-BnB8CsON.js")
}), Y({
	id: "hcl",
	extensions: [
		".tf",
		".tfvars",
		".hcl"
	],
	aliases: [
		"Terraform",
		"tf",
		"HCL",
		"hcl"
	],
	loader: () => import("./hcl-Dw13HB8j.js")
}), Y({
	id: "html",
	extensions: [
		".html",
		".htm",
		".shtml",
		".xhtml",
		".mdoc",
		".jsp",
		".asp",
		".aspx",
		".jshtm"
	],
	aliases: [
		"HTML",
		"htm",
		"html",
		"xhtml"
	],
	mimetypes: [
		"text/html",
		"text/x-jshtm",
		"text/template",
		"text/ng-template"
	],
	loader: () => import("./html-Bn0lFmB3.js")
}), Y({
	id: "ini",
	extensions: [
		".ini",
		".properties",
		".gitconfig"
	],
	filenames: [
		"config",
		".gitattributes",
		".gitconfig",
		".editorconfig"
	],
	aliases: ["Ini", "ini"],
	loader: () => import("./ini-CtjpBASy.js")
}), Y({
	id: "java",
	extensions: [".java", ".jav"],
	aliases: ["Java", "java"],
	mimetypes: ["text/x-java-source", "text/x-java"],
	loader: () => import("./java-C7kSf7-7.js")
}), Y({
	id: "javascript",
	extensions: [
		".js",
		".es6",
		".jsx",
		".mjs",
		".cjs"
	],
	firstLine: "^#!.*\\bnode",
	filenames: ["jakefile"],
	aliases: [
		"JavaScript",
		"javascript",
		"js"
	],
	mimetypes: ["text/javascript"],
	loader: () => import("./javascript-T2Xl_env.js")
}), Y({
	id: "julia",
	extensions: [".jl"],
	aliases: ["julia", "Julia"],
	loader: () => import("./julia-DccZaP5q.js")
}), Y({
	id: "kotlin",
	extensions: [".kt", ".kts"],
	aliases: ["Kotlin", "kotlin"],
	mimetypes: ["text/x-kotlin-source", "text/x-kotlin"],
	loader: () => import("./kotlin-B_wJYPI0.js")
}), Y({
	id: "less",
	extensions: [".less"],
	aliases: ["Less", "less"],
	mimetypes: ["text/x-less", "text/less"],
	loader: () => import("./less-BpXfi39Z.js")
}), Y({
	id: "lexon",
	extensions: [".lex"],
	aliases: ["Lexon"],
	loader: () => import("./lexon-DvbBygoR.js")
}), Y({
	id: "lua",
	extensions: [".lua"],
	aliases: ["Lua", "lua"],
	loader: () => import("./lua-BrtCz-Cp.js")
}), Y({
	id: "liquid",
	extensions: [".liquid", ".html.liquid"],
	aliases: ["Liquid", "liquid"],
	mimetypes: ["application/liquid"],
	loader: () => import("./liquid-C-uZ9VT1.js")
}), Y({
	id: "m3",
	extensions: [
		".m3",
		".i3",
		".mg",
		".ig"
	],
	aliases: [
		"Modula-3",
		"Modula3",
		"modula3",
		"m3"
	],
	loader: () => import("./m3-DJcOqTqh.js")
}), Y({
	id: "markdown",
	extensions: [
		".md",
		".markdown",
		".mdown",
		".mkdn",
		".mkd",
		".mdwn",
		".mdtxt",
		".mdtext"
	],
	aliases: ["Markdown", "markdown"],
	loader: () => import("./markdown-C_jeeMr1.js")
}), Y({
	id: "mdx",
	extensions: [".mdx"],
	aliases: ["MDX", "mdx"],
	loader: () => import("./mdx-DAFPrY04.js")
}), Y({
	id: "mips",
	extensions: [".s"],
	aliases: ["MIPS", "MIPS-V"],
	mimetypes: [
		"text/x-mips",
		"text/mips",
		"text/plaintext"
	],
	loader: () => import("./mips-QOLrb2Ow.js")
}), Y({
	id: "msdax",
	extensions: [".dax", ".msdax"],
	aliases: ["DAX", "MSDAX"],
	loader: () => import("./msdax-BcjIpez_.js")
}), Y({
	id: "mysql",
	extensions: [],
	aliases: ["MySQL", "mysql"],
	loader: () => import("./mysql-aNwLeAMe.js")
}), Y({
	id: "objective-c",
	extensions: [".m"],
	aliases: ["Objective-C"],
	loader: () => import("./objective-c-C9lRqecT.js")
}), Y({
	id: "pascal",
	extensions: [
		".pas",
		".p",
		".pp"
	],
	aliases: ["Pascal", "pas"],
	mimetypes: ["text/x-pascal-source", "text/x-pascal"],
	loader: () => import("./pascal-DOD4L1L8.js")
}), Y({
	id: "pascaligo",
	extensions: [".ligo"],
	aliases: ["Pascaligo", "ligo"],
	loader: () => import("./pascaligo-BCbgKWuK.js")
}), Y({
	id: "perl",
	extensions: [".pl", ".pm"],
	aliases: ["Perl", "pl"],
	loader: () => import("./perl-DfiuiXHZ.js")
}), Y({
	id: "pgsql",
	extensions: [],
	aliases: [
		"PostgreSQL",
		"postgres",
		"pg",
		"postgre"
	],
	loader: () => import("./pgsql-Czc3x-hA.js")
}), Y({
	id: "php",
	extensions: [
		".php",
		".php4",
		".php5",
		".phtml",
		".ctp"
	],
	aliases: ["PHP", "php"],
	mimetypes: ["application/x-php"],
	loader: () => import("./php-C-wJdg3d.js")
}), Y({
	id: "pla",
	extensions: [".pla"],
	loader: () => import("./pla-BdZ6b2NB.js")
}), Y({
	id: "postiats",
	extensions: [
		".dats",
		".sats",
		".hats"
	],
	aliases: ["ATS", "ATS/Postiats"],
	loader: () => import("./postiats-DNRXN0R0.js")
}), Y({
	id: "powerquery",
	extensions: [".pq", ".pqm"],
	aliases: [
		"PQ",
		"M",
		"Power Query",
		"Power Query M"
	],
	loader: () => import("./powerquery-C-MIEAOo.js")
}), Y({
	id: "powershell",
	extensions: [
		".ps1",
		".psm1",
		".psd1"
	],
	aliases: [
		"PowerShell",
		"powershell",
		"ps",
		"ps1"
	],
	loader: () => import("./powershell-BBx2O22X.js")
}), Y({
	id: "proto",
	extensions: [".proto"],
	aliases: ["protobuf", "Protocol Buffers"],
	loader: () => import("./protobuf-DB5LvNuC.js")
}), Y({
	id: "pug",
	extensions: [".jade", ".pug"],
	aliases: [
		"Pug",
		"Jade",
		"jade"
	],
	loader: () => import("./pug-DThx5NHO.js")
}), Y({
	id: "python",
	extensions: [
		".py",
		".rpy",
		".pyw",
		".cpy",
		".gyp",
		".gypi"
	],
	aliases: ["Python", "py"],
	firstLine: "^#!/.*\\bpython[0-9.-]*\\b",
	loader: () => import("./python-CO-0TVwR.js")
}), Y({
	id: "qsharp",
	extensions: [".qs"],
	aliases: ["Q#", "qsharp"],
	loader: () => import("./qsharp-C-vyCm0G.js")
}), Y({
	id: "r",
	extensions: [
		".r",
		".rhistory",
		".rmd",
		".rprofile",
		".rt"
	],
	aliases: ["R", "r"],
	loader: () => import("./r-DYoj10G4.js")
}), Y({
	id: "razor",
	extensions: [".cshtml"],
	aliases: ["Razor", "razor"],
	mimetypes: ["text/x-cshtml"],
	loader: () => import("./razor-CTIWyOH5.js")
}), Y({
	id: "redis",
	extensions: [".redis"],
	aliases: ["redis"],
	loader: () => import("./redis-DyplsuyI.js")
}), Y({
	id: "redshift",
	extensions: [],
	aliases: ["Redshift", "redshift"],
	loader: () => import("./redshift-BwsF3uMk.js")
}), Y({
	id: "restructuredtext",
	extensions: [".rst"],
	aliases: ["reStructuredText", "restructuredtext"],
	loader: () => import("./restructuredtext-Borw7tht.js")
}), Y({
	id: "ruby",
	extensions: [
		".rb",
		".rbx",
		".rjs",
		".gemspec",
		".pp"
	],
	filenames: ["rakefile", "Gemfile"],
	aliases: ["Ruby", "rb"],
	loader: () => import("./ruby-C9-eXZdM.js")
}), Y({
	id: "rust",
	extensions: [".rs", ".rlib"],
	aliases: ["Rust", "rust"],
	loader: () => import("./rust-BPJY58JV.js")
}), Y({
	id: "sb",
	extensions: [".sb"],
	aliases: ["Small Basic", "sb"],
	loader: () => import("./sb-CxqJtlG8.js")
}), Y({
	id: "scala",
	extensions: [
		".scala",
		".sc",
		".sbt"
	],
	aliases: [
		"Scala",
		"scala",
		"SBT",
		"Sbt",
		"sbt",
		"Dotty",
		"dotty"
	],
	mimetypes: [
		"text/x-scala-source",
		"text/x-scala",
		"text/x-sbt",
		"text/x-dotty"
	],
	loader: () => import("./scala-JFQfnTTB.js")
}), Y({
	id: "scheme",
	extensions: [
		".scm",
		".ss",
		".sch",
		".rkt"
	],
	aliases: ["scheme", "Scheme"],
	loader: () => import("./scheme-C6xtxtFU.js")
}), Y({
	id: "scss",
	extensions: [".scss"],
	aliases: [
		"Sass",
		"sass",
		"scss"
	],
	mimetypes: ["text/x-scss", "text/scss"],
	loader: () => import("./scss-CAhEnFoL.js")
}), Y({
	id: "shell",
	extensions: [".sh", ".bash"],
	aliases: ["Shell", "sh"],
	loader: () => import("./shell-DZxOw2Ds.js")
}), Y({
	id: "sol",
	extensions: [".sol"],
	aliases: [
		"sol",
		"solidity",
		"Solidity"
	],
	loader: () => import("./solidity-BBGBjFgP.js")
}), Y({
	id: "aes",
	extensions: [".aes"],
	aliases: [
		"aes",
		"sophia",
		"Sophia"
	],
	loader: () => import("./sophia-SuPzYDhI.js")
}), Y({
	id: "sparql",
	extensions: [".rq"],
	aliases: ["sparql", "SPARQL"],
	loader: () => import("./sparql-DjZFU9qF.js")
}), Y({
	id: "sql",
	extensions: [".sql"],
	aliases: ["SQL"],
	loader: () => import("./sql-DBOb1sS3.js")
}), Y({
	id: "st",
	extensions: [
		".st",
		".iecst",
		".iecplc",
		".lc3lib",
		".TcPOU",
		".TcDUT",
		".TcGVL",
		".TcIO"
	],
	aliases: [
		"StructuredText",
		"scl",
		"stl"
	],
	loader: () => import("./st-CltEaDsD.js")
}), Y({
	id: "swift",
	aliases: ["Swift", "swift"],
	extensions: [".swift"],
	mimetypes: ["text/swift"],
	loader: () => import("./swift-BFb6ZToe.js")
}), Y({
	id: "systemverilog",
	extensions: [".sv", ".svh"],
	aliases: [
		"SV",
		"sv",
		"SystemVerilog",
		"systemverilog"
	],
	loader: () => import("./systemverilog-BBjnp-HK.js")
}), Y({
	id: "verilog",
	extensions: [".v", ".vh"],
	aliases: [
		"V",
		"v",
		"Verilog",
		"verilog"
	],
	loader: () => import("./systemverilog-BBjnp-HK.js")
}), Y({
	id: "tcl",
	extensions: [".tcl"],
	aliases: [
		"tcl",
		"Tcl",
		"tcltk",
		"TclTk",
		"tcl/tk",
		"Tcl/Tk"
	],
	loader: () => import("./tcl-8rUFF5t0.js")
}), Y({
	id: "twig",
	extensions: [".twig"],
	aliases: ["Twig", "twig"],
	mimetypes: ["text/x-twig"],
	loader: () => import("./twig-Bt85m8C0.js")
}), Y({
	id: "typescript",
	extensions: [
		".ts",
		".tsx",
		".cts",
		".mts"
	],
	aliases: [
		"TypeScript",
		"ts",
		"typescript"
	],
	mimetypes: ["text/typescript"],
	loader: () => import("./typescript-BxNpUh-K.js")
}), Y({
	id: "typespec",
	extensions: [".tsp"],
	aliases: ["TypeSpec"],
	loader: () => import("./typespec-Bab5zZET.js")
}), Y({
	id: "vb",
	extensions: [".vb"],
	aliases: ["Visual Basic", "vb"],
	loader: () => import("./vb-B27yOxV2.js")
}), Y({
	id: "wgsl",
	extensions: [".wgsl"],
	aliases: [
		"WebGPU Shading Language",
		"WGSL",
		"wgsl"
	],
	loader: () => import("./wgsl-DEfGNKYg.js")
}), Y({
	id: "xml",
	extensions: [
		".xml",
		".xsd",
		".dtd",
		".ascx",
		".csproj",
		".config",
		".props",
		".targets",
		".wxi",
		".wxl",
		".wxs",
		".xaml",
		".svg",
		".svgz",
		".opf",
		".xslt",
		".xsl"
	],
	firstLine: "(\\<\\?xml.*)|(\\<svg)|(\\<\\!doctype\\s+svg)",
	aliases: ["XML", "xml"],
	mimetypes: [
		"text/xml",
		"application/xml",
		"application/xaml+xml",
		"application/xml-dtd"
	],
	loader: () => import("./xml-DuV39CiI.js")
}), Y({
	id: "yaml",
	extensions: [".yaml", ".yml"],
	aliases: [
		"YAML",
		"yaml",
		"YML",
		"yml"
	],
	mimetypes: ["application/x-yaml", "text/x-yaml"],
	loader: () => import("./yaml-DZOmgw7L.js")
});
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/external/monaco-lsp-client/out/index.js
var ib = Object.defineProperty, ab = (e, t, n) => t in e ? ib(e, t, {
	enumerable: !0,
	configurable: !0,
	writable: !0,
	value: n
}) : e[t] = n, X = (e, t, n) => ab(e, typeof t == "symbol" ? t : t + "", n), ob, sb, cb, lb, ub;
function db(e) {
	return e.method !== void 0;
}
var fb;
(function(e) {
	function t(e) {
		return e;
	}
	e.create = t;
})(fb ||= {});
var pb;
(function(e) {
	e.parseError = -32700, e.invalidRequest = -32600, e.methodNotFound = -32601, e.invalidParams = -32602, e.internalError = -32603;
	function t(e) {
		return -32099 <= e && e <= -32e3;
	}
	e.isServerError = t;
	function n(e) {
		if (!t(e)) throw Error("Invalid range for a server error.");
		return e;
	}
	e.serverError = n, e.unexpectedServerError = -32e3;
	function r(e) {
		return !0;
	}
	e.isApplicationError = r;
	function i(e) {
		return e;
	}
	e.applicationError = i, e.genericApplicationError = -320100;
})(pb ||= {});
var mb = class {
	constructor() {
		X(this, "listeners", /* @__PURE__ */ new Set()), X(this, "event", (e) => (this.listeners.add(e), { dispose: () => {
			this.listeners.delete(e);
		} }));
	}
	fire(e) {
		this.listeners.forEach((t) => t(e));
	}
}, hb = class {
	constructor(e) {
		X(this, "_value"), X(this, "eventEmitter"), this._value = e, this.eventEmitter = new mb();
	}
	get value() {
		return this._value;
	}
	set value(e) {
		this._value !== e && (this._value = e, this.eventEmitter.fire(e));
	}
	get onChange() {
		return this.eventEmitter.event;
	}
};
function gb(e, t) {
	let n = setTimeout(t, e);
	return { dispose: () => clearTimeout(n) };
}
function _b(e, t, n) {
	return e instanceof Set ? (e.add(t), { dispose: () => e.delete(t) }) : (e.set(t, n), { dispose: () => e.delete(t) });
}
var vb = class {
	constructor() {
		X(this, "_state", "none"), X(this, "promise"), X(this, "resolve", () => {}), X(this, "reject", () => {}), this.promise = new Promise((e, t) => {
			this.resolve = e, this.reject = t;
		});
	}
	get state() {
		return this._state;
	}
};
ob = class {
	constructor() {
		X(this, "_unprocessedMessages", []), X(this, "_messageListener"), X(this, "id", ob.id++), X(this, "_state", new hb({ state: "open" })), X(this, "state", this._state);
	}
	setListener(e) {
		if (this._messageListener = e, e) for (; this._unprocessedMessages.length > 0 && this._messageListener !== void 0;) {
			let e = this._unprocessedMessages.shift();
			this._messageListener(e);
		}
	}
	send(e) {
		return this._sendImpl(e);
	}
	_dispatchReceivedMessage(e) {
		this._unprocessedMessages.length === 0 && this._messageListener ? this._messageListener(e) : this._unprocessedMessages.push(e);
	}
	_onConnectionClosed() {
		this._state.value = {
			state: "closed",
			error: void 0
		};
	}
	log(e) {
		return new yb(this, e ?? new bb());
	}
}, X(ob, "id", 0);
var yb = class {
	constructor(e, t) {
		X(this, "baseStream"), X(this, "logger"), this.baseStream = e, this.logger = t;
	}
	get state() {
		return this.baseStream.state;
	}
	setListener(e) {
		if (e === void 0) {
			this.baseStream.setListener(void 0);
			return;
		}
		this.baseStream.setListener((t) => {
			this.logger.log(this.baseStream, "incoming", t), e(t);
		});
	}
	send(e) {
		return this.logger.log(this.baseStream, "outgoing", e), this.baseStream.send(e);
	}
	toString() {
		return `StreamLogger/${this.baseStream.toString()}`;
	}
}, bb = class {
	log(e, t, n) {
		console.log(`${t === "incoming" ? "<-" : "->"} [${e.toString()}] ${JSON.stringify(n)}`);
	}
}, xb = class e {
	constructor(e) {
		X(this, "connect"), this.connect = e;
	}
	mapContext(t) {
		return new e((e) => this.connect(e ? Sb(e, t) : void 0));
	}
};
function Sb(e, t) {
	return {
		handleNotification: (n, r) => e.handleNotification(n, t(r)),
		handleRequest: (n, r, i) => e.handleRequest(n, r, t(i))
	};
}
var Cb = class e {
	constructor(e, t, n) {
		X(this, "_stream"), X(this, "_listener"), X(this, "_logger"), X(this, "_unprocessedResponses", /* @__PURE__ */ new Map()), X(this, "_lastUsedRequestId", 0), this._stream = e, this._listener = t, this._logger = n, this._stream.setListener((e) => {
			db(e) ? e.id === void 0 ? this._processNotification(e) : this._processRequest(e) : this._processResponse(e);
		});
	}
	static createChannel(t, n) {
		let r = !1;
		return new xb((i) => {
			if (r) throw Error(`A channel to the stream ${t} was already constructed!`);
			return r = !0, new e(t, i, n);
		});
	}
	get state() {
		return this._stream.state;
	}
	async _processNotification(e) {
		if (e.id !== void 0) throw Error();
		if (!this._listener) {
			this._logger && this._logger.debug({
				text: "Notification ignored",
				message: e
			});
			return;
		}
		try {
			await this._listener.handleNotification({
				method: e.method,
				params: e.params || null
			});
		} catch (t) {
			this._logger && this._logger.warn({
				text: `Exception was thrown while handling notification: ${t}`,
				exception: t,
				message: e
			});
		}
	}
	async _processRequest(e) {
		if (e.id === void 0) throw Error();
		let t;
		if (this._listener) try {
			t = await this._listener.handleRequest({
				method: e.method,
				params: e.params || null
			}, e.id);
		} catch (n) {
			this._logger && this._logger.warn({
				text: `Exception was thrown while handling request: ${n}`,
				message: e,
				exception: n
			}), t = { error: {
				code: pb.internalError,
				message: "An unexpected exception was thrown.",
				data: void 0
			} };
		}
		else this._logger && this._logger.debug({
			text: "Received request even though not listening for requests",
			message: e
		}), t = { error: {
			code: pb.methodNotFound,
			message: "This endpoint does not listen for requests or notifications.",
			data: void 0
		} };
		let n;
		n = "result" in t ? {
			jsonrpc: "2.0",
			id: e.id,
			result: t.result
		} : {
			jsonrpc: "2.0",
			id: e.id,
			error: t.error
		}, await this._stream.send(n);
	}
	_processResponse(e) {
		let t = "" + e.id, n = this._unprocessedResponses.get(t);
		if (!n) {
			this._logger && this._logger.debug({
				text: "Got an unexpected response message",
				message: e
			});
			return;
		}
		this._unprocessedResponses.delete(t), n(e);
	}
	_newRequestId() {
		return this._lastUsedRequestId++;
	}
	sendRequest(e, t, n) {
		let r = {
			jsonrpc: "2.0",
			id: this._newRequestId(),
			method: e.method,
			params: e.params || void 0
		};
		return n && n(r.id), new Promise((e, t) => {
			let n = "" + r.id;
			this._unprocessedResponses.set(n, (n) => {
				"result" in n ? e({ result: n.result }) : (n.error || t(/* @__PURE__ */ Error("Response had neither 'result' nor 'error' field set.")), e({ error: n.error }));
			}), this._stream.send(r).then(void 0, (e) => {
				this._unprocessedResponses.delete(n), t(e);
			});
		});
	}
	sendNotification(e, t) {
		let n = {
			jsonrpc: "2.0",
			id: void 0,
			method: e.method,
			params: e.params || void 0
		};
		return this._stream.send(n);
	}
	toString() {
		return "StreamChannel/" + this._stream.toString();
	}
}, wb;
(function(e) {
	function t() {
		return {
			deserializeFromJson: (e) => ({
				hasErrors: !1,
				value: e
			}),
			serializeToJson: (e) => e
		};
	}
	e.sAny = t;
	function n() {
		return {
			deserializeFromJson: (e) => ({
				hasErrors: !1,
				value: {}
			}),
			serializeToJson: (e) => ({})
		};
	}
	e.sEmptyObject = n;
	function r() {
		return {
			deserializeFromJson: (e) => ({
				hasErrors: !1,
				value: void 0
			}),
			serializeToJson: (e) => null
		};
	}
	e.sVoidFromNull = r;
})(wb ||= {});
var Tb = Symbol("OptionalMethodNotFound"), Eb = class {
	contextualize(e) {
		return new Db(this, e);
	}
}, Db = class extends Eb {
	constructor(e, t) {
		super(), X(this, "underylingTypedChannel"), X(this, "converters"), this.underylingTypedChannel = e, this.converters = t;
	}
	async request(e, t, n) {
		let r = await this.converters.getSendContext(n);
		return this.underylingTypedChannel.request(e, t, r);
	}
	async notify(e, t, n) {
		let r = await this.converters.getSendContext(n);
		return this.underylingTypedChannel.notify(e, t, r);
	}
	registerNotificationHandler(e, t) {
		return this.underylingTypedChannel.registerNotificationHandler(e, async (e, n) => await t(e, await this.converters.getNewContext(n)));
	}
	registerRequestHandler(e, t) {
		return this.underylingTypedChannel.registerRequestHandler(e, async (e, n, r) => await t(e, n, await this.converters.getNewContext(r)));
	}
}, Ob = class e extends Eb {
	constructor(e, t = {}) {
		super(), X(this, "channelCtor"), X(this, "_requestSender"), X(this, "_handler", /* @__PURE__ */ new Map()), X(this, "_unknownNotificationHandler", /* @__PURE__ */ new Set()), X(this, "_timeout"), X(this, "sendExceptionDetails", !1), X(this, "_logger"), X(this, "listeningDeferred", new vb()), X(this, "onListening", this.listeningDeferred.promise), X(this, "_requestDidErrorEventEmitter", new mb()), X(this, "onRequestDidError", this._requestDidErrorEventEmitter.event), this.channelCtor = e, this._logger = t.logger, this.sendExceptionDetails = !!t.sendExceptionDetails, this._timeout = gb(1e3, () => {
			this._requestSender || console.warn(`"${this.startListen.name}" has not been called within 1 second after construction of this channel. Did you forget to call it?`, this);
		});
	}
	static fromTransport(t, n = {}) {
		return new e(Cb.createChannel(t, n.logger), n);
	}
	startListen() {
		if (this._requestSender) throw Error(`"${this.startListen.name}" can be called only once, but it already has been called.`);
		this._timeout &&= (this._timeout.dispose(), void 0), this._requestSender = this.channelCtor.connect({
			handleRequest: (e, t, n) => this.handleRequest(e, t, n),
			handleNotification: (e, t) => this.handleNotification(e, t)
		}), this.listeningDeferred.resolve();
	}
	checkChannel(e) {
		if (!e) throw Error(`"${this.startListen.name}" must be called before any messages can be sent or received.`);
		return !0;
	}
	async handleRequest(e, t, n) {
		let r = this._handler.get(e.method);
		if (!r) return this._logger && this._logger.debug({
			text: `No request handler for "${e.method}".`,
			data: { requestObject: e }
		}), { error: {
			code: pb.methodNotFound,
			message: `No request handler for "${e.method}".`,
			data: { method: e.method }
		} };
		if (r.kind != "request") {
			let t = `"${e.method}" is registered as notification, but was sent as request.`;
			return this._logger && this._logger.debug({
				text: t,
				data: { requestObject: e }
			}), { error: {
				code: pb.invalidRequest,
				message: t,
				data: { method: e.method }
			} };
		}
		let i = r.requestType.paramsSerializer.deserializeFromJson(e.params);
		if (i.hasErrors) {
			let t = `Got invalid params: ${i.errorMessage}`;
			return this._logger && this._logger.debug({
				text: t,
				data: {
					requestObject: e,
					errorMessage: i.errorMessage
				}
			}), { error: {
				code: pb.invalidParams,
				message: t,
				data: { errors: i.errorMessage }
			} };
		} else {
			let a = i.value, o;
			try {
				let e = await r.handler(a, t, n);
				if ("error" in e || "errorMessage" in e) {
					let t = e.error ? r.requestType.errorSerializer.serializeToJson(e.error) : void 0;
					o = { error: {
						code: e.errorCode || pb.genericApplicationError,
						message: e.errorMessage || "An error was returned",
						data: t
					} };
				} else o = { result: r.requestType.resultSerializer.serializeToJson(e.ok) };
			} catch (t) {
				t instanceof Ab ? o = { error: {
					code: t.code,
					message: t.message
				} } : (this._logger && this._logger.warn({
					text: `An exception was thrown while handling a request: ${t}.`,
					exception: t,
					data: { requestObject: e }
				}), o = { error: {
					code: pb.unexpectedServerError,
					message: this.sendExceptionDetails ? `An exception was thrown while handling a request: ${t}.` : "Server has thrown an unexpected exception"
				} });
			}
			return o;
		}
	}
	async handleNotification(e, t) {
		let n = this._handler.get(e.method);
		if (!n) {
			for (let t of this._unknownNotificationHandler) t(e);
			this._unknownNotificationHandler.size === 0 && this._logger && this._logger.debug({
				text: `Unhandled notification "${e.method}"`,
				data: { requestObject: e }
			});
			return;
		}
		if (n.kind != "notification") {
			this._logger && this._logger.debug({
				text: `"${e.method}" is registered as request, but was sent as notification.`,
				data: { requestObject: e }
			});
			return;
		}
		let r = n.notificationType.paramsSerializer.deserializeFromJson(e.params);
		if (r.hasErrors) {
			this._logger && this._logger.debug({
				text: `Got invalid params: ${r}`,
				data: {
					requestObject: e,
					errorMessage: r.errorMessage
				}
			});
			return;
		}
		let i = r.value;
		for (let r of n.handlers) try {
			r(i, t);
		} catch (t) {
			this._logger && this._logger.warn({
				text: `An exception was thrown while handling a notification: ${t}.`,
				exception: t,
				data: { requestObject: e }
			});
		}
	}
	registerUnknownNotificationHandler(e) {
		return _b(this._unknownNotificationHandler, e);
	}
	registerRequestHandler(e, t) {
		if (this._handler.get(e.method)) throw Error(`Handler with method "${e.method}" already registered.`);
		return _b(this._handler, e.method, {
			kind: "request",
			requestType: e,
			handler: t
		});
	}
	registerNotificationHandler(e, t) {
		let n = this._handler.get(e.method);
		if (!n) n = {
			kind: "notification",
			notificationType: e,
			handlers: /* @__PURE__ */ new Set()
		}, this._handler.set(e.method, n);
		else {
			if (n.kind !== "notification") throw Error(`Method "${e.method}" was already registered as request handler.`);
			if (n.notificationType !== e) throw Error(`Method "${e.method}" was registered for a different type.`);
		}
		return _b(n.handlers, t);
	}
	getRegisteredTypes() {
		let e = [];
		for (let t of this._handler.values()) t.kind === "notification" ? e.push(t.notificationType) : t.kind === "request" && e.push(t.requestType);
		return e;
	}
	async request(e, t, n) {
		if (!this.checkChannel(this._requestSender)) throw Error("Impossible");
		let r = e.paramsSerializer.serializeToJson(t);
		kb(r);
		let i = await this._requestSender.sendRequest({
			method: e.method,
			params: r
		}, n);
		if ("error" in i) {
			if (e.isOptional && i.error.code === pb.methodNotFound) return Tb;
			let t;
			if (i.error.data !== void 0) {
				let n = e.errorSerializer.deserializeFromJson(i.error.data);
				if (n.hasErrors) throw Error(n.errorMessage);
				t = n.value;
			} else t = void 0;
			let n = new Ab(i.error.message, t, i.error.code);
			throw this._requestDidErrorEventEmitter.fire({ error: n }), n;
		} else {
			let t = e.resultSerializer.deserializeFromJson(i.result);
			if (t.hasErrors) throw Error("Could not deserialize response: " + t.errorMessage + `

${JSON.stringify(i, null, 2)}`);
			return t.value;
		}
	}
	async notify(e, t, n) {
		if (!this.checkChannel(this._requestSender)) throw Error();
		let r = e.paramsSerializer.serializeToJson(t);
		kb(r), this._requestSender.sendNotification({
			method: e.method,
			params: r
		}, n);
	}
};
function kb(e) {
	if (e !== null && Array.isArray(e) && typeof e != "object") throw Error("Invalid value! Only null, array and object is allowed.");
}
var Ab = class e extends Error {
	constructor(t, n, r = pb.genericApplicationError) {
		super(t), X(this, "data"), X(this, "code"), this.data = n, this.code = r, Object.setPrototypeOf(this, e.prototype);
	}
}, jb = class e {
	constructor(e, t, n, r, i = !1) {
		X(this, "method"), X(this, "paramsSerializer"), X(this, "resultSerializer"), X(this, "errorSerializer"), X(this, "isOptional"), X(this, "kind", "request"), this.method = e, this.paramsSerializer = t, this.resultSerializer = n, this.errorSerializer = r, this.isOptional = i;
	}
	withMethod(t) {
		return new e(t, this.paramsSerializer, this.resultSerializer, this.errorSerializer);
	}
	optional() {
		return new e(this.method, this.paramsSerializer, this.resultSerializer, this.errorSerializer, !0);
	}
}, Mb = class e {
	constructor(e, t) {
		X(this, "method"), X(this, "paramsSerializer"), X(this, "kind", "notification"), this.method = e, this.paramsSerializer = t;
	}
	withMethod(t) {
		return new e(t, this.paramsSerializer);
	}
};
function Z(e) {
	return new jb((e || {}).method, wb.sAny(), wb.sAny(), wb.sAny());
}
function Q(e) {
	return new Mb((e || {}).method, wb.sAny());
}
var Nb = (sb = Symbol(), cb = class {
	constructor(e) {
		X(this, "error"), X(this, sb), this.error = e;
	}
}, X(cb, "factory", (e) => new cb(e)), cb);
function Pb(e) {
	let t = Fb(e.server), n = Fb(e.client);
	return new Ib(e.tags || [], t, n);
}
function Fb(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = r.method ? r.method : n;
		t[n] = r.withMethod(e);
	}
	return t;
}
var Ib = class e {
	constructor(e = [], t, n) {
		X(this, "tags"), X(this, "server"), X(this, "client"), this.tags = e, this.server = t, this.client = n;
	}
	_onlyDesignTime() {
		return /* @__PURE__ */ Error("This property is not meant to be accessed at runtime");
	}
	get TContractObject() {
		throw this._onlyDesignTime();
	}
	get TClientInterface() {
		throw this._onlyDesignTime();
	}
	get TServerInterface() {
		throw this._onlyDesignTime();
	}
	get TClientHandler() {
		throw this._onlyDesignTime();
	}
	get TServerHandler() {
		throw this._onlyDesignTime();
	}
	get TTags() {
		throw this._onlyDesignTime();
	}
	getInterface(e, t, n, r) {
		let i = this.buildCounterpart(e, n), a = this.registerHandlers(e, t, r, i);
		return {
			counterpart: i,
			dispose: () => a.dispose()
		};
	}
	buildCounterpart(e, t) {
		let n = {};
		for (let [r, i] of Object.entries(t)) {
			let t;
			t = i.kind === "request" ? i.isOptional ? async (t, n) => {
				t === void 0 && (t = {});
				try {
					return await e.request(i, t, n);
				} catch (e) {
					if (e && e.code === pb.methodNotFound) return Tb;
					throw e;
				}
			} : (t, n) => (t === void 0 && (t = {}), e.request(i, t, n)) : (t, n) => (t === void 0 && (t = {}), e.notify(i, t, n)), n[r] = t;
		}
		return n;
	}
	registerHandlers(e, t, n, r) {
		let i = [];
		for (let [a, o] of Object.entries(t)) if (o.kind === "request") {
			let t = n[a];
			if (!t) continue;
			let s = this.createRequestHandler(r, t);
			i.push(e.registerRequestHandler(o, s));
		} else {
			let t = n[a];
			t && i.push(e.registerNotificationHandler(o, (e, n) => {
				t(e, {
					context: n,
					counterpart: r
				});
			}));
		}
		return { dispose: () => i.forEach((e) => e.dispose()) };
	}
	createRequestHandler(e, t) {
		return async (n, r, i) => {
			let a = await t(n, {
				context: i,
				counterpart: e,
				newErr: Nb.factory,
				requestId: r
			});
			return a instanceof Nb ? a.error : { ok: a };
		};
	}
	static getServerFromStream(e, t, n, r) {
		let i = Ob.fromTransport(t, n), { server: a } = e.getServer(i, r);
		return i.startListen(), {
			channel: i,
			server: a
		};
	}
	static registerServerToStream(e, t, n, r) {
		let i = Ob.fromTransport(t, n), { client: a } = e.registerServer(i, r);
		return i.startListen(), {
			channel: i,
			client: a
		};
	}
	getServer(e, t) {
		let { counterpart: n, dispose: r } = this.getInterface(e, this.client, this.server, t);
		return {
			server: n,
			dispose: r
		};
	}
	registerServer(e, t) {
		let { counterpart: n, dispose: r } = this.getInterface(e, this.server, this.client, t);
		return {
			client: n,
			dispose: r
		};
	}
	withContext() {
		return new e(this.tags, this.server, this.client);
	}
}, Lb = /* @__PURE__ */ (function(e) {
	return e.Comment = "comment", e.Imports = "imports", e.Region = "region", e;
})({}), Rb = /* @__PURE__ */ (function(e) {
	return e[e.File = 1] = "File", e[e.Module = 2] = "Module", e[e.Namespace = 3] = "Namespace", e[e.Package = 4] = "Package", e[e.Class = 5] = "Class", e[e.Method = 6] = "Method", e[e.Property = 7] = "Property", e[e.Field = 8] = "Field", e[e.Constructor = 9] = "Constructor", e[e.Enum = 10] = "Enum", e[e.Interface = 11] = "Interface", e[e.Function = 12] = "Function", e[e.Variable = 13] = "Variable", e[e.Constant = 14] = "Constant", e[e.String = 15] = "String", e[e.Number = 16] = "Number", e[e.Boolean = 17] = "Boolean", e[e.Array = 18] = "Array", e[e.Object = 19] = "Object", e[e.Key = 20] = "Key", e[e.Null = 21] = "Null", e[e.EnumMember = 22] = "EnumMember", e[e.Struct = 23] = "Struct", e[e.Event = 24] = "Event", e[e.Operator = 25] = "Operator", e[e.TypeParameter = 26] = "TypeParameter", e;
})({}), zb = /* @__PURE__ */ (function(e) {
	return e[e.Deprecated = 1] = "Deprecated", e;
})({}), Bb = /* @__PURE__ */ (function(e) {
	return e[e.Type = 1] = "Type", e[e.Parameter = 2] = "Parameter", e;
})({}), Vb = /* @__PURE__ */ (function(e) {
	return e[e.Text = 1] = "Text", e[e.Method = 2] = "Method", e[e.Function = 3] = "Function", e[e.Constructor = 4] = "Constructor", e[e.Field = 5] = "Field", e[e.Variable = 6] = "Variable", e[e.Class = 7] = "Class", e[e.Interface = 8] = "Interface", e[e.Module = 9] = "Module", e[e.Property = 10] = "Property", e[e.Unit = 11] = "Unit", e[e.Value = 12] = "Value", e[e.Enum = 13] = "Enum", e[e.Keyword = 14] = "Keyword", e[e.Snippet = 15] = "Snippet", e[e.Color = 16] = "Color", e[e.File = 17] = "File", e[e.Reference = 18] = "Reference", e[e.Folder = 19] = "Folder", e[e.EnumMember = 20] = "EnumMember", e[e.Constant = 21] = "Constant", e[e.Struct = 22] = "Struct", e[e.Event = 23] = "Event", e[e.Operator = 24] = "Operator", e[e.TypeParameter = 25] = "TypeParameter", e;
})({}), Hb = /* @__PURE__ */ (function(e) {
	return e[e.Deprecated = 1] = "Deprecated", e;
})({}), Ub = /* @__PURE__ */ (function(e) {
	return e[e.PlainText = 1] = "PlainText", e[e.Snippet = 2] = "Snippet", e;
})({}), Wb = /* @__PURE__ */ (function(e) {
	return e[e.Text = 1] = "Text", e[e.Read = 2] = "Read", e[e.Write = 3] = "Write", e;
})({}), Gb = /* @__PURE__ */ (function(e) {
	return e.Empty = "", e.QuickFix = "quickfix", e.Refactor = "refactor", e.RefactorExtract = "refactor.extract", e.RefactorInline = "refactor.inline", e.RefactorRewrite = "refactor.rewrite", e.Source = "source", e.SourceOrganizeImports = "source.organizeImports", e.SourceFixAll = "source.fixAll", e;
})({}), Kb = /* @__PURE__ */ (function(e) {
	return e[e.Error = 1] = "Error", e[e.Warning = 2] = "Warning", e[e.Information = 3] = "Information", e[e.Hint = 4] = "Hint", e;
})({}), qb = /* @__PURE__ */ (function(e) {
	return e[e.Unnecessary = 1] = "Unnecessary", e[e.Deprecated = 2] = "Deprecated", e;
})({}), Jb = /* @__PURE__ */ (function(e) {
	return e[e.Invoked = 1] = "Invoked", e[e.TriggerCharacter = 2] = "TriggerCharacter", e[e.TriggerForIncompleteCompletions = 3] = "TriggerForIncompleteCompletions", e;
})({}), Yb = /* @__PURE__ */ (function(e) {
	return e[e.Invoked = 1] = "Invoked", e[e.TriggerCharacter = 2] = "TriggerCharacter", e[e.ContentChange = 3] = "ContentChange", e;
})({}), Xb = /* @__PURE__ */ (function(e) {
	return e[e.Invoked = 1] = "Invoked", e[e.Automatic = 2] = "Automatic", e;
})({}), $ = class {
	constructor(e) {
		this.method = e;
	}
}, Zb = {
	textDocumentImplementation: new $("textDocument/implementation"),
	textDocumentTypeDefinition: new $("textDocument/typeDefinition"),
	textDocumentDocumentColor: new $("textDocument/documentColor"),
	textDocumentColorPresentation: new $("textDocument/colorPresentation"),
	textDocumentFoldingRange: new $("textDocument/foldingRange"),
	textDocumentDeclaration: new $("textDocument/declaration"),
	textDocumentSelectionRange: new $("textDocument/selectionRange"),
	textDocumentPrepareCallHierarchy: new $("textDocument/prepareCallHierarchy"),
	textDocumentSemanticTokensFull: new $("textDocument/semanticTokens/full"),
	textDocumentSemanticTokensFullDelta: new $("textDocument/semanticTokens/full/delta"),
	textDocumentLinkedEditingRange: new $("textDocument/linkedEditingRange"),
	workspaceWillCreateFiles: new $("workspace/willCreateFiles"),
	workspaceWillRenameFiles: new $("workspace/willRenameFiles"),
	workspaceWillDeleteFiles: new $("workspace/willDeleteFiles"),
	textDocumentMoniker: new $("textDocument/moniker"),
	textDocumentPrepareTypeHierarchy: new $("textDocument/prepareTypeHierarchy"),
	textDocumentInlineValue: new $("textDocument/inlineValue"),
	textDocumentInlayHint: new $("textDocument/inlayHint"),
	textDocumentDiagnostic: new $("textDocument/diagnostic"),
	textDocumentInlineCompletion: new $("textDocument/inlineCompletion"),
	textDocumentWillSaveWaitUntil: new $("textDocument/willSaveWaitUntil"),
	textDocumentCompletion: new $("textDocument/completion"),
	textDocumentHover: new $("textDocument/hover"),
	textDocumentSignatureHelp: new $("textDocument/signatureHelp"),
	textDocumentDefinition: new $("textDocument/definition"),
	textDocumentReferences: new $("textDocument/references"),
	textDocumentDocumentHighlight: new $("textDocument/documentHighlight"),
	textDocumentDocumentSymbol: new $("textDocument/documentSymbol"),
	textDocumentCodeAction: new $("textDocument/codeAction"),
	workspaceSymbol: new $("workspace/symbol"),
	textDocumentCodeLens: new $("textDocument/codeLens"),
	textDocumentDocumentLink: new $("textDocument/documentLink"),
	textDocumentFormatting: new $("textDocument/formatting"),
	textDocumentRangeFormatting: new $("textDocument/rangeFormatting"),
	textDocumentRangesFormatting: new $("textDocument/rangesFormatting"),
	textDocumentOnTypeFormatting: new $("textDocument/onTypeFormatting"),
	textDocumentRename: new $("textDocument/rename"),
	workspaceExecuteCommand: new $("workspace/executeCommand"),
	workspaceDidCreateFiles: new $("workspace/didCreateFiles"),
	workspaceDidRenameFiles: new $("workspace/didRenameFiles"),
	workspaceDidDeleteFiles: new $("workspace/didDeleteFiles"),
	workspaceDidChangeConfiguration: new $("workspace/didChangeConfiguration"),
	textDocumentDidOpen: new $("textDocument/didOpen"),
	textDocumentDidChange: new $("textDocument/didChange"),
	textDocumentDidClose: new $("textDocument/didClose"),
	textDocumentDidSave: new $("textDocument/didSave"),
	textDocumentWillSave: new $("textDocument/willSave"),
	workspaceDidChangeWatchedFiles: new $("workspace/didChangeWatchedFiles")
};
Pb({
	server: {
		textDocumentImplementation: Z({ method: "textDocument/implementation" }),
		textDocumentTypeDefinition: Z({ method: "textDocument/typeDefinition" }),
		textDocumentDocumentColor: Z({ method: "textDocument/documentColor" }),
		textDocumentColorPresentation: Z({ method: "textDocument/colorPresentation" }),
		textDocumentFoldingRange: Z({ method: "textDocument/foldingRange" }),
		textDocumentDeclaration: Z({ method: "textDocument/declaration" }),
		textDocumentSelectionRange: Z({ method: "textDocument/selectionRange" }),
		textDocumentPrepareCallHierarchy: Z({ method: "textDocument/prepareCallHierarchy" }),
		callHierarchyIncomingCalls: Z({ method: "callHierarchy/incomingCalls" }),
		callHierarchyOutgoingCalls: Z({ method: "callHierarchy/outgoingCalls" }),
		textDocumentSemanticTokensFull: Z({ method: "textDocument/semanticTokens/full" }),
		textDocumentSemanticTokensFullDelta: Z({ method: "textDocument/semanticTokens/full/delta" }),
		textDocumentSemanticTokensRange: Z({ method: "textDocument/semanticTokens/range" }),
		textDocumentLinkedEditingRange: Z({ method: "textDocument/linkedEditingRange" }),
		workspaceWillCreateFiles: Z({ method: "workspace/willCreateFiles" }),
		workspaceWillRenameFiles: Z({ method: "workspace/willRenameFiles" }),
		workspaceWillDeleteFiles: Z({ method: "workspace/willDeleteFiles" }),
		textDocumentMoniker: Z({ method: "textDocument/moniker" }),
		textDocumentPrepareTypeHierarchy: Z({ method: "textDocument/prepareTypeHierarchy" }),
		typeHierarchySupertypes: Z({ method: "typeHierarchy/supertypes" }),
		typeHierarchySubtypes: Z({ method: "typeHierarchy/subtypes" }),
		textDocumentInlineValue: Z({ method: "textDocument/inlineValue" }),
		textDocumentInlayHint: Z({ method: "textDocument/inlayHint" }),
		inlayHintResolve: Z({ method: "inlayHint/resolve" }),
		textDocumentDiagnostic: Z({ method: "textDocument/diagnostic" }),
		workspaceDiagnostic: Z({ method: "workspace/diagnostic" }),
		textDocumentInlineCompletion: Z({ method: "textDocument/inlineCompletion" }),
		initialize: Z({ method: "initialize" }),
		shutdown: Z({ method: "shutdown" }),
		textDocumentWillSaveWaitUntil: Z({ method: "textDocument/willSaveWaitUntil" }),
		textDocumentCompletion: Z({ method: "textDocument/completion" }),
		completionItemResolve: Z({ method: "completionItem/resolve" }),
		textDocumentHover: Z({ method: "textDocument/hover" }),
		textDocumentSignatureHelp: Z({ method: "textDocument/signatureHelp" }),
		textDocumentDefinition: Z({ method: "textDocument/definition" }),
		textDocumentReferences: Z({ method: "textDocument/references" }),
		textDocumentDocumentHighlight: Z({ method: "textDocument/documentHighlight" }),
		textDocumentDocumentSymbol: Z({ method: "textDocument/documentSymbol" }),
		textDocumentCodeAction: Z({ method: "textDocument/codeAction" }),
		codeActionResolve: Z({ method: "codeAction/resolve" }),
		workspaceSymbol: Z({ method: "workspace/symbol" }),
		workspaceSymbolResolve: Z({ method: "workspaceSymbol/resolve" }),
		textDocumentCodeLens: Z({ method: "textDocument/codeLens" }),
		codeLensResolve: Z({ method: "codeLens/resolve" }),
		textDocumentDocumentLink: Z({ method: "textDocument/documentLink" }),
		documentLinkResolve: Z({ method: "documentLink/resolve" }),
		textDocumentFormatting: Z({ method: "textDocument/formatting" }),
		textDocumentRangeFormatting: Z({ method: "textDocument/rangeFormatting" }),
		textDocumentRangesFormatting: Z({ method: "textDocument/rangesFormatting" }),
		textDocumentOnTypeFormatting: Z({ method: "textDocument/onTypeFormatting" }),
		textDocumentRename: Z({ method: "textDocument/rename" }),
		textDocumentPrepareRename: Z({ method: "textDocument/prepareRename" }),
		workspaceExecuteCommand: Z({ method: "workspace/executeCommand" }),
		workspaceDidChangeWorkspaceFolders: Q({ method: "workspace/didChangeWorkspaceFolders" }),
		windowWorkDoneProgressCancel: Q({ method: "window/workDoneProgress/cancel" }),
		workspaceDidCreateFiles: Q({ method: "workspace/didCreateFiles" }),
		workspaceDidRenameFiles: Q({ method: "workspace/didRenameFiles" }),
		workspaceDidDeleteFiles: Q({ method: "workspace/didDeleteFiles" }),
		notebookDocumentDidOpen: Q({ method: "notebookDocument/didOpen" }),
		notebookDocumentDidChange: Q({ method: "notebookDocument/didChange" }),
		notebookDocumentDidSave: Q({ method: "notebookDocument/didSave" }),
		notebookDocumentDidClose: Q({ method: "notebookDocument/didClose" }),
		initialized: Q({ method: "initialized" }),
		exit: Q({ method: "exit" }),
		workspaceDidChangeConfiguration: Q({ method: "workspace/didChangeConfiguration" }),
		textDocumentDidOpen: Q({ method: "textDocument/didOpen" }),
		textDocumentDidChange: Q({ method: "textDocument/didChange" }),
		textDocumentDidClose: Q({ method: "textDocument/didClose" }),
		textDocumentDidSave: Q({ method: "textDocument/didSave" }),
		textDocumentWillSave: Q({ method: "textDocument/willSave" }),
		workspaceDidChangeWatchedFiles: Q({ method: "workspace/didChangeWatchedFiles" }),
		setTrace: Q({ method: "$/setTrace" }),
		cancelRequest: Q({ method: "$/cancelRequest" }),
		progress: Q({ method: "$/progress" })
	},
	client: {
		workspaceWorkspaceFolders: Z({ method: "workspace/workspaceFolders" }).optional(),
		workspaceConfiguration: Z({ method: "workspace/configuration" }).optional(),
		workspaceFoldingRangeRefresh: Z({ method: "workspace/foldingRange/refresh" }).optional(),
		windowWorkDoneProgressCreate: Z({ method: "window/workDoneProgress/create" }).optional(),
		workspaceSemanticTokensRefresh: Z({ method: "workspace/semanticTokens/refresh" }).optional(),
		windowShowDocument: Z({ method: "window/showDocument" }).optional(),
		workspaceInlineValueRefresh: Z({ method: "workspace/inlineValue/refresh" }).optional(),
		workspaceInlayHintRefresh: Z({ method: "workspace/inlayHint/refresh" }).optional(),
		workspaceDiagnosticRefresh: Z({ method: "workspace/diagnostic/refresh" }).optional(),
		clientRegisterCapability: Z({ method: "client/registerCapability" }).optional(),
		clientUnregisterCapability: Z({ method: "client/unregisterCapability" }).optional(),
		windowShowMessageRequest: Z({ method: "window/showMessageRequest" }).optional(),
		workspaceCodeLensRefresh: Z({ method: "workspace/codeLens/refresh" }).optional(),
		workspaceApplyEdit: Z({ method: "workspace/applyEdit" }).optional(),
		windowShowMessage: Q({ method: "window/showMessage" }),
		windowLogMessage: Q({ method: "window/logMessage" }),
		telemetryEvent: Q({ method: "telemetry/event" }),
		textDocumentPublishDiagnostics: Q({ method: "textDocument/publishDiagnostics" }),
		logTrace: Q({ method: "$/logTrace" }),
		cancelRequest: Q({ method: "$/cancelRequest" }),
		progress: Q({ method: "$/progress" })
	}
}), lb = class {
	constructor() {
		X(this, "_store", new Qb());
	}
	dispose() {
		this._store.dispose();
	}
	_register(e) {
		if (e === this) throw Error("Cannot register a disposable on itself!");
		return this._store.add(e);
	}
}, X(lb, "None", Object.freeze({ dispose() {} }));
var Qb = (ub = class {
	constructor() {
		X(this, "_toDispose", /* @__PURE__ */ new Set()), X(this, "_isDisposed", !1);
	}
	dispose() {
		this._isDisposed || (this._isDisposed = !0, this.clear());
	}
	clear() {
		if (this._toDispose.size !== 0) try {
			for (let e of this._toDispose) e.dispose();
		} finally {
			this._toDispose.clear();
		}
	}
	add(e) {
		if (!e) return e;
		if (e === this) throw Error("Cannot register a disposable on itself!");
		return this._isDisposed ? ub.DISABLE_DISPOSED_WARNING || console.warn((/* @__PURE__ */ Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!")).stack) : this._toDispose.add(e), e;
	}
}, X(ub, "DISABLE_DISPOSED_WARNING", !1), ub);
Gb.Empty, Gb.QuickFix, Gb.Refactor, Gb.RefactorExtract, Gb.RefactorInline, Gb.RefactorRewrite, Gb.Source, Gb.SourceOrganizeImports, Gb.SourceFixAll, e.CodeActionTriggerType.Invoke, Xb.Invoked, e.CodeActionTriggerType.Auto, Xb.Automatic, Vb.Text, e.CompletionItemKind.Text, Vb.Method, e.CompletionItemKind.Method, Vb.Function, e.CompletionItemKind.Function, Vb.Constructor, e.CompletionItemKind.Constructor, Vb.Field, e.CompletionItemKind.Field, Vb.Variable, e.CompletionItemKind.Variable, Vb.Class, e.CompletionItemKind.Class, Vb.Interface, e.CompletionItemKind.Interface, Vb.Module, e.CompletionItemKind.Module, Vb.Property, e.CompletionItemKind.Property, Vb.Unit, e.CompletionItemKind.Unit, Vb.Value, e.CompletionItemKind.Value, Vb.Enum, e.CompletionItemKind.Enum, Vb.Keyword, e.CompletionItemKind.Keyword, Vb.Snippet, e.CompletionItemKind.Snippet, Vb.Color, e.CompletionItemKind.Color, Vb.File, e.CompletionItemKind.File, Vb.Reference, e.CompletionItemKind.Reference, Vb.Folder, e.CompletionItemKind.Folder, Vb.EnumMember, e.CompletionItemKind.EnumMember, Vb.Constant, e.CompletionItemKind.Constant, Vb.Struct, e.CompletionItemKind.Struct, Vb.Event, e.CompletionItemKind.Event, Vb.Operator, e.CompletionItemKind.Operator, Vb.TypeParameter, e.CompletionItemKind.TypeParameter, Hb.Deprecated, e.CompletionItemTag.Deprecated, e.CompletionTriggerKind.Invoke, Jb.Invoked, e.CompletionTriggerKind.TriggerCharacter, Jb.TriggerCharacter, e.CompletionTriggerKind.TriggerForIncompleteCompletions, Jb.TriggerForIncompleteCompletions, Ub.Snippet, e.CompletionItemInsertTextRule.InsertAsSnippet, Rb.File, e.SymbolKind.File, Rb.Module, e.SymbolKind.Module, Rb.Namespace, e.SymbolKind.Namespace, Rb.Package, e.SymbolKind.Package, Rb.Class, e.SymbolKind.Class, Rb.Method, e.SymbolKind.Method, Rb.Property, e.SymbolKind.Property, Rb.Field, e.SymbolKind.Field, Rb.Constructor, e.SymbolKind.Constructor, Rb.Enum, e.SymbolKind.Enum, Rb.Interface, e.SymbolKind.Interface, Rb.Function, e.SymbolKind.Function, Rb.Variable, e.SymbolKind.Variable, Rb.Constant, e.SymbolKind.Constant, Rb.String, e.SymbolKind.String, Rb.Number, e.SymbolKind.Number, Rb.Boolean, e.SymbolKind.Boolean, Rb.Array, e.SymbolKind.Array, Rb.Object, e.SymbolKind.Object, Rb.Key, e.SymbolKind.Key, Rb.Null, e.SymbolKind.Null, Rb.EnumMember, e.SymbolKind.EnumMember, Rb.Struct, e.SymbolKind.Struct, Rb.Event, e.SymbolKind.Event, Rb.Operator, e.SymbolKind.Operator, Rb.TypeParameter, e.SymbolKind.TypeParameter, zb.Deprecated, e.SymbolTag.Deprecated, Wb.Text, e.DocumentHighlightKind.Text, Wb.Read, e.DocumentHighlightKind.Read, Wb.Write, e.DocumentHighlightKind.Write, Lb.Comment, e.FoldingRangeKind.Comment, Lb.Imports, e.FoldingRangeKind.Imports, Lb.Region, e.FoldingRangeKind.Region, a.Error, Kb.Error, a.Warning, Kb.Warning, a.Info, Kb.Information, a.Hint, Kb.Hint, Kb.Error, a.Error, Kb.Warning, a.Warning, Kb.Information, a.Info, Kb.Hint, a.Hint, qb.Unnecessary, s.Unnecessary, qb.Deprecated, s.Deprecated, e.SignatureHelpTriggerKind.Invoke, Yb.Invoked, e.SignatureHelpTriggerKind.TriggerCharacter, Yb.TriggerCharacter, e.SignatureHelpTriggerKind.ContentChange, Yb.ContentChange, Bb.Type, e.InlayHintKind.Type, Bb.Parameter, e.InlayHintKind.Parameter, new Map([...Object.values(Zb)].map((e) => [e.method, e])), typeof WebSocket < "u" || (typeof MozWebSocket < "u" ? MozWebSocket : typeof global < "u" ? global.WebSocket || global.MozWebSocket : typeof window < "u" ? window.WebSocket || window.MozWebSocket : typeof self < "u" && (self.WebSocket || self.MozWebSocket));
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/editor/internal/initialize.js
function $b() {
	return c;
}
globalThis.MonacoEnvironment?.globalAPI && (globalThis.monaco = $b());
//#endregion
//#region ../../node_modules/.pnpm/monaco-editor@0.55.1/node_modules/monaco-editor/esm/vs/editor/editor.main.js
var ex = $b();
ex.languages.css = Oy, ex.languages.html = Iy, ex.languages.typescript = d, ex.languages.json = Zy;
//#endregion
//#region src/composables/useHunspellMonaco.ts
function tx(e, t) {
	let n;
	return (...r) => {
		clearTimeout(n), n = setTimeout(() => e(...r), t);
	};
}
function nx(t, n, i) {
	let s = null, c = null, l = null, u = [];
	function d() {
		let e = t.value?.getModel();
		e && o.setModelMarkers(e, "hunspell", []);
	}
	function f() {
		c?.dispose(), c = null, l?.dispose(), l = null, u = [], s &&= (d(), s.terminate(), null);
	}
	let p = tx(() => {
		if (!s || !t.value) return;
		let e = t.value.getModel();
		e && s.postMessage({ text: e.getValue() });
	}, 300);
	function m() {
		if (!t.value) return;
		if (!window.HunspellEnvironment?.getWorker) {
			console.warn("[useHunspellMonaco] window.HunspellEnvironment.getWorker is not configured. Set window.HunspellEnvironment = { getWorker: () => new HunspellWorker() } in your app entry.");
			return;
		}
		s = window.HunspellEnvironment.getWorker(), s.addEventListener("message", (e) => {
			let n = t.value?.getModel();
			if (!n) return;
			u = e.data;
			let r = e.data.map((e) => {
				let t = n.getPositionAt(e.offset), r = e.length, i = n.getPositionAt(e.offset + r);
				return {
					severity: a.Warning,
					message: `Unknown word: ${e.text}`,
					startLineNumber: t.lineNumber,
					startColumn: t.column,
					endLineNumber: i.lineNumber,
					endColumn: i.column,
					source: "hunspell"
				};
			});
			o.setModelMarkers(n, "hunspell", r);
		}), c = t.value.onDidChangeModelContent(p);
		let n = i.value || "plaintext";
		l = e.registerCodeActionProvider(n, { provideCodeActions(e, t) {
			let n = [];
			for (let i of u) {
				let a = e.getPositionAt(i.offset), o = e.getPositionAt(i.offset + i.length), s = new r(a.lineNumber, a.column, o.lineNumber, o.column);
				if (s.intersectRanges(t)) for (let t of i.suggestions) n.push({
					title: `Change to "${t}"`,
					kind: "quickfix",
					diagnostics: [],
					edit: { edits: [{
						resource: e.uri,
						textEdit: {
							range: s,
							text: t
						},
						versionId: e.getVersionId()
					}] },
					isPreferred: n.length === 0
				});
			}
			return {
				actions: n,
				dispose: () => {}
			};
		} }), p();
	}
	pe([n, t], ([e]) => {
		e ? (f(), m()) : f();
	}, { immediate: !0 }), pe(i, () => {
		n.value && s && p();
	}), ne(() => {
		f();
	});
}
//#endregion
//#region src/components/BaseMonacoEditor/BaseMonacoEditor.vue?vue&type=script&setup=true&lang.ts
var rx = ["aria-label"], ix = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseMonacoEditor",
	props: {
		modelValue: { default: "" },
		language: { default: "plaintext" },
		theme: { default: "vs" },
		readonly: {
			type: Boolean,
			default: !1
		},
		minimap: {
			type: Boolean,
			default: !1
		},
		lineNumbers: {
			type: Boolean,
			default: !0
		},
		wordWrap: {
			type: Boolean,
			default: !1
		},
		height: { default: "300px" },
		fontSize: { default: 14 },
		tabSize: { default: 2 },
		scrollBeyondLastLine: {
			type: Boolean,
			default: !1
		},
		automaticLayout: {
			type: Boolean,
			default: !0
		},
		completionProvider: {},
		spellCheck: {
			type: Boolean,
			default: !1
		}
	},
	emits: [
		"update:modelValue",
		"change",
		"blur",
		"focus",
		"ready"
	],
	setup(t, { expose: n, emit: r }) {
		let i = t, a = r, s = P(null), c = ue(null), l = null;
		nx(c, g(() => i.spellCheck && !i.readonly), g(() => i.language ?? "plaintext"));
		function u(t) {
			l?.dispose(), l = null, i.completionProvider && (l = e.registerCompletionItemProvider(t, i.completionProvider));
		}
		return re(() => {
			s.value && (c.value = o.create(s.value, {
				value: i.modelValue,
				language: i.language,
				theme: i.theme,
				readOnly: i.readonly,
				minimap: { enabled: i.minimap },
				lineNumbers: i.lineNumbers ? "on" : "off",
				wordWrap: i.wordWrap ? "on" : "off",
				fontSize: i.fontSize,
				tabSize: i.tabSize,
				scrollBeyondLastLine: i.scrollBeyondLastLine,
				automaticLayout: i.automaticLayout,
				fixedOverflowWidgets: !0,
				overviewRulerLanes: 0,
				overviewRulerBorder: !1,
				renderLineHighlight: "all",
				cursorStyle: "line",
				padding: {
					top: 8,
					bottom: 8
				}
			}), c.value.onDidChangeModelContent(() => {
				let e = c.value.getValue();
				a("update:modelValue", e), a("change", e);
			}), c.value.onDidBlurEditorText(() => a("blur")), c.value.onDidFocusEditorText(() => a("focus")), u(i.language ?? "plaintext"), a("ready", c.value));
		}), ne(() => {
			l?.dispose(), l = null, c.value?.dispose(), c.value = null;
		}), pe(() => i.modelValue, (e) => {
			c.value && c.value.getValue() !== e && c.value.setValue(e);
		}), pe(() => i.language, (e) => {
			let t = c.value?.getModel();
			t && o.setModelLanguage(t, e), u(e);
		}), pe(() => i.completionProvider, () => {
			u(i.language ?? "plaintext");
		}), pe(() => i.theme, (e) => {
			o.setTheme(e);
		}), pe(() => i.readonly, (e) => {
			c.value?.updateOptions({ readOnly: e });
		}), pe(() => i.minimap, (e) => {
			c.value?.updateOptions({ minimap: { enabled: e } });
		}), pe(() => i.lineNumbers, (e) => {
			c.value?.updateOptions({ lineNumbers: e ? "on" : "off" });
		}), pe(() => i.wordWrap, (e) => {
			c.value?.updateOptions({ wordWrap: e ? "on" : "off" });
		}), pe(() => i.fontSize, (e) => {
			c.value?.updateOptions({ fontSize: e });
		}), pe(() => i.tabSize, (e) => {
			c.value?.updateOptions({ tabSize: e });
		}), n({ editor: () => c.value }), (e, n) => (N(), y("div", {
			ref_key: "containerEl",
			ref: s,
			class: "base-monaco-editor",
			role: "region",
			style: M({ height: t.height }),
			"aria-label": `${t.language} editor`
		}, null, 12, rx));
	}
}), [["__scopeId", "data-v-18fff138"]]), ax = ["aria-label", "aria-pressed"], ox = {
	class: "theme-toggle__icon",
	"aria-hidden": "true"
}, sx = {
	key: 0,
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "currentColor",
	width: "20",
	height: "20"
}, cx = {
	key: 1,
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "currentColor",
	width: "20",
	height: "20"
}, lx = { class: "theme-toggle__label" }, ux = /* @__PURE__ */ V(/* @__PURE__ */ T({
	__name: "BaseThemeToggle",
	props: { ariaLabel: {} },
	emits: ["change"],
	setup(e, { emit: t }) {
		let n = t, r = P("light");
		function i() {
			return document.documentElement.getAttribute("data-theme") ?? "light";
		}
		function a() {
			let e = r.value === "light" ? "dark" : "light";
			document.documentElement.setAttribute("data-theme", e), r.value = e, n("change", e);
		}
		let o = null;
		return re(() => {
			r.value = i(), o = new MutationObserver(() => {
				r.value = i();
			}), o.observe(document.documentElement, {
				attributes: !0,
				attributeFilter: ["data-theme"]
			});
		}), ie(() => {
			o?.disconnect(), o = null;
		}), (t, n) => (N(), y("button", {
			type: "button",
			class: j(["theme-toggle", `theme-toggle--${r.value}`]),
			"aria-label": e.ariaLabel === void 0 ? r.value === "dark" ? "Switch to light theme" : "Switch to dark theme" : e.ariaLabel,
			"aria-pressed": r.value === "dark",
			onClick: a
		}, [b("span", ox, [r.value === "dark" ? (N(), y("svg", sx, [...n[0] ||= [b("path", { d: "M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" }, null, -1)]])) : (N(), y("svg", cx, [...n[1] ||= [b("path", {
			"fill-rule": "evenodd",
			d: "M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z",
			"clip-rule": "evenodd"
		}, null, -1)]]))]), b("span", lx, [I(t.$slots, "default", {}, () => [C(L(r.value === "dark" ? "Light mode" : "Dark mode"), 1)], !0)])], 10, ax));
	}
}), [["__scopeId", "data-v-6568ba02"]]);
//#endregion
export { Io as BaseAccordion, Bo as BaseAccordionItem, lu as BaseApplicationLayout, hu as BaseAvatar, Mn as BaseBadge, Cs as BaseBreadcrumb, xe as BaseButton, dg as BaseCalendar, jn as BaseCard, On as BaseCardBody, An as BaseCardFooter, En as BaseCardHeader, ui as BaseCheckbox, Dy as BaseCodeBlock, Po as BaseCollapse, bg as BaseDateInput, Ig as BaseDateRangeInput, gv as BaseDateTimeRangeInput, ys as BaseDialog, qo as BaseDialogBody, Zo as BaseDialogFooter, Uo as BaseDialogHeader, Ur as BaseDropdown, Ks as BaseFileInput, vo as BaseFormBuilder, ho as BaseFormBuilderActions, uo as BaseFormBuilderField, Cl as BaseFormWizard, yl as BaseFormWizardContent, xl as BaseFormWizardFooter, _l as BaseFormWizardSteps, gu as BaseInView, Bn as BaseInput, ic as BaseList, Wu as BaseLogViewerRow, Uu as BaseLogViewerToolbar, lo as BaseMarkdownInput, Tc as BaseMenu, Ac as BaseMenuItem, xc as BaseMenuItemButton, _c as BaseMenuItemLink, dc as BaseMenuList, Cc as BaseMenuSubmenu, Dc as BaseMenubar, Uc as BaseModal, Lc as BaseModalBody, Vc as BaseModalFooter, Nc as BaseModalHeader, ix as BaseMonacoEditor, Ao as BaseMultiselect, Qc as BaseNavbar, ol as BaseNavbarItem, Zl as BasePopover, lc as BaseProgressBar, pi as BaseRadio, hi as BaseRadioGroup, Qs as BaseSearchInput, Qr as BaseSelect, Is as BaseSidebar, As as BaseSidebarBody, Ps as BaseSidebarFooter, Es as BaseSidebarHeader, sl as BaseSkeleton, oc as BaseSpinner, ll as BaseStatusIcon, bi as BaseSwitch, Dl as BaseTabList, kl as BaseTabPanel, Gl as BaseTable, Vl as BaseTableBody, zl as BaseTableEmptyState, Ll as BaseTableHead, Al as BaseTabs, bo as BaseTag, ni as BaseTextarea, ux as BaseThemeToggle, Qg as BaseTimeInput, O_ as BaseTimeRangeInput, Jl as BaseTooltip, Pu as BaseTreeNodeLabel, zu as BaseTreeView, H as BaseTypography, _u as BaseVirtualList, Gu as BaseVirtualLogViewer, Au as BaseVirtualTable, Eu as BaseVirtualTableFooter, bu as BaseVirtualTableHead, Su as BaseVirtualTableRow, Ml as BaseVirtualTabs, Bu as BaseVirtualTreeView, ru as BaseWindowPopout, uu as StatusLevels, go as useFormSchema, vs as useRouterClose };
