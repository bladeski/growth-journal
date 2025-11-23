import '../../../src/components/PersonalGrowth/PersonalGrowth';

describe('PersonalGrowth extra behaviors', () => {
  test('emits edit events when editMidday and editEvening called', async () => {
    const el = document.createElement('personal-growth') as any;
    // minimal template so shadowRoot exists
    el.templateFn = () => `<div><div id="midday-display"></div><div id="reflection-display"></div></div>`;
    document.body.appendChild(el);

    // wait a tick so connectedCallback/onMount run
    await new Promise((r) => setTimeout(r, 0));

    // hook into emitted events (use camelCase event names emitted by the component)
    let seen = 0;
    const p = new Promise<void>((resolve) => {
      el.addEventListener('editMidday', () => {
        seen += 1;
        if (seen === 2) resolve();
      });
      el.addEventListener('editEvening', () => {
        seen += 1;
        if (seen === 2) resolve();
      });
    });

    // call the edit helpers which should emit
    el.editMiddayCheckin && el.editMiddayCheckin();
    el.editEveningCheckin && el.editEveningCheckin();

    await p;
  });

  test('date navigation updates internal date', async () => {
    const el = document.createElement('personal-growth') as any;
    el.templateFn = () => `<div><div id="journal-date"></div></div>`;
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 0));

    const start = el.getCurrentData().date;
    if (el.goToNext) await el.goToNext();
    const next = el.getCurrentData().date;
    expect(next).not.toBe(start);
    if (el.goToPrevious) await el.goToPrevious();
    const back = el.getCurrentData().date;
    expect(back).toBe(start);
  });
});
