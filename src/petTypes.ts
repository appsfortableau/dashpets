import { PetType, Sprites } from './types/pet';

const dogDefaults: Omit<PetType, "asset"> = {
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
  }
}

const catDefaults: Omit<PetType, "asset"> = {
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
    sleep: ['sit.png', 'sit.png', 'sit.png', 'sit.png', 'sit.png', 'sit.png', 'sit.png', 'sleep1.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', "sleep1.png"],
  }
}

export const Egg: PetType = {
  asset: 'egg',
  canFly: false,
  speed: 0,
  aspectRatio: { x: 1, y: 1 },
  sprites: {
    walk: ['egg_0.png'],
    run: ['egg_0.png'],
    sleep: ['egg_0.png', 'egg_1.png', 'egg_2.png', 'egg_3.png', 'egg_4.png'],
    sit: ['egg_5.png', 'egg_6.png', 'egg_7.png', 'egg_8.png', 'egg_9.png', 'egg_10.png', 'egg_11.png'],
  },
}

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
    ...catDefaults
  },
  cat_grey: {
    asset: 'cat_grey',
    ...catDefaults
  },
  cat_orange: {
    asset: 'cat_orange',
    ...catDefaults
  },
  // chicken: {
  //   asset: 'chicken',
  //   canFly: false,
  //   speed: 0.6,
  //   aspectRatio: { x: 0.85, y: 1 },
  //   sprites: {
  //     walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
  //     run: ['run1.gif', 'run2.gif', 'run3.gif'],
  //     sit: ['sit.gif'],
  //     sleep: ['sleep.gif'],
  //   }
  // },
  // bird: {
  //   asset: 'bird',
  //   canFly: true,
  //   speed: 1,
  //   aspectRatio: { x: 1, y: 0.92 },
  //   sprites: {
  //     walk: ['walk.gif'],
  //     run: ['walk.gif'],
  //     sit: ['walk.gif'],
  //     sleep: ['walk.gif'],
  //   }
  // },
  // crab: {
  //   asset: 'crab',
  //   canFly: false,
  //   speed: 0.3,
  //   aspectRatio: { x: 1, y: 0.76 },
  //   sprites: {
  //     walk: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
  //     run: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
  //     sit: ['walk1.gif'],
  //     sleep: ['walk1.gif'],
  //   }
  // },
  // shark: {
  //   asset: 'shark',
  //   canFly: false,
  //   speed: 0.3,
  //   aspectRatio: { x: 1, y: 0.225 },
  //   sprites: {
  //     walk: ['walk1.png'],
  //     run: ['run1.png'],
  //     sit: ['walk1.png'],
  //     sleep: ['walk1.png'],
  //   }
  // },
  // guineapig: {
  //   asset: 'guineapig',
  //   canFly: false,
  //   speed: 0.1,
  //   aspectRatio: { x: 1, y: 0.56 },
  //   sprites: {
  //     walk: ['walk1.png', 'sit1.png'],
  //     run: ['walk1.png', 'sit1.png'],
  //     sit: ['sit1.png'],
  //     sleep: ['sleep1.png'],
  //   },
  // },
  // rat: {
  //   asset: 'rat',
  //   canFly: false,
  //   speed: 1,
  //   aspectRatio: { x: 1, y: 0.56 },
  //   sprites: {
  //     walk: ['walk1.png'],
  //     run: ['walk1.png'],
  //     sit: ['sit1.png'],
  //     sleep: ['sleep1.png'],
  //   },
  // },
} as const;
