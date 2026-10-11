import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_LAYOUT, roomAt, homePath } from '../js/scene3d.js';

test('furniture sits in the right room', () => {
  const where = (id) => roomAt(HOME_LAYOUT[id].x, HOME_LAYOUT[id].z);
  for (const id of ['bed', 'fan']) assert.equal(where(id), 'bed', id);
  for (const id of ['toilet', 'shower', 'bucket']) assert.equal(where(id), 'bath', id);
  for (const id of ['sofa', 'tv', 'chair', 'stove', 'fridge', 'desk', 'speaker', 'dog']) assert.equal(where(id), 'living', id);
  for (const [id, o] of Object.entries(HOME_LAYOUT)) {
    if (o.stand) assert.equal(roomAt(...o.stand), roomAt(o.x, o.z), `${id}: you stand in the same room`);
  }
});

test('walking between rooms goes through the doorways', () => {
  assert.deepEqual(homePath([0, 0], [1, 1]), [[1, 1]]);
  const bedToBath = homePath(HOME_LAYOUT.bed.stand, HOME_LAYOUT.toilet.stand);
  assert.equal(bedToBath.length, 5);
  assert.equal(roomAt(...bedToBath[1]), 'living');
  assert.equal(roomAt(...bedToBath[3]), 'bath');
});
