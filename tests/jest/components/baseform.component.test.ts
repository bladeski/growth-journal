import { jest } from '@jest/globals';
import '../../../src/components/Base/BaseFormComponent';

describe('BaseFormComponent helpers', () => {
  test('updateFormValues maps props into DOM elements', async () => {
    const root = document.createElement('div');
    root.innerHTML = `<input id="f1" /><span id="s1"></span>`;

    const host: any = { shadowRoot: root, props: { sampleField: 'value' } };

    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;

    BaseProto.updateFormValues.call(host, [
      { selector: '#f1', propName: 'sampleField' },
      { selector: '#s1', propName: 'sampleField' },
    ]);

    const f = root.querySelector('#f1') as HTMLInputElement;
    const s = root.querySelector('#s1') as HTMLSpanElement;
    expect(f.value).toBe('value');
    expect(s.textContent).toBe('value');
  });

  test('createFieldUpdater updates props and clears messages', async () => {
    const root = document.createElement('div');
    root.innerHTML = `<textarea id="x"></textarea>`;

    const host: any = { shadowRoot: root, props: { field: '', errorMessage: 'err' } };
    host.clearMessages = () => { host.props.errorMessage = ''; };

    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;
    const updater = BaseProto.createFieldUpdater.call(host, 'field');

    const ta = root.querySelector('#x') as HTMLTextAreaElement;
    ta.value = 'abc';
    updater({ target: ta } as unknown as Event);
    expect(host.props.field).toBe('abc');
    expect(host.props.errorMessage).toBe('');
  });

  test('handleFormSubmit success and failure flows', async () => {
    const host: any = {
      props: { successMessage: '', errorMessage: '', isLoading: false },
      updateMessages: () => {},
      updateSubmitButton: () => {},
      clearMessages: () => {},
      dispatchEvent: () => {},
    };

    const BaseProto: any = (await import('../../../src/components/Base/BaseFormComponent')).BaseFormComponent.prototype;

    const form = document.createElement('form');
    // @ts-ignore
    form.checkValidity = () => true;

    const apiCall = jest.fn().mockResolvedValue(true);
    await BaseProto.handleFormSubmit.call(host, { preventDefault: () => {}, target: form } as unknown as Event, null, () => ({ sampleField: 'x' }), apiCall, 'ok', 'testform');
    expect(host.props.successMessage).toBe('ok');

    (apiCall as any).mockRejectedValueOnce(new Error('fail'));
    await BaseProto.handleFormSubmit.call(host, { preventDefault: () => {}, target: form } as unknown as Event, null, () => ({ sampleField: 'x' }), apiCall, 'ok', 'testform');
    expect(host.props.errorMessage).toMatch(/fail|Failed to save/);
  });
});
