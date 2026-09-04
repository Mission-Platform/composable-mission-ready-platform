# Package API Directory

This project-wide page is a directory of package capabilities and compatibility
contracts. The canonical installation, usage, limitations, and API details for
each package live beside that package under its full `packages/**/docs/` path. Generated API references must be added to the owning
package rather than this page.

> **الواردات دائمًا عارية.** شحن الإطار `@mission-platform/*` حزم تعرض واحدة `.`
> دخول يحرسه `mp:vue`, `mp:react`, `mp:solid`، و `mp:web-component` تصدير
> الشروط. حدد الإطار **مرة واحدة** — عبر `resolve.conditions` (يرى `defineFrameworkAppConfig` /
> `frameworkResolveConditions` من `@mission-platform/vite-config`) و `customConditions` (عبر
> `@mission-platform/typescript-config/framework-<name>` الإعدادات المسبقة) - ثم قم باستيراد كل شيء بالعارية
> محدد الحزمة. يرى [إعداد المستهلك الخارجي](external-consumer-setup.md).

## الإطار الأساسي

### @mission-platform/forge

أساس بنية "الكتابة مرة واحدة"، مما يوفر وقت تشغيل JSX وخطافات محايدة لإطار العمل.

| تصدير              | اكتب  | الوصف                                                                                                    |
| :----------------- | :---- | :------------------------------------------------------------------------------------------------------- |
| `h`, `Fragment`    | وظيفة | مصنع JSX وجزء لمكونات التأليف.                                                           |
| `useState`         | هوك   | Framework-neutral state hook.                                                            |
| `useEffect`        | هوك   | خطاف ذو تأثير محايد للإطار.                                                              |
| `useMemo`          | هوك   | Framework-neutral memoization hook.                                                      |
| `useRef`           | هوك   | خطاف مرجعي محايد للإطار.                                                                 |
| `useContext`       | هوك   | ربط سياق محايد للإطار.                                                                   |
| `toVueComponent`   | محول  | تحويل مكون صياغة إلى Vue 3 مكون (من `@mission-platform/forge/vue`).   |
| `toReactComponent` | محول  | تحويل مكون صياغة إلى React مكون (من `@mission-platform/forge/react`). |

### @mission-platform/vite-plugin-forge

The compiler driver accepts explicit `FrameworkOutputPlugin` instances; it does
not provide a framework registry. `defineViteForgeComponents` and
`defineTsdownForgeComponents` (plus the hook and CMS helpers) share an in-process
`ForgeCompilerService` for one build or watch session.

| Capability         | الوصف                                                                                                                                                                               |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service lifecycle  | Reuse source, graph, parsed-source, semantic-IR, and target-artifact state across builds; dispose one-shot services after completion and watcher services on close. |
| Cache keys         | Source/dependency/config fingerprints, compiler and router options, `tsconfig` `baseUrl`/`paths`, target ID, plugin identity/version, and relevant conditions.      |
| Watch invalidation | Changed files invalidate reverse graph dependents, including transitive component and hook entries; unrelated target snapshots remain reusable.                     |
| Diagnostics/report | Reports phase timing, cache hit/miss counts, affected files, warnings, errors, and emitted artifact counts. Errors block promotion.                 |
| Artifact manifest  | Lists target-scoped entries, modules, declarations, source maps, assets, and checksums before atomic promotion.                                                     |
| Extension point    | Implement and pass a `FrameworkOutputPlugin` from a caller-owned `forge-plugin-*` package; do not add target branches to the neutral driver.                        |

Configure aliases through the project `tsconfig.json` (`baseUrl` and
`paths`); Vite and tsdown graph preparation use the same alias facts. Router
selection, router plugins, and conditions are forwarded through component and
hook helpers. A future worker/daemon may sit behind the service contract, but
the supported implementation is currently in-process.

### @mission-platform/router

Framework-neutral route contracts, pure matching helpers, and compiler markers for
shared packages. Applications own route records and native router instances; the
Forge router target selected by the application supplies the runtime capabilities.

| تصدير                                                                | اكتب                | الوصف                                                                                                                                                 |
| :------------------------------------------------------------------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MpRoute`                                                            | محول                | Route records, params, query/hash state, metadata, and navigation targets.                                                            |
| `defineRoutes`                                                       | وظيفة               | Define route trees and resolve paths without a DOM or framework runtime.                                                              |
| `MpNavigationResult`, `MpRouteGuard`, `MpHistory`, `MpRouterAdapter` | اكتب                | Navigation outcomes/events, guards, pluggable history, and adapter contracts.                                                         |
| `useMpRoute`                                                         | Compiler markers    | Neutral link, route-state, navigation, resolution, and outlet capabilities consumed by shared packages.                               |
| `@mission-platform/forge-router-*`                                   | صياغة أهداف المترجم | Independently selected native router targets for Vue Router, React Router, SolidJS Router, SvelteKit, RedwoodSDK, and Web Components. |

Runtime packages own history and reactive state; the neutral package never imports a UI framework. For Web Components,
register the elements once and pass complex targets through DOM properties rather than serialized attributes:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from "@mission-platform/forge-router-web-components/runtime";

registerRouterElements();
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  routes: [{ path: "/overview", component: () => "Documentation" }],
});
setForgeRouter(router);
const link = document.createElement("forge-router-link");
link.to = { path: "/overview", query: { q: "router" }, hash: "results" };
link.router = router;
```

### Async route views and `Suspense`

Forge's neutral compiler recognizes `Suspense` and lowers it to the native
async boundary for the selected target. Keep the fallback in the shared source
so every target presents the same loading state without importing a framework
adapter:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

React, Vue, Solid, and Svelte receive their native suspense boundary. A
framework-free application uses the Web Components router's outlet fallback
for async route views instead:

```ts
const router = createWebComponentsRouter({
  history: new MpMemoryHistory("/overview"),
  loadingFallback: () => {
    const spinner = document.createElement("span");
    spinner.className = "docs-loading-spinner";
    spinner.setAttribute("aria-label", "Loading documentation");
    return spinner;
  },
  routes: [{ path: "/:slug(.*)", component: loadDocumentationView }],
});
```

The router emits a loading overlay from `forge-router-outlet` while the async
route view resolves. The current view remains mounted until the destination is
ready, and the overlay is removed after success, redirect, cancellation, or
failure.

## واجهة المستخدم والتصميم

### @mission-platform/tokens

رموز التصميم المركزية للألوان والطباعة والمسافات.

| تصدير         | Description                                                                                                          |
| :------------ | :------------------------------------------------------------------------------------------------------------------- |
| `tokens`      | كائن JS/TS يحتوي على جميع رموز التصميم (على سبيل المثال، `tokens.color.primary`). |
| `tokens.scss` | متغيرات SCSS للاستخدام في أوراق الأنماط.                                                             |

### @mission-platform/breakpoints

المرافق سريعة الاستجابة ومكونات الرؤية.

| تصدير            | اكتب | الوصف                                                          |
| :--------------- | :--- | :------------------------------------------------------------- |
| `useBreakpoints` | هوك  | إرجاع حالة نقطة التوقف التفاعلية.              |
| `ShowIf`         | مكون | يعرض الأطفال فقط عندما يتطابق شرط نقطة التوقف. |
| `HideIf`         | مكون | إخفاء الأطفال عند تطابق شرط نقطة التوقف.       |

### @mission-platform/components

تم تأليف مكونات واجهة المستخدم المشتركة مرة واحدة وهي متاحة لأطر عمل متعددة.

- **استيراد**: دائمًا `@mission-platform/components`; النشط `mp:<framework>` الحالة تقرر ما إذا كنت ستحصل على
  Vue 3, React, Solidأو بناء مكون الويب.
- **المسارات الفرعية لكل مكون**: `@mission-platform/components/<path>` (e.g.
  `@mission-platform/components/atoms/forge-badge/forge-badge`) يدرك الحالة أيضًا، ويقوم بتحميل ذلك المكون فقط
  قطعة.
- **عناصر**: `ForgeButton`, `ForgeInput`, `ForgeModal`وأكثر من ذلك.

## حزم الميزات

### @mission-platform/i18n

نظام التدويل على أساس i18next.

| تصدير             | الوصف                                                                         |
| :---------------- | :---------------------------------------------------------------------------- |
| `createForgeI18N` | تهيئة مثيل i18n باستخدام الإعدادات الافتراضية للنظام الأساسي. |
| `useI18n`         | ربط للترجمات والتبديل المحلي في المكونات.                     |

### @mission-platform/seo

العلامات الوصفية وإدارة SEO.

| تصدير    | الوصف                                                                                                |
| :------- | :--------------------------------------------------------------------------------------------------- |
| `useSeo` | ربط لتعيين عنوان الصفحة والعلامات الوصفية وبيانات الرسم البياني المفتوح بشكل تعريفي. |

### @mission-platform/map

المجمع التفاعلي لـ MapLibre GL.

| مكون            | الوصف                                           |
| :-------------- | :---------------------------------------------- |
| `<MpMap>`       | مكون حاوية الخريطة الرئيسية.    |
| `<MpMapMarker>` | مكون لوضع العلامات على الخريطة. |

### @mission-platform/code-scanner

مسح الباركود القائم على الكاميرا ورمز الاستجابة السريعة.

| مكون              | الوصف                                                                    |
| :---------------- | :----------------------------------------------------------------------- |
| `<MpCodeScanner>` | المكون الذي يقوم بتهيئة دفق الكاميرا وإصدار نتائج المسح. |

## التكامل

### @mission-platform/rxjs

يربط عناصر RxJS Observables بحالة المكون.

| هوك             | الوصف                                                                        |
| :-------------- | :--------------------------------------------------------------------------- |
| `useObservable` | يشترك في عنصر يمكن ملاحظته ويعيد أحدث قيمة له كحالة تفاعلية. |

### @mission-platform/d3

تكامل D3.js المحايد للإطار.

| هوك     | الوصف                                                              |
| :------ | :----------------------------------------------------------------- |
| `useD3` | ربط تحديد D3 بمرجع مكون من خلال إدارة دورة الحياة. |

### @mission-platform/hunspell

التدقيق الإملائي المدعوم من WebAssembly.

| تصدير          | هوك                                                                    |
| :------------- | :--------------------------------------------------------------------- |
| `initHunspell` | يقوم بتحميل وحدة Hunspell WebAssembly وإنشاء مثيل لها. |
| `spell`        | التحقق مما إذا كانت الكلمة مكتوبة بشكل صحيح.           |
| `suggest`      | يوفر اقتراحات إملائية للكلمة.                          |

## Service Monitoring

### Service Monitor API

The service-monitor application provides both public and authenticated endpoints for monitoring service health.

#### Public Endpoints

Public endpoints expose only minimal status information and do not require authentication:

- **`GET /api/services`**: Returns rolled-up status for every monitored service. Response includes only `{ id, name, type }` for each service, plus `now` and `intervalSeconds`. No target configuration, URLs, hosts, queries, headers, thresholds, or topology is exposed.
- **`GET /api/metrics?service=<id>&since=<ms>`**: Returns raw time-series metrics for one service. The `since` parameter is bounded by the configured retention window. Response includes only `service`, `now`, `since`, and `samples`.

#### Authenticated Endpoints

Authenticated endpoints require the `MONITOR_API_TOKEN` bearer token and expose full monitor configuration:

- **`POST /api/check`**: Trigger an immediate probe cycle.
- **`GET /api/monitors`**: List all monitors with full configuration.
- **`POST /api/monitors`**: Create a new monitor.
- **`PATCH /api/monitors/<id>`**: Update an existing monitor.
- **`DELETE /api/monitors/<id>`**: Delete a monitor and clear its historical counters.

#### Probe and Destination Policy

Service-monitor enforces strict bounds on probe behavior:

- **Allowed schemes**: URL probes default to `https://` (and port 443) unless trusted private mode is enabled; `http://` is allowed in trusted mode.
- **Allowed ports**: URL probes allow port 443; host probes allow a baseline of ports [53, 80, 123, 443, 1883, 8883].
- **Forbidden destinations**: Private/link-local addresses (127.0.0.1, ::1, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fe80::/10) unless explicitly trusted.
- **Request/response bounds**: Probe requests are limited to 64 KB; responses are limited to 256 KB. Speed tests are limited to 25 MB.
- **Redirect policy**: Redirects must remain within the same origin and approved path prefixes; cross-origin or disallowed-path redirects are rejected.
- **History retention**: Incident, update, and maintenance history is bounded by item-count caps (max 100 items per monitor). Default retention for metric data is 24 hours.

#### Server-Side Rendering (SSR)

The service-monitor SSR layer requires authentication before serializing private monitor configuration into client props. Unauthenticated requests receive only the public status DTO.

### Email Sender Worker

The email-sender worker provides a local development showcase for email rendering and delivery.

#### Deployment Modes

- **Local development** (default): Sends to MailPit on `localhost:1025`. No authentication required.
- **Non-local deployment**: Requires explicit `EMAIL_DEPLOYMENT_TOKEN` bearer authorization, `EMAIL_ALLOWED_ORIGINS` allowlist, and `EMAIL_ALLOWED_RECIPIENTS` allowlist. Rate limiting via `EMAIL_RATE_LIMITER` is enforced.

#### Request Validation

All email requests must:

- Use `Content-Type: application/json`.
- Include a valid recipient email address (`to` field, max 254 characters).
- Include a recipient name (`recipientName`, 1–100 characters).
- Include completed email HTML (`html`, max 240 KB).
- Pass HTML compatibility checks via `assertCompatibleEmailHtml`.

#### Fail-Closed Defaults

Non-local deployments without explicit configuration will reject all requests. Local deployments remain unrestricted for development convenience.

## Forge Web Script Artifact Verification

### Artifact Content Identity

Forge Web Script artifacts use a versioned SHA-256 content identity in the format `sha256-v1:<hex>`. This digest is computed over the complete artifact binary and is stored in the artifact manifest's `contentHash` field.

#### Integrity vs. Authenticity

A content hash **detects accidental or unauthorized content changes** when compared with a trusted expected value. It does **not**:

- Authenticate the producer or origin of the artifact.
- Replace cryptographic signatures or deployment access controls.
- Guarantee the artifact is safe to execute.

#### Verification Workflow

1. **Obtain the expected hash** from a trusted source (e.g., a signed manifest, CI build log, or secure configuration).
2. **Compute the artifact hash** using the verifier: `fws_verify_artifact(artifact)` returns the `contentHash`.
3. **Compare hashes**: If they match, the artifact has not been accidentally or maliciously altered since the expected value was recorded.
4. **Verify the manifest**: Use `fws_inspect_manifest` to check capability imports, exports, metadata, and policy compliance independently.

#### Versioning

The `sha256-v1` prefix allows for future hash algorithm upgrades without ambiguity. Callers must handle both legacy (if any) and current digest formats gracefully.

## مزيد من القراءة

- [Vue 2 ل Vue 3 دليل الهجرة ](migration-guides/vue2-to-vue3.md)
- [نظرة عامة على تكوين المشروع](configs/index.md)
- [هيكل مساحة العمل](workspace-structure.md)

## استكمال فهرس حزمة مساحة العمل

يتم إنشاء الفهرس التالي من بيانات الحزمة ويتم الاحتفاظ به هنا بحيث يغطي مرجع واجهة برمجة التطبيقات العامة كل ملف
حزمة في `packages/`، بما في ذلك واجهات WebAssembly المكتوبة.

### الأساسية وواجهة المستخدم

| الحزمة                         | الغرض                                                                         |
| :----------------------------- | :---------------------------------------------------------------------------- |
| `@mission-platform/forge`      | وقت تشغيل ومحولات JSX المحايدة للإطار.                        |
| `@mission-platform/components` | مكونات واجهة المستخدم للكتابة مرة واحدة.                      |
| `@mission-platform/icons`      | مكونات أيقونة SVG للكتابة مرة واحدة.                          |
| `@mission-platform/layouts`    | مكونات التطبيق والحاوية والتخطيط سريع الاستجابة.              |
| `@mission-platform/forms`      | نماذج المخطط ومكونات منشئ النماذج المرئية.                    |
| `@mission-platform/forms-core` | Schema derivation, validation, and form-builder domain logic. |
| `@mission-platform/tokens`     | خصائص CSS المخصصة ورموز تصميم SCSS.                           |

### المركبات والتكاملات

| الحزمة                                          | الغرض                                                                                                    |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------------- |
| `@mission-platform/breakpoints`                 | حالة توقف الاستجابة ومساعدي الرؤية.                                                      |
| `@mission-platform/d3`                          | أدوات مساعدة قابلة للتركيب والهامش لدورة حياة اختيار D3.                                 |
| `@mission-platform/i18n`                        | مساعدي تكامل الحالة وإطار العمل i18next.                                                 |
| `@mission-platform/map`                         | مكونات خريطة MapLibre والمواد المركبة.                                                   |
| `@mission-platform/observers`                   | Intersection, mutation, and performance observer composables.                            |
| `@mission-platform/phone-number`                | تحليل وتنسيق رقم هاتف WebAssembly المكتوب.                                               |
| `@mission-platform/router`                      | Framework-neutral route contracts and compiler capabilities.                             |
| `@mission-platform/forge-router-web-components` | Web Components router target and framework-free runtime.                                 |
| `@mission-platform/rxjs`                        | RxJS القابلة للملاحظة والاشتراكات المركبة.                                               |
| `@mission-platform/scheduler`                   | واجهة مستخدم المجدول والتكرار ومنطق مجال تخطيط التقويم.                                  |
| `@mission-platform/vcard`                       | بيانات ومكونات RFC 6350 vCard وRFC 5545 iCalendar.                                       |
| `@mission-platform/content`                     | محتوى مكونات AST والبناة وموناكو وMarkdown وWYSIWYG.                                     |
| `@mission-platform/seo`                         | البيانات التعريفية والرسم البياني المفتوح والمكونات القابلة للتركيب من البيانات المنظمة. |
| `@mission-platform/speech-audio`                | مكونات الكلام والصوت والويب MIDI.                                                        |
| `@mission-platform/three`                       | لوحة Three.js والمكونات القابلة للتركيب لدورة الحياة.                    |

### حزم التعليمات البرمجية وWebAssembly

| الحزمة                           | الغرض                                                            |
| :------------------------------- | :--------------------------------------------------------------- |
| `@mission-platform/barcode`      | واجهة ومكون تشفير/فك تشفير الباركود 1D.          |
| `@mission-platform/code-scanner` | Camera and image code-scanning component.        |
| `@mission-platform/matrix-code`  | Data Matrix and Aztec encode/decode façade.      |
| `@mission-platform/qr-code`      | QR encode/decode façade and component.           |
| `@mission-platform/harper`       | Harper grammar and style integration for Monaco. |
| `@mission-platform/hunspell`     | Emscripten Hunspell spell-checking wrapper.      |

### Forge compiler targets

These live in `packages/compiler/plugins/`. يقرر البرنامج الإضافي **framework** وقت التشغيل الذي يعتبر مكونًا محايدًا
تم تخفيضه إلى؛ يحدد هدف **CMS** نظام المحتوى الأساسي الذي سيتم عرضه عليه. يتكون المحوران، لذلك أي CMS
قد يكون الهدف مرتبطًا بأي مكون إضافي لإطار العمل. See the [Forge Compiler Pipeline](../packages/tooling/vite/forge/docs/reference/compiler.md).

| الحزمة                                          | الغرض                                                                                             |
| :---------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `@mission-platform/forge-plugin-api`            | `FrameworkOutputPlugin` العقد وأنواع IR الدلالية وأنواع محولات البناء.            |
| `@mission-platform/forge-plugin-react`          | React هدف الإخراج.                                                                |
| `@mission-platform/forge-plugin-vue`            | Vue 3 هدف الإخراج                                                                                 |
| `@mission-platform/forge-plugin-solid`          | Solid هدف الإخراج.                                                                |
| `@mission-platform/forge-plugin-svelte`         | Svelte 5 هدف الإخراج                                                                              |
| `@mission-platform/forge-plugin-web-components` | هدف إخراج مكونات الويب.                                                           |
| `@mission-platform/forge-cms-plugin-api`        | `CmsOutputPlugin` العقد ونموذج المحتوى المحايد وبرنامج تشغيل CMS وبناء المساعدين. |
| `@mission-platform/forge-cms-storyblok`         | كائنات مكون Storyblok وأغلفة الكتلة و `components.json`.                          |
| `@mission-platform/forge-cms-astro`             | ثابت `.astro` قوالب و `client:load` جزر الإطار.                                   |
| `@mission-platform/forge-cms-ghost`             | أجزاء شبح المقاود و `config.custom` جزء الموضوع.                                  |
| `@mission-platform/forge-cms-jekyll`            | جيكل السائل يشمل، `_data` مخطط، و `_config.yml` جزء.                              |
| `@mission-platform/forge-cms-webflow`           | تدفق الويب `declareComponent` مكونات الكود و `webflow.json` جزء المكتبة.          |

#### @mission-platform/forge-cms-plugin-api

| تصدير                     | اكتب  | الوصف                                                                                                    |
| :------------------------ | :---- | :------------------------------------------------------------------------------------------------------- |
| `analyzeContentComponent` | وظيفة | يعرض دعائم مكون محايد على نموذج المحتوى المحايد للنظام الأساسي.                          |
| `ContentComponent`        | اكتب  | أمر `ContentField`ق، وفتحات، و `interactive` علَم.                                       |
| `ContentFieldKind`        | اكتب  | `text`, `richtext`, `number`, `boolean`, `option`, `asset`, `link`, `children`.          |
| `CmsOutputPlugin`         | اكتب  | العقد المستهدف: مكون إضافي لإطار عمل مقيد بالإضافة إلى الباعثات الأربعة. |
| `defineForgeCmsPlugin`    | وظيفة | التحقق من صحة هدف CMS في وقت التكوين.                                                    |
| `generateCmsArtifacts`    | وظيفة | الاكتشاف العام ← IR ← نموذج المحتوى ← انبعاث ← كتابة السائق.                             |
| `defineTsdownForgeCms`    | وظيفة | تكوين tsdown لهدف CMS واحد، ينبعث منه `dist/cms/<cms>/<framework>/**`.                   |
| `defineTsdownForgeCmsAll` | وظيفة | تكوينات tsdown للحصول على قائمة أهداف CMS.                                               |
