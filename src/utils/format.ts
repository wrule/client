/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

/**
 * format file size log
 * @param size
 * @returns
 */
export const formatSize = (size: number): string => {
  if (size < 1024) {
    return `${size}Byte`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)}KB`;
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)}MB`;
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(2)}GB`;
};

//  1 bit  sign           (1 = non-negative, 0= negative)
// 17 bits year*13+month  (year 0-9999, month 0-12)
//  5 bits day            (0-31)
//  5 bits hour           (0-23)
//  6 bits minute         (0-59)
//  6 bits second         (0-59)

// **** 大部分脚本语言特性决定 有些地方必须 bigint bit shifts int32 ****
// Number 表示是大小超过了5字节，所以回转安全的
// Fraction/Mantissa Exponent Sign
// 52 bits (0 - 51) 11 bits (52 - 62) 1 bit (63)

/**
 * 转换为5字节时间
 * @param time
 */
export const encodeDateTime = (time: number): number => {
  const date = new Date(time);
  const ymd = ((date.getFullYear() * 13 + date.getMonth() + 1) << 5) | date.getDate();
  const hms = (date.getHours() << 12) | (date.getMinutes() << 6) | date.getSeconds();
  // const ymd = ((9999 * 13 + 11 + 1) << 5) | 31;
  // const hms = (23 << 12) | (59 << 6) | 59;
  return Number((BigInt(ymd) << 17n) | BigInt(hms));
};

/**
 * 解析5字节时间
 * @param ymdHms
 */
export const decodeDateTime = (ymdHms: number): number[] => {
  const ymd = Number(BigInt(ymdHms) >> 17n);
  const ym = ymd >> 5;
  const hms = ymdHms % (1 << 17);
  const year = ym / 13 >>> 0;
  const month = ym % 13;
  const day = ymd % (1 << 5);
  const hour = (hms >> 12) >>> 0;
  const minute = (hms >> 6) % (1 << 6);
  const second = hms % (1 << 6);
  return [year, month, day, hour, minute, second];
};
