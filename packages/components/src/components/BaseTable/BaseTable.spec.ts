import { describe, expect, it } from 'vitest'

import { mountWithI18n } from '../../test-utils/mountWithI18n'

import BaseTable from './BaseTable.vue'

import type { TableColumn } from './BaseTable.vue'

interface Row { name: string; age: number }

const columns: TableColumn<Row>[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'age', label: 'Age', sortable: true, align: 'right' },
]

const rows: Row[] = [
  { name: 'Bob', age: 30 },
  { name: 'Alice', age: 25 },
]

describe('BaseTable', () => {
  it('renders a table element', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows } })
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('renders correct column headers', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows } })
    const headers = wrapper.findAll('th')
    expect(headers[0].text()).toContain('Name')
    expect(headers[1].text()).toContain('Age')
  })

  it('renders correct number of rows', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows } })
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  it('renders cell data', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows } })
    expect(wrapper.find('tbody').text()).toContain('Bob')
    expect(wrapper.find('tbody').text()).toContain('Alice')
  })

  it('shows empty state when no rows', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows: [] } })
    expect(wrapper.find('.base-table__empty').exists()).toBe(true)
  })

  it('renders caption', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows, caption: 'People' } })
    expect(wrapper.find('caption').text()).toBe('People')
  })

  it('applies striped class', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows, striped: true } })
    expect(wrapper.find('.base-table').classes()).toContain('base-table--striped')
  })

  it('applies bordered class', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows, bordered: true } })
    expect(wrapper.find('.base-table').classes()).toContain('base-table--bordered')
  })

  it('shows loading spinner', () => {
    const wrapper = mountWithI18n(BaseTable, { props: { columns, rows, loading: true } })
    expect(wrapper.find('.base-table__loading').exists()).toBe(true)
  })
})
