export type Ball = {
  position: Vec2
  velocity: Vec2
  frozen: boolean
}

export type BallConstants = {
  friction: number
  gravity: number
  damping: number
}
