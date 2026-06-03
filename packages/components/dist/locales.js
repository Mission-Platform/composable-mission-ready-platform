import { defineLocales as e } from "@mission-platform/i18n";
//#endregion
//#region src/locales/index.ts
var t = e({ en: {
	required: {
		t: 0,
		b: {
			t: 2,
			i: [{ t: 3 }],
			s: "required"
		}
	},
	loading: {
		t: 0,
		b: {
			t: 2,
			i: [{ t: 3 }],
			s: "Loading…"
		}
	}
} });
//#endregion
export { t as locales };
