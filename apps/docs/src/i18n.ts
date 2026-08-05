/**
 * Documentation-app internationalisation.
 *
 * The documentation *content* is authored in English, but the app **chrome**
 * (search field, table-of-contents heading, "page not found" state, and the
 * accessible control labels) is localised into every language the Mission
 * Platform supports. Locale is switched entirely on the client — the prerendered
 * HTML ships the English baseline and the `ForgeLanguageSwitcher` swaps the active
 * i18next language (and `<html lang>`/`dir`) live — so the static-site
 * generation stays a single set of pages.
 */
import { createForgeI18N, type ForgeI18N, type ForgeLocales, forgeNamespace } from '@mission-platform/i18n';

/** Every locale the Mission Platform ships translations for. */
export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

/** A locale supported by the documentation chrome. */
export type DocumentationLocale = (typeof SUPPORTED_LOCALES)[number];

/** Source-of-truth locale used for prerendering and as the i18next fallback. */
export const DEFAULT_LOCALE: DocumentationLocale = 'en';

/** The i18next namespace the documentation app registers its messages under. */
export const DOCS_NAMESPACE = forgeNamespace('docs');

/** Native label shown for each locale in the language switcher. */
export const LOCALE_LABELS: Record<DocumentationLocale, string> = {
  en: 'English',
  ar: 'العربية',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  he: 'עברית',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  zh: '中文',
};

/** Writing direction per locale (Arabic and Hebrew are right-to-left). */
export const LOCALE_DIR: Record<DocumentationLocale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
  de: 'ltr',
  es: 'ltr',
  fr: 'ltr',
  he: 'rtl',
  it: 'ltr',
  ja: 'ltr',
  ko: 'ltr',
  nl: 'ltr',
  zh: 'ltr',
};

/** Narrow an arbitrary value (route param, stored preference) to a supported locale. */
export function resolveDocumentationLocale(value: unknown): DocumentationLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as DocumentationLocale)
    : DEFAULT_LOCALE;
}

/**
 * Chrome message catalogue, keyed by locale then message path. Seeded in full at
 * creation time (the catalogue is tiny) so every locale resolves instantly on a
 * client-side switch without a lazy fetch.
 */
const messages: ForgeLocales = {
  en: {
    search: {
      placeholder: 'Search the docs…',
      title: 'Search',
      hint: 'Type a query in the search box above to find documentation across the whole platform.',
      summaryOne: '1 result for “{{query}}”',
      summaryOther: '{{count}} results for “{{query}}”',
      empty: 'No documents match your search. Try a different or shorter term.',
    },
    toc: { title: 'On this page' },
    notFound: {
      title: 'Page not found',
      body: 'No documentation exists for “{{slug}}”.',
      back: 'Back to the documentation home',
    },
    a11y: {
      theme: 'Toggle colour theme',
      language: 'Change language',
      menu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
    },
    nav: { home: 'Home', toggleSidebar: 'Toggle documentation navigation' },
  },
  ar: {
    search: {
      placeholder: 'ابحث في الوثائق…',
      title: 'بحث',
      hint: 'اكتب استعلامًا في مربع البحث أعلاه للعثور على الوثائق عبر المنصة بأكملها.',
      summaryOne: 'نتيجة واحدة لـ «{{query}}»',
      summaryOther: '{{count}} نتيجة لـ «{{query}}»',
      empty: 'لا توجد مستندات تطابق بحثك. جرّب مصطلحًا مختلفًا أو أقصر.',
    },
    toc: { title: 'في هذه الصفحة' },
    notFound: {
      title: 'الصفحة غير موجودة',
      body: 'لا توجد وثائق لـ «{{slug}}».',
      back: 'العودة إلى صفحة الوثائق الرئيسية',
    },
    a11y: {
      theme: 'تبديل نسق الألوان',
      language: 'تغيير اللغة',
      menu: 'فتح قائمة التنقل',
      closeMenu: 'إغلاق قائمة التنقل',
    },
    nav: { home: 'الصفحة الرئيسية', toggleSidebar: 'تبديل تنقل الوثائق' },
  },
  de: {
    search: {
      placeholder: 'Dokumentation durchsuchen…',
      title: 'Suche',
      hint: 'Gib oben im Suchfeld einen Suchbegriff ein, um die Dokumentation der gesamten Plattform zu durchsuchen.',
      summaryOne: '1 Ergebnis für „{{query}}“',
      summaryOther: '{{count}} Ergebnisse für „{{query}}“',
      empty: 'Keine Dokumente entsprechen deiner Suche. Versuche einen anderen oder kürzeren Begriff.',
    },
    toc: { title: 'Auf dieser Seite' },
    notFound: {
      title: 'Seite nicht gefunden',
      body: 'Für „{{slug}}“ existiert keine Dokumentation.',
      back: 'Zurück zur Dokumentationsstartseite',
    },
    a11y: {
      theme: 'Farbthema umschalten',
      language: 'Sprache ändern',
      menu: 'Navigationsmenü öffnen',
      closeMenu: 'Navigationsmenü schließen',
    },
    nav: { home: 'Startseite', toggleSidebar: 'Dokumentationsnavigation umschalten' },
  },
  es: {
    search: {
      placeholder: 'Buscar en la documentación…',
      title: 'Buscar',
      hint: 'Escribe una consulta en el cuadro de búsqueda de arriba para encontrar documentación en toda la plataforma.',
      summaryOne: '1 resultado para «{{query}}»',
      summaryOther: '{{count}} resultados para «{{query}}»',
      empty: 'Ningún documento coincide con tu búsqueda. Prueba con un término diferente o más corto.',
    },
    toc: { title: 'En esta página' },
    notFound: {
      title: 'Página no encontrada',
      body: 'No existe documentación para «{{slug}}».',
      back: 'Volver al inicio de la documentación',
    },
    a11y: {
      theme: 'Cambiar el tema de color',
      language: 'Cambiar idioma',
      menu: 'Abrir el menú de navegación',
      closeMenu: 'Cerrar el menú de navegación',
    },
    nav: { home: 'Inicio', toggleSidebar: 'Alternar la navegación de la documentación' },
  },
  fr: {
    search: {
      placeholder: 'Rechercher dans la documentation…',
      title: 'Recherche',
      hint: 'Saisissez une requête dans le champ de recherche ci-dessus pour trouver de la documentation sur toute la plateforme.',
      summaryOne: '1 résultat pour « {{query}} »',
      summaryOther: '{{count}} résultats pour « {{query}} »',
      empty: 'Aucun document ne correspond à votre recherche. Essayez un terme différent ou plus court.',
    },
    toc: { title: 'Sur cette page' },
    notFound: {
      title: 'Page introuvable',
      body: 'Aucune documentation n’existe pour « {{slug}} ».',
      back: 'Retour à l’accueil de la documentation',
    },
    a11y: {
      theme: 'Changer le thème de couleur',
      language: 'Changer de langue',
      menu: 'Ouvrir le menu de navigation',
      closeMenu: 'Fermer le menu de navigation',
    },
    nav: { home: 'Accueil', toggleSidebar: 'Basculer la navigation de la documentation' },
  },
  he: {
    search: {
      placeholder: 'חיפוש בתיעוד…',
      title: 'חיפוש',
      hint: 'הקלד שאילתה בתיבת החיפוש שלמעלה כדי למצוא תיעוד בכל הפלטפורמה.',
      summaryOne: 'תוצאה אחת עבור „{{query}}”',
      summaryOther: '{{count}} תוצאות עבור „{{query}}”',
      empty: 'אין מסמכים התואמים לחיפוש שלך. נסה מונח אחר או קצר יותר.',
    },
    toc: { title: 'בעמוד זה' },
    notFound: {
      title: 'העמוד לא נמצא',
      body: 'לא קיים תיעוד עבור „{{slug}}”.',
      back: 'חזרה לדף הבית של התיעוד',
    },
    a11y: {
      theme: 'החלפת ערכת צבעים',
      language: 'שינוי שפה',
      menu: 'פתיחת תפריט הניווט',
      closeMenu: 'סגירת תפריט הניווט',
    },
    nav: { home: 'דף הבית', toggleSidebar: 'החלפת ניווט התיעוד' },
  },
  it: {
    search: {
      placeholder: 'Cerca nella documentazione…',
      title: 'Cerca',
      hint: 'Digita una query nella casella di ricerca in alto per trovare la documentazione in tutta la piattaforma.',
      summaryOne: '1 risultato per «{{query}}»',
      summaryOther: '{{count}} risultati per «{{query}}»',
      empty: 'Nessun documento corrisponde alla tua ricerca. Prova un termine diverso o più breve.',
    },
    toc: { title: 'In questa pagina' },
    notFound: {
      title: 'Pagina non trovata',
      body: 'Nessuna documentazione esiste per «{{slug}}».',
      back: 'Torna alla home della documentazione',
    },
    a11y: {
      theme: 'Cambia tema colore',
      language: 'Cambia lingua',
      menu: 'Apri il menu di navigazione',
      closeMenu: 'Chiudi il menu di navigazione',
    },
    nav: { home: 'Home', toggleSidebar: 'Attiva/disattiva la navigazione della documentazione' },
  },
  ja: {
    search: {
      placeholder: 'ドキュメントを検索…',
      title: '検索',
      hint: '上の検索ボックスにクエリを入力すると、プラットフォーム全体のドキュメントを検索できます。',
      summaryOne: '「{{query}}」の結果 1 件',
      summaryOther: '「{{query}}」の結果 {{count}} 件',
      empty: '検索に一致するドキュメントがありません。別の、またはより短い語句をお試しください。',
    },
    toc: { title: 'このページの内容' },
    notFound: {
      title: 'ページが見つかりません',
      body: '「{{slug}}」のドキュメントは存在しません。',
      back: 'ドキュメントのホームに戻る',
    },
    a11y: {
      theme: 'カラーテーマを切り替える',
      language: '言語を変更する',
      menu: 'ナビゲーションメニューを開く',
      closeMenu: 'ナビゲーションメニューを閉じる',
    },
    nav: { home: 'ホーム', toggleSidebar: 'ドキュメントナビゲーションの切り替え' },
  },
  ko: {
    search: {
      placeholder: '문서 검색…',
      title: '검색',
      hint: '위의 검색창에 검색어를 입력하면 플랫폼 전체의 문서를 찾을 수 있습니다.',
      summaryOne: '“{{query}}”에 대한 결과 1개',
      summaryOther: '“{{query}}”에 대한 결과 {{count}}개',
      empty: '검색과 일치하는 문서가 없습니다. 다른 검색어나 더 짧은 검색어를 사용해 보세요.',
    },
    toc: { title: '이 페이지에서' },
    notFound: {
      title: '페이지를 찾을 수 없습니다',
      body: '“{{slug}}”에 대한 문서가 없습니다.',
      back: '문서 홈으로 돌아가기',
    },
    a11y: {
      theme: '색상 테마 전환',
      language: '언어 변경',
      menu: '탐색 메뉴 열기',
      closeMenu: '탐색 메뉴 닫기',
    },
    nav: { home: '홈', toggleSidebar: '문서 탐색 전환' },
  },
  nl: {
    search: {
      placeholder: 'Zoek in de documentatie…',
      title: 'Zoeken',
      hint: 'Typ een zoekopdracht in het zoekvak hierboven om documentatie op het hele platform te vinden.',
      summaryOne: '1 resultaat voor ‘{{query}}’',
      summaryOther: '{{count}} resultaten voor ‘{{query}}’',
      empty: 'Geen documenten komen overeen met je zoekopdracht. Probeer een andere of kortere term.',
    },
    toc: { title: 'Op deze pagina' },
    notFound: {
      title: 'Pagina niet gevonden',
      body: 'Er bestaat geen documentatie voor ‘{{slug}}’.',
      back: 'Terug naar de documentatiestartpagina',
    },
    a11y: {
      theme: 'Kleurthema wisselen',
      language: 'Taal wijzigen',
      menu: 'Navigatiemenu openen',
      closeMenu: 'Navigatiemenu sluiten',
    },
    nav: { home: 'Home', toggleSidebar: 'Documentatienavigatie in-/uitschakelen' },
  },
  zh: {
    search: {
      placeholder: '搜索文档…',
      title: '搜索',
      hint: '在上方的搜索框中输入查询，即可在整个平台中查找文档。',
      summaryOne: '“{{query}}”的 1 条结果',
      summaryOther: '“{{query}}”的 {{count}} 条结果',
      empty: '没有与您的搜索匹配的文档。请尝试其他或更短的关键词。',
    },
    toc: { title: '本页内容' },
    notFound: {
      title: '未找到页面',
      body: '不存在“{{slug}}”的文档。',
      back: '返回文档首页',
    },
    a11y: {
      theme: '切换配色主题',
      language: '更改语言',
      menu: '打开导航菜单',
      closeMenu: '关闭导航菜单',
    },
    nav: { home: '首页', toggleSidebar: '切换文档导航' },
  },
};

/** Build the documentation app's i18next instance, seeded with every locale. */
export function createDocumentationI18n(locale: DocumentationLocale = DEFAULT_LOCALE): ForgeI18N {
  return createForgeI18N({
    locale,
    fallbackLocale: DEFAULT_LOCALE,
    namespace: DOCS_NAMESPACE,
    messages,
  });
}
