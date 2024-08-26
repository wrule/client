/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import Papa from 'papaparse';
import { DataSetControllerData, DataSourceConfig } from '@plugin/data-set-case/types/data';
import { DATASET_FIELDS_MODE } from '@engine/core/enum/data-set';
import { SystemError } from '@engine/core/error';
import { getDataSourceByServer } from '@engine/core/utils';
import { DataSource } from '@engine/dispatch/types/data-source';
import { CONFIG } from '@engine/config';
import { FileData, createReadStream, downloadFile } from '@engine/utils/file';
import { DATASOURCE_EXECUTE } from '@engine/core/execute';
import Logger from '@/logger';

const Mock: any = { };

export interface RowsData {
  rows: unknown[][];
  skip: boolean[];
}

interface TableData {
  fields: any[];
  rows: any[];
}

interface CSVData {
  fields: string[];
  rows: string[][];
}

/**
 * 从CSV创建数据
 * @param {FileData} csv
 * @param {number} maxCount
 * @returns {Promise<CSVData>}
 */
const createDataFromCSV = async (csv: FileData, maxCount: number): Promise<CSVData> => new Promise((resolve, reject) => {
  const fields: string[] = [];
  const rows: string[][] = [];
  if (csv && csv['@fileKey']) {
    const stream = createReadStream(csv);
    const rw = stream.pipe(Papa.parse(Papa.NODE_STREAM_INPUT, { preview: maxCount + 1 }))
      .on('error', (e) => {
        stream.close();
        reject(e);
      })
      .on('data', (chunk: string[]) => {
        if (fields.length === 0) {
          fields.push(...chunk);
        } else {
          rows.push(chunk);
        }
        /** @fixme Actively end the read stream, papaparse has not ended yet, which will cause slow processing */
        if (rows.length >= maxCount) {
          rw.end();
        }
      })
      .on('finish', () => {
        stream.close();
        resolve({ fields, rows });
      });
  } else {
    reject(new Error('CSV File not found'));
  }
});

/**
 * 查询数据源
 * @param {DataSourceConfig} data
 * @param {DataSource} dataSourceList
 * @returns
 */
const queryDataSource = async (data: DataSourceConfig, dataSourceList: DataSource[] = []): Promise<TableData> => {
  const dataSource: TableData = { fields: [], rows: [] };
  const server = getDataSourceByServer(data.serverId, dataSourceList);
  if (server) {
    try {
      const fn = DATASOURCE_EXECUTE[server.type];

      if (fn) {
        /** @notice 数据库获取数据 暂定超时十秒 不能更改 */
        const result = await fn(server, data.command, 10 * 1000);
        if (result.fields && result.rows) {
          dataSource.fields = result.fields;
          dataSource.rows = result.rows;
        }
      } else {
        throw new Error(`type#${server.type} not supported`);
      }
    } catch (e) {
      throw new Error(`data source [${server.serverId}] get data failed, ${e.message}`);
    }
  } else {
    throw new Error(`data source ${data.serverId} not found.`);
  }
  return dataSource;
};

/**
 * 获取数据集中的数据
 * @returns {Promise<unknown[][]>}
 */
export const createRows = async (
  data: DataSetControllerData,
  dataSourceList: DataSource[] = [],
  maxCount: number = data.config?.maxCount ? data.config.maxCount : CONFIG.DATASET_DEFAULT_MAX_COUNT,
): Promise<RowsData> => {
  try {
    if (!data.fields || !data.fields.length) {
      throw new Error('dataset fields is empty');
    }
    const useDataSource = data.fields.some((field) => field.mode === DATASET_FIELDS_MODE.DATA_SOURCE);
    const useCSV = data.fields.some((field) => field.mode === DATASET_FIELDS_MODE.CSV);

    const dataSource: TableData = useDataSource && data.dataSource
      ? await queryDataSource(data.dataSource, dataSourceList)
      : { fields: [], rows: [] };
    const csvData: CSVData = useCSV && data.csv ? await createDataFromCSV(data.csv, maxCount) : { fields: [], rows: [] };

    const isMockOnly = data.fields.every((field) => field.mode === DATASET_FIELDS_MODE.MOCK);
    const count = isMockOnly ? maxCount : Math.min(data.fields.reduce((num1, field) => {
      let num2 = 0;
      switch (field.mode) {
        case DATASET_FIELDS_MODE.CSV:
          num2 = csvData.rows.length; // 取CSV长度
          break;
        case DATASET_FIELDS_MODE.DATA_SOURCE:
          num2 = dataSource.rows.length; // 取数据库返回长度
          break;
        case DATASET_FIELDS_MODE.STATIC:
          num2 = field.rows.length; // 取填写长度
          break;
        // case DATASET_FIELDS_MODE.MOCK:
        //   num2 = maxCount; // 取最大次数
        //   break;
          // no default
      }

      if (num1 === 0) {
        return num2;
      }
      return Math.max(num1, num2);
    }, 0), maxCount);
    const rows: unknown[][] = [];
    const skip: boolean[] = [];
    const dataSourceFields: Record<string, number> = {};
    const csvSourceFields: Record<string, number> = {};

    for (let i = 0; i < count; i++) {
      skip[i] = false;
      rows[i] = data.fields.map((field): unknown => {
        switch (field.mode) {
          case DATASET_FIELDS_MODE.CSV: {
            if (!csvSourceFields[field.name]) {
              csvSourceFields[field.name] = csvData.fields.findIndex((item) => item === field.field);
            }
            const index = csvSourceFields[field.name];
            const row = csvData.rows[i];
            if (row && row[index]) {
              return row[index];
            }
            return '';
          }
          case DATASET_FIELDS_MODE.DATA_SOURCE: {
            if (!dataSourceFields[field.name]) {
              dataSourceFields[field.name] = dataSource.fields.findIndex((item) =>
                item.name === field.field ||
                item.name.toLowerCase() === field.field.toLowerCase()
              );
            }
            const index = dataSourceFields[field.name];
            const row = dataSource.rows[i];
            if (row !== undefined && row[index] !== undefined) {
              /** @notice 数据源字段 选择了必填 那么这一行就跳过了 */
              if (field.required && row[index] === null) {
                skip[i] = true;
              }
              return row[index];
            }
            return '';
          }
          case DATASET_FIELDS_MODE.STATIC:
            return field.rows[i] !== undefined ? field.rows[i] : '';
          case DATASET_FIELDS_MODE.MOCK:
            return Mock.mock(field.method);
            // no default
        }
        return '';
      });
    }
    return { rows, skip };
  } catch (e) {
    throw new SystemError(e);
  }
};

/**
 * Download DataSet CSV File
 * @param data
 */
export const downloadDataSetCSVFile = async (data: DataSetControllerData): Promise<void> => {
  if (data.csv) {
    // logger.info('[file] downloading CSV file');
    await downloadFile(data.csv);
  }
};
