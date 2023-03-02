/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { expect } from 'chai';
import { assignmentRegExp } from '@/assignment';

describe('assignment REGEXP', () => {
  [
    { arg1: '1 2 3 4 5', arg2: '\\w', arg3: '', arg4: 0, arg5: '1' },
    { arg1: '1.2.3.4.5', arg2: '\\w.(\\w).\\w.(\\w).\\w', arg3: 'g', arg4: 2, arg5: ['4'] },
    { arg1: '1.2.3.4.5', arg2: '\\w.(\\w).\\w.(\\w).\\w', arg3: '', arg4: 2, arg5: '4' },
    { arg1: '1 2 3 4 5', arg2: '\\w', arg3: 'g', arg4: undefined, arg5: ['1', '2', '3', '4', '5'] },
    { arg1: '1 2 3 4 5', arg2: 'a', arg3: 'g', arg4: undefined, arg5: [] },
    { arg1: '1 2 3 4 5', arg2: 'test', arg3: '', arg4: '', arg5: undefined },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentRegExp({
        content: item.arg1,
        exp: item.arg2,
        flags: item.arg3,
        index: item.arg4,
      })).to.deep.equal(item.arg5);
    });
  });
});

describe('assignment REGEXP IP', () => {
  it('case 1', () => {
    expect(assignmentRegExp({
      content: '213kopdko 14.27.178.11 12k3opsdas',
      exp: '((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})(\\.((2(5[0-5]|[0-4]\\d))|[0-1]?\\d{1,2})){3}',
      index: 0,
    })).to.deep.equal('14.27.178.11');
  });
});
