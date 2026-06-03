import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseAccordion from './BaseAccordion.vue'
import BaseAccordionItem from './BaseAccordionItem.vue'

describe('BaseAccordion', () => {
  it('renders slotted items', () => {
    const wrapper = mountWithI18n(BaseAccordion, {
      slots: {
        default: `
          <BaseAccordionItem id="a">
            <template #summary>Section A</template>
            Content A
          </BaseAccordionItem>
          <BaseAccordionItem id="b">
            <template #summary>Section B</template>
            Content B
          </BaseAccordionItem>
        `,
      },
      global: {
        components: { BaseAccordionItem },
      },
    })
    expect(wrapper.findAll('details')).toHaveLength(2)
  })

  it('shows no content initially', () => {
    const wrapper = mountWithI18n(BaseAccordion, {
      slots: {
        default: `
          <BaseAccordionItem id="a">
            <template #summary>Section A</template>
            Content A
          </BaseAccordionItem>
        `,
      },
      global: {
        components: { BaseAccordionItem },
      },
    })
    expect(wrapper.findAll('.base-accordion__content')).toHaveLength(0)
  })

  it('applies disabled class to disabled items', () => {
    const wrapper = mountWithI18n(BaseAccordion, {
      slots: {
        default: `
          <BaseAccordionItem id="a">
            <template #summary>Section A</template>
            Content A
          </BaseAccordionItem>
          <BaseAccordionItem id="b" :disabled="true">
            <template #summary>Disabled</template>
            Content B
          </BaseAccordionItem>
        `,
      },
      global: {
        components: { BaseAccordionItem },
      },
    })
    const disabledItem = wrapper.findAll('details')[1]
    expect(disabledItem.classes()).toContain('base-accordion__item--disabled')
  })
})

describe('BaseAccordionItem (standalone)', () => {
  it('renders summary slot content', () => {
    const wrapper = mountWithI18n(BaseAccordion, {
      slots: {
        default: `
          <BaseAccordionItem id="a">
            <template #summary>My Summary</template>
            My Content
          </BaseAccordionItem>
        `,
      },
      global: {
        components: { BaseAccordionItem },
      },
    })
    expect(wrapper.find('summary').text()).toContain('My Summary')
  })
})
