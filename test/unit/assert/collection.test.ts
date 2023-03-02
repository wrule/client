/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import assert from 'node:assert';
import { expect } from 'chai';
import { isCollection } from '@/assert';

describe('assert collection', () => {
  it('is collection', async () => {
    expect(isCollection('a', ['a'])).to.be.equal(true);
  });
  it('is not collection ', async () => {
    expect(isCollection('c', ['b'])).to.be.equal(false);
  });

  it('collection stringify array', async () => {
    // @ts-ignore
    expect(isCollection('b', JSON.stringify(['b']))).to.be.equal(true);
  });

  it('collection print error', async () => {
    try {
      // @ts-ignore
      isCollection('c', 'aaa');
      assert(false);
    } catch (e) {}
  });
});
