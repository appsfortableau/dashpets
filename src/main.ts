import './styles/app.css';
import messages from '@/petMessages.json' with { type: "json" };
import '@/utils/primitives';
import { DataPoint, DataPointValue, Pet, PetType, Vec2 } from '@/types/pet';
import '@/utils/tableau.extensions.1.latest.min.js';
import { getEncodings, getSummaryDataTable, openConfig } from '@/utils/tableau/data';
import { debounce, immediateThenDebounce } from '@/utils/debounce.js';
import { getStoredTableauSettings, storeSettingsInTableau } from '@/utils/tableau/settings';
import { Ball, BallConstants } from './types/ball';
import { lerp, unlerp } from '@/utils/lerp';
import { Egg, petTypes } from '@/petTypes';
import { clamp, isNumber } from '@/utils/primitives';
import { removeAgg } from './utils/tableau/fieldName';
import { DataTable } from '@tableau/extensions-api-types';
import { fallbackNoInTableau } from './utils/shared';

tableau.extensions.initializeAsync({ configure: openConfig }).then(() => {
  const imageMap: Record<string, HTMLImageElement> = {}

  function loadImage(src: string, assetFolder: string): HTMLImageElement {
    const imagePath = 'assets/' + assetFolder + '/' + src
    const cachedImage = imageMap[imagePath]
    if (cachedImage) {
      return cachedImage
    }
    const img = new Image();
    // TODO resolve correct folder for the pet.
    img.src = imagePath
    imageMap[imagePath] = img
    return img;
  }

  const worksheet = tableau.extensions.worksheetContent?.worksheet!;
  if (!worksheet) {
    return; // no worksheet
  }
  let isAuthoring = tableau.extensions.environment.mode === 'authoring';
  const nameSplitCharacter = "🚰";

  const clearSelectionButton = document.getElementById("clearSelection")! as HTMLButtonElement;
  const canvas = document.getElementById('gameCanvas')! as HTMLCanvasElement;
  const startScreen = document.getElementById('startScreen') as HTMLElement;

  // NOTE: Could this be null?
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false

  const ballConst: BallConstants = {
    damping: 0.8,
    gravity: 2.981,
    friction: 0.7,
  } as const

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const updateDataAndRender = debounce(_updateDataAndRender, 100)

  let ignoreUpdate = false

  worksheet.addEventListener(tableau.TableauEventType.SummaryDataChanged, updateDataAndRender);
  tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, updateDataAndRender);
  window.addEventListener("resize", () => {
    canvas.height = window.innerHeight
    canvas.width = window.innerWidth
    updateDataAndRender();
  })

  clearSelectionButton.addEventListener("click", clearSelection)
  function clearSelection() {
    pets.filter(element => element.selected).forEach(element => {
      element.selected = false;
      worksheet.clearSelectedMarksAsync();
    })
  }

  function getPetTypeFromHash(name: string): PetType {
    const hashCode = name.hashCode();

    const petTypesArr = Object.values(petTypes)
    const petIndex = Math.abs(hashCode) % petTypesArr.length

    return petTypesArr[petIndex]
  }


  function getTooltipMessage(pet: Pet): string {
    let message = ""
    if (pet.eggCompletion < 1) {
      if (Math.random() > 0.5) {
        message = `I am ${Math.round(pet.eggCompletion * 100)}% hatched`
      } else {
        const targetValue = getFormattedFromDataPoint(pet.dataPoint, targetMeasure) ?? ""
        if (targetValue && removeAgg(sizeMeasure)) {
          message = `My ${removeAgg(sizeMeasure)} target is ${targetValue}`
        }
      }
    } else {
      if (Math.random() > 0.5) {
        const dimension = sizeMeasure
        const value = getFormattedFromDataPoint(pet.dataPoint, sizeMeasure)
        if (value) {
          message = `My ${removeAgg(dimension)} is ${value}`
        }
      }
      if (!message) {
        message = messages[Math.floor(Math.random() * messages.length)];
      }
    }
    return message
  }

  function getFormattedFromDataPoint(dataPoint: DataPoint, key: string): string | null {
    if (!key) {
      return null;
    }

    let targetValue = dataPoint?.[key].formattedValue ?? null

    return targetValue
  }


  function getInitialPetPosition(): Vec2 {
    if (enableYaxis) {
      return { x: Math.random() * canvas.width, y: Math.random() * canvas.height };
    } else {
      return { x: Math.random() * canvas.width, y: canvas.height };
    }
  }

  function createBall(position: Vec2, velocity: Vec2 = { x: 0, y: 0 }): Ball {
    return {
      position,
      velocity,
      frozen: true
    }
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

  const storeDebounceIgnore = debounce((settings) => {
    storeSettingsInTableau(settings)
    ignoreUpdate = true;
  }, 1000)

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect();
    const click: Vec2 = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    if (enableBall) {
      throwBall(click, e.timeStamp)
    }

    pets.map((pet) => {
      // Check if the click is within the pet's bounding box
      if (click.x >= pet.position.x && click.x <= pet.position.x + pet.dimensions.x && click.y >= pet.position.y && click.y <= pet.position.y + pet.dimensions.y) {
        pet.selected = !pet.selected; // Toggle selection
      }
      return pet
    });

    const marksToSelect: Record<string, Set<any>> = {}
    pets.filter(s => s.selected).forEach(({ dataPoint }) => {
      Object.entries(dataPoint).forEach(([k, v]) => {
        if (k === sizeMeasure || k === targetMeasure) {
          return
        }

        if (!marksToSelect[k]) {
          marksToSelect[k] = new Set()
        }

        marksToSelect[k].add(v.value)
      })
    })

    if (Object.keys(marksToSelect).length > 0) {
      const marks = Object.entries(marksToSelect).map(([k, v]) => {
        return { fieldName: k, value: Array.from(v) }
      })

      worksheet.selectMarksByValueAsync(marks, window.tableau.SelectionUpdateType.Replace);
    } else {
      clearSelection()
    }
  });

  function throwBall(startPos: Vec2, startTime: number) {
    if (ball) {
      ball.frozen = true
    }
    canvas.onmouseup = (e) => {
      e.preventDefault()
      canvas.onmouseup = null
      canvas.onmousemove = null
      if (!ball) {
        return
      }
      const rect = canvas.getBoundingClientRect();
      const mousePosition: Vec2 = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }

      const velocity: Vec2 = {
        x: (mousePosition.x - startPos.x),
        y: (mousePosition.y - startPos.y)
      }

      ball = createBall(mousePosition, velocity)
      ball.frozen = false

      pets.forEach(pet => {
        if (pet.state !== 'run') {
          pet.chaseBall = true
          pet.state = 'run'
        }
      })
    }

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mousePosition: Vec2 = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
      const deltaTime = e.timeStamp - startTime
      if (ball) {
        ball.position = mousePosition
        if (deltaTime > 100) {
          startPos = mousePosition
          startTime = e.timeStamp
        }
      } else if (deltaTime > 200) {
        ball = createBall(mousePosition)
      }
    }
  }

  let gameLoop: () => void = () => requestAnimationFrame(gameLoop)

  let enableYaxis: boolean
  let backgroundColor: string
  let useRandomSize: boolean
  let enableBall: boolean
  let petSize: number
  let fields: Record<string, string[]>
  let data: DataTable | null
  let pets: Pet[]
  let ball: Ball | null
  let sizeMeasure: string
  let targetMeasure: string

  function setCanvasBackground(color: string) {
    ctx.fillStyle = color; // Set the fill style to the background color
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the entire canvas
  }
  async function _updateDataAndRender() {
    if (ignoreUpdate) {
      ignoreUpdate = false
      return
    }

    const settings = getStoredTableauSettings()
    enableYaxis = settings.displaySettings.enableYAxis;
    backgroundColor = settings.displaySettings.backgroundColor;
    setCanvasBackground(backgroundColor);
    useRandomSize = settings.dynamicSizeSettings.enableRandomSize;
    petSize = settings.displaySettings.petSizePixels
    enableBall = settings.ballSettings.enableBall

    fields = await getEncodings(worksheet);
    sizeMeasure = fields?.["size"]?.[0] ?? ""
    targetMeasure = fields?.["target"]?.[0] ?? ""

    // TODO: What if data is null?
    data = await getSummaryDataTable(worksheet)!;

    if (data && data.totalRowCount > 0) {
      startScreen.style.display = 'none';
      canvas.style.display = 'block';
    } else {
      startScreen.style.display = 'flex';
      canvas.style.display = 'none';
    }

    pets = [];

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
        const dataPointValue = dataPoint[sizeMeasure].value
        if (typeof dataPointValue === "number") {
          sizeScalar = unlerp(sizeMeasureMinMax.min, sizeMeasureMinMax.max, dataPointValue)
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
      return Object.values(dataPoint).map((value, i) => dataPointIndexToIsDimensionMap[i] ? value.formattedValue : "").filter(Boolean).join(nameSplitCharacter);
    }

    function getNumberFromDataPoint(dataPoint: DataPoint, key: string): number | null {
      if (!key) {
        return null;
      }

      let targetValue = dataPoint?.[key].value ?? null

      if (isNumber(targetValue)) {
        return targetValue
      }

      return null
    }

    function createPet(dataPoint: DataPoint, position: Vec2): Pet {
      const name = getNameFromDataPoint(dataPoint);
      const targetValue = getNumberFromDataPoint(dataPoint, targetMeasure) ?? 0
      const dimensionValue = getNumberFromDataPoint(dataPoint, sizeMeasure) ?? 0
      const startValue = settings.dataPointStore.measureStartValue[name] ?? 0
      const completionPercentage = unlerp(startValue ?? 0, targetValue, dimensionValue)
      const eggCompletion = targetMeasure ? clamp(completionPercentage ?? 1, 0, 1) : 1;
      const isEgg = eggCompletion < 1;
      const petType = isEgg ? Egg : getPetTypeFromHash(name);
      const dimensions = getPetDimensions(dataPoint, petType);
      const direction = getRandomDirection();
      const images = {
        walk: petType.sprites.walk.map((src) => loadImage(src, petType.asset)),
        run: petType.sprites.run.map((src) => loadImage(src, petType.asset)),
        sit: petType.sprites.sit.map((src) => loadImage(src, petType.asset)),
        sleep: petType.sprites.sleep.map((src) => loadImage(src, petType.asset)),
      }
      const eggImage = images.sleep[Math.round(lerp(0, images.sleep.length - 1, eggCompletion))];

      const petPosition = {
        x: position.x,
        y: position.y - dimensions.y,
      }

      const pet: Pet = {
        dataPoint,
        name: name,
        position: petPosition,
        dimensions,
        speed: petType.speed,
        canFly: petType.canFly,
        animationFrame: 0,
        state: isEgg ? 'sleep' : 'walk',
        hover: false,
        selected: false,
        direction,
        images,
        currentImage: isEgg ? eggImage : images.walk[0],
        animationTimer: 0,
        animationDelay: 300,
        idleTime: 0,
        idleTimeLimit: Math.random() * 2000 + 2000,
        tooltip: '',
        tooltipTimer: 0,
        tooltipCooldown: Math.random() * 20000 + 5000,
        eggCompletion,
      };

      return pet;
    }

    const minSpeed = 0.5;
    const maxSpeed = 1;
    // double max speed for when using 2 dimensions instead of one
    const doubleMaxSpeed = maxSpeed * 2;
    function getRandomDirection(): Vec2 {
      let dirX = 0, dirY = 0;

      if (enableYaxis) {
        // Set the direction to a random angle
        const angle = lerp(0, 2 * Math.PI, Math.random())

        dirX = doubleMaxSpeed * Math.cos(angle)
        dirY = doubleMaxSpeed * Math.sin(angle)
      } else {
        dirX = lerp(minSpeed, maxSpeed, Math.random())
      }

      dirX *= (Math.random() < 0.5 ? -1 : 1);
      dirY *= (Math.random() < 0.5 ? -1 : 1);

      return { x: dirX, y: dirY }
    }

    const dataPointIndexToFieldNameMap = data?.columns.map(col => col.fieldName) ?? []
    const dataPointIndexToIsDimensionMap = data?.columns.map(col => fields["dimension"]?.includes(col.fieldName)) ?? [];
    // GET FROM TABLEAU
    // Data from tableau is not strongly typed
    // Only the dimensions are needed because they define the datapoints
    const petsData = Array.from(new Set(data?.data.map((row) => {
      return row.map((data, i) => [dataPointIndexToFieldNameMap[i], { value: data.value, formattedValue: data.formattedValue } as DataPointValue]);
    }) ?? [])).map(entries => Object.fromEntries(entries) as DataPoint);

    // If authoring update starting values of target calculation
    if (isAuthoring) {
      settings.dataPointStore.measureStartValue = {}
      petsData.forEach(point => {
        const sizeMeasureValue = getNumberFromDataPoint(point, sizeMeasure)
        if (sizeMeasureValue) {
          const name = getNameFromDataPoint(point)
          settings.dataPointStore.measureStartValue[name] = sizeMeasureValue
        }
      })
      storeDebounceIgnore(settings)
    }

    const sizeMeasureMinMax = {
      min: Number.MAX_SAFE_INTEGER,
      max: Number.MIN_SAFE_INTEGER
    }

    if (sizeMeasure) {
      petsData.forEach(point => {
        const sizeMeasureValue = point[sizeMeasure].value ?? 0
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

      if (pet.chaseBall && ball === undefined) {
        pet.chaseBall = false
        pet.state = 'sit'
      }

      // Tooltip logic
      pet.tooltipTimer += deltaTime;

      const globalTooltipFactor = Math.max(1, pets.length); // Prevent division by zero
      const tooltipChance = 0.5 / globalTooltipFactor;
      // Check if it's time to show a new tooltip
      if (settings.displaySettings.enableTooltips) {
        if (pet.tooltipTimer >= pet.tooltipCooldown) {
          if (Math.random() < tooltipChance) {
            // 30% chance to say something
            pet.tooltip = getTooltipMessage(pet);
          } else {
            pet.tooltip = ''; // Otherwise, clear the tooltip
          }
          pet.tooltipTimer = 0;
          pet.tooltipCooldown = Math.random() * 3000 + 1000; // Random cooldown (5-25 seconds)
        }
      }

      if (pet.eggCompletion < 1) {
        return;
      }

      if (pet.hover) {
        pet.idleTime = 0;
        return;
      }
      pet.idleTime += deltaTime;

      if (pet.idleTime > pet.idleTimeLimit && !pet.chaseBall) {
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
        pet.direction = getRandomDirection()
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
        if (pet.chaseBall) {
          const dirToBall: Vec2 = {
            x: ball?.position.x - (pet.position.x + settings.displaySettings.petSizePixels / 2),
            y: ball?.position.y - (pet.position.y + settings.displaySettings.petSizePixels / 2)
          }
          if (Math.sqrt(dirToBall.x ** 2 + dirToBall.y ** 2) < settings.ballSettings.ballSize / 2) {
            ball = null
            pet.state = 'sit'
          } else {
            if (enableYaxis) {
              if (dirToBall.x > 10) {
                pet.direction.x = Math.abs(pet.direction.x)
              } else if (dirToBall.x < -10) {
                pet.direction.x = -Math.abs(pet.direction.x)
              }
              if (dirToBall.y > 10) {
                pet.direction.y = Math.abs(pet.direction.y)
              } else if (dirToBall.y < -10) {
                pet.direction.y = -Math.abs(pet.direction.y)
              }
            } else {
              if (dirToBall.x > 5) {
                pet.direction.x = Math.abs(pet.direction.x)
                pet.direction.y = Math.abs(pet.direction.y)
              } else if (dirToBall.x < -5) {
                pet.direction.x = -Math.abs(pet.direction.x)
                pet.direction.y = -Math.abs(pet.direction.y)
              }
            }
          }
        }
        pet.position.x += pet.speed * pet.direction.x;
        if (enableYaxis || pet.canFly) {
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
      if (enableYaxis || pet.canFly) {
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

    function updateBall(ball: Ball, deltaTime: number) {
      if (ball.frozen) {
        return;
      }

      ball.velocity.y = Math.floor(Math.min(ball.velocity.y, 50) * 10) / 10;
      ball.velocity.x = Math.floor(Math.min(ball.velocity.x, 50) * 10) / 10;

      const timeMul = deltaTime / 50;
      const ballRad = settings.ballSettings.ballSize / 2;

      // Handle wall collisions (X-axis)
      if (ball.position.x - ballRad < 0) {
        ball.velocity.x = -ball.velocity.x * ballConst.damping;
        ball.position.x = ballRad;
      } else if (ball.position.x + ballRad >= canvas.width) {
        ball.velocity.x = -ball.velocity.x * ballConst.damping;
        ball.position.x = canvas.width - ballRad;
      }

      // Handle floor and ceiling collisions (Y-axis)
      if (ball.position.y - ballRad < 0) {
        ball.velocity.y = -ball.velocity.y * ballConst.damping;
        ball.position.y = ballRad;
      } else if (ball.position.y + ballRad >= canvas.height) {
        ball.velocity.y = -ball.velocity.y * ballConst.damping;
        ball.velocity.x *= ballConst.friction; // Apply friction when touching the ground
        ball.position.y = canvas.height - ballRad;

        // Damp the Y-velocity further to prevent infinite bounces
        if (Math.abs(ball.velocity.y) < 0.5) {
          ball.velocity.y = 0;
        }
      }

      // Stop the ball when velocity is very low
      if (Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2) < (enableYaxis ? 2 : 0.5)) {
        ball.frozen = true;
        ball.velocity.x = 0;
        ball.velocity.y = 0;
        if (!enableYaxis) {
          ball.position.y = canvas.height - ballRad;
        }
        return;
      }

      // Apply gravity or friction based on `useYcoords`
      if (!enableYaxis) {
        ball.velocity.y += ballConst.gravity * timeMul;
      } else {
        ball.velocity.y *= 0.99; // Gradual damping for Y
        ball.velocity.x *= 0.99; // Gradual damping for X
      }

      // Update ball position
      ball.position.x += ball.velocity.x * timeMul;
      ball.position.y += ball.velocity.y * timeMul;
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

        if (pet.direction.x < 0) {
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

    function drawBall(ball: Ball) {
      ctx.beginPath();
      ctx.arc(ball.position.x, ball.position.y, settings.ballSettings.ballSize / 2, 0, 2 * Math.PI, false);
      ctx.fillStyle = settings.ballSettings.ballColor;
      ctx.fill();
    }

    function setClearSelectionButtonVisibility(state: "hidden" | "visible") {
      clearSelectionButton.style.display = state === "hidden" ? "none" : "block"
    }

    gameLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setCanvasBackground(backgroundColor)
      const currentTime = Date.now();
      const deltaTime = currentTime - lastUpdateTime;
      lastUpdateTime = currentTime;


      // Draw from back to front to make sure the hover is for the animal at the highest z-index
      for (let i = pets.length - 1; i >= 0; i--) {
        const pet = pets[i];
        updatePet(pet, deltaTime);
        drawPet(pet);
      }

      if (ball) {
        updateBall(ball, deltaTime)
        drawBall(ball)
      }

      if (pets.some(pet => pet.selected)) {
        setClearSelectionButtonVisibility("visible")
      } else {
        setClearSelectionButtonVisibility("hidden")
      }

      requestAnimationFrame(gameLoop)
    }
  }
  gameLoop();
  updateDataAndRender();
})
.catch(fallbackNoInTableau);
