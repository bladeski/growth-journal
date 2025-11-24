import { BaseComponent } from '../../../src/components/Base/BaseComponent';
import { jest } from '@jest/globals';

describe('BaseComponent core behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('renders template function and binds props placeholders', () => {
    // Create a small subclass for testing that properly extends BaseComponent
    class TestComp extends BaseComponent<{ title: string }, any> {
      constructor() {
        super((locals: any) => `<div><span data-bind="title"></span><button data-action="click:onClick">Go</button></div>`, { title: 'init' }, []);
      }
      connectedCallback() {
        super.connectedCallback();
      }
      onClick() {
        (this as any)._clicked = true;
      }
    }

    customElements.define('test-base-comp', TestComp as any);

    const el = document.createElement('test-base-comp') as any;
    document.body.appendChild(el);

    // ensure the template rendered and data-bind was populated
    const span = el.shadowRoot && el.shadowRoot.querySelector('[data-bind="title"]');
    expect(span).toBeTruthy();
    expect(span.textContent).toBe('init');

    // assign prop directly and ensure updateBindings updates bound nodes
    el.props.title = 'changed';
    // subsequent render/updateBindings happens synchronously via proxy
    expect(span.textContent).toBe('changed');
  });

  test('syncs data-prop attributes to props and attributeChangedCallback updates bindings', async () => {
    class AttrComp extends BaseComponent<{ label: string }, any> {
      constructor() {
        super((locals: any) => `<div><span data-bind="label"></span></div>`, { label: 'none' }, []);
      }
      static get observedAttributes() {
        return ['data-prop:label'];
      }
    }

    customElements.define('test-attr-comp', AttrComp as any);
    const el = document.createElement('test-attr-comp') as any;
    // set attribute before connecting
    el.setAttribute('data-prop:label', 'from-attr');
    document.body.appendChild(el);

    // attribute should be synced into props and rendered
    const span = el.shadowRoot && el.shadowRoot.querySelector('[data-bind="label"]');
    expect(el.props.label).toBe('from-attr');
    expect(span.textContent).toBe('from-attr');

    // change attribute after connect
    el.setAttribute('data-prop:label', 'updated');
    // attributeChangedCallback should update bindings
    expect(el.props.label).toBe('updated');
    expect(span.textContent).toBe('updated');
  });

  test('disconnectedCallback clears shadowRoot and state', () => {
    class DComp extends BaseComponent<{ x: string }, any> {
      constructor() {
        super(() => `<div><span data-bind="x"></span></div>`, { x: 'y' }, []);
      }
    }

    customElements.define('test-disconnect-comp', DComp as any);
    const el = document.createElement('test-disconnect-comp') as any;
    document.body.appendChild(el);
    expect(el.shadowRoot && el.shadowRoot.innerHTML).toContain('data-bind="x"');

    // explicitly invoke disconnectedCallback to ensure cleanup
    if (typeof el.disconnectedCallback === 'function') el.disconnectedCallback();
    document.body.removeChild(el);
    // after disconnected, shadowRoot should be cleared
    expect(el.shadowRoot && el.shadowRoot.innerHTML).toBe('');
  });
});
import { BaseComponent } from '../../../src/components/Base/BaseComponent';

describe('BaseComponent behavior', () => {
  test('renders template and binds props to spans', () => {
    // create a minimal template function
    const tpl = (locals: any) => `<div><span data-bind="title"></span><button data-action="click:onClick">Click</button></div>`;

    // host object with shadowRoot
    const root = document.createElement('div');

    const host: any = {
      shadowRoot: root,
      props: { title: 'Hello' },
      bindActions: (function () {}).bind(null),
      templateFn: tpl,
      initialized: false,
      bindings: new Map<string, HTMLElement[]>(),
    };

    // give the plain host the BaseComponent prototype and constructor so
    // private prototype methods and static observedAttributes are available
    Object.setPrototypeOf(host, BaseComponent.prototype);
    host.constructor = BaseComponent;

    // use the imported prototype
    const BaseProto: any = BaseComponent.prototype;

    // attach the template function and call render via prototype
    host.templateFn = tpl;
    BaseProto.render.call(host);

    const span = root.querySelector('[data-bind="title"]') as HTMLSpanElement;
    expect(span.textContent).toBe('Hello');
  });

  test('syncDataPropAttributes converts data-prop to props', () => {
    const el = document.createElement('div') as any;
    el.setAttribute('data-prop:my-prop', '123');

    // ensure prototype/constructor are set so observedAttributes is available
    Object.setPrototypeOf(el, BaseComponent.prototype);
    el.constructor = BaseComponent;

    // ensure the class declares the observed attribute we want synced
    const originalObserved = (BaseComponent as any).observedAttributes;
    (BaseComponent as any).observedAttributes = ['data-prop:my-prop'];

    // use prototype method from imported class
    const BaseProto: any = BaseComponent.prototype;

    el.props = { myProp: 0 };
    BaseProto.syncDataPropAttributes.call(el);
    expect(el.props.myProp).toBe(123);

    // restore original observedAttributes
    (BaseComponent as any).observedAttributes = originalObserved;
  });
});
