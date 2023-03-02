/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

export interface FieldRules {
  /** 正则表达式/字段名 */
  pattern: string;
  /** 区分大小写 默认不区分 */
  ignoreCase?: boolean;
  /** 规则匹配包含的类型 */
  type: string[];
  /** mock的值 */
  mock: string;
}

export interface FieldRegExp {
  ignoreCase: boolean;
  /** 规则匹配包含的类型 */
  type: string[];
  /** mock的值 */
  mock: string;
  /** pattern */
  pattern: RegExp;
}
export type FieldsRegExp = Record<string, FieldRegExp>;

export const createFieldRegExp = (fieldRules: FieldRules[]): FieldsRegExp => {
  const result: Record<string, FieldRegExp> = {};
  fieldRules.forEach((fieldRule) => {
    const { pattern, type, mock, ignoreCase } = fieldRule;
    const regExp = new RegExp(pattern, ignoreCase === false ? '' : 'i');
    const key = `${type.sort().join(',')}_${regExp.source}`;
    result[key] = {
      ignoreCase: ignoreCase !== false,
      type,
      mock,
      pattern: regExp,
    };
  });
  return result;
};

export const DEFAULT_FIELDS_REGEXP: FieldsRegExp = createFieldRegExp([
  { type: ['string'], pattern: 'avatar|icon', mock: "@image('100x100')" },
  { type: ['string'], pattern: 'image|img|photo|pic', mock: "@image('400x400')" },
  { type: ['string'], pattern: '.*url', mock: "@url('http')" },
  { type: ['string'], pattern: 'nick|user_?name', mock: '@cname' },
  { type: ['string'], pattern: 'title|name|.*tip$', mock: '@ctitle' },
  { type: ['string', 'integer', 'number'], pattern: 'id|num|code|amount|quantity|price|discount|balance|money', mock: '@natural(1,100)' },
  { type: ['string', 'integer', 'number'], pattern: 'phone|mobile|tel$', mock: '@phone' },
  { type: ['string'], pattern: '.*date', mock: "@date('yyyy-MM-dd')" },
  { type: ['integer', 'number'], pattern: '.*date', mock: "@date('yyyyMMdd')" },
  { type: ['string'], pattern: 'created?_?at|updated?_?at|deleted?_?at|.*time', mock: "@datetime('yyyy-MM-dd HH:mm:ss')" },
  { type: ['integer', 'number'], pattern: 'created?_?at|updated?_?at|deleted?_?at|.*time', mock: "@datetime('T')" },
  { type: ['string'], pattern: 'e?mail*', mock: "@email('163.com')" },
  { type: ['string'], pattern: '.*province.*', mock: '@province' },
  { type: ['string'], pattern: '.*city.*', mock: '@city' },
  { type: ['string'], pattern: '.*address', mock: '@address' },
  { type: ['string'], pattern: '.*district', mock: '@county' },
  { type: ['string'], pattern: '.*ip$', mock: '@ip' },
  { type: ['string'], pattern: 'birthday', mock: "@date('yyyy-MM-dd')" },
  { type: ['integer', 'number'], pattern: 'birthday', mock: '@date(yyyyMMdd)' },
  { type: ['string'], pattern: 'gender|sex', mock: '@pick(["男","女"])' },
  { type: ['string'], pattern: 'description', mock: '@cparagraph' },
]);
