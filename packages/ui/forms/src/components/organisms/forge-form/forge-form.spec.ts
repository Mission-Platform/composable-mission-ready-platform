import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import {
  defaultFormContext,
  ForgeForm,
  runValidation,
  useFormContext,
  validateWithFunction,
  validateWithSafeParse,
  validateWithStandardSchema,
  validateWithYup,
  type FormContextValue,
} from './forge-form';

const ReactForm = toReactComponent(ForgeForm, 'Form');
const VueForm = toVueComponent(ForgeForm, 'Form');

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function validateEmailRequired(values: Record<string, unknown>): Record<string, string> {
  if (!values.email) {
    return { email: 'Email address is required' };
  }
  return {};
}

function validateEmailSimple(values: Record<string, unknown>): Record<string, string> {
  if (!values.email) {
    return { email: 'Email is required' };
  }
  return {};
}

function sampleSynchronousValidator(values: Record<string, unknown>): Record<string, string> {
  return values.code ? {} : { code: 'Code required' };
}

async function sampleAsynchronousValidator(values: Record<string, unknown>): Promise<Record<string, string>> {
  await Promise.resolve();
  return values.token ? {} : { token: 'Token required' };
}

function sampleCustomValidator(): Record<string, string> {
  return {
    customField: 'Custom validator error',
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ForgeForm authors the same component for React and Vue', () => {
  it('renders a form container with children on both frameworks', async () => {
    const properties = { id: 'test-form', className: 'custom-form' };
    const react = renderToStaticMarkup(
      createElement(ReactForm, properties, createElement('button', { type: 'submit' }, 'Submit')),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueForm, properties, () => [vueH('button', { type: 'submit' }, 'Submit')]) }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('form');
      expect(html).toContain('id="test-form"');
      expect(html).toContain('custom-form');
      expect(html).toContain('Submit');
    }
  });

  it('submits form with valid data and calls onSubmit', async () => {
    const onSubmit = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { username: 'testuser' },
            onSubmit,
          },
          () => [vueH('button', { id: 'submit-btn', type: 'submit' }, 'Save')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await nextTick();

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).toEqual({ username: 'testuser' });

    app.unmount();
    host.remove();
  });

  it('renders accessible error summary banner when errors are present on both frameworks', async () => {
    const properties = {
      errors: { username: 'Username is required' },
      errorSummaryTitle: 'Form Errors',
    };
    const react = renderToStaticMarkup(createElement(ReactForm, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueForm, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('role="alert"');
      expect(html).toContain('Form Errors');
      expect(html).toContain('Username is required');
      expect(html).toContain('href="#username"');
    }
  });
});

describe('Form submission and validation behavior', () => {
  it('blocks onSubmit when validation errors exist and renders error summary via properties', async () => {
    const onSubmit = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            id: 'validation-test-form',
            initialValues: { email: '' },
            validate: validateEmailRequired,
            onSubmit,
          },
          () => [vueH('button', { type: 'submit' }, 'Submit')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await flushPromises();

    // onSubmit must be blocked
    expect(onSubmit).not.toHaveBeenCalled();

    // Direct validation call confirms errors
    const errors = await runValidation({ email: '' }, validateEmailRequired);
    expect(errors.email).toBe('Email address is required');

    // Rendering with validation errors produces accessible error summary banner
    const summaryHtml = renderToStaticMarkup(
      createElement(ReactForm, {
        id: 'validation-test-form',
        errors,
      }),
    );
    expect(summaryHtml).toContain('id="validation-test-form-error-summary"');
    expect(summaryHtml).toContain('role="alert"');
    expect(summaryHtml).toContain('Email address is required');

    app.unmount();
    host.remove();
  });

  it('submits when form data satisfies validation criteria', async () => {
    let capturedContext: FormContextValue | undefined;
    const onSubmit = vi.fn((_vals: Record<string, unknown>, context: FormContextValue) => {
      capturedContext = context;
    });
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            id: 'valid-form',
            initialValues: { email: 'valid@example.com' },
            validate: validateEmailSimple,
            onSubmit,
          },
          () => [vueH('button', { type: 'submit' }, 'Submit')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await flushPromises();

    expect(onSubmit).toHaveBeenCalled();
    expect(capturedContext?.isValid).toBe(true);

    app.unmount();
    host.remove();
  });

  it('triggers onReset callback and clears internal form state on reset event', async () => {
    const onReset = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { username: 'initial-user' },
            onReset,
          },
          () => [vueH('button', { type: 'reset' }, 'Reset')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      form.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    }
    await nextTick();

    expect(onReset).toHaveBeenCalled();

    app.unmount();
    host.remove();
  });
});

describe('Accessible error summary links and navigation', () => {
  it('navigates focus to the invalid field element when error link is clicked', async () => {
    const host = document.createElement('div');
    const targetInput = document.createElement('input');
    targetInput.id = 'target-field';
    document.body.append(targetInput, host);

    const app = createApp({
      render: () =>
        vueH(VueForm, {
          errors: { 'target-field': 'Target field has an error' },
          errorSummaryTitle: 'Submission Error',
        }),
    });
    app.mount(host);

    const errorLink = host.querySelector<HTMLAnchorElement>('a[href="#target-field"]');
    expect(errorLink).not.toBeNull();
    if (errorLink) {
      errorLink.click();
    }

    expect(document.activeElement).toBe(targetInput);

    app.unmount();
    host.remove();
    targetInput.remove();
  });

  it('renders form-level errors starting with underscore as text instead of links', async () => {
    const properties = {
      errors: { _form: 'A general server error occurred' },
    };
    const html = renderToStaticMarkup(createElement(ReactForm, properties));

    expect(html).toContain('A general server error occurred');
    expect(html).not.toContain('href="#_form"');
  });

  it('hides error summary banner when showErrorSummary is false', async () => {
    const properties = {
      errors: { email: 'Email required' },
      showErrorSummary: false,
    };
    const html = renderToStaticMarkup(createElement(ReactForm, properties));

    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('Email required');
  });
});

describe('Modular schema sub-validators', () => {
  describe('validateWithStandardSchema', () => {
    it('returns formatted field errors for failed validation issues', async () => {
      const mockSchema = {
        '~standard': {
          validate: async () => ({
            issues: [
              { path: ['user', { key: 'email' }], message: 'Invalid email address' },
              { path: 'age', message: 'Age must be positive' },
              { path: undefined, message: 'General schema issue' },
            ],
          }),
        },
      };

      const errors = await validateWithStandardSchema({ user: { email: 'invalid' } }, mockSchema);

      expect(errors['user.email']).toBe('Invalid email address');
      expect(errors.age).toBe('Age must be positive');
      expect(errors._form).toBe('General schema issue');
    });

    it('returns empty error map when validation passes or schema is invalid', async () => {
      const mockSchema = {
        '~standard': {
          validate: async () => ({ issues: undefined }),
        },
      };

      const validErrors = await validateWithStandardSchema({ email: 'test@example.com' }, mockSchema);
      expect(validErrors).toEqual({});

      // eslint-disable-next-line unicorn/no-null
      const nullErrors = await validateWithStandardSchema({}, null);
      expect(nullErrors).toEqual({});

      const nonSchemaErrors = await validateWithStandardSchema({}, { '~standard': {} });
      expect(nonSchemaErrors).toEqual({});
    });
  });

  describe('validateWithSafeParse', () => {
    it('returns field errors when safeParse returns failure with issues or errors array', async () => {
      const zodStyleSchema = {
        safeParse: () => ({
          success: false,
          error: {
            issues: [
              { path: ['profile', 'firstName'], message: 'First name is required' },
              { path: ['tags', 0], message: 'Tag cannot be empty' },
            ],
          },
        }),
      };

      const errors = await validateWithSafeParse({}, zodStyleSchema);
      expect(errors['profile.firstName']).toBe('First name is required');
      expect(errors['tags.0']).toBe('Tag cannot be empty');

      const alternateZodSchema = {
        safeParse: () => ({
          success: false,
          error: {
            errors: [{ path: 'username', message: 'Username too short' }],
          },
        }),
      };

      const alternateErrors = await validateWithSafeParse({}, alternateZodSchema);
      expect(alternateErrors.username).toBe('Username too short');
    });

    it('returns empty map when safeParse succeeds or schema is missing safeParse', async () => {
      const successSchema = {
        safeParse: () => ({ success: true }),
      };
      const errors = await validateWithSafeParse({}, successSchema);
      expect(errors).toEqual({});

      const invalidSchema = await validateWithSafeParse({}, {});
      expect(invalidSchema).toEqual({});
    });
  });

  describe('validateWithYup', () => {
    it('catches validation error with inner issues array', async () => {
      const yupSchema = {
        validate: async () => {
          const validationError = new Error('Validation failed') as Error & {
            inner: Array<{ path: string; message: string }>;
          };
          validationError.inner = [
            { path: 'password', message: 'Password is too weak' },
            { path: '', message: 'Form is invalid' },
          ];
          throw validationError;
        },
      };

      const errors = await validateWithYup({}, yupSchema);
      expect(errors.password).toBe('Password is too weak');
      expect(errors._form).toBe('Form is invalid');
    });

    it('catches validation error with errors object or single message', async () => {
      const yupSchemaWithErrors = {
        validate: async () => {
          const validationError = new Error('Validation failed') as Error & { errors: Record<string, string> };
          validationError.errors = { terms: 'You must accept terms' };
          throw validationError;
        },
      };

      const errors = await validateWithYup({}, yupSchemaWithErrors);
      expect(errors.terms).toBe('You must accept terms');

      const yupSchemaWithMessage = {
        validate: async () => {
          throw new Error('Top-level rejection');
        },
      };

      const fallbackErrors = await validateWithYup({}, yupSchemaWithMessage);
      expect(fallbackErrors._form).toBe('Top-level rejection');
    });

    it('handles resolved result containing errors or issues dictionary', async () => {
      const yupReturningErrors = {
        validate: async () => ({
          errors: { phone: 'Invalid phone number' },
        }),
      };

      const errors = await validateWithYup({}, yupReturningErrors);
      expect(errors.phone).toBe('Invalid phone number');

      const yupReturningIssues = {
        validate: async () => ({
          issues: [{ path: ['address', 'zip'], message: 'Invalid postal code' }],
        }),
      };

      const issueErrors = await validateWithYup({}, yupReturningIssues);
      expect(issueErrors['address.zip']).toBe('Invalid postal code');
    });

    it('returns empty map when validate succeeds cleanly or is not a function', async () => {
      const cleanSchema = {
        validate: async () => ({ valid: true }),
      };
      const errors = await validateWithYup({}, cleanSchema);
      expect(errors).toEqual({});

      // eslint-disable-next-line unicorn/no-null
      const invalidSchema = await validateWithYup({}, null);
      expect(invalidSchema).toEqual({});
    });
  });

  describe('validateWithFunction', () => {
    it('supports synchronous and asynchronous validation functions', async () => {
      const syncErrors = await validateWithFunction({}, sampleSynchronousValidator);
      expect(syncErrors.code).toBe('Code required');

      const asyncErrors = await validateWithFunction({}, sampleAsynchronousValidator);
      expect(asyncErrors.token).toBe('Token required');

      const noErrors = await validateWithFunction({});
      expect(noErrors).toEqual({});
    });
  });

  describe('runValidation combined pipeline', () => {
    it('merges schema and custom validate function errors', async () => {
      const schema = {
        safeParse: () => ({
          success: false,
          error: {
            issues: [{ path: 'schemaField', message: 'Schema error' }],
          },
        }),
      };

      const combined = await runValidation({}, sampleCustomValidator, schema);
      expect(combined.schemaField).toBe('Schema error');
      expect(combined.customField).toBe('Custom validator error');
    });
  });
});

describe('FormContext tracking and immutable updates', () => {
  it('manages value, dirty, and touched states immutably through context mutators', async () => {
    let context!: FormContextValue;
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { username: 'alice', active: false },
            errors: { username: 'Initial error' },
            onSubmit: (_vals: Record<string, unknown>, formContext: FormContextValue) => {
              context = formContext;
            },
          },
          () => [vueH('button', { type: 'submit' }, 'Submit')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await flushPromises();

    expect(context).toBeDefined();

    // Field value change clears existing field error and marks dirty
    context.setFieldValue('username', 'bob');
    expect(context.values.username).toBe('bob');
    expect(context.dirty.username).toBe(true);
    expect(context.isDirty).toBe(true);
    expect(context.errors.username).toBeUndefined();

    // Reverting field value to initial restores non-dirty state
    context.setFieldValue('username', 'alice');
    expect(context.dirty.username).toBe(false);

    // setFieldTouched
    context.setFieldTouched('active', true);
    expect(context.touched.active).toBe(true);

    // setFieldError adds and immutably clears errors
    context.setFieldError('active', 'Must be active');
    expect(context.errors.active).toBe('Must be active');
    expect(context.isValid).toBe(false);

    context.setFieldError('active', undefined);
    expect(context.errors.active).toBeUndefined();
    expect(context.isValid).toBe(true);

    // setValues replaces values and calculates dirty state
    context.setValues({ username: 'charlie', active: true });
    expect(context.values.username).toBe('charlie');
    expect(context.values.active).toBe(true);
    expect(context.dirty.username).toBe(true);
    expect(context.dirty.active).toBe(true);

    // resetForm resets everything back to initial
    context.resetForm();
    expect(context.values.username).toBe('alice');
    expect(context.values.active).toBe(false);
    expect(context.dirty).toEqual({});
    expect(context.touched).toEqual({});
    expect(context.errors).toEqual({});

    app.unmount();
    host.remove();
  });

  it('provides input binding properties through getFieldProperties / getFieldProps', async () => {
    let context!: FormContextValue;
    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { text: 'hello', agree: false },
            onSubmit: (_vals: Record<string, unknown>, formContext: FormContextValue) => {
              context = formContext;
            },
          },
          () => [vueH('button', { type: 'submit' }, 'Submit')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await flushPromises();

    const textBinding = context.getFieldProperties('text');
    expect(textBinding.name).toBe('text');
    expect(textBinding.value).toBe('hello');
    expect(textBinding.touched).toBe(true); // submitted form marks all fields touched

    // Simulate input onChange event with target.value
    textBinding.onChange({ target: { value: 'world' } });
    expect(context.values.text).toBe('world');

    // Simulate checkbox onChange event with target.checked
    const agreeBinding = context.getFieldProps('agree');
    agreeBinding.onChange({ target: { type: 'checkbox', checked: true } });
    expect(context.values.agree).toBe(true);

    // Simulate direct value pass
    agreeBinding.onChange(false);
    expect(context.values.agree).toBe(false);

    // onBlur sets field touched
    agreeBinding.onBlur();
    expect(context.touched.agree).toBe(true);

    app.unmount();
    host.remove();
  });
});

describe('Async submission and validation concurrency', () => {
  it('toggles isSubmitting during async submitForm execution', async () => {
    let capturedContext: FormContextValue | undefined;
    let resolveSubmitPromise: (() => void) | undefined;

    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmitPromise = resolve;
        }),
    );

    const host = document.createElement('div');
    document.body.append(host);

    const app = createApp({
      render: () =>
        vueH(
          VueForm,
          {
            initialValues: { name: 'test' },
            onSubmit: (_vals: Record<string, unknown>, formContext: FormContextValue) => {
              capturedContext = formContext;
              return onSubmit();
            },
          },
          () => [vueH('button', { type: 'submit' }, 'Submit')],
        ),
    });
    app.mount(host);

    const form = host.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
    await flushPromises();

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.isSubmitting).toBe(true);

    if (resolveSubmitPromise) {
      resolveSubmitPromise();
    }
    await flushPromises();

    expect(capturedContext?.isSubmitting).toBe(false);

    app.unmount();
    host.remove();
  });
});

describe('defaultFormContext fallback', () => {
  it('useFormContext returns defaultFormContext when used outside a form provider', () => {
    const context = useFormContext();
    expect(context).toBe(defaultFormContext);
    expect(context.isValid).toBe(true);
    expect(context.isSubmitting).toBe(false);
    expect(context.isDirty).toBe(false);
  });

  it('defaultFormContext async methods resolve predictably and callbacks execute safely', async () => {
    await expect(defaultFormContext.submitForm()).resolves.toBeUndefined();
    await expect(defaultFormContext.validateForm()).resolves.toEqual({});
    await expect(defaultFormContext.validateField('email')).resolves.toBeUndefined();

    // Verify synchronous no-ops do not throw
    expect(() => defaultFormContext.setFieldValue('email', 'test')).not.toThrow();
    expect(() => defaultFormContext.setFieldTouched('email', true)).not.toThrow();
    expect(() => defaultFormContext.setFieldError('email', 'error')).not.toThrow();
    expect(() => defaultFormContext.setValues({ email: 'test' })).not.toThrow();
    expect(() => defaultFormContext.setErrors({})).not.toThrow();
    expect(() => defaultFormContext.setTouched({})).not.toThrow();
    expect(() => defaultFormContext.resetForm()).not.toThrow();

    const fieldProperties = defaultFormContext.getFieldProps('field');
    expect(fieldProperties.name).toBe('field');
    expect(fieldProperties.value).toBeUndefined();
    expect(fieldProperties.error).toBeUndefined();
    expect(fieldProperties.touched).toBe(false);
    expect(() => fieldProperties.onChange('val')).not.toThrow();
    expect(() => fieldProperties.onBlur()).not.toThrow();
  });
});
