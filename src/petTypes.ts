import { PetType } from './types/pet';

export const petTypes: Record<string, PetType> = {
  dog: {
    asset: 'dog',
    canFly: false,
    speed: 1,
    aspectRatio: { x: 1, y: 0.66 },
    sprites: {
      walk: ['walk1.png', 'walk2.png'],
      run: ['walk1.png', 'walk2.png'],
      sit: ['sit1.png', 'sit2.png'],
      sleep: ['sleep1.png', 'sleep2.png'],
    },
  },
  dog_black: {
    asset: 'dog_black',
    canFly: false,
    speed: 1,
    aspectRatio: { x: 1, y: 0.66 },
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
      sleep: ['sleep1.png', 'sleep2.png', 'sleep2.png', 'sleep2.png', 'sleep2.png'],
    },
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
  cat: {
    asset: 'cat',
    canFly: false,
    speed: 1.5,
    aspectRatio: { x: 1, y: 0.92 },
    sprites: {
      walk: ['walk1.gif', 'walk2.gif'],
      run: ['walk1.gif', 'walk2.gif'],
      sit: ['sit1.png'],
      sleep: ['sleep1.png', 'sleep2.png'],
    },
  },
  cat_grey: {
    asset: 'cat_grey',
    canFly: false,
    speed: 1.5,
    aspectRatio: { x: 1, y: 0.92 },
    sprites: {
      walk: ['walk1.png', 'walk2.png'],
      run: ['walk1.png', 'walk2.png'],
      sit: ['sit1.png'],
      sleep: ['sleep1.png', 'sleep2.png'],
    },
  },
  cat_orange: {
    asset: 'cat_orange',
    canFly: false,
    speed: 1.5,
    aspectRatio: { x: 1, y: 0.92 },
    sprites: {
      walk: ['walk1.png', 'walk2.png'],
      run: ['walk1.png', 'walk2.png'],
      sit: ['sit1.png'],
      sleep: ['sleep1.png', 'sleep2.png'],
    },
  },
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
