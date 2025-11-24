import '../../../src/components/CheckinHeader/CheckinHeader.ts';

describe('CheckinHeader', () => {
  test('updateHeader updates props and visibility', () => {
    const el = document.createElement('checkin-header') as any;
    document.body.appendChild(el);

    // ensure shadowRoot available
    if (!el.shadowRoot) el.attachShadow({ mode: 'open' });

    // add elements used in visibility
    const daily = document.createElement('div');
    daily.className = 'daily-focus';
    el.shadowRoot.appendChild(daily);
    const core = document.createElement('p');
    core.className = 'core-value';
    el.shadowRoot.appendChild(core);
    const intent = document.createElement('p');
    intent.className = 'intention';
    el.shadowRoot.appendChild(intent);
    const meta = document.createElement('div');
    meta.className = 'metadata-container';
    el.shadowRoot.appendChild(meta);

    // update with empty values -> should hide
    el.updateHeader({ coreValue: '', intention: '', metadata: '' });
    expect(daily.style.display).toBe('none');
    expect(core.style.display).toBe('none');
    expect(intent.style.display).toBe('none');
    expect(meta.style.display).toBe('none');

    // update with content -> should show and set metadata innerHTML
    el.updateHeader({ coreValue: 'Focus', intention: 'Be present', metadata: '<span>hi</span>' });
    expect(daily.style.display).toBe('flex');
    expect(core.style.display).toBe('inline-flex');
    expect(intent.style.display).toBe('inline-flex');
    expect(meta.style.display).toBe('block');
    expect(meta.innerHTML).toContain('hi');
  });
});
