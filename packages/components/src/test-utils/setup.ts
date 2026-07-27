import i18next, { keyFromSelector } from 'i18next';

await i18next.init({
  lng: 'en',
  initImmediate: false,
});

const translate = i18next.t.bind(i18next);
i18next.t = ((selector, ...arguments_: Parameters<typeof i18next.t>) =>
  translate(typeof selector === 'function' ? keyFromSelector(selector) : selector, ...arguments_)) as typeof i18next.t;
