import { classNames, type MpElement, useState } from '@mission-platform/forge';

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
export interface PricingTableProperties {
  plans: PricingPlan[];
  currency?: string;
  billingToggle?: boolean;
  annualDiscount?: number;
  heading?: string;
  selectedId?: string;
  onPlanSelect?: (plan: PricingPlan) => void;
  onBillingChange?: (annual: boolean) => void;
}

export function ForgePricingTable(properties: Readonly<PricingTableProperties>): MpElement {
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
