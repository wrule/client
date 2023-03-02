/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
// @ts-nocheck
import { createClient } from 'node-impala';

const client = createClient();

client.connect({
  host: '10.10.31.32',
  port: 21050,
  resultType: 'json-array',
});
// protocol: 'beeswax',
// host: '10.10.31.32',
// port: '21050',
client.query('SELECT column_name FROM table_name')
  .then((result) => console.log(result))
  .catch((err) => console.error(err))
  .done(() => client.close().catch((err) => console.error(err)));
