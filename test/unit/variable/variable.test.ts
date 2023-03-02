/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-unused-expressions */
/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { expect } from 'chai';
import VariableManager, { VARIABLE_TYPE, REPLACE_MODE } from '@/variable';

describe('test variable manager', () => {
  describe('string mode null and undefined', () => {
    [
      { arg1: undefined, arg2: undefined, arg3: undefined },
      { arg1: undefined, arg2: '12345 ${test}', arg3: '12345 undefined' },
      { arg1: undefined, arg2: '${test}', arg3: 'undefined' },
      { arg1: null, arg2: null, arg3: 'null', name: 'null' },
      { arg1: null, arg2: '12345 ${test}', arg3: '12345 null' },
      { arg1: null, arg2: '${test}', arg3: 'null' },
    ].forEach((item) => {
      it('string mode null and undefined', () => {
        const variable = new VariableManager();
        variable.set('test', item.arg1);
        const ret = variable.replace(item.arg2, REPLACE_MODE.STRING);
        expect(ret).to.be.equal(item.arg3);
      });
    });
  });

  describe('string mode common case', () => {
    [
      { arg1: 'test ${hello} ${abc} ${a[0].test} ${b}', arg2: 'test true {"a":1} 123 string' },
      { arg1: 'test ${abc.a}', arg2: 'test 1' },
      { arg1: 'test ${a[0].test}', arg2: 'test 123' },
      { arg1: 'test ${a[0]}', arg2: 'test {"test":123}' },
      { arg1: 'test ${a[1]}', arg2: 'test undefined' },
      { arg1: 'test ${b[1]}', arg2: 'test t' },
      { arg1: 'test ${c[1]}', arg2: 'test ${c[1]}' },
      { arg1: '12345', arg2: '12345' },
      { arg1: '12345 ${abcd}', arg2: '12345 null' },
      { arg1: '', arg2: '' },
      { arg1: '$a{}', arg2: '$a{}' },
      { arg1: '${}', arg2: '${}' },
      { arg1: '${--}', arg2: '${--}' },
      { arg1: '${a_c["hello-world"]}', arg2: '123' },
      { arg1: '12345 ${abcde}', arg2: '12345 ${abcde}' },
      { arg1: '12345 ${bug9}', arg2: '12345 12345$$$' },
    ].forEach((item) => {
      it('string mode common case', () => {
        const variable = new VariableManager();
        variable.set('hello', true);
        variable.set('hello2', 'true');
        variable.set('abc', { a: 1 });
        variable.set('abcd', null);
        variable.set('bug9', '12345$$$');
        variable.set('abcde', null);
        variable.set('bug9', '12345$$$');
        variable.set('a', [{ test: 123 }]);
        variable.set('a_c', { 'hello-world': 123 });
        variable.set('b', 'string');
        variable.del('abcde');
        const ret = variable.replace(item.arg1);
        expect(ret).to.be.equal(item.arg2);
      });
    });
  });

  describe('auto mode', () => {
    [
      { arg1: true, arg2: true },
      { arg1: 123, arg2: 123 },
      { arg1: null, arg2: null },
      { arg1: 'string 123', arg2: 'string 123' },
      { arg1: { a: 1, b: { a: 1 } }, arg2: { a: 1, b: { a: 1 } } },
      { arg1: [1, 2, 3, 4, 5], arg2: [1, 2, 3, 4, 5] },
      { arg1: undefined, arg2: undefined },
    ].forEach((item) => {
      it(`type is ${typeof item.arg1}`, () => {
        const variable = new VariableManager();
        variable.set('hello', item.arg1);
        const ret = variable.replace('${hello}', REPLACE_MODE.AUTO);
        expect(ret).to.deep.equal(item.arg2);
      });
    });

    it('auto mode mixed content', () => {
      const variable = new VariableManager();
      variable.set('hello', 'string');
      variable.set('hello1', true);
      variable.set('hello2', 43);
      variable.set('hello3', { a: 1 });
      variable.set('hello4', [1, 2, 3, 4, 5, 6]);
      const ret = variable.replace('${hello} ${hello1} ${hello2} ${hello3} ${hello4}', REPLACE_MODE.AUTO);
      expect(ret).to.be.equal('string true 43 {"a":1} [1,2,3,4,5,6]');
    });
  });

  it('syntax mode', () => {
    const variable = new VariableManager();
    variable.set('hello', 'stri"ng');
    variable.set('hello1', true);
    variable.set('hello2', 43);
    variable.set('hello3', { a: 1 });
    variable.set('hello4', [1, 2, 3, 4, 5, 6]);
    variable.set('hello5', null);
    variable.set('hello6', undefined);
    const ret = variable.replace('${hello} ${hello1} ${hello2} ${hello3} ${hello4} ${hello5} ${hello6} ${hello7} ${hello3.b}', REPLACE_MODE.SYNTAX);
    expect(ret).to.be.equal('"stri\\"ng" true 43 {"a":1} [1,2,3,4,5,6] null undefined ${hello7} undefined');
  });

  it('buffer type', () => {
    const variable = new VariableManager();
    const a = Buffer.from('test');
    expect(variable.replace(a)).to.be.equal(a);
  });

  it('variable manager extends', () => {
    const variable = new VariableManager();
    variable.set('hello', true);
    variable.set('hello2', 'true');
    const variable2 = new VariableManager(variable);
    const ret = variable2.replace('if (${hello} == true && ${hello2} == "true")', REPLACE_MODE.STRING);
    expect(ret).to.be.equal('if (true == true && true == "true")');
  });

  it('variable manager extends2', () => {
    const variable = new VariableManager();
    variable.set('hello', true);
    variable.set('hello2', 'true');
    const variable2 = new VariableManager(variable, [VARIABLE_TYPE.CONTEXT]);
    const ret = variable2.replace('if (${hello} == true && ${hello2} == "true")', REPLACE_MODE.STRING);
    expect(ret).to.be.equal('if (true == true && true == "true")');
  });

  describe('get variable', () => {
    [
      { arg1: undefined },
      { arg1: null },
      { arg1: true },
      { arg1: 123 },
      { arg1: 'string 123' },
      { arg1: { a: 1, b: { a: 1 } } },
      { arg1: [1, 2, 3, 4, 5] },
    ].forEach((item) => {
      it(`get ${typeof item.arg1}`, () => {
        const variable = new VariableManager();
        variable.set('content', item.arg1);
        variable.setEnv('env', item.arg1);
        variable.setExecute('exec', item.arg1);
        expect(variable.get('content')).to.deep.equal(item.arg1);
        expect(variable.getEnv('env')).to.deep.equal(item.arg1);
        expect(variable.getExecute('exec')).to.deep.equal(item.arg1);
      });
    });

    it('get all variable', () => {
      const variable = new VariableManager();
      variable.set('hello0', 'stri"ng');
      variable.set('hello1', true);
      variable.set('hello2', 43);
      variable.set('hello3', { a: 1 });
      variable.set('hello4', [1, 2, 3, 4, 5, 6]);
      const ret = variable.getVariables();
      expect(ret).to.deep.equal({
        [VARIABLE_TYPE.ENV]: {},
        [VARIABLE_TYPE.CONTEXT]: {
          hello0: 'stri"ng',
          hello1: true,
          hello2: 43,
          hello3: { a: 1 },
          hello4: [1, 2, 3, 4, 5, 6],
        },
        [VARIABLE_TYPE.EXECUTE]: {},
        [VARIABLE_TYPE.GLOBAL]: {},
      });
    });

    it('get variable cover', () => {
      const variable = new VariableManager();
      variable.set('hello0', 'stri"ng');
      variable.setContext('hello0', true);
      variable.setExecute('hello0', { a: 1 });
      const ret = variable.get('hello0');
      const ret2 = variable.getContext('hello0');
      expect(ret).to.deep.equal(true);
      expect(ret2).to.be.true;
    });
  });

  describe('object path get', () => {
    [
      { arg1: '[0]', arg2: { a: 1, b: true, c: 123 }, arg3: '{"a":1,"b":true,"c":123} 123' },
      { arg1: '[0].a', arg2: 1, arg3: '1 123' },
      { arg1: '[0].b', arg2: true, arg3: 'true 123' },
      { arg1: '[0].c', arg2: 123, arg3: '123 123' },
    ].forEach((item) => {
      it('object path', () => {
        const variable = new VariableManager();
        variable.set('hello', [
          { a: 1, b: true, c: 123 },
        ]);
        expect(variable.replace(`\${hello${item.arg1}}`, REPLACE_MODE.AUTO)).to.deep.equal(item.arg2);
        expect(variable.replace(`\${hello${item.arg1}} 123`)).to.be.equal(item.arg3);
      });
    });

    it('tring[object] variable get test', () => {
      const variable = new VariableManager();
      variable.set('hello', '{"a":1,"b":true,"c":123}');
      expect(variable.replace('${hello.a}', REPLACE_MODE.AUTO)).to.deep.equal(1);
    });
  });

  it('variable extends', () => {
    const variable = new VariableManager();
    variable.setEnv('hello', true);
    variable.setEnv('hello2', 'true');
    const variable2 = new VariableManager(variable, [VARIABLE_TYPE.ENV]);
    const ret = variable2.replace('if (${hello} == true && ${hello2} == "true")', REPLACE_MODE.STRING);
    expect(ret).to.be.equal('if (true == true && true == "true")');
  });

  it('variable local replace', () => {
    const variable = new VariableManager();
    variable.set('hello', 'world');
    const local = variable.createLocal();
    local.set('hello2', 'world2');
    local.setLocal('hello3', 'world3');
    // expect(variable.replace('${hello}')).to.be.equal('world');
    expect(variable.replace('${hello2}')).to.be.equal('world2');
    expect(variable.replace('${hello3}')).to.be.equal('${hello3}');
    expect(local.replace('${hello2}')).to.be.equal('world2');
    expect(local.replace('${hello3}')).to.be.equal('world3');
  });

  it('variable local get', () => {
    const variable = new VariableManager();
    variable.set('hello', 'world');
    const local = variable.createLocal();
    local.set('hello2', 'world2');
    local.setLocal('hello3', 'world3');
    expect(variable.get('hello2')).to.be.equal('world2');
    expect(local.get('hello2')).to.be.equal('world2');
    expect(variable.get('hello3')).to.be.equal(undefined);
    expect(local.get('hello3')).to.be.equal('world3');
  });

  it('variable replace multiple', () => {
    const variable = new VariableManager();
    variable.setEnv('hello', true);
    const ret = variable.replace('${hello} ${hello}${hello}1${hello}${hello}');
    expect(ret).to.be.equal('true truetrue1truetrue');
  });
});
