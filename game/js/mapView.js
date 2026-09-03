// mapView.js
// Controla el arrastre (pan) y el zoom del mapa sobre un <svg> mediante su
// viewBox. No depende de ninguna librería externa.

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class MapView {
  /**
   * @param {SVGSVGElement} svgEl
   * @param {number} mapWidth ancho del mundo del mapa (unidades del mapa)
   * @param {number} mapHeight alto del mundo del mapa
   */
  constructor(svgEl, mapWidth, mapHeight) {
    this.svg = svgEl;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    const initialW = mapWidth;
    const initialH = mapHeight;
    this.viewBox = {
      x: (mapWidth - initialW) / 2,
      y: (mapHeight - initialH) / 2,
      w: initialW,
      h: initialH,
    };

    this.minZoomW = mapWidth * 0.18; // más zoom in
    this.maxZoomW = mapWidth * 1.5; // más zoom out

    this._dragging = false;
    this._lastPointer = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this._bindEvents();
    this._applyViewBox();
  }

  _bindEvents() {
    this.svg.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this.svg.addEventListener("wheel", this._onWheel, { passive: false });
  }

  destroy() {
    this.svg.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    this.svg.removeEventListener("wheel", this._onWheel);
  }

  _applyViewBox() {
    const { x, y, w, h } = this.viewBox;
    this.svg.setAttribute("viewBox", `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }

  _onPointerDown(event) {
    this._dragging = true;
    this._lastPointer = { x: event.clientX, y: event.clientY };
    this.svg.classList.add("dragging");
    if (this.svg.setPointerCapture) {
      try {
        this.svg.setPointerCapture(event.pointerId);
      } catch (e) {
        // Algunos entornos de test no soportan captura de puntero; se ignora.
      }
    }
  }

  _onPointerMove(event) {
    if (!this._dragging) return;
    const dx = event.clientX - this._lastPointer.x;
    const dy = event.clientY - this._lastPointer.y;
    this._lastPointer = { x: event.clientX, y: event.clientY };

    const rect = this.svg.getBoundingClientRect();
    const scaleX = this.viewBox.w / (rect.width || 1);
    const scaleY = this.viewBox.h / (rect.height || 1);
    this.viewBox.x -= dx * scaleX;
    this.viewBox.y -= dy * scaleY;
    this._clampPan();
    this._applyViewBox();
  }

  _onPointerUp() {
    this._dragging = false;
    this.svg.classList.remove("dragging");
  }

  _onWheel(event) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 1.12 : 1 / 1.12;
    const rect = this.svg.getBoundingClientRect();
    const pointerXRatio = rect.width ? (event.clientX - rect.left) / rect.width : 0.5;
    const pointerYRatio = rect.height ? (event.clientY - rect.top) / rect.height : 0.5;

    const newW = clamp(this.viewBox.w * zoomFactor, this.minZoomW, this.maxZoomW);
    const newH = newW * (this.viewBox.h / this.viewBox.w);

    const pointerWorldX = this.viewBox.x + pointerXRatio * this.viewBox.w;
    const pointerWorldY = this.viewBox.y + pointerYRatio * this.viewBox.h;

    this.viewBox.x = pointerWorldX - pointerXRatio * newW;
    this.viewBox.y = pointerWorldY - pointerYRatio * newH;
    this.viewBox.w = newW;
    this.viewBox.h = newH;

    this._clampPan();
    this._applyViewBox();
  }

  _clampPan() {
    const marginX = this.mapWidth * 0.4;
    const marginY = this.mapHeight * 0.4;
    const minX = -marginX;
    const minY = -marginY;
    const maxX = Math.max(minX, this.mapWidth + marginX - this.viewBox.w);
    const maxY = Math.max(minY, this.mapHeight + marginY - this.viewBox.h);
    this.viewBox.x = clamp(this.viewBox.x, minX, maxX);
    this.viewBox.y = clamp(this.viewBox.y, minY, maxY);
  }

  resetView() {
    this.viewBox = { x: 0, y: 0, w: this.mapWidth, h: this.mapHeight };
    this._applyViewBox();
  }
}
