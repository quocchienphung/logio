import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CollateralPlayback } from './collateral-simulation.ts';
import { SAMPLE_ISSUES } from './fixtures.ts';

const labelOnly = { name: 'Untrusted.xlsx', size: 123, arrayBuffer() { throw new Error('Must not read bytes'); }, text() { throw new Error('Must not read content'); } };
test('a selected file supplies only a label; the preview always uses the fixed sample', async t => {
  const model = new CollateralPlayback(); t.after(() => model.dispose());
  await model.open(labelOnly);
  const state = model.getSnapshot();
  assert.equal(state.phase, 'ready');
  assert.equal(state.fileName, labelOnly.name);
  assert.equal(state.result.profile.sheets[0].dataRows, 6);
  assert.equal((await model.gridRows(2, 1))[0].values[3], 'BR001');
  assert.equal(state.unsaved, false);
  assert.equal((await model.exportXlsx()).blob, undefined, 'no real export bytes');
  assert.equal((await model.loadProgress(labelOnly)).ok, true, 'progress input is also not read');
});
test('review, undo and redo update only sample state; a fresh instance starts empty', async t => {
  const model = new CollateralPlayback(); t.after(() => model.dispose());
  await model.open();
  const issue = SAMPLE_ISSUES[0];
  await model.edit([{ row: issue.row, col: issue.col, value: 'Sample edit' }]);
  assert.equal(model.getSnapshot().view.states[issue.id].correctedValue, 'Sample edit');
  await model.undo(); assert.equal(model.getSnapshot().view.states[issue.id], undefined);
  await model.redo(); assert.equal(model.getSnapshot().view.states[issue.id].correctedValue, 'Sample edit');
  assert.equal(new CollateralPlayback().getSnapshot().phase, 'idle');
});
test('closing or replacing the preview cancels pending progress and repair commits', async t => {
  const model = new CollateralPlayback(); t.after(() => model.dispose());
  const old = model.open(labelOnly); model.close(); await old;
  assert.equal(model.getSnapshot().phase, 'idle');
  const first = model.open({ name: 'First.xlsx', size: 1 });
  const second = model.open({ name: 'Second.xlsx', size: 2 });
  await Promise.all([first, second]);
  assert.equal(model.getSnapshot().result.fileName, 'Second.xlsx');
  const repair = model.autoRepair(); model.close(); assert.equal(await repair, null);
  assert.equal(model.getSnapshot().view, null);
});
