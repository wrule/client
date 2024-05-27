
export default
class QueueMap<K, V> {
  public constructor(private readonly maxSize: number) {
    this.storeMap = new Map<K, V>();
    this.storeQueue = [];
  }

  private readonly storeMap: Map<K, V>;
  private readonly storeQueue: K[];

  public get(key: K) {
    return this.storeMap.get(key);
  }

  public set(key: K, value: V) {
    if (this.storeMap.has(key)) {
      this.storeMap.set(key, value);
    } else {
      this.storeMap.set(key, value);
      this.storeQueue.push(key);
      if (this.storeQueue.length > this.maxSize) {
        const rmKey = this.storeQueue.shift();
        if (rmKey) this.storeMap.delete(rmKey);
      }
    }
  }

  public delete(key: K) {
    this.storeMap.delete(key);
    const rmIndex = this.storeQueue.findIndex((item) => item === key);
    if (rmIndex >= 0) this.storeQueue.splice(rmIndex, 1);
  }

  public has(key: K) {
    return this.storeMap.has(key);
  }

  public clear() {
    this.storeMap.clear();
    this.storeQueue.splice(0, this.storeQueue.length);
  }
}
