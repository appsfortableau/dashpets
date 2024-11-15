import './style.css';
import './utils/tableau.extensions.1.latest.min.js';
import { getFieldsOnEncoding, getSummaryDataTable, openConfig } from './utils/tableau.js';

tableau.extensions.initializeAsync({ configure: openConfig }).then(() => {
  const worksheet = tableau.extensions.worksheetContent?.worksheet!;
  if (!worksheet) {
    return; // no worksheet
  }

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, updateDataAndRender);

  const canvas = document.getElementById('gameCanvas')! as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  async function updateDataAndRender() {
    // set to true to use the Y axis as well
    let useYcoords = false;
    // just for fun for now, lets change it to a measure of Tableau
    let useRandomSize = false;

    const fields = await getFieldsOnEncoding(worksheet);
    const data = await getSummaryDataTable(worksheet);

    // Pet data - define different pet types with unique images
    const petTypes = {
      dog: {
        asset: 'dog',
        aspectRatio: { x: 1, y: 0.66 },
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif', 'walk6.gif', 'walk7.gif'],
        run: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif', 'walk6.gif', 'walk7.gif'],
        sit: 'walk1.gif',
        sleep: 'walk1.gif',
      },
      chicken: {
        asset: 'chicken',
        aspectRatio: { x: 0.85, y: 1 },
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
        run: ['run1.gif', 'run2.gif', 'run3.gif'],
        sit: 'sit.gif',
        sleep: 'sleep.gif',
      },
      crab: {
        asset: 'crab',
        aspectRatio: { x: 1, y: 0.76 },
        walk: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
        run: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
        sit: 'walk1.gif',
        sleep: 'walk1.gif',
      },
    };

    // GET FROM TABLEAU
    const petsData = data.data.map((row) => {
      return row[0].value;
    });
    const pets = []; // Array to hold pet objects
    const messages = [
      '👋', // wave hand emoji
      'Hello!',
      'I love SuperTables!',
      'My Sales is above target!',
    ];

    function loadImage(src, petType) {
      const img = new Image();
      // TODO resolve correct folder for the pet.
      img.src = 'assets/' + petType.asset + '/' + src;
      return img;
    }

    // Helper function to randomly select a pet type
    function getRandomPetType() {
      const petTypeKeys = Object.keys(petTypes);
      const randomKey = petTypeKeys[Math.floor(Math.random() * petTypeKeys.length)];
      return petTypes[randomKey];
    }

    function createPet(x, y) {
      let randomSize = Math.random();
      const petType = getRandomPetType();
      const pet = {
        x: x,
        y: y - (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.y,
        width: (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.x,
        height: (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.y,
        speed: 1,
        animationFrame: 0,
        state: 'walk',
        hover: false,
        directionX: Math.random() < 0.5 ? -1 : 1,
        directionY: Math.random() < 0.5 ? -1 : 1,
        images: {
          walk: petType.walk.map((src) => loadImage(src, petType)),
          run: petType.run.map((src) => loadImage(src, petType)),
          sit: loadImage(petType.sit, petType),
          sleep: loadImage(petType.sleep, petType),
        },
        currentImage: null,
        animationTimer: 0,
        animationDelay: 300,
        idleTime: 0,
        idleTimeLimit: Math.random() * 2000 + 2000,
        tooltip: '', // Tooltip text
        tooltipTimer: 0, // Timer for showing a new message
        tooltipCooldown: Math.random() * 20000 + 5000,
      };
      pet.currentImage = pet.images.walk[0]; // Default to first walking image
      return pet;
    }

    // Create each pet from petsData and add to pets array
    petsData.forEach((_, index) => {
      let pet;
      if (useYcoords) {
        pet = createPet(Math.random() * canvas.width, Math.random() * canvas.height);
      } else {
        pet = createPet(Math.random() * canvas.width, canvas.height);
      }
      pets.push(pet);
    });

    function updatePet(pet, deltaTime) {
      // Tooltip logic
      pet.tooltipTimer += deltaTime;

      // Check if it's time to show a new tooltip
      if (pet.tooltipTimer >= pet.tooltipCooldown) {
        if (Math.random() < 0.1) {
          // 30% chance to say something
          pet.tooltip = messages[Math.floor(Math.random() * messages.length)];
        } else {
          pet.tooltip = ''; // Otherwise, clear the tooltip
        }
        pet.tooltipTimer = 0;
        pet.tooltipCooldown = Math.random() * 3000 + 1000; // Random cooldown (5-25 seconds)
      }

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
        } else if (random < 0.4) {
          pet.state = 'sleep';
          pet.currentImage = pet.images.sleep;
        } else if (random < 0.5) {
          pet.state = 'run';
          pet.speed = 3;
        } else {
          pet.state = 'walk';
          pet.speed = 1;
        }
        pet.directionX = Math.random() < 0.5 ? -1 : 1;
        pet.directionY = Math.random() < 0.5 ? -1 : 1;
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
        pet.x += pet.speed * pet.directionX;
        if (useYcoords) {
          pet.y += pet.speed * pet.directionY;
        }
      }

      if (pet.x <= 0) {
        pet.x = 0;
        pet.directionX = 1;
      }
      if (pet.x + pet.width >= canvas.width) {
        pet.x = canvas.width - pet.width;
        pet.directionX = -1;
      }
      if (useYcoords) {
        if (pet.y <= 0) {
          pet.y = 0;
          pet.directionY = 1;
        }
        if (pet.y + pet.height >= canvas.height) {
          pet.y = canvas.height - pet.height;
          pet.directionY = -1;
        }
      }
    }

    function drawTooltip(pet) {
      if (pet.tooltip) {
        ctx.font = '10px Monocraft';
        ctx.fillStyle = 'white';

        const textWidth = ctx.measureText(pet.tooltip).width;
        const tooltipX = pet.x + pet.width / 2 - textWidth / 2 - 10;
        const tooltipY = pet.y - 30;

        // Pixelated border
        ctx.fillStyle = 'black';
        ctx.fillRect(tooltipX - 2, tooltipY - 2, textWidth + 24, 24); // Outer border
        ctx.fillStyle = 'white';
        ctx.fillRect(tooltipX, tooltipY, textWidth + 20, 20); // Inner box

        // Tooltip text
        ctx.fillStyle = 'black';
        ctx.fillText(pet.tooltip, tooltipX + 10, tooltipY + 15);
      }
    }

    function drawPet(pet) {
      if (pet.currentImage && pet.currentImage.complete) {
        ctx.save();

        if (pet.directionX === -1) {
          ctx.translate(pet.x + pet.width, pet.y);
          ctx.scale(-1, 1);
          ctx.drawImage(pet.currentImage, 0, 0, pet.width, pet.height);
        } else {
          ctx.drawImage(pet.currentImage, pet.x, pet.y, pet.width, pet.height);
        }

        ctx.restore();
      }

      drawTooltip(pet);
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
      let hoveringPet = false;
      pets.forEach((pet, index) => {
        let tooltipAlreadyActive = false;
        if (pet.hover) {
          tooltipAlreadyActive = true;
        }
        pet.hover = mouseX >= pet.x && mouseX <= pet.x + pet.width && mouseY >= pet.y && mouseY <= pet.y + pet.height;
        if (pet.hover) {
          hoveringPet = true;
          if (!tooltipAlreadyActive) {
            const myHoveredTuple = index + 1;
            window?.tableau?.extensions?.worksheetContent?.worksheet.hoverTupleAsync(myHoveredTuple, {
              tooltipAnchorPoint: { x: mouseX, y: mouseY + 100 },
            });
          }
        }
      });
      if (!hoveringPet) {
        window?.tableau?.extensions?.worksheetContent?.worksheet.hoverTupleAsync(99999999999, {
          tooltipAnchorPoint: { x: mouseX, y: mouseY + 100 },
        });
      }
    });

    canvas.addEventListener('mouseleave', () => {
      // window?.tableau?.extensions?.worksheetContent?.worksheet.hoverTupleAsync(-1, {
      //   tooltipAnchorPoint: { x: pet.x, y: pet.y + 100 },
      // });
      pets.forEach((pet) => (pet.hover = false));
    });

    gameLoop();
  }
  updateDataAndRender();
});
