/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { DataSetDetailResult } from '@plugin/data-set/types/result';
import { DataSetControllerData } from '@plugin/data-set/types/data';
import { createRows, downloadDataSetCSVFile } from '@plugin/data-set/utils';
import { DataSource } from '@engine/dispatch/types/data-source';

export interface TestDataSetData {
  data: DataSetControllerData;
  dataSource: DataSource[];
}

export const testDataSet = async (data: TestDataSetData): Promise<DataSetDetailResult> => {
  await downloadDataSetCSVFile(data.data);
  const result = await createRows(data.data, data.dataSource);
  return {
    fields: data.data.fields,
    rows: result.rows,
  };
};
