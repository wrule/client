/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { expect } from 'chai';
import { assignmentJSON } from '@/assignment';

describe('assignment JSON', () => {
  [
    { arg1: { a: 124 }, arg2: 'a', arg3: 124 },
    { arg1: '{ "a": 123 }', arg2: 'a', arg3: 123 },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentJSON({
        content: item.arg1,
        path: item.arg2,
      })).to.be.equal(item.arg3);
    });
  });
});

describe('assignment JSON Error', () => {
  it('case 1', () => {
    try {
      assignmentJSON({
        content: 'hello',
        path: '0',
      });
      expect(1).to.be.equal(2);
    } catch (e) {
      expect(e).to.be.an('error');
    }
  });
});

describe('assignment JSON Recursion', () => {
  [
    { arg1: { a: 124, b: { c: '12345' } }, arg2: 'b.c', arg3: '12345' },
    { arg1: '{ "a": 123 }', arg2: 'a', arg3: 123 },
    { arg1: JSON.stringify({ a: 124, b: JSON.stringify({ c: 124, d: [0, 1, 2, 3] }) }), arg2: 'b.c', arg3: 124 },
    { arg1: JSON.stringify({ a: 124, b: JSON.stringify(JSON.stringify({ c: 124, d: JSON.stringify([0, 1, 2, 3]) })) }), arg2: 'b.d', arg3: [0, 1, 2, 3] },
    { arg1: JSON.stringify({ a: 124, b: JSON.stringify(JSON.stringify({ c: 124, d: JSON.stringify([0, 1, 2, 3]) })) }).replace(/\\/g, '\\\\').replace(/\"/g, '\\"'), arg2: 'b.d', arg3: [0, 1, 2, 3] },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentJSON({
        content: item.arg1,
        path: item.arg2,
        recursion: true,
      })).to.deep.equal(item.arg3);
    });
  });
});
