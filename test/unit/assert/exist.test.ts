/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { expect } from 'chai';
import { isExist } from '@/assert';

describe('assert exist', () => {
  [
    { arg1: null, arg2: false },
    { arg1: undefined, arg2: false },
    { arg1: '', arg2: false },
    { arg1: 'null', arg2: true },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(isExist(item.arg1)).to.be.equal(item.arg2);
    });
  });
});
