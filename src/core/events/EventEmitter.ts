type EventListener<T = any> = (data: T) => void;

export class EventEmitter<TEvents extends Record<string, any>> {
  private listeners: { [K in keyof TEvents]?: EventListener<TEvents[K]>[] } = {};

  on<K extends keyof TEvents>(event: K, callback: EventListener<TEvents[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(callback);

    return () => {
      const callbacks = this.listeners[event];
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${String(event)} listener:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
