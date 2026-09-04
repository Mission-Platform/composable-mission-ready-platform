import {
  classNames,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge-jsx';

import styles from './forge-pricing-table.module.scss';

export interface PricingFeature {
  label?: string;
  name?: string;
  included?: boolean;
}
export interface PricingPlan {
  id: string;
  name: string;
  price: string | number;
  annualPrice?: string | number;
  description?: string;
  features: (string | PricingFeature)[];
  ctaLabel?: string;
  highlighted?: boolean;
  popular?: boolean;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface PricingTableStyleProperties {
  readonly 'border-width-thin'?: string;
  readonly 'color-bg-surface'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-primary-default'?: string;
  readonly 'color-text-on-primary'?: string;
  readonly 'color-text-tertiary'?: string;
  readonly 'font-size-3xl'?: string;
  readonly 'font-size-xs'?: string;
  readonly 'font-weight-bold'?: string;
  readonly 'radius-full'?: string;
  readonly 'radius-lg'?: string;
  readonly 'radius-md'?: string;
  readonly 'shadow-focus-primary'?: string;
  readonly 'size-height-lg'?: string;
  readonly 'size-height-md'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
  readonly 'spacing-5'?: string;
  readonly 'spacing-6'?: string;
}

export type PricingTableStyle = CSSStyleProperties & {
  readonly '--forge-pricing-table-border-width-thin'?: string | undefined;
  readonly '--forge-pricing-table-color-bg-surface'?: string | undefined;
  readonly '--forge-pricing-table-color-border-default'?: string | undefined;
  readonly '--forge-pricing-table-color-primary-default'?: string | undefined;
  readonly '--forge-pricing-table-color-text-on-primary'?: string | undefined;
  readonly '--forge-pricing-table-color-text-tertiary'?: string | undefined;
  readonly '--forge-pricing-table-font-size-3xl'?: string | undefined;
  readonly '--forge-pricing-table-font-size-xs'?: string | undefined;
  readonly '--forge-pricing-table-font-weight-bold'?: string | undefined;
  readonly '--forge-pricing-table-radius-full'?: string | undefined;
  readonly '--forge-pricing-table-radius-lg'?: string | undefined;
  readonly '--forge-pricing-table-radius-md'?: string | undefined;
  readonly '--forge-pricing-table-shadow-focus-primary'?: string | undefined;
  readonly '--forge-pricing-table-size-height-lg'?: string | undefined;
  readonly '--forge-pricing-table-size-height-md'?: string | undefined;
  readonly '--forge-pricing-table-spacing-1'?: string | undefined;
  readonly '--forge-pricing-table-spacing-2'?: string | undefined;
  readonly '--forge-pricing-table-spacing-3'?: string | undefined;
  readonly '--forge-pricing-table-spacing-4'?: string | undefined;
  readonly '--forge-pricing-table-spacing-5'?: string | undefined;
  readonly '--forge-pricing-table-spacing-6'?: string | undefined;
};

function createPricingTableStyle(
  properties: Readonly<PricingTableStyleProperties> | undefined,
): PricingTableStyle | undefined {
  return createForgeStyle({
    '--forge-pricing-table-border-width-thin': properties?.['border-width-thin'],
    '--forge-pricing-table-color-bg-surface': properties?.['color-bg-surface'],
    '--forge-pricing-table-color-border-default': properties?.['color-border-default'],
    '--forge-pricing-table-color-primary-default': properties?.['color-primary-default'],
    '--forge-pricing-table-color-text-on-primary': properties?.['color-text-on-primary'],
    '--forge-pricing-table-color-text-tertiary': properties?.['color-text-tertiary'],
    '--forge-pricing-table-font-size-3xl': properties?.['font-size-3xl'],
    '--forge-pricing-table-font-size-xs': properties?.['font-size-xs'],
    '--forge-pricing-table-font-weight-bold': properties?.['font-weight-bold'],
    '--forge-pricing-table-radius-full': properties?.['radius-full'],
    '--forge-pricing-table-radius-lg': properties?.['radius-lg'],
    '--forge-pricing-table-radius-md': properties?.['radius-md'],
    '--forge-pricing-table-shadow-focus-primary': properties?.['shadow-focus-primary'],
    '--forge-pricing-table-size-height-lg': properties?.['size-height-lg'],
    '--forge-pricing-table-size-height-md': properties?.['size-height-md'],
    '--forge-pricing-table-spacing-1': properties?.['spacing-1'],
    '--forge-pricing-table-spacing-2': properties?.['spacing-2'],
    '--forge-pricing-table-spacing-3': properties?.['spacing-3'],
    '--forge-pricing-table-spacing-4': properties?.['spacing-4'],
    '--forge-pricing-table-spacing-5': properties?.['spacing-5'],
    '--forge-pricing-table-spacing-6': properties?.['spacing-6'],
  }) as PricingTableStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface PricingTableProperties {
  plans: PricingPlan[];
  currency?: string;
  billingToggle?: boolean;
  annualDiscount?: number;
  heading?: string;
  selectedId?: string;
  onPlanSelect?: (plan: PricingPlan) => void;
  onBillingChange?: (annual: boolean) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<PricingTableStyleProperties>;
}

export function ForgePricingTable(properties: Readonly<PricingTableProperties>): MpElement {
  const style = createPricingTableStyle(properties.properties);

  const [selectedId, setSelectedId] = useState(properties.selectedId);
  const [annual, setAnnual] = useState(false);
  const select = (plan: PricingPlan): void => {
    setSelectedId(plan.id);
    properties.onPlanSelect?.(plan);
  };
  const plans = properties.plans ?? [];
  const { currency = '$', billingToggle = false, annualDiscount = 20 } = properties;
  const discount = Math.min(100, Math.max(0, annualDiscount));
  const formatPrice = (plan: PricingPlan): string | number => {
    const value =
      annual && plan.annualPrice !== undefined
        ? plan.annualPrice
        : annual && typeof plan.price === 'number'
          ? plan.price * (1 - discount / 100)
          : plan.price;
    return typeof value === 'number' ? `${currency}${Number.isInteger(value) ? value : value.toFixed(2)}` : value;
  };
  return (
    <section
      className={styles['forge-pricing-table']}
      aria-label={properties.heading ?? 'Pricing plans'}
      style={style}
    >
      {properties.heading ? <h2>{properties.heading}</h2> : undefined}
      {billingToggle ? (
        <div className={styles['forge-pricing-table__billing']}>
          <button
            type="button"
            aria-pressed={!annual}
            onClick={() => {
              setAnnual(false);
              properties.onBillingChange?.(false);
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={annual}
            onClick={() => {
              setAnnual(true);
              properties.onBillingChange?.(true);
            }}
          >
            Annual
          </button>
          <span>Save {discount}%</span>
        </div>
      ) : undefined}
      <div className={styles['forge-pricing-table__plans']}>
        {plans.map((plan) => (
          <article
            className={classNames(styles['forge-pricing-table__plan'], {
              [styles['forge-pricing-table__plan--highlighted']]: plan.highlighted || plan.popular,
              [styles['forge-pricing-table__plan--selected']]: selectedId === plan.id,
            })}
            key={plan.id}
          >
            {plan.highlighted || plan.popular ? (
              <span className={styles['forge-pricing-table__badge']}>Popular</span>
            ) : undefined}
            <h3>{plan.name}</h3>
            <p className={styles['forge-pricing-table__price']}>{formatPrice(plan)}</p>
            {plan.description ? <p>{plan.description}</p> : undefined}
            <ul>
              {plan.features.map((feature, index) => {
                const item = typeof feature === 'string' ? { label: feature, included: true } : feature;
                return (
                  <li
                    className={item.included === false ? styles['forge-pricing-table__feature--excluded'] : undefined}
                    key={`${plan.id}-${index}`}
                  >
                    {item.included === false ? 'Not included: ' : '✓ '}
                    {item.label ?? item.name}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              aria-label={`Choose ${plan.name}`}
              aria-pressed={selectedId === plan.id}
              onClick={() => select(plan)}
            >
              {plan.ctaLabel ?? 'Choose plan'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
