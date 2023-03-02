/**
 * This file is part of the hapi-router
 * @author William Chan <root@williamchan.me>
 */
import { Route, PathTokens } from '@mock/http/types/router';

export enum PathType {
  FULL = 0,
  PARAM = 1,
}
export const tokenize = (path: string): PathTokens[] => {
  const tokens: PathTokens[] = (path[0] === '/' ? path.substring(1) : path).split('/').map((segment) => {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      return [PathType.PARAM, segment.substring(1, segment.length - 1)];
    }
    return [PathType.FULL, segment];
  });
  return tokens;
};

/**
 * 简易路由分段 二叉树
 */
export default class Segment {
  // 后面是全路径
  public full = new Map<string, Segment>();
  // 有路径参数
  public segment?: Segment;
  public route?: Route;
  // 后分段静态路径
  public segments?: Map<string, Segment>;

  public delete!: () => void;

  private parent?: Segment;

  public constructor(parent?: Segment) {
    this.parent = parent;
  }

  /**
   * create Segment
   * @param segments
   * @param route
   * @returns
   */
  public create(tokens: PathTokens[], route: Route): Segment {
    const isParam = tokens.findIndex((segment) => segment[0] === PathType.PARAM) !== -1;
    if (isParam) {
      const data = tokens[0];
      if (data) {
        if (data[0] === PathType.PARAM) {
          this.segment = this.segment || new Segment(this);
          if (tokens.length > 1) {
            return this.segment.create(tokens.slice(1), route);
          }
          if (!this.segment.route) {
            this.segment.route = route;
            this.segment.delete = () => {
              delete this.segment?.route;
              if (this.segment?.isEmpty()) {
                if (this.delete) this.delete();
              }
            };
            return this.segment;
          }
          throw new Error('route already exists');
        } else {
          this.segments = this.segments || new Map<string, Segment>();
          let segment = this.segments.get(data[1]);
          if (!segment) {
            segment = new Segment(this);
            this.segments.set(data[1], segment);
            segment.delete = () => {
              this.segments?.delete(data[1]);
              this.remove();
            };
          }
          return segment.create(tokens.slice(1), route);
        }
      }
    } else {
      const path = `/${tokens.map((segment) => segment[1]).join('/')}`;
      if (!this.full.has(path)) {
        const segment = new Segment(this);
        this.full.set(path, segment);
        segment.route = route;
        segment.delete = () => {
          this.full.delete(path);
          this.remove();
        };
        return segment;
      }
      throw new Error('route already exists');
    }
    throw new Error('unexpected error');
  }

  /**
   * lookup route
   * @param path
   * @param segments
   * @returns
   */
  public lookup(path: string, segments?: string[]): Route | undefined {
    if (segments && segments.length === 0 && this.route) {
      return this.route;
    }
    // 优先寻找 full 匹配 如果没有就找 segments 如果没有才找 segment
    if (this.full.has(path)) {
      return this.full.get(path)?.route;
    }
    const paths = segments || (path[0] === '/' ? path.substring(1) : path).split('/');
    if (this.segments) {
      const segment = this.segments.get(paths[0]);
      if (segment) {
        return segment.lookup(path.slice(paths[0].length + 1), paths.slice(1));
      }
    }
    if (this.segment) {
      // @fixme 不允许后置为空路径 当然后续可以支持?的情况 不过觉得没必要……
      if (path && path !== '/') {
        return this.segment.lookup(path.slice(paths[0].length + 1), paths.slice(1));
      }
    }
  }

  /**
   * is empty segment route
   * @returns {boolean}
   */
  public isEmpty(): boolean {
    if (!this.full.size && !this.segment) {
      if (!this.segments || !this.segments.size) {
        return true;
      }
    }
    return false;
  }

  /**
   * remove empty segment route
   */
  public remove(): void {
    if (this.segment && this.segment.isEmpty()) {
      delete this.segment;
    }
    if (this.isEmpty()) {
      if (this.delete) this.delete();
      if (this.parent) {
        this.parent.remove();
      }
    }
  }
}
