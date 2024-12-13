import { PetType } from './types/pet';

const dogDefaults: Omit<PetType, 'asset'> = {
  canFly: false,
  speed: 1,
  aspectRatio: { x: 1, y: 0.84 },
  sprites: {
    walk: ['walk1.png', 'walk2.png'],
    run: ['run1.png', 'run2.png'],
    sit: [
      'sit1.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
      'sit1.png',
      'sit1.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
      'sit2.png',
    ],
    sleep: ['sleep1.png', 'sleep2.png', 'sleep2.png', 'sleep3.png', 'sleep2.png', 'sleep2.png'],
  },
};

const catDefaults: Omit<PetType, 'asset'> = {
  canFly: false,
  speed: 1.5,
  aspectRatio: { x: 1, y: 0.84 },
  sprites: {
    walk: ['walk1.png', 'walk2.png'],
    run: ['walk1.png', 'walk2.png'],
    sit: [
      'talk1.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
      'talk1.png',
      'talk1.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
      'talk2.png',
    ],
    sleep: [
      'sit.png',
      'sit.png',
      'sit.png',
      'sit.png',
      'sit.png',
      'sit.png',
      'sit.png',
      'sleep1.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep2.png',
      'sleep1.png',
    ],
  },
};

export const Egg: PetType = {
  asset: 'egg',
  canFly: false,
  speed: 0,
  aspectRatio: { x: 0.5, y: 0.5 },
  sprites: {
    walk: ['egg_0.png'],
    run: ['egg_0.png'],
    sleep: ['egg_0.png', 'egg_1.png', 'egg_2.png', 'egg_3.png', 'egg_4.png'],
    sit: ['egg_0.png', 'egg_1.png', 'egg_2.png', 'egg_3.png', 'egg_4.png'],
  },
};

export const petTypes: Record<string, PetType> = {
  dog: {
    asset: 'dog',
    ...dogDefaults,
  },
  dog_black: {
    asset: 'dog_black',
    ...dogDefaults,
  },
  dog_beige: {
    asset: 'dog_beige',
    ...dogDefaults,
  },
  cat: {
    asset: 'cat',
    ...catDefaults,
  },
  cat_grey: {
    asset: 'cat_grey',
    ...catDefaults,
  },
  cat_orange: {
    asset: 'cat_orange',
    ...catDefaults,
  },
} as const;
