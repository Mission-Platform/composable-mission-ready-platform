import { Fragment as e, computed as t, createCommentVNode as n, createElementBlock as r, createVNode as i, defineComponent as a, inject as o, markRaw as s, onMounted as c, onUnmounted as l, openBlock as u, provide as d, readonly as f, ref as p, renderSlot as m, shallowRef as h, toValue as g, unref as _, watch as v, withCtx as y } from "vue";
import { Map as b, Marker as x, Popup as ee } from "maplibre-gl";
//#region src/composables/injectionKeys.ts
var S = Symbol("maplibre-map"), C = /* @__PURE__ */ ((e, t) => {
	let n = e.__vccOpts || e;
	for (let [e, r] of t) n[e] = r;
	return n;
})(/* @__PURE__ */ a({
	__name: "MapLibre",
	props: {
		mapStyle: {},
		center: { default: () => [0, 0] },
		zoom: { default: 1 },
		minZoom: { default: void 0 },
		maxZoom: { default: void 0 },
		bearing: { default: 0 },
		pitch: { default: 0 },
		cooperativeGestures: {
			type: Boolean,
			default: !1
		},
		attributionControl: {
			type: [Boolean, Object],
			default: void 0
		}
	},
	emits: [
		"load",
		"move",
		"click",
		"contextmenu"
	],
	setup(e, { emit: t }) {
		let i = e, a = t, o = h(null), f = h(null);
		return d(S, f), c(() => {
			if (!o.value) return;
			let e = new b({
				container: o.value,
				style: i.mapStyle,
				center: i.center,
				zoom: i.zoom,
				minZoom: i.minZoom,
				maxZoom: i.maxZoom,
				bearing: i.bearing,
				pitch: i.pitch,
				cooperativeGestures: i.cooperativeGestures,
				attributionControl: i.attributionControl
			});
			e.on("load", () => {
				f.value = s(e), a("load", e);
			}), e.on("move", () => {
				a("move", e);
			}), e.on("click", (e) => {
				a("click", e);
			}), e.on("contextmenu", (e) => {
				a("contextmenu", e);
			});
		}), l(() => {
			f.value?.remove(), f.value = null;
		}), v(() => i.mapStyle, (e) => {
			e !== void 0 && f.value?.setStyle(e);
		}), v(() => i.center, (e) => {
			e && f.value?.setCenter(e);
		}), v(() => i.zoom, (e) => {
			e !== void 0 && f.value?.setZoom(e);
		}), v(() => i.bearing, (e) => {
			e !== void 0 && f.value?.setBearing(e);
		}), v(() => i.pitch, (e) => {
			e !== void 0 && f.value?.setPitch(e);
		}), (e, t) => (u(), r("div", {
			ref_key: "containerRef",
			ref: o,
			class: "map-libre"
		}, [f.value ? m(e.$slots, "default", { key: 0 }, void 0, !0) : n("", !0)], 512));
	}
}), [["__scopeId", "data-v-9abc8003"]]);
//#endregion
//#region src/composables/useMap.ts
function w() {
	let e = o(S);
	if (!e) throw Error("[useMap] No map context found. Make sure this composable is called inside a <MapLibre> component.");
	return { map: e };
}
//#endregion
//#region src/composables/useMarker.ts
function T(e, t) {
	let { lngLat: n, ...r } = t, i = h(null);
	return v(e, (e) => {
		if (!e) return;
		let t = new x(r);
		t.setLngLat(g(n)).addTo(e), i.value = s(t);
	}, { immediate: !0 }), v(() => g(n), (e) => {
		i.value?.setLngLat(e);
	}), l(() => {
		i.value?.remove(), i.value = null;
	}), { marker: i };
}
//#endregion
//#region src/components/MapMarker/MapMarker.vue
var te = /* @__PURE__ */ a({
	__name: "MapMarker",
	props: {
		lngLat: {},
		color: { default: void 0 },
		scale: { default: void 0 },
		draggable: {
			type: Boolean,
			default: !1
		},
		rotationAlignment: { default: void 0 },
		pitchAlignment: { default: void 0 }
	},
	emits: ["dragend"],
	setup(e, { expose: t, emit: n }) {
		let r = e, i = n, { map: a } = w(), o = p(r.lngLat);
		v(() => r.lngLat, (e) => {
			o.value = e;
		});
		let { marker: s } = T(a, {
			lngLat: o,
			color: r.color,
			scale: r.scale,
			draggable: r.draggable,
			rotationAlignment: r.rotationAlignment,
			pitchAlignment: r.pitchAlignment
		});
		return v(s, (e) => {
			e && e.on("dragend", () => {
				i("dragend", e.getLngLat());
			});
		}), t({ marker: s }), (e, t) => null;
	}
});
//#endregion
//#region src/composables/usePopup.ts
function E(e, t) {
	let { lngLat: n, content: r, isText: i = !1, open: a = !0, ...o } = t, c = h(null);
	return v(e, (e) => {
		if (!e) return;
		let t = new ee(o);
		i ? t.setText(g(r)) : t.setHTML(g(r)), t.setLngLat(g(n)), g(a) && t.addTo(e), c.value = s(t);
	}, { immediate: !0 }), v(() => g(n), (e) => {
		c.value?.setLngLat(e);
	}), v(() => g(r), (e) => {
		c.value && (i ? c.value.setText(e) : c.value.setHTML(e));
	}), v(() => g(a), (t) => {
		let n = e.value;
		!c.value || !n || (t ? c.value.addTo(n) : c.value.remove());
	}), l(() => {
		c.value?.remove(), c.value = null;
	}), { popup: c };
}
//#endregion
//#region src/components/MapPopup/MapPopup.vue
var ne = /* @__PURE__ */ a({
	__name: "MapPopup",
	props: {
		lngLat: {},
		content: {},
		isText: {
			type: Boolean,
			default: !1
		},
		open: {
			type: Boolean,
			default: !0
		},
		offset: { default: void 0 },
		className: { default: void 0 },
		closeButton: {
			type: Boolean,
			default: !0
		},
		closeOnClick: {
			type: Boolean,
			default: !0
		},
		anchor: { default: void 0 }
	},
	emits: ["close"],
	setup(e, { expose: n, emit: r }) {
		let i = e, a = r, { map: o } = w(), s = p(i.lngLat), c = t(() => i.content), l = t(() => i.open), { popup: u } = E(o, {
			lngLat: s,
			content: c,
			isText: i.isText,
			open: l,
			offset: i.offset,
			className: i.className,
			closeButton: i.closeButton,
			closeOnClick: i.closeOnClick,
			anchor: i.anchor
		});
		return u.value?.on("close", () => {
			a("close");
		}), n({ popup: u }), (e, t) => null;
	}
});
//#endregion
//#region src/composables/useSource.ts
function D(e, t) {
	let { id: n } = t;
	function r(e, t) {
		e.getSource(n) || e.addSource(n, t);
	}
	function i(e) {
		e.getSource(n) && e.removeSource(n);
	}
	v([e, () => g(t.source)], ([e, t], a) => {
		if (!e) return;
		let o = a?.[0], s = a?.[1];
		if (t.type === "geojson" && s?.type === "geojson" && e === o) {
			let r = e.getSource(n);
			if (r?.setData) {
				r.setData(t.data);
				return;
			}
		}
		o && i(o), r(e, t);
	}, {
		immediate: !0,
		deep: !0
	}), l(() => {
		let t = e.value;
		t && i(t);
	});
}
//#endregion
//#region src/components/MapSource/MapSource.vue
var O = /* @__PURE__ */ a({
	__name: "MapSource",
	props: {
		id: {},
		source: {}
	},
	setup(e) {
		let n = e, { map: r } = w(), i = t(() => n.source);
		return D(r, {
			id: n.id,
			source: i
		}), (e, t) => m(e.$slots, "default");
	}
});
//#endregion
//#region src/composables/useLayer.ts
function k(e, t) {
	function n(e, t, n) {
		e.getLayer(t.id) || e.addLayer(t, n);
	}
	function r(e, t) {
		e.getLayer(t) && e.removeLayer(t);
	}
	v([
		e,
		() => g(t.layer),
		() => g(t.beforeId)
	], ([e, t, i], [, a]) => {
		e && (a && r(e, a.id), n(e, t, i));
	}, {
		immediate: !0,
		deep: !0
	}), l(() => {
		let n = e.value;
		n && r(n, g(t.layer).id);
	});
}
//#endregion
//#region src/components/MapLayer/MapLayer.vue
var A = /* @__PURE__ */ a({
	__name: "MapLayer",
	props: {
		layer: {},
		beforeId: { default: void 0 }
	},
	setup(e) {
		let n = e, { map: r } = w();
		return k(r, {
			layer: t(() => n.layer),
			beforeId: t(() => n.beforeId)
		}), (e, t) => null;
	}
}), j = {
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
}, M = 6371008.8, N = {
	centimeters: M * 100,
	centimetres: M * 100,
	degrees: 360 / (2 * Math.PI),
	feet: M * 3.28084,
	inches: M * 39.37,
	kilometers: M / 1e3,
	kilometres: M / 1e3,
	meters: M,
	metres: M,
	miles: M / 1609.344,
	millimeters: M * 1e3,
	millimetres: M * 1e3,
	nauticalmiles: M / 1852,
	radians: 1,
	yards: M * 1.0936
};
function P(e, t, n = {}) {
	let r = { type: "Feature" };
	return (n.id === 0 || n.id) && (r.id = n.id), n.bbox && (r.bbox = n.bbox), r.properties = t || {}, r.geometry = e, r;
}
function F(e, t, n = {}) {
	if (!e) throw Error("coordinates is required");
	if (!Array.isArray(e)) throw Error("coordinates must be an Array");
	if (e.length < 2) throw Error("coordinates must be at least 2 numbers long");
	if (!ae(e[0]) || !ae(e[1])) throw Error("coordinates must contain numbers");
	return P({
		type: "Point",
		coordinates: e
	}, t, n);
}
function I(e, t, n = {}) {
	for (let t of e) {
		if (t.length < 4) throw Error("Each LinearRing of a Polygon must have 4 or more Positions.");
		if (t[t.length - 1].length !== t[0].length) throw Error("First and last Position are not equivalent.");
		for (let e = 0; e < t[t.length - 1].length; e++) if (t[t.length - 1][e] !== t[0][e]) throw Error("First and last Position are not equivalent.");
	}
	return P({
		type: "Polygon",
		coordinates: e
	}, t, n);
}
function L(e, t, n = {}) {
	if (e.length < 2) throw Error("coordinates must be an array of two or more positions");
	return P({
		type: "LineString",
		coordinates: e
	}, t, n);
}
function R(e, t = {}) {
	let n = { type: "FeatureCollection" };
	return t.id && (n.id = t.id), t.bbox && (n.bbox = t.bbox), n.features = e, n;
}
function re(e, t = "kilometers") {
	let n = N[t];
	if (!n) throw Error(t + " units is invalid");
	return e * n;
}
function z(e, t = "kilometers") {
	let n = N[t];
	if (!n) throw Error(t + " units is invalid");
	return e / n;
}
function B(e) {
	return e % (2 * Math.PI) * 180 / Math.PI;
}
function V(e) {
	return e % 360 * Math.PI / 180;
}
function ie(e, t = "kilometers", n = "kilometers") {
	if (!(e >= 0)) throw Error("length must be a positive number");
	return re(z(e, t), n);
}
function ae(e) {
	return !isNaN(e) && e !== null && !Array.isArray(e);
}
function H(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+invariant@7.3.5/node_modules/@turf/invariant/dist/esm/index.js
function U(e) {
	if (!e) throw Error("coord is required");
	if (!Array.isArray(e)) {
		if (e.type === "Feature" && e.geometry !== null && e.geometry.type === "Point") return [...e.geometry.coordinates];
		if (e.type === "Point") return [...e.coordinates];
	}
	if (Array.isArray(e) && e.length >= 2 && !Array.isArray(e[0]) && !Array.isArray(e[1])) return [...e];
	throw Error("coord must be GeoJSON Point or an Array of numbers");
}
function oe(e) {
	if (Array.isArray(e)) return e;
	if (e.type === "Feature") {
		if (e.geometry !== null) return e.geometry.coordinates;
	} else if (e.coordinates) return e.coordinates;
	throw Error("coords must be GeoJSON Feature, Geometry Object or an Array");
}
function se(e, t) {
	return e.type === "FeatureCollection" ? "FeatureCollection" : e.type === "GeometryCollection" ? "GeometryCollection" : e.type === "Feature" && e.geometry !== null ? e.geometry.type : e.type;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+bearing@7.3.5/node_modules/@turf/bearing/dist/esm/index.js
function W(e, t, n = {}) {
	if (n.final === !0) return ce(e, t);
	let r = U(e), i = U(t), a = V(r[0]), o = V(i[0]), s = V(r[1]), c = V(i[1]), l = Math.sin(o - a) * Math.cos(c), u = Math.cos(s) * Math.sin(c) - Math.sin(s) * Math.cos(c) * Math.cos(o - a);
	return B(Math.atan2(l, u));
}
function ce(e, t) {
	let n = W(t, e);
	return n = (n + 180) % 360, n;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+destination@7.3.5/node_modules/@turf/destination/dist/esm/index.js
function le(e, t, n, r = {}) {
	let i = U(e), a = V(i[0]), o = V(i[1]), s = V(n), c = z(t, r.units), l = Math.asin(Math.sin(o) * Math.cos(c) + Math.cos(o) * Math.sin(c) * Math.cos(s)), u = B(a + Math.atan2(Math.sin(s) * Math.sin(c) * Math.cos(o), Math.cos(c) - Math.sin(o) * Math.sin(l))), d = B(l);
	return i[2] === void 0 ? F([u, d], r.properties) : F([
		u,
		d,
		i[2]
	], r.properties);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+distance@7.3.5/node_modules/@turf/distance/dist/esm/index.js
function G(e, t, n = {}) {
	var r = U(e), i = U(t), a = V(i[1] - r[1]), o = V(i[0] - r[0]), s = V(r[1]), c = V(i[1]), l = Math.sin(a / 2) ** 2 + Math.sin(o / 2) ** 2 * Math.cos(s) * Math.cos(c);
	return re(2 * Math.atan2(Math.sqrt(l), Math.sqrt(1 - l)), n.units);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+rhumb-bearing@7.3.5/node_modules/@turf/rhumb-bearing/dist/esm/index.js
function ue(e, t, n = {}) {
	let r;
	return r = n.final ? de(U(t), U(e)) : de(U(e), U(t)), r > 180 ? -(360 - r) : r;
}
function de(e, t) {
	let n = V(e[1]), r = V(t[1]), i = V(t[0] - e[0]);
	i > Math.PI && (i -= 2 * Math.PI), i < -Math.PI && (i += 2 * Math.PI);
	let a = Math.log(Math.tan(r / 2 + Math.PI / 4) / Math.tan(n / 2 + Math.PI / 4));
	return (B(Math.atan2(i, a)) + 360) % 360;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+meta@7.3.5/node_modules/@turf/meta/dist/esm/index.js
function K(e, t, n) {
	if (e !== null) for (var r, i, a, o, s, c, l, u = 0, d = 0, f, p = e.type, m = p === "FeatureCollection", h = p === "Feature", g = m ? e.features.length : 1, _ = 0; _ < g; _++) {
		l = m ? e.features[_].geometry : h ? e.geometry : e, f = l ? l.type === "GeometryCollection" : !1, s = f ? l.geometries.length : 1;
		for (var v = 0; v < s; v++) {
			var y = 0, b = 0;
			if (o = f ? l.geometries[v] : l, o !== null) {
				c = o.coordinates;
				var x = o.type;
				switch (u = n && (x === "Polygon" || x === "MultiPolygon") ? 1 : 0, x) {
					case null: break;
					case "Point":
						if (t(c, d, _, y, b) === !1) return !1;
						d++, y++;
						break;
					case "LineString":
					case "MultiPoint":
						for (r = 0; r < c.length; r++) {
							if (t(c[r], d, _, y, b) === !1) return !1;
							d++, x === "MultiPoint" && y++;
						}
						x === "LineString" && y++;
						break;
					case "Polygon":
					case "MultiLineString":
						for (r = 0; r < c.length; r++) {
							for (i = 0; i < c[r].length - u; i++) {
								if (t(c[r][i], d, _, y, b) === !1) return !1;
								d++;
							}
							x === "MultiLineString" && y++, x === "Polygon" && b++;
						}
						x === "Polygon" && y++;
						break;
					case "MultiPolygon":
						for (r = 0; r < c.length; r++) {
							for (b = 0, i = 0; i < c[r].length; i++) {
								for (a = 0; a < c[r][i].length - u; a++) {
									if (t(c[r][i][a], d, _, y, b) === !1) return !1;
									d++;
								}
								b++;
							}
							y++;
						}
						break;
					case "GeometryCollection":
						for (r = 0; r < o.geometries.length; r++) if (K(o.geometries[r], t, n) === !1) return !1;
						break;
					default: throw Error("Unknown Geometry Type");
				}
			}
		}
	}
}
function fe(e, t) {
	if (e.type === "Feature") t(e, 0);
	else if (e.type === "FeatureCollection") for (var n = 0; n < e.features.length && t(e.features[n], n) !== !1; n++);
}
function pe(e, t) {
	var n, r, i, a, o, s, c, l, u, d, f = 0, p = e.type === "FeatureCollection", m = e.type === "Feature", h = p ? e.features.length : 1;
	for (n = 0; n < h; n++) {
		for (s = p ? e.features[n].geometry : m ? e.geometry : e, l = p ? e.features[n].properties : m ? e.properties : {}, u = p ? e.features[n].bbox : m ? e.bbox : void 0, d = p ? e.features[n].id : m ? e.id : void 0, c = s ? s.type === "GeometryCollection" : !1, o = c ? s.geometries.length : 1, i = 0; i < o; i++) {
			if (a = c ? s.geometries[i] : s, a === null) {
				if (t(null, f, l, u, d) === !1) return !1;
				continue;
			}
			switch (a.type) {
				case "Point":
				case "LineString":
				case "MultiPoint":
				case "Polygon":
				case "MultiLineString":
				case "MultiPolygon":
					if (t(a, f, l, u, d) === !1) return !1;
					break;
				case "GeometryCollection":
					for (r = 0; r < a.geometries.length; r++) if (t(a.geometries[r], f, l, u, d) === !1) return !1;
					break;
				default: throw Error("Unknown Geometry Type");
			}
		}
		f++;
	}
}
function me(e, t, n) {
	var r = n;
	return pe(e, function(e, i, a, o, s) {
		r = i === 0 && n === void 0 ? e : t(r, e, i, a, o, s);
	}), r;
}
function he(e, t) {
	pe(e, function(e, n, r, i, a) {
		var o = e === null ? null : e.type;
		switch (o) {
			case null:
			case "Point":
			case "LineString":
			case "Polygon": return t(P(e, r, {
				bbox: i,
				id: a
			}), n, 0) === !1 ? !1 : void 0;
		}
		var s;
		switch (o) {
			case "MultiPoint":
				s = "Point";
				break;
			case "MultiLineString":
				s = "LineString";
				break;
			case "MultiPolygon":
				s = "Polygon";
				break;
		}
		for (var c = 0; c < e.coordinates.length; c++) {
			var l = e.coordinates[c];
			if (t(P({
				type: s,
				coordinates: l
			}, r), n, c) === !1) return !1;
		}
	});
}
function ge(e, t) {
	he(e, function(e, n, r) {
		var i = 0;
		if (e.geometry) {
			var a = e.geometry.type;
			if (!(a === "Point" || a === "MultiPoint")) {
				var o, s = 0, c = 0, l = 0;
				if (K(e, function(a, u, d, f, p) {
					if (o === void 0 || n > s || f > c || p > l) {
						o = a, s = n, c = f, l = p, i = 0;
						return;
					}
					if (t(L([o, a], e.properties), n, r, p, i) === !1) return !1;
					i++, o = a;
				}) === !1) return !1;
			}
		}
	});
}
function _e(e, t, n) {
	var r = n, i = !1;
	return ge(e, function(e, a, o, s, c) {
		r = i === !1 && n === void 0 ? e : t(r, e, a, o, s, c), i = !0;
	}), r;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+area@7.3.5/node_modules/@turf/area/dist/esm/index.js
function ve(e) {
	return me(e, (e, t) => e + ye(t), 0);
}
function ye(e) {
	let t = 0, n;
	switch (e.type) {
		case "Polygon": return be(e.coordinates);
		case "MultiPolygon":
			for (n = 0; n < e.coordinates.length; n++) t += be(e.coordinates[n]);
			return t;
		case "Point":
		case "MultiPoint":
		case "LineString":
		case "MultiLineString": return 0;
	}
	return 0;
}
function be(e) {
	let t = 0;
	if (e && e.length > 0) {
		t += Math.abs(Ce(e[0]));
		for (let n = 1; n < e.length; n++) t -= Math.abs(Ce(e[n]));
	}
	return t;
}
var xe = M * M / 2, Se = Math.PI / 180;
function Ce(e) {
	let t = e.length - 1;
	if (t <= 2) return 0;
	let n = 0, r = 0;
	for (; r < t;) {
		let i = e[r], a = e[r + 1 === t ? 0 : r + 1], o = e[r + 2 >= t ? (r + 2) % t : r + 2], s = i[0] * Se, c = a[1] * Se, l = o[0] * Se;
		n += (l - s) * Math.sin(c), r++;
	}
	return n * xe;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+bbox@7.3.5/node_modules/@turf/bbox/dist/esm/index.js
function we(e, t = {}) {
	if (e.bbox != null && !0 !== t.recompute) return e.bbox;
	let n = [
		Infinity,
		Infinity,
		-Infinity,
		-Infinity
	];
	return K(e, (e) => {
		n[0] > e[0] && (n[0] = e[0]), n[1] > e[1] && (n[1] = e[1]), n[2] < e[0] && (n[2] = e[0]), n[3] < e[1] && (n[3] = e[1]);
	}), n;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+center@7.3.5/node_modules/@turf/center/dist/esm/index.js
function Te(e, t = {}) {
	let n = we(e);
	return F([(n[0] + n[2]) / 2, (n[1] + n[3]) / 2], t.properties, t);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+centroid@7.3.5/node_modules/@turf/centroid/dist/esm/index.js
function q(e, t = {}) {
	let n = 0, r = 0, i = 0;
	return K(e, function(e) {
		n += e[0], r += e[1], i++;
	}, !0), F([n / i, r / i], t.properties);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+clone@7.3.5/node_modules/@turf/clone/dist/esm/index.js
function Ee(e) {
	if (!e) throw Error("geojson is required");
	switch (e.type) {
		case "Feature": return De(e);
		case "FeatureCollection": return ke(e);
		case "Point":
		case "LineString":
		case "Polygon":
		case "MultiPoint":
		case "MultiLineString":
		case "MultiPolygon":
		case "GeometryCollection": return Ae(e);
		default: throw Error("unknown GeoJSON type");
	}
}
function De(e) {
	let t = { type: "Feature" };
	return Object.keys(e).forEach((n) => {
		switch (n) {
			case "type":
			case "properties":
			case "geometry": return;
			default: t[n] = e[n];
		}
	}), t.properties = Oe(e.properties), e.geometry == null ? t.geometry = null : t.geometry = Ae(e.geometry), t;
}
function Oe(e) {
	let t = {};
	return e && Object.keys(e).forEach((n) => {
		let r = e[n];
		typeof r == "object" ? r === null ? t[n] = null : Array.isArray(r) ? t[n] = r.map((e) => e) : t[n] = Oe(r) : t[n] = r;
	}), t;
}
function ke(e) {
	let t = { type: "FeatureCollection" };
	return Object.keys(e).forEach((n) => {
		switch (n) {
			case "type":
			case "features": return;
			default: t[n] = e[n];
		}
	}), t.features = e.features.map((e) => De(e)), t;
}
function Ae(e) {
	let t = { type: e.type };
	return e.bbox && (t.bbox = e.bbox), e.type === "GeometryCollection" ? (t.geometries = e.geometries.map((e) => Ae(e)), t) : (t.coordinates = je(e.coordinates), t);
}
function je(e) {
	let t = e;
	return typeof t[0] == "object" ? t.map((e) => je(e)) : t.slice();
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+rhumb-distance@7.3.5/node_modules/@turf/rhumb-distance/dist/esm/index.js
function Me(e, t, n = {}) {
	let r = U(e), i = U(t);
	return i[0] += i[0] - r[0] > 180 ? -360 : r[0] - i[0] > 180 ? 360 : 0, ie(Ne(r, i), "meters", n.units);
}
function Ne(e, t, n) {
	n = n === void 0 ? M : Number(n);
	let r = n, i = e[1] * Math.PI / 180, a = t[1] * Math.PI / 180, o = a - i, s = Math.abs(t[0] - e[0]) * Math.PI / 180;
	s > Math.PI && (s -= 2 * Math.PI);
	let c = Math.log(Math.tan(a / 2 + Math.PI / 4) / Math.tan(i / 2 + Math.PI / 4)), l = Math.abs(c) > 1e-11 ? o / c : Math.cos(i);
	return Math.sqrt(o * o + l * l * s * s) * r;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+rhumb-destination@7.3.5/node_modules/@turf/rhumb-destination/dist/esm/index.js
function Pe(e, t, n, r = {}) {
	let i = t < 0, a = ie(Math.abs(t), r.units, "meters");
	i && (a = -Math.abs(a));
	let o = U(e), s = Fe(o, a, n);
	return s[0] += s[0] - o[0] > 180 ? -360 : o[0] - s[0] > 180 ? 360 : 0, F(s, r.properties);
}
function Fe(e, t, n, r) {
	r = r === void 0 ? M : Number(r);
	let i = t / r, a = e[0] * Math.PI / 180, o = V(e[1]), s = V(n), c = i * Math.cos(s), l = o + c;
	Math.abs(l) > Math.PI / 2 && (l = l > 0 ? Math.PI - l : -Math.PI - l);
	let u = Math.log(Math.tan(l / 2 + Math.PI / 4) / Math.tan(o / 2 + Math.PI / 4)), d = Math.abs(u) > 1e-11 ? c / u : Math.cos(o);
	return [((a + i * Math.sin(s) / d) * 180 / Math.PI + 540) % 360 - 180, l * 180 / Math.PI];
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+transform-rotate@7.3.5/node_modules/@turf/transform-rotate/dist/esm/index.js
function Ie(e, t, n) {
	if (n ||= {}, !H(n)) throw Error("options is invalid");
	let r = n.pivot, i = n.mutate;
	if (!e) throw Error("geojson is required");
	if (t == null || isNaN(t)) throw Error("angle is required");
	if (t === 0) return e;
	let a = r ?? q(e);
	return (i === !1 || i === void 0) && (e = Ee(e)), K(e, function(e) {
		let n = ue(a, e) + t, r = oe(Pe(a, Me(a, e), n));
		e[0] = r[0], e[1] = r[1];
	}), e;
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+length@7.3.5/node_modules/@turf/length/dist/esm/index.js
function Le(e, t = {}) {
	return _e(e, (e, n) => {
		let r = n.geometry.coordinates;
		return e + G(r[0], r[1], t);
	}, 0);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+midpoint@7.3.5/node_modules/@turf/midpoint/dist/esm/index.js
function Re(e, t) {
	let n = G(e, t), r = W(e, t);
	return le(e, n / 2, r);
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+transform-scale@7.3.5/node_modules/@turf/transform-scale/dist/esm/index.js
function ze(e, t, n) {
	if (n ||= {}, !H(n)) throw Error("options is invalid");
	let r = n.origin || "centroid", i = n.mutate || !1;
	if (!e) throw Error("geojson required");
	if (typeof t != "number" || t <= 0) throw Error("invalid factor");
	let a = Array.isArray(r) || typeof r == "object";
	return i !== !0 && (e = Ee(e)), e.type === "FeatureCollection" && !a ? (fe(e, function(n, i) {
		e.features[i] = Be(n, t, r);
	}), e) : Be(e, t, r);
}
function Be(e, t, n) {
	let r = se(e) === "Point", i = Ve(e, n);
	return t === 1 || r ? e : (K(e, function(e) {
		let n = Me(i, e), r = ue(i, e), a = oe(Pe(i, n * t, r));
		e[0] = a[0], e[1] = a[1], e.length === 3 && (e[2] *= t);
	}), delete e.bbox, e);
}
function Ve(e, t) {
	if (t ??= "centroid", Array.isArray(t) || typeof t == "object") return U(t);
	let n = e.bbox ? e.bbox : we(e, { recompute: !0 }), r = n[0], i = n[1], a = n[2], o = n[3];
	switch (t) {
		case "sw":
		case "southwest":
		case "westsouth":
		case "bottomleft": return F([r, i]);
		case "se":
		case "southeast":
		case "eastsouth":
		case "bottomright": return F([a, i]);
		case "nw":
		case "northwest":
		case "westnorth":
		case "topleft": return F([r, o]);
		case "ne":
		case "northeast":
		case "eastnorth":
		case "topright": return F([a, o]);
		case "center": return Te(e);
		case void 0:
		case null:
		case "centroid": return q(e);
		default: throw Error("invalid origin");
	}
}
//#endregion
//#region ../../node_modules/.pnpm/@turf+transform-translate@7.3.5/node_modules/@turf/transform-translate/dist/esm/index.js
function He(e, t, n, r) {
	if (r ||= {}, !H(r)) throw Error("options is invalid");
	var i = r.units, a = r.zTranslation, o = r.mutate;
	if (!e) throw Error("geojson is required");
	if (t == null || isNaN(t)) throw Error("distance is required");
	if (a && typeof a != "number" && isNaN(a)) throw Error("zTranslation is not a number");
	if (a = a === void 0 ? 0 : a, t === 0 && a === 0) return e;
	if (n == null || isNaN(n)) throw Error("direction is required");
	return t < 0 && (t = -t, n += 180), (o === !1 || o === void 0) && (e = Ee(e)), K(e, function(e) {
		var r = oe(Pe(e, t, n, { units: i }));
		e[0] = r[0], e[1] = r[1], a && e.length === 3 && (e[2] += a);
	}), e;
}
//#endregion
//#region src/composables/useDrawing.ts
var Ue = 0;
function J() {
	return `draw-${++Ue}`;
}
function We(e, t, n) {
	let r = n[0] - t[0], i = n[1] - t[1];
	if (r === 0 && i === 0) {
		let n = e[0] - t[0], r = e[1] - t[1];
		return n * n + r * r;
	}
	let a = ((e[0] - t[0]) * r + (e[1] - t[1]) * i) / (r * r + i * i);
	a = Math.max(0, Math.min(1, a));
	let o = t[0] + a * r - e[0], s = t[1] + a * i - e[1];
	return o * o + s * s;
}
function Ge(e, t) {
	let n = Infinity, r = 1;
	for (let i = 0; i < e.length - 1; i++) {
		let a = We(t, e[i], e[i + 1]);
		a < n && (n = a, r = i + 1);
	}
	return r;
}
function Y(e, t, n, r) {
	let i = n.project(e), a = n.project(t), o = a.x - i.x, s = a.y - i.y, c = Math.hypot(o, s), l = Math.atan2(s, o), u = [
		0,
		2 * Math.PI / 3,
		4 * Math.PI / 3
	].map((e) => {
		let t = l + e, r = i.x + c * Math.cos(t), a = i.y + c * Math.sin(t), o = n.unproject([r, a]);
		return [o.lng, o.lat];
	}), d = r ?? J(), f = I([[...u, u[0]]], {
		drawMode: "triangle",
		id: d,
		_anchor: e,
		_edge: t
	});
	return f.id = d, f;
}
function X(e, t, n, r) {
	let i = n.project(e), a = n.project(t), o = a.x - i.x, s = a.y - i.y, c = Math.max(Math.abs(o), Math.abs(s)), l = Math.sign(o) || 1, u = Math.sign(s) || 1, d = [
		[i.x, i.y],
		[i.x + c * l, i.y],
		[i.x + c * l, i.y + c * u],
		[i.x, i.y + c * u],
		[i.x, i.y]
	].map(([e, t]) => {
		let r = n.unproject([e, t]);
		return [r.lng, r.lat];
	}), f = r ?? J(), p = I([d], {
		drawMode: "square",
		id: f,
		_anchor: e,
		_edge: t
	});
	return p.id = f, p;
}
function Z(e, t, n, r) {
	let i = n.project(e), a = n.project(t), o = a.x - i.x, s = a.y - i.y, c = Math.max(Math.hypot(o, s), 1), l = Array.from({ length: 64 }, (e, t) => {
		let r = 2 * Math.PI * t / 64, a = i.x + c * Math.cos(r), o = i.y + c * Math.sin(r), s = n.unproject([a, o]);
		return [s.lng, s.lat];
	});
	l.push(l[0]);
	let u = r ?? J(), d = I([l], {
		drawMode: "circle",
		id: u,
		_anchor: e,
		_edge: t
	});
	return d.id = u, d;
}
function Q(e) {
	if (e.length < 2) return;
	let t = J(), n = L(e, {
		drawMode: "line",
		id: t
	});
	return n.id = t, n;
}
function $(e) {
	if (e.length < 3) return;
	let t = [...e, e[0]], n = J(), r = I([t], {
		drawMode: "polygon",
		id: n
	});
	return r.id = n, r;
}
function Ke(e, t, n) {
	switch (e) {
		case "line": return Q(t);
		case "polygon": return $(t);
		case "square": return t.length >= 2 && n ? X(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		case "circle": return t.length >= 2 && n ? Z(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		case "triangle": return t.length >= 2 && n ? Y(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		default: return;
	}
}
function qe(e, t, n) {
	if (!(!e || t.length === 0)) switch (e) {
		case "line": return t.length >= 2 ? Q(t) : void 0;
		case "polygon": return t.length >= 2 ? $(t) : void 0;
		case "square": return t.length >= 2 && n ? X(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		case "circle": return t.length >= 2 && n ? Z(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		case "triangle": return t.length >= 2 && n ? Y(t[0], t.at(-1) ?? [0, 0], n) : void 0;
		default: return;
	}
}
function Je(e, t, n, r) {
	if (!(!e || !n || t.length === 0)) switch (e) {
		case "line": {
			let e = [...t, n];
			return e.length >= 2 ? Q(e) : void 0;
		}
		case "polygon": {
			let e = [...t, n];
			return e.length >= 2 ? $(e) : void 0;
		}
		case "square": return r ? X(t[0], n, r) : void 0;
		case "circle": return r ? Z(t[0], n, r) : void 0;
		case "triangle": return r ? Y(t[0], n, r) : void 0;
		default: return;
	}
}
function Ye(e, n = {}) {
	let r = p(void 0), i = p(void 0), a = p([]), o = p(n.initialFeatures ?? []), s = p(void 0), c = p(!1), l, u = p(!0), d = t(() => R(o.value)), m = t(() => qe(r.value, a.value, e.value)), h = t(() => Je(r.value, a.value, s.value, e.value)), g = t(() => !r.value || !["line", "polygon"].includes(r.value) ? R([]) : R(a.value.map((e, t) => ({
		type: "Feature",
		id: t,
		geometry: {
			type: "Point",
			coordinates: e
		},
		properties: { vertexIndex: t }
	}))));
	function _(e) {
		return e >= 1e3 ? `${(e / 1e3).toFixed(1)} km` : `${Math.round(e)} m`;
	}
	function v(e) {
		return e >= 1e6 ? `${(e / 1e6).toFixed(2)} km²` : `${Math.round(e)} m²`;
	}
	function y(e) {
		let t = e.geometry;
		if (t.type === "LineString") {
			let t = Le(e, { units: "kilometres" }) * 1e3;
			return {
				...e,
				properties: {
					...e.properties,
					_length: t
				}
			};
		}
		if (t.type === "Polygon") {
			let t = ve(e);
			return {
				...e,
				properties: {
					...e.properties,
					_area: t
				}
			};
		}
		return e;
	}
	let b = t(() => {
		let e = [];
		for (let t of o.value) {
			let n = t.geometry;
			if (n.type === "LineString") {
				let r = typeof t.properties._length == "number" ? t.properties._length : Le(t, { units: "kilometres" }) * 1e3, i = n.coordinates;
				if (i.length >= 2) {
					let n = Re(F(i[0]), F(i.at(-1)));
					e.push({
						type: "Feature",
						id: `${t.id}-label`,
						geometry: n.geometry,
						properties: {
							label: _(r),
							featureId: t.id
						}
					});
				}
			} else if (n.type === "Polygon") {
				let n = typeof t.properties._area == "number" ? t.properties._area : ve(t), r = q(t);
				e.push({
					type: "Feature",
					id: `${t.id}-label`,
					geometry: r.geometry,
					properties: {
						label: v(n),
						featureId: t.id
					}
				});
			}
		}
		return R(e);
	}), x = t(() => {
		if (!r.value || ![
			"square",
			"circle",
			"triangle"
		].includes(r.value) || a.value.length === 0) return;
		let [e, t] = a.value[0];
		return {
			type: "Feature",
			id: "anchor",
			geometry: {
				type: "Point",
				coordinates: [e, t]
			},
			properties: { role: "anchor" }
		};
	});
	function ee(e) {
		C(), r.value = e, i.value = void 0;
	}
	function S() {
		if (!r.value) return;
		let t = Ke(r.value, a.value, e.value);
		t && (o.value = [...o.value, y(t)], i.value = t.id), a.value = [], r.value = void 0;
	}
	function C() {
		a.value = [], r.value = void 0;
	}
	function w(e) {
		r.value && C(), i.value = e;
	}
	function T(e) {
		o.value = o.value.filter((t) => t.id !== e), i.value === e && (i.value = void 0);
	}
	function te() {
		i.value && T(i.value);
	}
	function E(e) {
		i.value && (o.value = o.value.map((t) => t.id === i.value ? e(t) : t));
	}
	function ne(e, t, n) {
		function r(e) {
			return e.map(([e, r, ...i]) => [
				e + t,
				r + n,
				...i
			]);
		}
		let i = e.geometry, a;
		switch (i.type) {
			case "LineString":
				a = {
					...i,
					coordinates: r(i.coordinates)
				};
				break;
			case "Polygon":
				a = {
					...i,
					coordinates: i.coordinates.map(r)
				};
				break;
			case "Point": {
				let [e, r, ...o] = i.coordinates;
				a = {
					...i,
					coordinates: [
						e + t,
						r + n,
						...o
					]
				};
				break;
			}
			default: a = i;
		}
		let o = { ...e.properties };
		return Array.isArray(o._anchor) && (o._anchor = [o._anchor[0] + t, o._anchor[1] + n]), Array.isArray(o._edge) && (o._edge = [o._edge[0] + t, o._edge[1] + n]), {
			...e,
			geometry: a,
			properties: o
		};
	}
	function D(e, t) {
		let [n, r] = q(e).geometry.coordinates;
		function i(e) {
			return e.map(([e, i, ...a]) => [
				n + (e - n) * t,
				r + (i - r) * t,
				...a
			]);
		}
		let a = e.geometry, o;
		o = a.type === "LineString" ? {
			...a,
			coordinates: i(a.coordinates)
		} : a.type === "Polygon" ? {
			...a,
			coordinates: a.coordinates.map(i)
		} : a;
		let s = { ...e.properties };
		return Array.isArray(s._anchor) && (s._anchor = [n + (s._anchor[0] - n) * t, r + (s._anchor[1] - r) * t]), Array.isArray(s._edge) && (s._edge = [n + (s._edge[0] - n) * t, r + (s._edge[1] - r) * t]), {
			...e,
			geometry: o,
			properties: s
		};
	}
	function O(e) {
		u.value = e;
	}
	function k(e, t) {
		u.value ? E((n) => {
			let r = He(n, G(F([0, 0]), F([e, t]), { units: "kilometres" }), W(F([0, 0]), F([e, t])), { units: "kilometres" });
			return r.id = n.id, r.properties = { ...n.properties }, r;
		}) : E((n) => ne(n, e, t));
	}
	function A(e) {
		u.value ? E((t) => {
			let n = ze(t, e);
			return n.id = t.id, n.properties = { ...t.properties }, y(n);
		}) : E((t) => y(D(t, e)));
	}
	function j(e) {
		E((t) => {
			let n = Ie(t, e);
			return n.id = t.id, n.properties = { ...t.properties }, n;
		});
	}
	function M(e, t) {
		if (!i.value) return;
		let n = o.value.find((e) => e.id === i.value);
		if (!n) return;
		let r = n.geometry;
		if (r.type === "LineString") {
			let a = [...r.coordinates];
			if (e < 0 || e >= a.length) return;
			a[e] = t;
			let s = y({
				...n,
				geometry: {
					...r,
					coordinates: a
				},
				properties: { ...n.properties }
			});
			o.value = o.value.map((e) => e.id === i.value ? s : e);
		} else if (r.type === "Polygon") {
			let a = r.coordinates.map((e) => [...e]), s = a[0];
			if (!s || e < 0 || e >= s.length - 1) return;
			s[e] = t, e === 0 && (s[s.length - 1] = t);
			let c = y({
				...n,
				geometry: {
					...r,
					coordinates: a
				},
				properties: { ...n.properties }
			});
			o.value = o.value.map((e) => e.id === i.value ? c : e);
		}
	}
	function N(e, t) {
		let n = o.value.find((t) => t.id === e);
		if (!n) return;
		let r = n.geometry;
		if (r.type === "LineString") {
			if (r.coordinates.length <= 2) return;
			let i = r.coordinates.filter((e, n) => n !== t);
			o.value = o.value.map((t) => t.id === e ? y({
				...n,
				geometry: {
					...r,
					coordinates: i
				},
				properties: { ...n.properties }
			}) : t);
		} else if (r.type === "Polygon") {
			let i = [...r.coordinates[0] ?? []];
			if (i.length - 1 <= 3) return;
			i.splice(t, 1), t === 0 && (i[i.length - 1] = i[0]), o.value = o.value.map((t) => t.id === e ? y({
				...n,
				geometry: {
					...r,
					coordinates: [i]
				},
				properties: { ...n.properties }
			}) : t);
		}
	}
	function P(e, t) {
		let n = o.value.find((t) => t.id === e);
		if (!n) return;
		let r = n.geometry;
		if (r.type === "LineString") {
			let i = [...r.coordinates], a = Ge(i, t);
			i.splice(a, 0, t), o.value = o.value.map((t) => t.id === e ? y({
				...n,
				geometry: {
					...r,
					coordinates: i
				},
				properties: { ...n.properties }
			}) : t);
		} else if (r.type === "Polygon") {
			let i = [...r.coordinates[0] ?? []], a = Ge(i, t);
			i.splice(a, 0, t), o.value = o.value.map((t) => t.id === e ? y({
				...n,
				geometry: {
					...r,
					coordinates: [i]
				},
				properties: { ...n.properties }
			}) : t);
		}
	}
	function I() {
		if (!i.value) return;
		let e = o.value.find((e) => e.id === i.value);
		if (e?.geometry.type !== "LineString") return;
		let t = [...e.geometry.coordinates];
		if (t.length < 2) return;
		if (t.length === 2) {
			let e = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
			t = [
				t[0],
				e,
				t[1]
			];
		}
		let n = Math.floor(t.length / 2), r = t.slice(0, n + 1), a = t.slice(n), s = J(), c = L(r, {
			drawMode: "line",
			id: s
		});
		c.id = s;
		let l = J(), u = L(a, {
			drawMode: "line",
			id: l
		});
		u.id = l, o.value = [
			...o.value.filter((e) => e.id !== i.value),
			c,
			u
		], i.value = s;
	}
	function re(e, t) {
		let n = o.value.find((t) => t.id === e), r = o.value.find((e) => e.id === t);
		if (!n || !r || n.geometry.type !== "LineString" || r.geometry.type !== "LineString") return;
		let a = [...n.geometry.coordinates], s = [...r.geometry.coordinates], c = (e, t) => {
			let n = e[0] - t[0], r = e[1] - t[1];
			return n * n + r * r;
		}, l = a[0], u = a.at(-1) ?? [0, 0], d = s[0], f = s.at(-1) ?? [0, 0], p = [
			{
				d: c(u, d),
				merged: [...a, ...s]
			},
			{
				d: c(u, f),
				merged: [...a, ...[...s].reverse()]
			},
			{
				d: c(l, f),
				merged: [...s, ...a]
			},
			{
				d: c(l, d),
				merged: [...[...s].reverse(), ...a]
			}
		].reduce((e, t) => t.d < e.d ? t : e, {
			d: Infinity,
			merged: []
		}), m = J(), h = L(p.merged, {
			drawMode: "line",
			id: m
		});
		h.id = m, o.value = [...o.value.filter((n) => n.id !== e && n.id !== t), h], i.value = m;
	}
	function z(e) {
		o.value = e;
	}
	function B(e) {
		let { lng: t, lat: n } = e.lngLat;
		if (s.value = [t, n], !(!c.value || !l)) if (l.type === "feature") {
			let e = t - l.startLng, r = n - l.startLat;
			l.startLng = t, l.startLat = n, k(e, r);
		} else l.type === "vertex" && M(l.vertexIndex, [t, n]);
	}
	function V(t) {
		if (r.value) return;
		let n = e.value;
		if (!n) return;
		let { x: a, y: o } = t.point, s = [[a - 8, o - 8], [a + 8, o + 8]], u = n.queryRenderedFeatures(s, { layers: ["map-draw-vertices-circle"] });
		if (u.length > 0 && i.value) {
			let e = u[0].properties?.vertexIndex;
			if (e != null) {
				let { lng: r, lat: a } = t.lngLat;
				c.value = !0, l = {
					type: "vertex",
					featureId: i.value,
					vertexIndex: e,
					startLng: r,
					startLat: a
				}, n.dragPan?.disable();
				return;
			}
		}
		let d = n.queryRenderedFeatures(s, { layers: ["map-draw-fill", "map-draw-line"] });
		if (d.length > 0) {
			let e = d[0].id ?? d[0].properties?.id, r = e == null ? void 0 : String(e);
			if (r) {
				let { lng: e, lat: a } = t.lngLat;
				i.value !== r && w(r), c.value = !0, l = {
					type: "feature",
					featureId: r,
					startLng: e,
					startLat: a
				}, n.dragPan?.disable();
			}
		}
	}
	function ie(t) {
		c.value && (c.value = !1, l = void 0, e.value?.dragPan?.enable());
	}
	function ae() {
		let t = e.value;
		t && (o.value = o.value.map((e) => {
			let { drawMode: n, _anchor: r, _edge: i } = e.properties ?? {};
			if (!r || !i) return e;
			let a;
			switch (n) {
				case "square":
					a = X(r, i, t, e.id);
					break;
				case "circle":
					a = Z(r, i, t, e.id);
					break;
				case "triangle":
					a = Y(r, i, t, e.id);
					break;
				default: return e;
			}
			return typeof e.properties._area == "number" && (a = {
				...a,
				properties: {
					...a.properties,
					_area: e.properties._area
				}
			}), a;
		}));
	}
	function H(t) {
		if (!r.value) {
			let n = e.value;
			if (!n) return;
			let { x: r, y: i } = t.point, a = [[r - 6, i - 6], [r + 6, i + 6]], o = n.queryRenderedFeatures(a, { layers: ["map-draw-fill", "map-draw-line"] });
			if (o.length > 0) {
				let e = o[0].id ?? o[0].properties?.id, t = e == null ? void 0 : String(e);
				t && w(t);
			} else w(void 0);
			return;
		}
		let { lng: n, lat: i } = t.lngLat, o = [n, i];
		if ([
			"square",
			"circle",
			"triangle"
		].includes(r.value)) {
			a.value.length === 0 ? a.value = [o] : (a.value = [...a.value, o], S());
			return;
		}
		a.value = [...a.value, o];
	}
	function U(t) {
		if (!r.value) {
			let n = e.value;
			if (!n) return;
			let { x: r, y: a } = t.point, o = [[r - 8, a - 8], [r + 8, a + 8]], s = n.queryRenderedFeatures(o, { layers: ["map-draw-vertices-circle"] });
			if (s.length > 0 && i.value) {
				let e = s[0].properties?.vertexIndex;
				if (e != null) {
					N(i.value, e), t.originalEvent?.preventDefault();
					return;
				}
			}
			let c = n.queryRenderedFeatures(o, { layers: ["map-draw-fill", "map-draw-line"] });
			if (c.length > 0) {
				let e = c[0].id ?? c[0].properties?.id, n = e == null ? void 0 : String(e);
				if (n) {
					let { lng: e, lat: r } = t.lngLat;
					P(n, [e, r]), w(n), t.originalEvent?.preventDefault();
				}
			}
			return;
		}
		a.value = a.value.slice(0, -1), S();
	}
	return {
		mode: f(r),
		features: d,
		selectedId: f(i),
		geodesic: u,
		draftVertices: f(a),
		draftFeature: m,
		ghostFeature: h,
		draftVertexPoints: g,
		anchorPoint: x,
		isDragging: f(c),
		startDrawing: ee,
		finishDrawing: S,
		cancelDrawing: C,
		selectFeature: w,
		deleteSelected: te,
		deleteFeature: T,
		moveSelected: k,
		scaleSelected: A,
		setGeodesic: O,
		rotateSelected: j,
		updateVertex: M,
		removeVertex: N,
		insertVertex: P,
		splitSelected: I,
		joinLines: re,
		setFeatures: z,
		handleMapClick: H,
		handleMapDblClick: U,
		handleMapMouseMove: B,
		handleMapMouseDown: V,
		handleMapMouseUp: ie,
		handleMapMoveEnd: ae,
		measureLabels: b
	};
}
//#endregion
//#region src/components/MapDraw/MapDraw.vue
var Xe = /* @__PURE__ */ a({
	__name: "MapDraw",
	props: {
		mode: { default: void 0 },
		modelValue: { default: () => [] },
		geodesic: {
			type: Boolean,
			default: !0
		},
		strokeColor: { default: j.primary[500] },
		fillColor: { default: j.primary[500] },
		fillOpacity: { default: .2 },
		strokeWidth: { default: 2 },
		draftColor: { default: j.warning[500] },
		vertexColor: { default: j.white }
	},
	emits: [
		"update:modelValue",
		"update:mode",
		"select",
		"update:geodesic"
	],
	setup(n, { expose: a, emit: o }) {
		let s = n, c = j.warning[500], l = o, { map: d } = w(), f = Ye(d, { initialFeatures: s.modelValue });
		v(() => s.geodesic, (e) => {
			f.geodesic.value !== (e !== !1) && f.setGeodesic(e !== !1);
		}, { immediate: !0 }), v(f.geodesic, (e) => {
			s.geodesic !== !1 != !!e && l("update:geodesic", !!e);
		}), v(() => s.mode, (e) => {
			e !== f.mode.value && (e === null ? f.cancelDrawing() : f.startDrawing(e));
		}, { immediate: !0 });
		let p = !1;
		v(() => s.modelValue, (e) => {
			p || f.setFeatures(e ?? []);
		}), v(f.features, (e) => {
			p = !0, l("update:modelValue", e.features), Promise.resolve().then(() => {
				p = !1;
			});
		}), v(() => f.selectedId.value, (e) => {
			l("select", e ?? null);
		}), v(d, (e, t) => {
			t && (t.off("click", f.handleMapClick), t.off("dblclick", f.handleMapDblClick), t.off("mousemove", f.handleMapMouseMove), t.off("mousedown", f.handleMapMouseDown), t.off("mouseup", f.handleMapMouseUp), t.off("moveend", f.handleMapMoveEnd), t.off("zoomend", f.handleMapMoveEnd)), e && (e.on("click", f.handleMapClick), e.on("dblclick", f.handleMapDblClick), e.on("mousemove", f.handleMapMouseMove), e.on("mousedown", f.handleMapMouseDown), e.on("mouseup", f.handleMapMouseUp), e.on("moveend", f.handleMapMoveEnd), e.on("zoomend", f.handleMapMoveEnd));
		}, { immediate: !0 }), v([
			() => f.isDragging.value,
			() => f.mode.value,
			() => f.selectedId.value
		], ([e, t, n]) => {
			let r = d.value?.getCanvas();
			r && (t ? r.style.cursor = "crosshair" : e ? r.style.cursor = "grabbing" : n ? r.style.cursor = "grab" : r.style.cursor = "");
		});
		let h = t(() => ({
			type: "geojson",
			data: f.features.value,
			promoteId: "id"
		})), g = t(() => ({
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: f.ghostFeature.value ? [f.ghostFeature.value] : []
			}
		})), b = t(() => ({
			type: "geojson",
			data: f.draftVertexPoints.value
		})), x = t(() => ({
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: f.anchorPoint.value ? [f.anchorPoint.value] : []
			}
		})), ee = t(() => ({
			type: "geojson",
			data: f.measureLabels.value
		})), S = t(() => ({
			type: "geojson",
			data: {
				type: "FeatureCollection",
				features: f.draftFeature.value ? [f.draftFeature.value] : []
			}
		})), C = t(() => {
			let e = f.features.value.features.find((e) => e.id === f.selectedId.value);
			if (!e) return {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: []
				}
			};
			let t = e.geometry, n = [];
			return t.type === "LineString" ? n = t.coordinates : t.type === "Polygon" && (n = t.coordinates[0]?.slice(0, -1) ?? []), {
				type: "geojson",
				data: {
					type: "FeatureCollection",
					features: n.map((e, t) => ({
						type: "Feature",
						id: t,
						geometry: {
							type: "Point",
							coordinates: e
						},
						properties: { vertexIndex: t }
					}))
				}
			};
		}), T = t(() => ({
			"fill-color": s.fillColor,
			"fill-opacity": [
				"case",
				[
					"==",
					["get", "id"],
					f.selectedId.value ?? ""
				],
				Math.min(s.fillOpacity * 1.5, 1),
				s.fillOpacity
			]
		})), te = t(() => ({
			"line-color": s.strokeColor,
			"line-width": s.strokeWidth
		})), E = t(() => ({
			"fill-color": s.draftColor,
			"fill-opacity": s.fillOpacity
		})), ne = t(() => ({
			"line-color": s.draftColor,
			"line-width": s.strokeWidth,
			"line-dasharray": [2, 2]
		})), D = t(() => ({
			"circle-radius": 6,
			"circle-color": s.vertexColor,
			"circle-stroke-color": s.strokeColor,
			"circle-stroke-width": 2
		})), k = t(() => ({
			"circle-radius": 5,
			"circle-color": c,
			"circle-stroke-color": j.white,
			"circle-stroke-width": 2
		})), M = t(() => ({
			"circle-radius": 7,
			"circle-color": s.draftColor,
			"circle-stroke-color": j.white,
			"circle-stroke-width": 2
		})), N = t(() => ({
			"fill-color": s.draftColor,
			"fill-opacity": s.fillOpacity * .6
		})), P = t(() => ({
			"line-color": s.draftColor,
			"line-width": s.strokeWidth,
			"line-dasharray": [3, 3],
			"line-opacity": .75
		})), F = t(() => ({
			"text-field": ["get", "label"],
			"text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
			"text-size": 12,
			"text-anchor": "top",
			"text-offset": [0, .5],
			"text-allow-overlap": !1,
			"text-ignore-placement": !1
		})), I = t(() => ({
			"text-color": j.neutral[900],
			"text-halo-color": j.white,
			"text-halo-width": 2
		}));
		return a({ drawing: f }), (t, n) => (u(), r(e, null, [
			i(O, {
				id: "map-draw-committed",
				source: h.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-fill",
					type: "fill",
					source: "map-draw-committed",
					filter: [
						"==",
						["geometry-type"],
						"Polygon"
					],
					paint: T.value
				} }, null, 8, ["layer"]), i(A, { layer: {
					id: "map-draw-line",
					type: "line",
					source: "map-draw-committed",
					paint: te.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-ghost",
				source: g.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-ghost-fill",
					type: "fill",
					source: "map-draw-ghost",
					filter: [
						"==",
						["geometry-type"],
						"Polygon"
					],
					paint: N.value
				} }, null, 8, ["layer"]), i(A, { layer: {
					id: "map-draw-ghost-line",
					type: "line",
					source: "map-draw-ghost",
					paint: P.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-draft-vertices",
				source: b.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-draft-vertices-circle",
					type: "circle",
					source: "map-draw-draft-vertices",
					paint: k.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-anchor",
				source: x.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-anchor-circle",
					type: "circle",
					source: "map-draw-anchor",
					paint: M.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-draft",
				source: S.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-draft-fill",
					type: "fill",
					source: "map-draw-draft",
					filter: [
						"==",
						["geometry-type"],
						"Polygon"
					],
					paint: E.value
				} }, null, 8, ["layer"]), i(A, { layer: {
					id: "map-draw-draft-line",
					type: "line",
					source: "map-draw-draft",
					paint: ne.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-measure",
				source: ee.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-measure-labels",
					type: "symbol",
					source: "map-draw-measure",
					layout: F.value,
					paint: I.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			i(O, {
				id: "map-draw-vertices",
				source: C.value
			}, {
				default: y(() => [i(A, { layer: {
					id: "map-draw-vertices-circle",
					type: "circle",
					source: "map-draw-vertices",
					paint: D.value
				} }, null, 8, ["layer"])]),
				_: 1
			}, 8, ["source"]),
			m(t.$slots, "default", { drawing: _(f) })
		], 64));
	}
});
//#endregion
export { Xe as MapDraw, A as MapLayer, C as MapLibre, te as MapMarker, ne as MapPopup, O as MapSource, S as mapKey, Ye as useDrawing, k as useLayer, w as useMap, T as useMarker, E as usePopup, D as useSource };
