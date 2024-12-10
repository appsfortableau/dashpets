export function lerp(min: number, max: number, scalar: number): number {
  return min + scalar * (max - min)
}

export function unlerp(min: number, max: number, value: number): number {
  if (min > max) {
    return unlerp(max, min, value)
  }
  return (value - min) / (max - min)
}
