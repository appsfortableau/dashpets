import './style.css';
import messages from '@/petMessages.json' with { type: "json" };
import '@/utils/strings';
import { DataPoint, Pet, PetType, Vec2 } from '@/types/pet';
import '@/utils/tableau.extensions.1.latest.min.js';
import { getEncodings, getSummaryDataTable, openConfig } from '@/utils/tableau/data';
import { immediateThenDebounce } from '@/utils/debounce.js';
import { getStoredTableauSettings } from '@/utils/tableau/settings';
import { lerp } from '@/utils/lerp';
import { petTypes } from '@/petTypes';

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
    const useYcoords = settings.displaySettings.enableYAxis;
    // just for fun for now, lets change it to a measure of Tableau
    const useRandomSize = settings.dynamicSizeSettings.enableRandomSize;
    const petSize = settings.displaySettings.petSizePixels

    const fields = await getEncodings(worksheet);
    // NOTE: Is it possible for the size measure to have a limit to 1 column in the trex?
    const sizeMeasure = fields?.["size"]?.[0] ?? ""

    // TODO: What if data is null?
    const data = await getSummaryDataTable(worksheet)!;
    const selected: string[] = [];
    const pets: Pet[] = [];

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

    function calculateSize(aspectRatio: number, sizeScalar: number) {
      const ratioPetSize = petSize * aspectRatio;
      const minSize = (settings.dynamicSizeSettings.minSizePercent / 100) * ratioPetSize
      const maxSize = (settings.dynamicSizeSettings.maxSizePercent / 100) * ratioPetSize

      return lerp(minSize, maxSize, sizeScalar)
    }


    function getPetDimensions(dataPoint: DataPoint, type: PetType): Vec2 {
      let sizeScalar = 0;

      if (useRandomSize) {
        sizeScalar = Math.random()
      } else if (sizeMeasure) {
        const dataPointValue = dataPoint[sizeMeasure]
        if (typeof dataPointValue === "number") {
          sizeScalar = (dataPointValue - sizeMeasureMinMax.min) / (sizeMeasureMinMax.max - sizeMeasureMinMax.min)
        } else {
          console.error(`Could not find data point value of ${sizeMeasure}`, dataPoint)
        }
      } else {
        return {
          x: petSize * type.aspectRatio.x,
          y: petSize * type.aspectRatio.y
        }
      }

      return {
        x: calculateSize(type.aspectRatio.x, sizeScalar),
        y: calculateSize(type.aspectRatio.y, sizeScalar)
      }
    }

    function getNameFromDataPoint(dataPoint: DataPoint): string {
      return Object.values(dataPoint).map((value, i) => indexToIsDimensionMap[i] ? value : "").filter(Boolean).join("🚰")
    }

    function createPet(dataPoint: DataPoint, position: Vec2): Pet {
      const name = getNameFromDataPoint(dataPoint);
      const petType = getPetTypeFromHash(name);
      const dimensions = getPetDimensions(dataPoint, petType);
      const images = {
        walk: petType.sprites.walk.map((src) => loadImage(src, petType)),
        run: petType.sprites.run.map((src) => loadImage(src, petType)),
        sit: petType.sprites.sit.map((src) => loadImage(src, petType)),
        sleep: petType.sprites.sleep.map((src) => loadImage(src, petType)),
      }

      const petPosition = {
        x: position.x,
        y: position.y - dimensions.y,
      }

      const direction: Vec2 = {
        x: Math.random() < 0.5 ? -1 : 1,
        y: Math.random() < 0.5 ? -1 : 1
      }

      const pet: Pet = {
        dataPoint,
        name: name,
        position: petPosition,
        dimensions,
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

    const indexToFieldNameMap = data?.columns.map(col => col.fieldName) ?? []
    const indexToIsDimensionMap = data?.columns.map(col => fields["dimension"]?.includes(col.fieldName)) ?? [];
    // GET FROM TABLEAU
    // Data from tableau is not strongly typed
    // Only the dimensions are needed because they define the datapoints
    const petsData = Array.from(new Set(data?.data.map((row) => {
      return row.map((data, i) => [indexToFieldNameMap[i], data.value]);
    }) ?? [])).map(entries => Object.fromEntries(entries) as DataPoint);

    const sizeMeasureMinMax = {
      min: Number.MAX_SAFE_INTEGER,
      max: Number.MIN_SAFE_INTEGER
    }

    if (sizeMeasure) {
      petsData.forEach(point => {
        const sizeMeasureValue = point[sizeMeasure] ?? 0
        if (typeof sizeMeasureValue !== "number") {
          return
        }

        if (sizeMeasureValue < sizeMeasureMinMax.min) {
          sizeMeasureMinMax.min = sizeMeasureValue;
        }
        if (sizeMeasureValue > sizeMeasureMinMax.max) {
          sizeMeasureMinMax.max = sizeMeasureValue;
        }
      })
    }

    // Create each pet from petsData and add to pets array
    petsData.forEach((dataPoint) => {
      const pet: Pet = createPet(dataPoint, getInitialPetPosition());

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
      if (pet.position.x + pet.dimensions.x >= canvas.width) {
        pet.position.x = canvas.width - pet.dimensions.x;
        pet.direction.x = -1;
      }
      if (useYcoords || pet.canFly) {
        if (pet.position.y <= 0) {
          pet.position.y = 0;
          pet.direction.y = 1;
        }
        if (pet.position.y + pet.dimensions.y >= canvas.height) {
          pet.position.y = canvas.height - pet.dimensions.y;
          pet.direction.y = -1;
        }
      }
    }

    function drawTooltip(pet: Pet) {
      if (pet.tooltip) {
        ctx.font = '10px Monocraft';
        ctx.fillStyle = 'white';

        const textWidth = ctx.measureText(pet.tooltip).width;
        const tooltipX = pet.position.x + pet.dimensions.x / 2 - textWidth / 2 - 10;
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
          ctx.strokeRect(pet.position.x - 1, pet.position.y - 1, pet.dimensions.x + 2, pet.dimensions.y + 2);
        }
        ctx.save();

        if (pet.direction.x === -1) {
          ctx.translate(pet.position.x + pet.dimensions.x, pet.position.y);
          ctx.scale(-1, 1);
          ctx.drawImage(pet.currentImage, 0, 0, pet.dimensions.x, pet.dimensions.y);
        } else {
          ctx.drawImage(pet.currentImage, pet.position.x, pet.position.y, pet.dimensions.x, pet.dimensions.y);
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
          pet.hover = mouseX >= pet.position.x && mouseX <= pet.position.x + pet.dimensions.x && mouseY >= pet.position.y && mouseY <= pet.position.y + pet.dimensions.y;

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
        if (clickX >= pet.position.x && clickX <= pet.position.x + pet.dimensions.x && clickY >= pet.position.y && clickY <= pet.position.y + pet.dimensions.y) {
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
