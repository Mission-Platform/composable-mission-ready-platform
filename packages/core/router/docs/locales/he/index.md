# @mission-platform/router

תרגום בסיוע מכונה מהמקור האנגלי הקנוני. יש לבדוק ידנית בעת הצורך. שמות חבילות, פקודות, נתיבים ומזהים טכניים נשארים ללא שינוי.

> packages/core/router/docs/index.md: [packages/core/router/docs/index.md](../../index.md)
> שפה: עברית (he)

ספריית ניתוב אגנוסטית למסגרת המספקת מודל מסלול אחיד ומתאמים לכל מסגרת עבור Vue, React ו-
מסגרות אחרות.

## סקירה כללית

חבילת `@mission-platform/router` מיישמת **מערכת ניתוב ניטרלית למסגרת** המפרידה בין המסלול
הגדרה והיגיון התאמה מפרטי יישום ספציפיים למסגרת. זה מאפשר לך להגדיר את המסלולים שלך פעם אחת
ולהשתמש בהם על פני מסגרות שונות תוך שמירה על עקביות.

## תכונות עיקריות

- **Framework-Agnostic Core**: הגדר מסלולים בפורמט ניטרלי שעובד על פני מסגרות
- ** API בטוח לסוגים**: תמיכה מלאה ב-TypeScript עבור הגדרות נתיב וניווט
- **ארכיטקטורה ניתנת לחיבור**: השתמש ברכיבי חיבור כדי לגשת למצב ניתוב ולניווט
- **דקדוק נתיב**: התאמת נתיב גמיש עם פרמטרים (`:p`, `:p?`, `:p*`, `:p+`, `*`)
- **תמיכה במחרוזת שאילתה**: ניתוח מובנה והסדרה של פרמטרי שאילתה
- **מסלולים מקוננים**: תמיכה במבני מסלולים היררכיים

## מודולים עיקריים ויצוא

### מודל מסלול ליבה

מערכת הגדרת המסלול ניטראלית במסגרת:

**`MpRoute`**: מייצג נתיב יחיד עם נתיב, שם ומטא נתונים.

**`defineRoutes`**: יוצר עץ נתיב ממערך של הגדרות נתיב.

**דוּגמָה:**

```typescript
import { defineRoutes } from '@mission-platform/router';

const routes = defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
  {
    path: '/users/:id',
    name: 'user-profile',
    component: UserProfile,
  },
]);
```

### כלי עזר לנתיבים

**`matchRoutes`**: התאמה של מיקום מול עץ נתיבים ומחזירה מסלולים תואמים.

**דוּגמָה:**

```typescript
import { matchRoutes } from '@mission-platform/router';

const matches = matchRoutes(routes, '/users/123');
matches.forEach((match) => {
  console.log(match.route.name, match.params);
});
```

### שירותי מיקום

**`resolveLocation`**: פותר מיקום נתיב לנתיב כתובת אתר.

**דוּגמָה:**

```typescript
import { resolveLocation } from '@mission-platform/router';

const location = resolveLocation({
  name: 'user-profile',
  params: { id: '123' },
});
console.log(location.path); // '/users/123'
```

## מתאמי מסגרת

מתאמים **לא** נחשפים כנתיבי משנה לכל מסגרת. `@mission-platform/router` מצהיר על
תנאי ייצוא `mp:<framework>` בערך ה-`.` היחיד שלו, אז אתה בוחר במסגרת **פעם** -
`resolve.conditions` ב-Vite (ראה `defineFrameworkAppConfig` / `frameworkResolveConditions` מ
`@mission-platform/vite-config`) ו-`customConditions` ב-TypeScript (באמצעות
`@mission-platform/typescript-config/framework-<name>` presets) - ולאחר מכן ייבא הכל עם המפרט החשוף.
כל מבנה מתאם מייצא מחדש גם את כל הליבה הנייטרלית.

### מתאם Vue (מצב `mp:vue`)

המתאם הספציפי Vue מספק אינטגרציה עם `vue-router`.

**ייצוא עיקרי:**

- **`createMpRouter`**: יוצר מופע Vue נתב ממסלולים ניטרליים
- **`useMpRouter`**: ניתן לחיבור כדי לגשת למופע הנתב
- **`useMpRoute`**: ניתן לחיבור כדי לגשת למידע על המסלול הנוכחי
- **`MpRouterLink`**: רכיב קישור נתב ניטרלי למסגרת

**דוּגמָה:**

```vue
<template>
  <div>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>

    <router-view />
  </div>
</template>

<script setup lang="ts">
  import { MpRouterLink, createMpRouter } from '@mission-platform/router';
  import { createApp } from 'vue';
  import routes from './routes';

  const router = createMpRouter({
    routes,
    history: 'web', // or 'hash' or 'memory'
  });

  createApp(App).use(router).mount('#app');
</script>
```

### מתאם React (מצב `mp:react`)

מתאם React מספק אינטגרציה עם נתב React.

**ייצוא עיקרי:**

- **`withMpRouter`**: HOC לספק הקשר לנתב
- **`useMpRoute`**: חבר לגישה למידע על המסלול הנוכחי
- **`MpLink`**: רכיב קישור ניטרלי למסגרת עבור React

### מתאם RedwoodSDK (`./redwood`)

RedwoodSDK אינה אחת ממסגרות `mp:*`, ולכן היא שומרת על נתיב משנה ייעודי. זה מספק אינטגרציה עם
`rwsdk/router` - טבלת המסלול השטוחה של בקשה/תגובה המשמשת את RedwoodSDK (React ב-Cloudflare Workers).

**ייצוא עיקרי:**

- **`toRedwoodRoutes`**: מתרגם את העץ הנייטרלי `MpRoute` לרשימה שטוחה של הגדרות נתיב `rwsdk` (מקוננות
  המסלולים משוטחים לשבילים מוחלטים).
- **`renderRoutes`**: עוטף את המסלולים המתורגמים במסמך, שיקוף
  `render(Document, routes, options)` של `rwsdk`.
- **`toRedwoodPath`**: ממירה דפוס נתיב ניטרלי לדקדוק של רדווד (תווים כלליים של `:param` ו-`*` בלבד;
  `:param?` → `:param`, `:param*` / `:param+`
  ← `*`).
- **`redwoodHref`** / **`createRedwoodLinks`**: בניית href-יחסי אפליקציה ממיקומים ניטרליים, מאז RedwoodSDK
  מנווט עם עוגנים פשוטים.

**דוּגמָה:**

```tsx
// worker.tsx
import { defineApp } from 'rwsdk/worker';
import { renderRoutes } from '@mission-platform/router/redwood';
import { Document } from '@/app/Document';
import { HomePage } from '@/app/pages/HomePage';
import { UserPage } from '@/app/pages/UserPage';

const routes = [
  { path: '/', component: HomePage },
  { path: '/users/:id', name: 'user', component: UserPage },
];

export default defineApp([renderRoutes(Document, routes)]);
```

## פרטים טכניים

### תלות

**חבילת ליבה:**

- **TypeScript**: הגדרות סוג ובטיחות סוג
- **ללא תלות מסגרת**: JavaScript טהור/TypeScript

**מתאם Vue:**

- **vue-נתב**: ספריית נתב Vue הרשמית
- **vue**: Vue 3 ליבות

**מתאם React:**

- **react-router-dom**: נתב React עבור יישומי אינטרנט
- **react**: ליבת React

### אַדְרִיכָלוּת

החבילה עוקבת אחר ארכיטקטורת שכבות:

1. **שכבת הליבה**: מודל מסלול ניטרלי מסגרת וכלי עזר
2. **שכבת מתאם**: יישומים ספציפיים למסגרת (Vue, React)
3. **Public API**: ממשק מאוחד לכל המסגרות

### דקדוק נתיב

הנתב תומך בדפוסי פרמטרי הנתיב הבאים:

- `:param`: פרמטר נדרש (לדוגמה, `/users/:id`)
- `:param?`: פרמטר אופציונלי (לדוגמה, `/users/:id?`)
- `:param*`: אפס פרמטרים או יותר (לדוגמה, `/files/:path*`)
- `:param+`: פרמטר אחד או יותר (לדוגמה, `/files/:path+`)
- `*`: תו כללי לתפוס הכל (לדוגמה, `/*`)

## מדריך אינטגרציה

### הגדרה בסיסית עם Vue

1. התקן את החבילה:

```bash
pnpm add @mission-platform/router vue-router
```

2. הגדר את המסלולים שלך:

```typescript
// src/routes.ts
import { defineRoutes } from '@mission-platform/router';
import HomePage from './pages/Home.vue';
import AboutPage from './pages/About.vue';

export default defineRoutes([
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/about',
    name: 'about',
    component: AboutPage,
  },
]);
```

3. צור את הנתב:

```typescript
// src/router.ts
import { createMpRouter } from '@mission-platform/router';
import routes from './routes';

export default createMpRouter({
  routes,
  history: 'web',
});
```

4. השתמש באפליקציה שלך:

```vue
// src/App.vue
<script setup lang="ts">
  import { MpRouterLink } from '@mission-platform/router';
</script>

<template>
  <nav>
    <MpRouterLink to="/">Home</MpRouterLink>
    <MpRouterLink to="/about">About</MpRouterLink>
  </nav>
  <router-view />
</template>
```

### התאמת מסלולים דינמיים

```vue
<script setup lang="ts">
  import { useMpRoute } from '@mission-platform/router';

  const route = useMpRoute();

  console.log(route.params.id); // Access dynamic parameters
  console.log(route.query.search); // Access query parameters
</script>
```

### ניווט פרוגרמטי

```vue
<script setup lang="ts">
  import { useMpRouter } from '@mission-platform/router';

  const router = useMpRouter();

  const goToAbout = () => {
    router.push('/about');
  };

  const navigateWithParams = () => {
    router.push({
      name: 'user-profile',
      params: { id: '123' },
      query: { tab: 'details' },
    });
  };
</script>
```

## תכונות מתקדמות

### מסלול מטא שדות

הוסף מטא נתונים למסלולים עבור לוגיקה מותאמת אישית:

```typescript
const routes = defineRoutes([
  {
    path: '/admin',
    name: 'admin',
    component: AdminPage,
    meta: {
      requiresAuth: true,
      adminOnly: true,
    },
  },
]);
```

### שומרי מסלולים (Vue)

```typescript
import { createMpRouter } from '@mission-platform/router';

const router = createMpRouter({
  routes,
  history: 'web',
});

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next('/login');
  } else {
    next();
  }
});
```

### מסלולים מקוננים

```typescript
const routes = defineRoutes([
  {
    path: '/app',
    name: 'app',
    component: AppLayout,
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardPage,
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsPage,
      },
    ],
  },
]);
```

## שיטות עבודה מומלצות

1. **ארגון המסלול**: קבץ מסלולים קשורים יחד והשתמש במסלולים מקוננים עבור רכיבי פריסה
2. **נתיבים בעלי שם**: השתמש תמיד בנתיבים בעלי שם עבור ניווט פרוגרמטי
3. **אימות פרמטר**: אימות פרמטרים דינמיים ברכיבי מסלול
4. **טיפול בשגיאות**: טפל במקרים של 404 עם נתיב הכל (`/*`)
5. **טעינה עצלה**: השתמש בייבואים דינמיים לפיצול קוד (ספציפי למסגרת)
6. **Type Safety**: הגדר ממשקים עבור פרמטרים של מסלולים ואובייקטי שאילתה
7. **ניהול שאילתות**: שמור על פרמטרי שאילתה פשוטים ובטוחים בכתובת האתרים

## מדריך הגירה

### מ-Vue נתב ישירות

בעת הגירה מ-vue-נתב ל-@mission-platform/router:

1. החלף את `createRouter` ב-`createMpRouter`
2. המר את הגדרות המסלול לשימוש ב-`defineRoutes`
3. החלף את `<router-link>` ב-`<MpRouterLink>`
4. עדכן חומרים קומפוזיציים: `useRoute()` → `useMpRoute()`, `useRouter()` → `useMpRouter()`

### מ-React נתב ישירות

בעת הגירה מ-react-router-dom:

1. הגדר מסלולים באמצעות הפורמט הנייטרלי עם `defineRoutes`
2. החלף את `<Link>` ב-`<MpLink>`
3. השתמש ב-`useMpRoute()` במקום ב-`useRoute()`
4. עטפו רכיבים עם `withMpRouter` לגישה לנתב

### מ-Next.js

עבור יישומי Next.js, שקול:

- שימוש בהגדרות המסלול הנייטרלי לעקביות
- יצירת שכבת מתאם מותאמת אישית במידת הצורך
- מינוף ניתוב מבוסס קבצים של Next.js לצד המודל הנייטרלי
