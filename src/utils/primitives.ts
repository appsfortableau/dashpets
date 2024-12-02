String.prototype.hashCode = function() {
  let hash = 0, i: number, chr: number;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = hash * 31 + chr;
    hash |= 0; // Convert to 32bit integer
  }

  return hash;
}

export function isNumber(a: any): a is number {
  return typeof a === "number" && isFinite(a)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
