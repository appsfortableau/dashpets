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

