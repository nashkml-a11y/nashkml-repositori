// timer.js
// Temporizador de cuenta atrás resistente a retrasos de renderizado.
//
// Nunca decrementamos un contador en cada tick (eso acumula drift si algún
// frame se retrasa). En su lugar guardamos el instante absoluto de fin
// (endsAt) y en cada actualización recalculamos remaining = endsAt - now.
// Así, aunque un tick llegue tarde, el tiempo mostrado sigue siendo exacto.

export class CountdownTimer {
  /**
   * @param {number} durationSeconds duración total de la cuenta atrás
   * @param {(remainingSeconds:number)=>void} onTick se llama en cada actualización
   * @param {()=>void} onComplete se llama exactamente una vez al llegar a 0
   */
  constructor(durationSeconds, onTick, onComplete) {
    this.durationMs = durationSeconds * 1000;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.endsAt = null;
    this.completed = false;
    this._rafId = null;
  }

  start() {
    this.endsAt = performance.now() + this.durationMs;
    this.completed = false;
    this._loop();
  }

  getRemainingMs() {
    if (this.endsAt == null) return this.durationMs;
    return Math.max(0, this.endsAt - performance.now());
  }

  getRemainingSeconds() {
    return Math.ceil(this.getRemainingMs() / 1000);
  }

  _loop = () => {
    if (this.completed) return;
    const remainingMs = this.getRemainingMs();
    this.onTick(Math.ceil(remainingMs / 1000));
    if (remainingMs <= 0) {
      this.completed = true;
      this.onComplete();
      return;
    }
    this._rafId = requestAnimationFrame(this._loop);
  };

  stop() {
    this.completed = true;
    if (this._rafId != null) cancelAnimationFrame(this._rafId);
  }
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
