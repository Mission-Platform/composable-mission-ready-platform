# @mission-platform/forge-adapters

ترجمة آلية مساعدة من المصدر الإنجليزي الأساسي. تُراجع يدويًا عند الحاجة. تبقى أسماء الحزم والأوامر والمسارات والمعرّفات التقنية دون تغيير.

> packages/core/forge-adapters/docs/index.md: [packages/core/forge-adapters/docs/index.md](../../index.md)
> اللغة: العربية (ar)

محولات إطار العمل لوقت تشغيل `@mission-platform/forge-jsx` المحايد.
يتم تأليف المكونات مرة واحدة مقابل Forge JSX ويتم عرضها من خلال المحول
للإطار المستهدف.

## صادرات

| دخول | الغرض |
| ------------------------------------------------- | -------------------------------------------- |
| `@mission-platform/forge-adapters/react` | `toReactComponent` and `renderToReact`       |
| `@mission-platform/forge-adapters/vue` | `toVueComponent` و `renderToVue` |
| `@mission-platform/forge-adapters/solid` | علامة SolidJS والأوليات الهيكلية |
| `@mission-platform/forge-adapters/svelte` | Svelte مساعدات العرض |
| `@mission-platform/forge-adapters/web-components` | العنصر المخصص الأصلي ووقت تشغيل DOM المباشر |

حزم الإطار هي تبعيات نظير اختيارية. تثبيت الإطار المستخدم
بواسطة المحول المحدد واستيراد المسار الفرعي الخاص به فقط.

```ts
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { MyComponent } from '@mission-platform/components';

const VueComponent = toVueComponent(MyComponent);
```
