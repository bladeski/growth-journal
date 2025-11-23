import { jest } from '@jest/globals';
import '../../../src/components/Base/BaseFormComponent';
import { mockIndexedDbService } from '../helpers/testHelpers';

describe('BaseFormComponent behavior', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('updateFormValues maps props to inputs and spans', async () => {
    // create a fake shadowRoot container
    const root = document.createElement('div');
    root.innerHTML = `<input id="f1" /><span id="s1"></span>`;

    // host is a plain object with a shadowRoot and props
    const host: any = { shadowRoot: root, props: {} };

    // get prototype methods
    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;

    host.props.foo = 'abc';
    host.props.bar = 'xyz';

    BaseProto.updateFormValues.call(host, [
      { selector: '#f1', propName: 'foo' },
      { selector: '#s1', propName: 'bar' },
    ]);

    const f = root.querySelector('#f1') as HTMLInputElement;
    const s = root.querySelector('#s1') as HTMLSpanElement;
    expect(f.value).toBe('abc');
    expect(s.textContent).toBe('xyz');
  });

  test('createFieldUpdater updates props and clears error messages', async () => {
    const root = document.createElement('div');
    root.innerHTML = `<textarea id="x"></textarea>`;

    const host: any = { shadowRoot: root, props: { field: '', errorMessage: 'err' }, clearMessages: () => { host.props.errorMessage = ''; } };

    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;
    const updater = BaseProto.createFieldUpdater.call(host, 'field');

    // simulate input event
    const ta = root.querySelector('#x') as HTMLTextAreaElement;
    ta.value = 'abc';
    updater({ target: ta } as unknown as Event);
    expect(host.props.field).toBe('abc');
    expect(host.props.errorMessage).toBe('');
  });

  test('handleFormSubmit success and failure flows', async () => {
    const mocker = mockIndexedDbService({});

    const host: any = {
      props: { successMessage: '', errorMessage: '', isLoading: false },
      updateMessages: () => {},
      updateSubmitButton: () => {},
      clearMessages: () => {},
      dispatchEvent: () => {},
    };

    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;

    // fake form element
    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;

    const apiCallSuccess = jest.fn().mockResolvedValue({ ok: true });
    await BaseProto.handleFormSubmit.call(host, { preventDefault: () => {}, target: form } as unknown as Event, null, () => ({ x: 1 }), apiCallSuccess, 'ok', 'test');
    expect(host.props.successMessage).toBeDefined();

    const apiCallFail = jest.fn().mockRejectedValue(new Error('fail'));
    await BaseProto.handleFormSubmit.call(host, { preventDefault: () => {}, target: form } as unknown as Event, null, () => ({ x: 1 }), apiCallFail, 'ok', 'test');
    expect(host.props.errorMessage).toBeDefined();

    mocker.restoreAll();
  });
});
