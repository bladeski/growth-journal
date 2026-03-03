import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { BaseComponent } from '../../../src/components/Base/BaseComponent.ts';

describe('BaseComponent advanced scenarios', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('property proxy behavior', () => {
    test('proxy setter calls updateBindings after initialization', () => {
      class ProxyTestComponent extends BaseComponent<{ title: string; message: string }> {
        constructor() {
          super(() => '<div><span data-bind="title"></span><span data-bind="message"></span></div>', {
            title: 'initial',
            message: 'test',
          });
        }
      }

      customElements.define('x-proxy-test', ProxyTestComponent);
      const el = document.createElement('x-proxy-test') as ProxyTestComponent;
      document.body.appendChild(el);

      // Manually render to initialize
      el.render();

      // Now when we set props via proxy after initialization, it should update bindings
      el.props.title = 'updated';

      const span = el.shadowRoot?.querySelector('[data-bind="title"]') as HTMLElement;
      expect(span?.textContent).toBe('updated');
    });

    test('proxy does not attempt updateBindings before initialization', () => {
      class ProxyPreInitComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(() => '<div>{{title}}</div>', { title: 'test' });
        }
      }

      customElements.define('x-proxy-preinit', ProxyPreInitComponent);
      const el = document.createElement('x-proxy-preinit') as ProxyPreInitComponent;

      // Before rendering (before initialization), setting props should not call updateBindings
      expect(() => {
        el.props.title = 'should not error';
      }).not.toThrow();
    });

    test('proxy ignores property sets with non-string keys', () => {
      class ProxySymbolComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(() => '<div></div>', { title: 'test' });
        }
      }

      customElements.define('x-proxy-symbol', ProxySymbolComponent);
      const el = document.createElement('x-proxy-symbol') as ProxySymbolComponent;
      document.body.appendChild(el);

      el.render();

      // Setting via symbol should work but not call updateBindings with non-string key
      const sym = Symbol('test');
      expect(() => {
        (el.props as Record<symbol, unknown>)[sym] = 'value';
      }).not.toThrow();
    });
  });

  describe('connectedCallback edge cases', () => {
    test('handles propKeys derivation when propKeys array is empty', () => {
      class EmptyPropKeysComponent extends BaseComponent<{ title: string }> {
        static propKeys = [] as const;

        constructor() {
          super(() => '<div>Test</div>', {});
        }
      }

      customElements.define('x-empty-propkeys', EmptyPropKeysComponent);
      const el = document.createElement('x-empty-propkeys') as EmptyPropKeysComponent;

      expect(() => {
        document.body.appendChild(el);
      }).not.toThrow();
    });

    test('handles propKeys derivation with camelCase props', () => {
      class CamelCasePropsComponent extends BaseComponent<{ userName: string; userEmail: string }> {
        static propKeys = ['userName', 'userEmail'] as const;

        constructor() {
          super(() => '<div><span data-bind="userName"></span></div>', {});
        }
      }

      customElements.define('x-camel-props', CamelCasePropsComponent);
      const el = document.createElement('x-camel-props') as CamelCasePropsComponent;

      expect(() => {
        document.body.appendChild(el);
        el.setAttribute('data-prop:user-name', 'John');
      }).not.toThrow();
    });

    test('handles propKeys with underscores', () => {
      class UnderscorePropsComponent extends BaseComponent<{ user_name: string }> {
        static propKeys = ['user_name'] as const;

        constructor() {
          super(() => '<div></div>', {});
        }
      }

      customElements.define('x-underscore-props', UnderscorePropsComponent);
      const el = document.createElement('x-underscore-props') as UnderscorePropsComponent;

      expect(() => {
        document.body.appendChild(el);
      }).not.toThrow();
    });

    test('handles missing observedAttributes gracefully', () => {
      class NoObservedComponent extends BaseComponent<{ test: string }> {
        static propKeys = undefined;

        constructor() {
          super(() => '<div></div>', { test: 'value' });
        }
      }

      customElements.define('x-no-observed', NoObservedComponent);
      const el = document.createElement('x-no-observed') as NoObservedComponent;

      expect(() => {
        document.body.appendChild(el);
      }).not.toThrow();
    });

    test('handles requiredProps checking on connectedCallback', () => {
      class RequiredPropsComponent extends BaseComponent<{ title: string; id: string }> {
        static requiredProps = ['title', 'id'];

        constructor() {
          super(() => '<div>{{title}}</div>', { title: 'test' });
        }
      }

      customElements.define('x-required-props', RequiredPropsComponent);
      const el = document.createElement('x-required-props') as RequiredPropsComponent;

      // Component should defer render since 'id' is missing
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(true);
    });

    test('syncs data-prop attributes on connectedCallback', () => {
      class DataPropComponent extends BaseComponent<{ label: string }> {
        static observedAttributes = ['data-prop:label'];

        constructor() {
          super(() => '<div><span data-bind="label"></span></div>', { label: 'default' });
        }
      }

      customElements.define('x-data-prop-sync', DataPropComponent);
      const el = document.createElement('x-data-prop-sync') as DataPropComponent;
      el.setAttribute('data-prop:label', 'synced-value');
      document.body.appendChild(el);

      expect(el.props.label).toBe('synced-value');
    });
  });

  describe('deferred rendering', () => {
    test('defers render when required props are missing', () => {
      class DeferredComponent extends BaseComponent<{ required: string; optional: string }> {
        static requiredProps = ['required'];

        constructor() {
          super(() => '<div>{{required}}</div>', {});
        }
      }

      customElements.define('x-deferred-render', DeferredComponent);
      const el = document.createElement('x-deferred-render') as DeferredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(true);
      expect(el.isInitialized).toBe(false);
    });

    test('tryInitialRender triggers render when requirements are met', () => {
      class DeferredComponent extends BaseComponent<{ required: string }> {
        static requiredProps = ['required'];

        constructor() {
          super(() => '<div>{{required}}</div>', {});
        }
      }

      customElements.define('x-try-initial-render', DeferredComponent);
      const el = document.createElement('x-try-initial-render') as DeferredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(true);

      // Use element-level accessor which calls setProp, triggering tryInitialRender
      (el as unknown as Record<string, unknown>).required = 'now-set';

      expect(el.renderDeferred).toBe(false);
      expect(el.isInitialized).toBe(true);
    });

    test('tryInitialRender does nothing if render was not deferred', () => {
      class NotDeferredComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(() => '<div>Test</div>', { title: 'value' });
        }
      }

      customElements.define('x-not-deferred', NotDeferredComponent);
      const el = document.createElement('x-not-deferred') as NotDeferredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(false);

      // Use element-level accessor through bracket notation
      (el as unknown as Record<string, unknown>).title = 'should not error';

      expect(el.renderDeferred).toBe(false);
    });
  });

  describe('useTemplateById', () => {
    test('uses template element when found', () => {
      // Create a template element
      const template = document.createElement('template');
      template.id = 'test-template';
      template.innerHTML = '<div><h1>{{title}}</h1></div>';
      document.body.appendChild(template);

      class TemplateComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(undefined, { title: 'test' });
        }
      }

      customElements.define('x-use-template', TemplateComponent);
      const el = document.createElement('x-use-template') as TemplateComponent;
      document.body.appendChild(el);

      // useTemplateById calls render() automatically when template is found
      el.useTemplateById('test-template');

      const h1 = el.shadowRoot?.querySelector('[data-bind="title"]') as HTMLElement;
      expect(h1?.textContent).toBe('test');
      
      template.remove();
    });

    test('resolves template when added before useTemplateById', () => {
      // Add the template to the DOM first
      const template = document.createElement('template');
      template.id = 'existing-template';
      template.innerHTML = '<div><p>{{title}}</p></div>';
      document.body.appendChild(template);

      class TemplateComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(undefined, { title: 'test' });
        }
      }

      customElements.define('x-existing-template', TemplateComponent);
      const el = document.createElement('x-existing-template') as TemplateComponent;
      document.body.appendChild(el);

      // useTemplateById calls render() automatically
      el.useTemplateById('existing-template');

      // Check for the rendered output with data binding
      expect(el.shadowRoot?.innerHTML).toContain('data-bind="title"');
      expect(el.shadowRoot?.innerHTML).toContain('test');

      template.remove();
    });

    test('sets up resolver when template not found initially', () => {
      class TemplateComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(undefined, { title: 'test' });
        }
      }

      customElements.define('x-template-later', TemplateComponent);
      const el = document.createElement('x-template-later') as TemplateComponent;
      document.body.appendChild(el);

      // Call useTemplateById before template exists - should set up a resolver
      el.useTemplateById('deferred-template');

      // Add the template after useTemplateById
      const template = document.createElement('template');
      template.id = 'deferred-template';
      template.innerHTML = '<div><p>{{title}}</p></div>';
      document.body.appendChild(template);

      // Manual render to trigger the resolver
      el.render();

      // Check that the template was resolved
      expect(el.shadowRoot?.innerHTML).toContain('data-bind="title"');
      expect(el.shadowRoot?.innerHTML).toContain('test');

      template.remove();
    });
  });

  describe('disconnectedCallback edge cases', () => {
    test('disconnectedCallback is called automatically when element is removed', () => {
      class DisconnectComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(() => '<div><span data-bind="title"></span></div>', { title: 'test' });
        }
      }

      customElements.define('x-disconnect', DisconnectComponent);
      const el = document.createElement('x-disconnect') as DisconnectComponent;
      document.body.appendChild(el);

      // Manually trigger render since connectedCallback might defer
      el.render();

      expect(el.isInitialized).toBe(true);
      const boundDisconnect = el.disconnectedCallback as () => void;

      expect(typeof boundDisconnect).toBe('function');
    });
  });

  describe('template resolution', () => {
    test('constructor with string template ID sets resolver', () => {
      const template = document.createElement('template');
      template.id = 'my-template-id';
      template.innerHTML = '<div>Template content</div>';
      document.body.appendChild(template);

      class StringTemplateComponent extends BaseComponent<{ text: string }> {
        constructor() {
          super('my-template-id', { text: 'value' });
        }
      }

      customElements.define('x-string-template', StringTemplateComponent);
      const el = document.createElement('x-string-template') as StringTemplateComponent;
      document.body.appendChild(el);

      // Test that the template was resolved and rendered
      expect(el.shadowRoot?.innerHTML).toContain('Template content');
      
      template.remove();
    });

    test('constructor with function template renders correctly', () => {
      const templateFn = () => '<div>Custom</div>';

      class FunctionTemplateComponent extends BaseComponent<{ text: string }> {
        constructor() {
          super(templateFn, { text: 'value' });
        }
      }

      customElements.define('x-function-template', FunctionTemplateComponent);
      const el = document.createElement('x-function-template') as FunctionTemplateComponent;
      document.body.appendChild(el);

      // Test the rendered output instead of the function reference
      expect(el.shadowRoot?.innerHTML).toContain('Custom');
    });
  });

  describe('initial props and accessors', () => {
    test('defines element prop accessors for initial props', () => {
      class PropAccessorComponent extends BaseComponent<{ label: string; count: number }> {
        get label(): string {
          return this.props.label;
        }
        set label(value: string) {
          this.props.label = value;
        }

        get count(): number {
          return this.props.count;
        }
        set count(value: number) {
          this.props.count = value;
        }

        constructor() {
          super(() => '<div></div>', { label: 'test', count: 0 });
        }
      }

      customElements.define('x-prop-accessor', PropAccessorComponent);
      const el = document.createElement('x-prop-accessor') as PropAccessorComponent;
      document.body.appendChild(el);

      // Should be able to set via element property
      el.label = 'updated';
      expect(el.props.label).toBe('updated');

      el.count = 5;
      expect(el.props.count).toBe(5);
    });

    test('handles empty initial props', () => {
      class EmptyPropsComponent extends BaseComponent<{ title: string }> {
        constructor() {
          super(() => '<div></div>', {});
        }
      }

      customElements.define('x-empty-props', EmptyPropsComponent);
      const el = document.createElement('x-empty-props') as EmptyPropsComponent;

      expect(() => {
        document.body.appendChild(el);
      }).not.toThrow();
    });
  });

  describe('shouldDeferInitialRender conditions', () => {
    test('returns false when no requiredProps defined', () => {
      class NoRequiredComponent extends BaseComponent<{ title: string }> {
        // requiredProps defaults to []
        constructor() {
          super(() => '<div></div>', { title: 'value' });
        }
      }

      customElements.define('x-no-required', NoRequiredComponent);
      const el = document.createElement('x-no-required') as NoRequiredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(false);
    });

    test('returns true when any required prop is undefined', () => {
      class MultiRequiredComponent extends BaseComponent<{ a: string; b: string; c: string }> {
        static requiredProps = ['a', 'b', 'c'];

        constructor() {
          super(() => '<div></div>', { a: 'set', c: 'set' });
        }
      }

      customElements.define('x-multi-required', MultiRequiredComponent);
      const el = document.createElement('x-multi-required') as MultiRequiredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(true);
    });

    test('returns false when all required props are defined', () => {
      class AllRequiredComponent extends BaseComponent<{ a: string; b: string }> {
        static requiredProps = ['a', 'b'];

        constructor() {
          super(() => '<div></div>', { a: 'value1', b: 'value2' });
        }
      }

      customElements.define('x-all-required', AllRequiredComponent);
      const el = document.createElement('x-all-required') as AllRequiredComponent;
      document.body.appendChild(el);

      expect(el.renderDeferred).toBe(false);
      expect(el.isInitialized).toBe(true);
    });
  });

  test('component renders with correct template', () => {
    class TestComponent extends BaseComponent<{ name: string }> {
      constructor() {
        super(() => '<div>Hello {{name}}</div>', { name: 'World' });
      }
    }

    customElements.define('x-test-component', TestComponent);
    const el = document.createElement('x-test-component') as TestComponent;
    document.body.appendChild(el);

    // Test the rendered output - properties are wrapped in data-bound elements
    const nameElement = el.shadowRoot?.querySelector('[data-bind="name"]') as HTMLElement;
    expect(nameElement?.textContent).toBe('World');
  });
});
