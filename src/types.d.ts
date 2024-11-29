export type PetType = {
  asset: string,
  canFly: boolean,
  speed: number,
  aspectRatio: Vec2,
  sprites: Sprites,
}

export type Vec2 = {
  y: number,
  x: number
}

export type Sprites = {
  walk: SpriteList,
  run: SpriteList,
  sit: SpriteList,
  sleep: SpriteList,
}

export type SpriteList = string[]

export type Pet = {
  name: string,
  position: Vec2,
  width: number,
  height: number,
  speed: PetType.speed,
  canFly: PetType.canFly,
  animationFrame: number,
  state: keyof Sprites,
  hover: boolean,
  selected: boolean,
  direction: Vec2,
  images: Record<keyof Sprites, HTMLImageElement[]>,
  currentImage: HTMLImageElement,
  animationTimer: number,
  animationDelay: number,
  idleTime: number,
  idleTimeLimit: number,
  // Tooltip text
  tooltip: string,
  // Timer for showing a new message
  tooltipTimer: number,
  tooltipCooldown: number,
}
