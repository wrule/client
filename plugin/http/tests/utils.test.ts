/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { expect } from 'chai';
import { urlEncodeFromEncoding, urlDecodeFromEncode } from '@plugin/http/utils';

describe('http utils', () => {
  it('urlEncodeFromEncoding', async () => {
    expect(urlEncodeFromEncoding('中国人', 'gbk')).to.be.equal('%D6%D0%B9%FA%C8%CB');
  });
  it('urlDecodeFromEncode', async () => {
    expect(urlDecodeFromEncode('%D6%D0%B9%FA123%C8%CB', 'gbk')).to.be.equal('中国123人');
  });
});
