/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */

interface BaseDataConnection {
  readonly host: string;
  readonly user?: string;
  readonly password?: string;
  readonly port?: number;
}

export interface DataSource extends BaseDataConnection {
  readonly type: number;
  readonly serverId: string;
  readonly serverName?: string;
}
