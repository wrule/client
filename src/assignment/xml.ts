/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import get from 'lodash/get';
import { XMLParser } from 'fast-xml-parser';
import { isObject, isArray } from '@/utils';
import { XMLOptions } from '@/assignment/types';

const xmlParser1 = new XMLParser({
  attributeNamePrefix: '#',
  textNodeName: 'content',
  ignoreAttributes: false,
  parseTagValue: false,
});

const xmlParser2 = new XMLParser({
  parseTagValue: false,
});

/**
 * XML assignment
 * @param {XMLOptions} opt
 */
export const assignmentXML = (opt: XMLOptions): any => {
  if (opt.content === undefined || opt.path === undefined) {
    throw new Error('Content or path is empty');
  }
  let json = opt.content;
  if (typeof opt.content === 'string') {
    const xmlParser = opt.attributeMode ? xmlParser1 : xmlParser2;
    json = xmlParser.parse(opt.content);
  }
  if (isObject(json) || isArray(json)) {
    const val = get(json, opt.path);
    return val;
  }
  throw new Error('Content is not a XML object');
};
