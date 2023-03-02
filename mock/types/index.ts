/**
 * This file is part of the XEngine.
 * @author William Chan <root@williamchan.me>
 */
import { HTTPMockConfig } from '@mock/http/types';

export interface MockConfig {
  /**
   * Defines the number of worker processes
   *
   * The optimal value depends on many factors including (but not limited to) the number of CPU cores, the
   * number of hard disk drives that store data, and load pattern. When one is in doubt, setting it to the
   * number of available CPU cores would be a good start
   */
  worker?: number;
  /**
   * Defines control http server host and port
   */
  control: {
    port: number;
    host: string;
  };
  /**
   * Defines mock http server rules
   */
  http?: HTTPMockConfig;
}
