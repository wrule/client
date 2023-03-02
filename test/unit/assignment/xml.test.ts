/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

import { expect } from 'chai';
import { assignmentXML } from '@/assignment';

describe('assignment XML', () => {
  [
    { arg1: `
    <?xml version="1.0" encoding="ISO-8859-1"?>
    <note>
      <to>George</to>
      <from>John</from>
      <heading>Reminder</heading>
      <body>Don't forget the meeting!</body>
    </note>`,
    arg2: 'note.to',
    arg3: 'George' },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentXML({
        content: item.arg1,
        path: item.arg2,
      })).to.be.equal(item.arg3);
    });
  });
});

describe('assignment XML attributeMode', () => {
  [
    { arg1: `
    <?xml version="1.0" encoding="ISO-8859-1"?>
    <bookstore>
      <book category="COOKING">
        <title lang="en">Everyday Italian</title>
        <author>Giada De Laurentiis</author>
        <year>2005</year>
        <price>30.00</price>
      </book>
      <book category="CHILDREN">
        <title lang="en">Harry Potter</title>
        <author>J K. Rowling</author>
        <year>2005</year>
        <price>29.99</price>
      </book>
      <book category="WEB">
        <title lang="en">Learning XML</title>
        <author>Erik T. Ray</author>
        <year>2003</year>
        <price>39.95</price>
      </book>
    </bookstore>`,
    arg2: 'bookstore.book[0]["#category"]',
    arg3: 'COOKING' },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentXML({
        content: item.arg1,
        path: item.arg2,
        attributeMode: true,
      })).to.be.equal(item.arg3);
    });
  });
});

describe('assignment XML number', () => {
  [
    { arg1: `
    <?xml version="1.0"?>
    <note>
      <to>00000</to>
    </note>`,
    arg2: 'note.to',
    arg3: '00000' },
  ].forEach((item, index) => {
    it(`case ${index}`, () => {
      expect(assignmentXML({
        content: item.arg1,
        path: item.arg2,
      })).to.be.equal(item.arg3);
    });
  });
});
