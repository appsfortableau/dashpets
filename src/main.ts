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

type LayoutMode = "free" | "size-bars"

tableau.extensions.initializeAsync({ configure: openConfig }).then(() => {
  function handleRuntimeError(error: unknown) {
    console.error("DashPets runtime error", error)
    const app = document.getElementById('app')
    if (!window?.tableau?.extensions) {
      fallbackNoInTableau()
      return
    }

    const container = document.createElement('div')
    container.classList.add('msg-container')
    const text = document.createElement('div')
    text.classList.add('msg-content')
    text.textContent = `DashPets hit an error: ${error instanceof Error ? error.message : String(error)}`
    container.append(text)
    app?.append(container)
  }

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
  const layoutControls = document.getElementById('layoutControls') as HTMLDivElement | null;
  const layoutButtons = layoutControls
    ? Array.from(layoutControls.querySelectorAll("button[data-layout]")) as HTMLButtonElement[]
    : [];

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


  function getVecLength(vector: Vec2): number {
    return Math.sqrt(vector.x ** 2 + vector.y ** 2)
  }

  function normalizeVec(vector: Vec2): Vec2 {
    const length = getVecLength(vector)
    if (length === 0) {
      return { x: 0, y: 0 }
    }
    return {
      x: vector.x / length,
      y: vector.y / length
    }
  }

  function scaleVec(vector: Vec2, scalar: number): Vec2 {
    return {
      x: vector.x * scalar,
      y: vector.y * scalar
    }
  }

  function addVec(a: Vec2, b: Vec2): Vec2 {
    return {
      x: a.x + b.x,
      y: a.y + b.y
    }
  }

  function getFrameIndependentAlpha(baseAlpha: number, deltaTime: number): number {
    const normalized = clamp(baseAlpha, 0.01, 0.99)
    return 1 - Math.pow(1 - normalized, deltaTime / 16.67)
  }

  let pointerPosition: Vec2 | null = null
  let lastUpdateTime = Date.now();
  canvas.addEventListener('mousemove',
    immediateThenDebounce((e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      pointerPosition = { x: mouseX, y: mouseY }
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
    pointerPosition = null
  });

  const storeDebounceIgnore = debounce((settings) => {
    storeSettingsInTableau(settings)
    ignoreUpdate = true;
  }, 1000)

  layoutButtons.forEach(button => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.layout as LayoutMode | undefined
      if (!nextMode) {
        return
      }
      setLayoutMode(nextMode)
    })
  })

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault()
    const rect = canvas.getBoundingClientRect();
    const click: Vec2 = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
    if (enableBall && layoutMode === "free") {
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
        if (typeof Number(v.value) === "number" && isNumber(v.value)) {
          return
        }
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
          pet.zoomiesTimeLeft = Math.max(pet.zoomiesTimeLeft, 1200)
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
  let enableTrails: boolean
  let trailLength: number
  let showPetName: boolean
  let petNamePosition: "above" | "below"
  let layoutMode: LayoutMode = "free"
  let hasSizeData: boolean = false
  let hasTargetData: boolean = false
  let sizeRanksByName: Record<string, number> = {}
  let petSize: number
  let fields: Record<string, string[]>
  let data: DataTable | null
  let pets: Pet[] = []
  let ball: Ball | null = null
  let sizeMeasure: string
  let targetMeasure: string

  function setLayoutButtonStates() {
    if (!layoutButtons.length) {
      return
    }
    layoutButtons.forEach(button => {
      const buttonMode = button.dataset.layout as LayoutMode | undefined
      if (!buttonMode) {
        return
      }

      const isAvailable = buttonMode === "free"
        || (buttonMode === "size-bars" && hasSizeData)

      button.disabled = !isAvailable
      button.classList.toggle("active", buttonMode === layoutMode)
    })
  }

  function setLayoutMode(nextMode: LayoutMode, shouldStore: boolean = true) {
    const canUseMode = nextMode === "free"
      || (nextMode === "size-bars" && hasSizeData)

    layoutMode = canUseMode ? nextMode : "free"
    if (layoutMode !== "free") {
      ball = null
      pets.forEach(pet => pet.chaseBall = false)
    }
    setLayoutButtonStates()

    if (!shouldStore) {
      return
    }
    const settings = getStoredTableauSettings()
    settings.displaySettings.layoutMode = layoutMode
    storeDebounceIgnore(settings)
  }

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
    enableTrails = settings.visualEffectsSettings.enableTrails
    trailLength = Math.round(clamp(settings.visualEffectsSettings.trailLength, 1, 20))
    showPetName = settings.displaySettings.showPetName
    petNamePosition = settings.displaySettings.petNamePosition === "below" ? "below" : "above"
    const preferredLayoutMode = settings.displaySettings.layoutMode as LayoutMode | undefined

    fields = await getEncodings(worksheet);
    sizeMeasure = fields?.["size"]?.[0] ?? ""
    targetMeasure = fields?.["target"]?.[0] ?? ""
    hasSizeData = !!sizeMeasure
    hasTargetData = !!targetMeasure

    // TODO: What if data is null?
    data = await getSummaryDataTable(worksheet)!;

    if (data && data.totalRowCount > 0) {
      startScreen.style.display = 'none';
      canvas.style.display = 'block';
      if (layoutControls) {
        layoutControls.style.display = 'flex';
      }
    } else {
      startScreen.style.display = 'flex';
      canvas.style.display = 'none';
      if (layoutControls) {
        layoutControls.style.display = 'none';
      }
    }

    pets = [];

    const speedMultiplier = clamp(settings.behaviorSettings.speedMultiplier, 0.2, 5)
    const movementSmoothness = clamp(settings.behaviorSettings.movementSmoothness / 100, 0.05, 0.95)
    const socialSpacingDistance = clamp(settings.behaviorSettings.socialSpacingPixels, 10, 400)
    const curiosityChance = clamp(settings.behaviorSettings.curiosityChancePercent / 100, 0, 1)
    const zoomiesChance = clamp(settings.behaviorSettings.zoomiesChancePercent / 100, 0, 1)
    const cursorAttractionRadius = clamp(settings.behaviorSettings.cursorAttractRadius, 10, 600)
    const formatAxisNumber = (value: number): string => {
      if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      }
      if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
      }
      return `${Math.round(value * 10) / 10}`
    }
    const getZeroBasedScalar = (value: number, minValue: number, maxValue: number): number => {
      const domainMin = Math.min(0, minValue)
      const domainMax = Math.max(0, maxValue)
      if (domainMin === domainMax) {
        return 1
      }
      return clamp((value - domainMin) / (domainMax - domainMin), 0, 1)
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
        const dataPointValue = dataPoint[sizeMeasure].value
        if (typeof dataPointValue === "number") {
          if (sizeMeasureMinMax.min === sizeMeasureMinMax.max) {
            sizeScalar = 1
          } else {
            sizeScalar = unlerp(sizeMeasureMinMax.min, sizeMeasureMinMax.max, dataPointValue)
          }
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
        x: calculateSize(type.aspectRatio.x, clamp(sizeScalar, 0, 1)),
        y: calculateSize(type.aspectRatio.y, clamp(sizeScalar, 0, 1))
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
      const completionPercentage = startValue === targetValue ? 1 : unlerp(startValue ?? 0, targetValue, dimensionValue)
      const eggCompletion = targetMeasure ? clamp(completionPercentage ?? 1, 0, 1) : 1;
      const isEgg = eggCompletion < 1;
      const sizeScalar = sizeMeasure && sizeMeasureMinMax.min !== sizeMeasureMinMax.max
        ? getZeroBasedScalar(dimensionValue, sizeMeasureMinMax.min, sizeMeasureMinMax.max)
        : 1
      const progressScalar = targetMeasure ? eggCompletion : 1
      const petType = isEgg ? Egg : getPetTypeFromHash(name);
      const dimensions = getPetDimensions(dataPoint, petType);
      const direction = getRandomDirection();
      const velocity = scaleVec(direction, petType.speed * speedMultiplier)
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
        velocity,
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
        zoomiesTimeLeft: 0,
        trail: [],
        trailTimer: 0,
        bobPhase: Math.random() * Math.PI * 2,
        sizeValue: dimensionValue,
        targetValue,
        sizeScalar,
        progressScalar,
      };

      return pet;
    }

    const minSpeed = 0.5;
    const maxSpeed = 1;
    function getRandomDirection(): Vec2 {
      let dirX = 0, dirY = 0;

      if (enableYaxis) {
        // Set the direction to a random angle
        const angle = lerp(0, 2 * Math.PI, Math.random())

        dirX = Math.cos(angle)
        dirY = Math.sin(angle)
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
    if (targetMeasure) {
      hasTargetData = petsData.some(point => isNumber(point[targetMeasure]?.value))
    }

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
    const targetMeasureMinMax = {
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
    hasSizeData = hasSizeData && sizeMeasureMinMax.min !== Number.MAX_SAFE_INTEGER
    if (targetMeasure) {
      petsData.forEach(point => {
        const targetMeasureValue = point[targetMeasure]?.value
        if (typeof targetMeasureValue !== "number") {
          return
        }

        if (targetMeasureValue < targetMeasureMinMax.min) {
          targetMeasureMinMax.min = targetMeasureValue;
        }
        if (targetMeasureValue > targetMeasureMinMax.max) {
          targetMeasureMinMax.max = targetMeasureValue;
        }
      })
    }
    hasTargetData = hasTargetData && targetMeasureMinMax.min !== Number.MAX_SAFE_INTEGER
    const sizeChartDomainMin = Math.min(
      0,
      sizeMeasureMinMax.min === Number.MAX_SAFE_INTEGER ? 0 : sizeMeasureMinMax.min,
      hasTargetData ? targetMeasureMinMax.min : 0
    )
    const sizeChartDomainMax = Math.max(
      0,
      sizeMeasureMinMax.max === Number.MIN_SAFE_INTEGER ? 0 : sizeMeasureMinMax.max,
      hasTargetData ? targetMeasureMinMax.max : 0
    )

    // Create each pet from petsData and add to pets array
    petsData.forEach((dataPoint) => {
      const pet: Pet = createPet(dataPoint, getInitialPetPosition());

      pets.push(pet);
    });

    sizeRanksByName = {}
    const sortedBySize = [...pets].sort((a, b) => b.sizeScalar - a.sizeScalar)
    sortedBySize.forEach((pet, index) => {
      sizeRanksByName[pet.name] = index
    })
    setLayoutMode(preferredLayoutMode ?? "free", false)

    function getLayoutSlotTargetPosition(pet: Pet): Vec2 {
      const total = Math.max(1, pets.length)
      if (layoutMode === "size-bars") {
        const rank = sizeRanksByName[pet.name] ?? 0
        const topPadding = 58
        const bottomPadding = 34
        const labelWidth = Math.max(120, Math.min(260, canvas.width * 0.26))
        const rightPadding = 24
        const chartWidth = Math.max(1, canvas.width - labelWidth - rightPadding)
        const rowHeight = Math.max(18, (canvas.height - topPadding - bottomPadding) / total)
        const scalar = getZeroBasedScalar(pet.sizeValue, sizeChartDomainMin, sizeChartDomainMax)
        const rowCenterY = topPadding + rowHeight * rank + rowHeight / 2
        const x = clamp(labelWidth + chartWidth * scalar - pet.dimensions.x / 2 + 8, 0, canvas.width - pet.dimensions.x)
        const y = clamp(rowCenterY - pet.dimensions.y / 2, 0, canvas.height - pet.dimensions.y)
        return { x, y }
      }
      return pet.position
    }

    function updatePetInChartLayout(pet: Pet, deltaTime: number) {
      const targetPosition = getLayoutSlotTargetPosition(pet)
      const smoothAlpha = getFrameIndependentAlpha(0.28, deltaTime)
      const previousPosition = { ...pet.position }
      pet.position.x = lerp(pet.position.x, targetPosition.x, smoothAlpha)
      pet.position.y = lerp(pet.position.y, targetPosition.y, smoothAlpha)
      pet.chaseBall = false
      pet.goal = undefined
      pet.zoomiesTimeLeft = 0
      const movement = {
        x: pet.position.x - previousPosition.x,
        y: pet.position.y - previousPosition.y
      }
      pet.velocity = movement
      pet.direction.x = 1

      const speed = getVecLength(movement)
      pet.state = speed > 1 ? "walk" : "sit"
      pet.animationDelay = pet.state === "walk" ? 180 : 300
      pet.animationTimer += deltaTime;
      if (pet.animationTimer > pet.animationDelay) {
        pet.animationTimer = 0;
        pet.animationFrame = (pet.animationFrame + 1) % pet.images[pet.state].length;
        pet.currentImage = pet.images[pet.state][pet.animationFrame];
      }
      pet.trail = []
      pet.bobPhase += deltaTime / 350
    }

    function updatePet(pet: Pet, deltaTime: number) {
      if (pet.selected) {
        pet.velocity = { x: 0, y: 0 }
        return;
      }

      if (layoutMode !== "free") {
        updatePetInChartLayout(pet, deltaTime)
        return
      }

      if (pet.chaseBall && !ball) {
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
      }
      const frameDelta = deltaTime / 16.67
      const petCenter = {
        x: pet.position.x + pet.dimensions.x / 2,
        y: pet.position.y + pet.dimensions.y / 2
      }
      const canMoveVertically = enableYaxis || pet.canFly
      let steering: Vec2 = { x: 0, y: 0 }
      let shouldSettleAtCursor = false

      if (!pet.chaseBall && settings.behaviorSettings.enableCuriosity && !pet.goal && Math.random() < curiosityChance * (deltaTime / 1000)) {
        pet.goal = {
          x: Math.random() * Math.max(1, canvas.width - pet.dimensions.x),
          y: canMoveVertically ? Math.random() * Math.max(1, canvas.height - pet.dimensions.y) : canvas.height - pet.dimensions.y
        }
      }

      if (pet.goal) {
        const toGoal = {
          x: pet.goal.x - petCenter.x,
          y: pet.goal.y - petCenter.y
        }
        const distanceToGoal = getVecLength(toGoal)
        if (distanceToGoal < 18) {
          pet.goal = undefined
        } else {
          steering = addVec(steering, scaleVec(normalizeVec(toGoal), 0.9))
        }
      }

      if (settings.behaviorSettings.enableCursorAttraction && pointerPosition) {
        const toCursor = {
          x: pointerPosition.x - petCenter.x,
          y: pointerPosition.y - petCenter.y
        }
        const cursorDistance = getVecLength(toCursor)
        if (cursorDistance < cursorAttractionRadius) {
          const settleRadius = Math.max(16, Math.min(42, cursorAttractionRadius * 0.22))
          if (cursorDistance <= settleRadius) {
            shouldSettleAtCursor = true
          } else {
            const pull = 1 - cursorDistance / cursorAttractionRadius
            steering = addVec(steering, scaleVec(normalizeVec(toCursor), pull * 1.4))
          }
        }
      }

      if (pet.chaseBall && ball) {
        const toBall = {
          x: ball.position.x - petCenter.x,
          y: ball.position.y - petCenter.y
        }
        const ballDistance = getVecLength(toBall)
        if (ballDistance < settings.ballSettings.ballSize / 2 + 12) {
          ball = null
          pet.chaseBall = false
          pet.state = 'sit'
          pet.idleTime = 0
          pet.goal = undefined
        } else {
          steering = addVec(steering, scaleVec(normalizeVec(toBall), 2.2))
        }
      } else {
        const wanderDirection = {
          x: Math.cos(pet.bobPhase * 0.6 + pet.position.x * 0.02),
          y: canMoveVertically ? Math.sin(pet.bobPhase * 0.6 + pet.position.y * 0.02) : 0
        }
        steering = addVec(steering, scaleVec(normalizeVec(wanderDirection), 0.35))
      }

      if (settings.behaviorSettings.enableSocialSpacing) {
        let spacingForce: Vec2 = { x: 0, y: 0 }
        pets.forEach(otherPet => {
          if (otherPet === pet || otherPet.eggCompletion < 1) {
            return
          }
          const offset = {
            x: petCenter.x - (otherPet.position.x + otherPet.dimensions.x / 2),
            y: petCenter.y - (otherPet.position.y + otherPet.dimensions.y / 2)
          }
          const distance = getVecLength(offset)
          if (distance > 0 && distance < socialSpacingDistance) {
            const awayForce = (socialSpacingDistance - distance) / socialSpacingDistance
            spacingForce = addVec(spacingForce, scaleVec(normalizeVec(offset), awayForce))
          }
        })
        steering = addVec(steering, spacingForce)
      }

      if (settings.behaviorSettings.enableZoomies && !pet.chaseBall && pet.zoomiesTimeLeft <= 0 && Math.random() < zoomiesChance * (deltaTime / 1000)) {
        pet.zoomiesTimeLeft = 800 + Math.random() * 1400
        pet.goal = undefined
      }
      pet.zoomiesTimeLeft = Math.max(0, pet.zoomiesTimeLeft - deltaTime)

      let targetSpeed = pet.speed * speedMultiplier
      if (pet.zoomiesTimeLeft > 0) {
        targetSpeed *= 2.4
      }
      if (pet.chaseBall) {
        targetSpeed *= 1.6
      }
      if (pet.state === 'sleep') {
        targetSpeed *= 0.2
      } else if (pet.state === 'sit') {
        targetSpeed *= 0.45
      }
      if (shouldSettleAtCursor) {
        pet.goal = undefined
        pet.zoomiesTimeLeft = 0
        steering = { x: 0, y: 0 }
        targetSpeed = 0
      }

      const desiredVelocity = scaleVec(normalizeVec(steering), targetSpeed)
      const smoothAlpha = getFrameIndependentAlpha(movementSmoothness, deltaTime)
      pet.velocity = {
        x: lerp(pet.velocity.x, desiredVelocity.x, smoothAlpha),
        y: lerp(pet.velocity.y, desiredVelocity.y, smoothAlpha)
      }

      if (!canMoveVertically) {
        pet.velocity.y = 0
      }

      if (!pet.hover && getVecLength(pet.velocity) < 0.12) {
        pet.idleTime += deltaTime;
      } else {
        pet.idleTime = 0;
      }

      if (pet.idleTime > pet.idleTimeLimit && !pet.chaseBall) {
        const random = Math.random();
        if (random < 0.22) {
          pet.state = 'sleep';
        } else if (random < 0.5) {
          pet.state = 'sit';
        } else {
          pet.state = 'walk';
          pet.direction = getRandomDirection()
          pet.velocity = scaleVec(pet.direction, pet.speed * speedMultiplier)
        }
        pet.idleTime = 0;
      }

      pet.position.x += pet.velocity.x * frameDelta;
      pet.position.y += pet.velocity.y * frameDelta;

      if (pet.position.x <= 0) {
        pet.position.x = 0;
        pet.velocity.x = Math.abs(pet.velocity.x) * 0.7;
      }
      if (pet.position.x + pet.dimensions.x >= canvas.width) {
        pet.position.x = canvas.width - pet.dimensions.x;
        pet.velocity.x = -Math.abs(pet.velocity.x) * 0.7;
      }
      if (canMoveVertically) {
        if (pet.position.y <= 0) {
          pet.position.y = 0;
          pet.velocity.y = Math.abs(pet.velocity.y) * 0.7;
        }
        if (pet.position.y + pet.dimensions.y >= canvas.height) {
          pet.position.y = canvas.height - pet.dimensions.y;
          pet.velocity.y = -Math.abs(pet.velocity.y) * 0.7;
        }
      } else {
        pet.position.y = canvas.height - pet.dimensions.y;
      }

      if (Math.abs(pet.velocity.x) > 0.01) {
        pet.direction.x = pet.velocity.x > 0 ? 1 : -1
      }

      const actualSpeed = getVecLength(pet.velocity)
      if (pet.hover || shouldSettleAtCursor) {
        pet.state = 'sit'
      } else if (pet.zoomiesTimeLeft > 0 || pet.chaseBall || actualSpeed > pet.speed * speedMultiplier * 1.25) {
        pet.state = 'run'
      } else if (actualSpeed > 0.1) {
        pet.state = 'walk'
      }

      pet.animationDelay = pet.state === "run"
        ? 110
        : pet.state === "walk"
          ? 170
          : pet.state === "sit"
            ? 260
            : 420
      pet.animationTimer += deltaTime;
      if (pet.animationTimer > pet.animationDelay) {
        pet.animationTimer = 0;
        pet.animationFrame = (pet.animationFrame + 1) % pet.images[pet.state].length;
        pet.currentImage = pet.images[pet.state][pet.animationFrame];
      }

      pet.trailTimer += deltaTime
      if (enableTrails && pet.state !== "sleep") {
        if (pet.trailTimer >= 40) {
          pet.trailTimer = 0
          pet.trail.push({ x: pet.position.x, y: pet.position.y })
          while (pet.trail.length > trailLength) {
            pet.trail.shift()
          }
        }
      } else {
        pet.trail = []
      }

      pet.bobPhase += deltaTime / 320
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

    function getDisplayPetName(pet: Pet, fallbackIndex?: number): string {
      const normalized = pet.name.split(nameSplitCharacter).join(" • ").trim()
      if (normalized) {
        return normalized
      }
      return `Pet ${typeof fallbackIndex === "number" ? fallbackIndex + 1 : "?"}`
    }

    function drawLayoutGuides() {
      if (layoutMode !== "size-bars") {
        return
      }

      const total = Math.max(1, pets.length)
      const title = `Size Bars${sizeMeasure ? ` (${removeAgg(sizeMeasure)})` : ""}`

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
      ctx.fillRect(8, 8, 260, 22)
      ctx.fillStyle = "#ffffff"
      ctx.font = "10px Monocraft"
      ctx.fillText(title, 14, 22)

      const topPadding = 58
      const bottomPadding = 34
      const labelWidth = Math.max(120, Math.min(260, canvas.width * 0.26))
      const rightPadding = 24
      const chartWidth = Math.max(1, canvas.width - labelWidth - rightPadding)
      const rowHeight = Math.max(18, (canvas.height - topPadding - bottomPadding) / total)
      const axisBottom = canvas.height - bottomPadding + 6
      const domainMin = Math.min(0, sizeMeasureMinMax.min)
      const domainMax = Math.max(0, sizeMeasureMinMax.max, hasTargetData ? targetMeasureMinMax.max : 0)

      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(labelWidth, topPadding - 6)
      ctx.lineTo(labelWidth, axisBottom)
      ctx.moveTo(labelWidth, axisBottom)
      ctx.lineTo(labelWidth + chartWidth, axisBottom)
      ctx.stroke()

      const tickCount = 4
      for (let i = 0; i <= tickCount; i++) {
        const t = i / tickCount
        const tickX = labelWidth + chartWidth * t
        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"
        ctx.beginPath()
        ctx.moveTo(tickX, axisBottom)
        ctx.lineTo(tickX, axisBottom + 5)
        ctx.stroke()
        ctx.fillStyle = "#ffffff"
        ctx.font = "8px Monocraft"
        const tickLabel = formatAxisNumber(domainMin + (domainMax - domainMin) * t)
        ctx.fillText(tickLabel, tickX - 12, axisBottom + 14)
      }

      ctx.font = "9px Monocraft"
      const yAxisLabel = "Pets"
      const xAxisLabel = removeAgg(sizeMeasure) || "Value"
      const yLabelWidth = ctx.measureText(yAxisLabel).width
      const xLabelWidth = ctx.measureText(xAxisLabel).width
      ctx.fillStyle = "rgba(0, 0, 0, 0.78)"
      ctx.fillRect(8, topPadding - 22, yLabelWidth + 10, 12)
      ctx.fillRect(labelWidth + chartWidth / 2 - xLabelWidth / 2 - 6, axisBottom + 18, xLabelWidth + 12, 12)
      ctx.fillStyle = "#ffffff"
      ctx.fillText(yAxisLabel, 13, topPadding - 13)
      ctx.fillText(xAxisLabel, labelWidth + chartWidth / 2 - xLabelWidth / 2, axisBottom + 27)

      pets.forEach(pet => {
        const rank = sizeRanksByName[pet.name] ?? 0
        const scalar = getZeroBasedScalar(pet.sizeValue, domainMin, domainMax)
        const y = topPadding + rowHeight * rank + 2
        const h = Math.max(8, rowHeight - 4)
        const w = Math.max(2, chartWidth * scalar)
        const label = getDisplayPetName(pet, rank)
        const shortLabel = label.length > 18 ? `${label.slice(0, 15)}...` : label
        const valueText = getFormattedFromDataPoint(pet.dataPoint, sizeMeasure) ?? `${Math.round(pet.sizeValue * 100) / 100}`

        if (hasTargetData && isNumber(pet.dataPoint[targetMeasure]?.value)) {
          const targetScalar = getZeroBasedScalar(Number(pet.dataPoint[targetMeasure].value), domainMin, domainMax)
          const targetX = labelWidth + chartWidth * targetScalar
          ctx.strokeStyle = "rgba(0, 180, 255, 0.45)"
          ctx.beginPath()
          ctx.moveTo(targetX, y)
          ctx.lineTo(targetX, y + h)
          ctx.stroke()
        }

        ctx.fillStyle = "rgba(255, 0, 121, 0.20)"
        ctx.fillRect(labelWidth, y, w, h)
        ctx.font = "9px Monocraft"
        const labelWidthPixels = ctx.measureText(shortLabel).width
        ctx.fillStyle = "rgba(0, 0, 0, 0.74)"
        ctx.fillRect(8, y + h / 2 - 7, labelWidthPixels + 8, 12)
        ctx.fillStyle = "#ffffff"
        ctx.fillText(shortLabel, 12, y + h / 2 + 3)
        const valueWidth = ctx.measureText(valueText).width
        const valueX = Math.min(labelWidth + w + 6, canvas.width - valueWidth - 4)
        ctx.fillStyle = "rgba(0, 0, 0, 0.70)"
        ctx.fillRect(valueX - 3, y + h / 2 - 7, valueWidth + 6, 12)
        ctx.fillStyle = "#ffffff"
        ctx.fillText(valueText, valueX, y + h / 2 + 3)
      })
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

    function drawPetName(pet: Pet) {
      if (!showPetName) {
        return
      }

      const text = getDisplayPetName(pet)
      const maxTextLength = 28
      const displayName = text.length > maxTextLength ? text.slice(0, maxTextLength - 3) + "..." : text
      ctx.font = '8px Monocraft';
      const textWidth = ctx.measureText(displayName).width
      const labelX = pet.position.x + pet.dimensions.x / 2 - textWidth / 2 - 6
      const offsetY = petNamePosition === "above" ? -18 : pet.dimensions.y + 4
      const labelY = pet.position.y + offsetY

      ctx.fillStyle = 'black';
      ctx.fillRect(labelX - 1, labelY - 1, textWidth + 14, 14);
      ctx.fillStyle = 'white';
      ctx.fillRect(labelX, labelY, textWidth + 12, 12);
      ctx.fillStyle = 'black';
      ctx.fillText(displayName, labelX + 6, labelY + 9);
    }

    function drawPet(pet: Pet) {
      if (pet.currentImage && pet.currentImage.complete) {
        if (enableTrails && pet.trail.length > 0) {
          pet.trail.forEach((trailPos, index) => {
            const alpha = ((index + 1) / pet.trail.length) * 0.22
            ctx.save()
            ctx.globalAlpha = alpha
            if (pet.direction.x < 0) {
              ctx.translate(trailPos.x + pet.dimensions.x, trailPos.y);
              ctx.scale(-1, 1);
              ctx.drawImage(pet.currentImage, 0, 0, pet.dimensions.x, pet.dimensions.y);
            } else {
              ctx.drawImage(pet.currentImage, trailPos.x, trailPos.y, pet.dimensions.x, pet.dimensions.y);
            }
            ctx.restore()
          })
        }

        if (pet.selected) {
          // Draw a black border around the pet
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          ctx.strokeRect(pet.position.x - 1, pet.position.y - 1, pet.dimensions.x + 2, pet.dimensions.y + 2);
        }
        ctx.save();
        const bobOffset = pet.eggCompletion < 1 ? 0 : Math.sin(pet.bobPhase) * 1.5

        if (pet.direction.x < 0) {
          ctx.translate(pet.position.x + pet.dimensions.x, pet.position.y + bobOffset);
          ctx.scale(-1, 1);
          ctx.drawImage(pet.currentImage, 0, 0, pet.dimensions.x, pet.dimensions.y);
        } else {
          ctx.drawImage(pet.currentImage, pet.position.x, pet.position.y + bobOffset, pet.dimensions.x, pet.dimensions.y);
        }

        ctx.restore();
      }

      drawPetName(pet);
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

      drawLayoutGuides()

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
  _updateDataAndRender().catch(handleRuntimeError);
})
.catch((error) => {
  console.error("DashPets failed to initialize", error)
  if (!window?.tableau?.extensions) {
    fallbackNoInTableau()
    return
  }

  const app = document.getElementById('app')
  const container = document.createElement('div')
  container.classList.add('msg-container')
  const text = document.createElement('div')
  text.classList.add('msg-content')
  text.textContent = `DashPets failed to initialize: ${error instanceof Error ? error.message : String(error)}`
  container.append(text)
  app?.append(container)
});
