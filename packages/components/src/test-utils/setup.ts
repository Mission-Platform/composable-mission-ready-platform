import i18next, { keyFromSelector } from 'i18next';

await i18next.init({
  lng: 'en',
});

const translate = i18next.t.bind(i18next) as unknown as (...arguments_: unknown[]) => string;
i18next.t = ((selector: unknown, ...arguments_: unknown[]) =>
  translate(
    typeof selector === 'function' ? keyFromSelector(selector as never) : selector,
    ...arguments_,
  )) as typeof i18next.t;
