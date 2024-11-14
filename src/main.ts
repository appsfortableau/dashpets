import './style.css';
import './utils/tableau.extensions.1.latest.min.js';
import { openConfig } from './utils/tableau.js';

tableau.extensions.initializeAsync({ configure: openConfig }).then(() => {
  const worksheet = tableau.extensions.worksheetContent?.worksheet;
  if (!worksheet) {
    return; // no worksheet
  }

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, updateDataAndRender);

  const canvas = document.getElementById('gameCanvas')! as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  async function updateDataAndRender() {
    const fields = await getFieldsOnEncoding(tableau.extensions.worksheetContent.worksheet);
    const data = await getSummaryDataTable(worksheet);

    // Pet data - define different pet types with unique images
    const petTypes = {
      dog: {
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
        run: ['run1.gif', 'run2.gif', 'run3.gif'],
        sit: 'sit.gif',
        sleep: 'sleep.gif',
      },
      cat: {
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
        run: ['run1.gif', 'run2.gif', 'run3.gif'],
        sit: 'sit.gif',
        sleep: 'sleep.gif',
      },
      parrot: {
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
        run: ['run1.gif', 'run2.gif', 'run3.gif'],
        sit: 'sit.gif',
        sleep: 'sleep.gif',
      },
    };

    // GET FROM TABLEAU
    const petsData = data.data.map((row) => {
      return row[0].value;
    });
    const pets = []; // Array to hold pet objects

    function loadImage(src) {
      const img = new Image();
      // TODO resolve correct folder for the pet.
      img.src = 'assets/chicken/' + src;
      return img;
    }

    // Helper function to randomly select a pet type
    function getRandomPetType() {
      const petTypeKeys = Object.keys(petTypes);
      const randomKey = petTypeKeys[Math.floor(Math.random() * petTypeKeys.length)];
      return petTypes[randomKey];
    }

    function createPet(x, y) {
      const petType = getRandomPetType();
      const pet = {
        x: x,
        y: canvas.height - 50,
        width: 50,
        height: 50,
        speed: 1,
        animationFrame: 0,
        state: 'walk',
        hover: false,
        direction: Math.random() < 0.5 ? -1 : 1,
        images: {
          walk: petType.walk.map((src) => loadImage(src)),
          run: petType.run.map((src) => loadImage(src)),
          sit: loadImage(petType.sit),
          sleep: loadImage(petType.sleep),
        },
        currentImage: null,
        animationTimer: 0,
        animationDelay: 300,
        idleTime: 0,
        idleTimeLimit: Math.random() * 2000 + 2000,
      };
      pet.currentImage = pet.images.walk[0]; // Default to first walking image
      return pet;
    }

    // Create each pet from petsData and add to pets array
    petsData.forEach((_, index) => {
      const pet = createPet((index + 1) * 100, canvas.height - 50);
      pets.push(pet);
    });

    function updatePet(pet, deltaTime) {
      if (pet.hover) {
        pet.idleTime = 0;
        return;
      }
      pet.idleTime += deltaTime;

      if (pet.idleTime > pet.idleTimeLimit) {
        const random = Math.random();
        if (random < 0.3) {
          pet.state = 'sit';
          pet.currentImage = pet.images.sit;
        } else if (random < 0.5) {
          pet.state = 'sleep';
          pet.currentImage = pet.images.sleep;
        } else if (random < 0.6) {
          pet.state = 'run';
          pet.speed = 3;
        } else {
          pet.state = 'walk';
          pet.speed = 1;
        }
        pet.direction = Math.random() < 0.5 ? -1 : 1;
        pet.idleTime = 0;
      }

      pet.animationTimer += deltaTime;
      if (pet.animationTimer > pet.animationDelay) {
        pet.animationTimer = 0;
        if (pet.state === 'walk' || pet.state === 'run') {
          pet.animationFrame = (pet.animationFrame + 1) % pet.images[pet.state].length;
          pet.currentImage = pet.images[pet.state][pet.animationFrame];
        }
      }

      if (pet.state === 'walk' || pet.state === 'run') {
        pet.x += pet.speed * pet.direction;
      }

      if (pet.x <= 0) {
        pet.x = 0;
        pet.direction = 1;
      }
      if (pet.x + pet.width >= canvas.width) {
        pet.x = canvas.width - pet.width;
        pet.direction = -1;
      }
    }

    function drawPet(pet) {
      if (pet.currentImage && pet.currentImage.complete) {
        ctx.save();

        if (pet.direction === -1) {
          ctx.translate(pet.x + pet.width, pet.y);
          ctx.scale(-1, 1);
          ctx.drawImage(pet.currentImage, 0, 0, pet.width, pet.height);
        } else {
          ctx.drawImage(pet.currentImage, pet.x, pet.y, pet.width, pet.height);
        }

        ctx.restore();
      }
    }

    function gameLoop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const currentTime = Date.now();
      const deltaTime = currentTime - lastUpdateTime;
      lastUpdateTime = currentTime;

      pets.forEach((pet) => {
        updatePet(pet, deltaTime);
        drawPet(pet);
      });

      requestAnimationFrame(gameLoop);
    }

    let lastUpdateTime = Date.now();

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      pets.forEach((pet) => {
        pet.hover = mouseX >= pet.x && mouseX <= pet.x + pet.width && mouseY >= pet.y && mouseY <= pet.y + pet.height;
      });
    });

    canvas.addEventListener('mouseleave', () => {
      pets.forEach((pet) => (pet.hover = false));
    });

    gameLoop();
  }
  updateDataAndRender();
});
