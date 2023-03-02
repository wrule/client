/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// http://eslint.org/docs/user-guide/configuring
module.exports = {
  root: true,
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  env: {
    node: true,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  // check if imports actually resolve
  settings: {
    'import/resolver': {
      node: {},
      typescript: {},
    },
  },
  // add your custom rules here
  rules: {
    'import/extensions': ['error', 'always', {
      js: 'never',
      ts: 'never',
    }],
    // allow optionalDependencies
    'import/no-extraneous-dependencies': ['error', {
      optionalDependencies: ['test/unit/index.js'],
    }],
    // allow single export
    'import/prefer-default-export': 'off',
    // 一些个人习惯
    camelcase: ['error', {
      properties: 'always',
    }],
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
    'max-len': ['error', {
      code: 140,
      ignoreTrailingComments: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreUrls: true,
      ignoreComments: true,
    }],
    'object-curly-newline': ['error', {
      consistent: true,
    }],
    'one-var': ['error', {
      initialized: 'never',
    }],
    'one-var-declaration-per-line': ['error', 'initializations'],
    'no-debugger': 'error',
    'no-console': 'warn',
    'no-empty': ['error', {
      allowEmptyCatch: true,
    }],
    // 无伤大雅的一些问题
    'class-methods-use-this': 'off',
    'no-shadow': 'off',
    'consistent-return': 'off',
    'no-continue': 'off',
    'no-await-in-loop': 'off',
    'no-plusplus': 'off',
    'no-use-before-define': 'off',
    'no-bitwise': 'off', // 位运算在安全的情况下还是有必要的
    'prefer-destructuring': 'off', // 不一定非要强制使用解构
    'no-underscore-dangle': 'off', // 允许使用下划线 私有变量经常用 但这个项目没有用_代表私有变量
    // typescript checked
    'no-redeclare': 'off',
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-dupe-class-members': 'off',
    'default-param-last': 'off',
    'no-lonely-if': 'off',
    // typescript lints cover
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-shadow': 'error',
    // typescript lints
    '@typescript-eslint/adjacent-overload-signatures': 'error',
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/ban-types': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/indent': ['error', 2, { SwitchCase: 1 }],
    '@typescript-eslint/member-delimiter-style': 'error',
    '@typescript-eslint/no-array-constructor': 'error',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-extraneous-class': 'error',
    '@typescript-eslint/no-for-in-array': 'error',
    '@typescript-eslint/no-misused-new': 'error',
    '@typescript-eslint/no-namespace': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-parameter-properties': 'error',
    '@typescript-eslint/no-use-before-define': 'error',
    '@typescript-eslint/no-useless-constructor': 'error',
    '@typescript-eslint/prefer-function-type': 'error',
    '@typescript-eslint/prefer-namespace-keyword': 'error',
    '@typescript-eslint/type-annotation-spacing': 'error',
    '@typescript-eslint/ban-ts-comment': 'warn',
  },
};
