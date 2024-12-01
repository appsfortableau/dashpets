import './style.css';
import '@/utils/strings';
import { Pet, PetType, Vec2 } from '@/types/pet';
import '@/utils/tableau.extensions.1.latest.min.js';
import { getEncodings, getSummaryDataTable, openConfig } from '@/utils/tableau/data';
import { immediateThenDebounce } from '@/utils/debounce.js';
import { getStoredTableauSettings } from './utils/tableau/settings';

tableau.extensions.initializeAsync({ configure: openConfig }).then(() => {
  const worksheet = tableau.extensions.worksheetContent?.worksheet!;
  if (!worksheet) {
    return; // no worksheet
  }

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, updateDataAndRender);
  tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, updateDataAndRender);

  const canvas = document.getElementById('gameCanvas')! as HTMLCanvasElement;
  // NOTE: Could this be null?
  const ctx = canvas.getContext('2d')!;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  async function updateDataAndRender() {
    const settings = getStoredTableauSettings()
    // set to true to use the Y axis as well
    let useYcoords = settings.displaySettings.enableYAxis;
    // just for fun for now, lets change it to a measure of Tableau
    let useRandomSize = settings.displaySettings.enableRandomSize;

    const fields = await getEncodings(worksheet);

    // TODO: What if data is null?
    const data = await getSummaryDataTable(worksheet)!;
    let selected: string[] = [];
    // Pet data - define different pet types with unique images
    const petTypes: Record<string, PetType> = {
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
        }
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
        }
      },
      chicken: {
        asset: 'chicken',
        canFly: false,
        speed: 0.6,
        aspectRatio: { x: 0.85, y: 1 },
        sprites: {
          walk: ['walk1.gif', 'walk2.gif', 'walk3.gif'],
          run: ['run1.gif', 'run2.gif', 'run3.gif'],
          sit: ['sit.gif'],
          sleep: ['sleep.gif'],
        }
      },
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
        }
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
      crab: {
        asset: 'crab',
        canFly: false,
        speed: 0.3,
        aspectRatio: { x: 1, y: 0.76 },
        sprites: {
          walk: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
          run: ['walk1.gif', 'walk2.gif', 'walk3.gif', 'walk4.gif', 'walk5.gif'],
          sit: ['walk1.gif'],
          sleep: ['walk1.gif'],
        }
      },
      shark: {
        asset: 'shark',
        canFly: false,
        speed: 0.3,
        aspectRatio: { x: 1, y: 0.225 },
        sprites: {
          walk: ['walk1.png'],
          run: ['run1.png'],
          sit: ['walk1.png'],
          sleep: ['walk1.png'],
        }
      },
      guineapig: {
        asset: 'guineapig',
        canFly: false,
        speed: 0.1,
        aspectRatio: { x: 1, y: 0.56 },
        sprites: {
          walk: ['walk1.png', 'sit1.png'],
          run: ['walk1.png', 'sit1.png'],
          sit: ['sit1.png'],
          sleep: ['sleep1.png'],
        }
      },
      rat: {
        asset: 'rat',
        canFly: false,
        speed: 1,
        aspectRatio: { x: 1, y: 0.56 },
        sprites: {
          walk: ['walk1.png'],
          run: ['walk1.png'],
          sit: ['sit1.png'],
          sleep: ['sleep1.png'],
        }
      },
    };

    const includeData = data?.columns.map(col => fields["dimension"]?.includes(col.fieldName)) ?? []

    // GET FROM TABLEAU
    // Data from tableau is not strongly typed
    // Only the dimensions are needed because they define the datapoints
    const petsData = Array.from(new Set(data?.data.map((row) => {
      return row.map((data, i) => includeData[i] ? data.value : "").filter(Boolean).join("🚰");
    }) ?? []));

    const pets: Pet[] = [];
    const messages = [
      '👋', // wave hand emoji
      'Hello!',
      'I love SuperTables!',
      'WriteBackExtreme is cool 😎',
      'My Sales is above target!',
      'I love Apps for Tableau 😍',
      'VizExtensions Woofs!',
      '🐾',
      'Keep going!',
      'Did you feed me today?',
      'I need a nap. 💤',
      'What a beautiful day! ☀️',
      'Where’s my treat? 🍖',
      'I saw a bird earlier. 🐦',
      'Can we play fetch? 🎾',
      'Life is pawsome! 🐕',
      'I’m fur-tastic!',
      'Let’s go for a walk! 🚶‍♂️',
      'My tail is the best thing ever. 🐕',
      'What’s for dinner? 🍗',
      'Did you see my cool trick? 🤸',
      'I’m thinking… 🤔',
      'Let’s chase squirrels! 🐿️',
      'Can I get a belly rub? 🙃',
      'Is it snack time yet? 🍪',
      'Look at me, I’m adorable! 😍',
      'I love being your pet! 💖',
      'Did you hear that noise? 👂',
      'Adventure time! 🗺️',
      'Can I have some cheese? 🧀',
      'Zoomies incoming! 🌀',
      'I’m on patrol! 👮',
      'Everything’s better with pets. 🐾',
      'I’m a good pet! 🥰',
      'Tail wags for everyone! 🐕',
      'Oops, I got distracted. 🐾',
      'Sunbathing is my favorite hobby. ☀️',
      'I’m watching you. 👀',
      'What’s that smell? 👃',
      'Nap time is calling! 🛌',
    ];

    function loadImage(src: string, petType: PetType): HTMLImageElement {
      const img = new Image();
      // TODO resolve correct folder for the pet.
      img.src = 'assets/' + petType.asset + '/' + src;
      return img;
    }

    // Helper function to randomly select a pet type
    // function getRandomPetType(): PetType {
    //   const petTypeKeys = Object.keys(petTypes);
    //   const randomKey = petTypeKeys[Math.floor(Math.random() * petTypeKeys.length)];
    //   return petTypes[randomKey];
    // }

    function getPetTypeFromHash(name: string): PetType {
      const hashCode = name.hashCode();

      const petTypesArr = Object.values(petTypes)
      const petIndex = Math.abs(hashCode) % petTypesArr.length

      return petTypesArr[petIndex]
    }

    function createPet(name: string, position: Vec2): Pet {
      let randomSize = Math.random();
      const petType = getPetTypeFromHash(name);
      const images = {
        walk: petType.sprites.walk.map((src) => loadImage(src, petType)),
        run: petType.sprites.run.map((src) => loadImage(src, petType)),
        sit: petType.sprites.sit.map((src) => loadImage(src, petType)),
        sleep: petType.sprites.sleep.map((src) => loadImage(src, petType)),
      }

      const petPosition = {
        x: position.x,
        y: position.y - (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.y,
      }

      const direction: Vec2 = {
        x: Math.random() < 0.5 ? -1 : 1,
        y: Math.random() < 0.5 ? -1 : 1
      }

      const pet: Pet = {
        name: name,
        position: petPosition,
        width: (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.x,
        height: (useRandomSize ? randomSize * 50 : 50) * petType.aspectRatio.y,
        speed: petType.speed,
        canFly: petType.canFly,
        animationFrame: 0,
        state: 'walk',
        hover: false,
        selected: false,
        direction,
        images,
        currentImage: images.walk[0],
        animationTimer: 0,
        animationDelay: 300,
        idleTime: 0,
        idleTimeLimit: Math.random() * 2000 + 2000,
        tooltip: '',
        tooltipTimer: 0,
        tooltipCooldown: Math.random() * 20000 + 5000,
      };

      return pet;
    }

    function getInitialPetPosition(): Vec2 {
      if (useYcoords) {
        return { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
      } else {
        return { x: Math.random() * canvas.width, y: canvas.height };
      }
    }

    // Create each pet from petsData and add to pets array
    petsData.forEach((name) => {
      const pet: Pet = createPet(name.toString(), getInitialPetPosition());

      pets.push(pet);
    });

    function updatePet(pet: Pet, deltaTime: number) {
      if (pet.selected) {
        // Stop movement if selected
        return;
      }
      // Tooltip logic
      pet.tooltipTimer += deltaTime;

      const globalTooltipFactor = Math.max(1, pets.length); // Prevent division by zero
      const tooltipChance = 0.2 / globalTooltipFactor;
      // Check if it's time to show a new tooltip
      if (settings.displaySettings.enableTooltips) {
        if (pet.tooltipTimer >= pet.tooltipCooldown) {
          if (Math.random() < tooltipChance) {
            // 30% chance to say something
            pet.tooltip = messages[Math.floor(Math.random() * messages.length)];
          } else {
            pet.tooltip = ''; // Otherwise, clear the tooltip
          }
          pet.tooltipTimer = 0;
          pet.tooltipCooldown = Math.random() * 3000 + 1000; // Random cooldown (5-25 seconds)
        }
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
        } else if (random < 0.4) {
          pet.state = 'sleep';
        } else if (random < 0.5) {
          pet.state = 'run';
          pet.speed = 3;
        } else {
          pet.state = 'walk';
          pet.speed = 1;
        }
        pet.direction.x = Math.random() < 0.5 ? -1 : 1;
        pet.direction.y = Math.random() < 0.5 ? -1 : 1;
        pet.idleTime = 0;
      }

      pet.animationTimer += deltaTime;
      if (pet.animationTimer > pet.animationDelay) {
        pet.animationTimer = 0;
        // if (pet.state === 'walk' || pet.state === 'run') {
        pet.animationFrame = (pet.animationFrame + 1) % pet.images[pet.state].length;
        pet.currentImage = pet.images[pet.state][pet.animationFrame];
        // }
      }

      if (pet.state === 'walk' || pet.state === 'run') {
        pet.position.x += pet.speed * pet.direction.x;
        if (useYcoords || pet.canFly) {
          pet.position.y += pet.speed * pet.direction.y;
        }
      }

      if (pet.position.x <= 0) {
        pet.position.x = 0;
        pet.direction.x = 1;
      }
      if (pet.position.x + pet.width >= canvas.width) {
        pet.position.x = canvas.width - pet.width;
        pet.direction.x = -1;
      }
      if (useYcoords || pet.canFly) {
        if (pet.position.y <= 0) {
          pet.position.y = 0;
          pet.direction.y = 1;
        }
        if (pet.position.y + pet.height >= canvas.height) {
          pet.position.y = canvas.height - pet.height;
          pet.direction.y = -1;
        }
      }
    }

    function drawTooltip(pet: Pet) {
      if (pet.tooltip) {
        ctx.font = '10px Monocraft';
        ctx.fillStyle = 'white';

        const textWidth = ctx.measureText(pet.tooltip).width;
        const tooltipX = pet.position.x + pet.width / 2 - textWidth / 2 - 10;
        const tooltipY = pet.position.y - 30;

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

    function drawPet(pet: Pet) {
      if (pet.currentImage && pet.currentImage.complete) {
        if (pet.selected) {
          // Draw a black border around the pet
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          ctx.strokeRect(pet.position.x - 1, pet.position.y - 1, pet.width + 2, pet.height + 2);
        }
        ctx.save();

        if (pet.direction.x === -1) {
          ctx.translate(pet.position.x + pet.width, pet.position.y);
          ctx.scale(-1, 1);
          ctx.drawImage(pet.currentImage, 0, 0, pet.width, pet.height);
        } else {
          ctx.drawImage(pet.currentImage, pet.position.x, pet.position.y, pet.width, pet.height);
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

    canvas.addEventListener('mousemove',
      immediateThenDebounce((e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const didDrawTooltip = pets.some((pet, index) => {
          let tooltipAlreadyActive = !!pet.hover;
          pet.hover = mouseX >= pet.position.x && mouseX <= pet.position.x + pet.width && mouseY >= pet.position.y && mouseY <= pet.position.y + pet.height;

          if (pet.hover) {
            canvas.style.cursor = 'pointer';
            if (!tooltipAlreadyActive) {
              const myHoveredTuple = index + 1;
              window?.tableau?.extensions?.worksheetContent?.worksheet.hoverTupleAsync(myHoveredTuple, {
                tooltipAnchorPoint: { x: mouseX, y: mouseY + 100 },
              });
            }

            return true;
          }
        });

        if (!didDrawTooltip) {
          // If we get here the cursor is not on a pet so we can remove the tooltip
          canvas.style.cursor = 'default';
          window?.tableau?.extensions?.worksheetContent?.worksheet.hoverTupleAsync(99999999999, {
            tooltipAnchorPoint: { x: mouseX, y: mouseY + 100 },
          });
        }
      }, 25)
    );

    canvas.addEventListener('mouseleave', () => {
      pets.forEach((pet) => (pet.hover = false));
    });

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      pets.forEach((pet) => {
        // Check if the click is within the pet's bounding box
        if (clickX >= pet.position.x && clickX <= pet.position.x + pet.width && clickY >= pet.position.y && clickY <= pet.position.y + pet.height) {
          pet.selected = !pet.selected; // Toggle selection
          if (pet.selected) {
            selected.push(pet.name);
            worksheet.selectMarksByValueAsync(
              [{ fieldName: fields["dimension"][0], value: selected }],
              window.tableau.SelectionUpdateType.Replace
            );
          } else {
            selected.findIndex((val) => val === pet.name);
            selected.splice(
              selected.findIndex((val) => val === pet.name),
              1
            );
            worksheet.selectMarksByValueAsync(
              [{ fieldName: fields["dimension"][0], value: selected }],
              window.tableau.SelectionUpdateType.Replace
            );
          }
        }
      });
    });

    gameLoop();
  }
  updateDataAndRender();
});
