export class PetsSettings {
  public displaySettings: DisplaySettings = new DisplaySettings();
  public dynamicSizeSettings: DynamicSizeSettings = new DynamicSizeSettings();
  public ballSettings: BallSettings = new BallSettings();
  public behaviorSettings: BehaviorSettings = new BehaviorSettings();
  public visualEffectsSettings: VisualEffectsSettings = new VisualEffectsSettings();
  public dataPointStore: DataPointStore = new DataPointStore()
}

export class DynamicSizeSettings {
  // This setting overwrites the size measure
  public enableRandomSize: boolean = false;
  public minSizePercent: number = 50;
  public maxSizePercent: number = 150;
}

class DisplaySettings {
  public backgroundColor: string = '#ffffff';
  public enableYAxis: boolean = false;
  public enableTooltips: boolean = true;
  public showPetName: boolean = false;
  public petNamePosition: string = "above";
  public layoutMode: string = "free";

  public petSizePixels: number = 75;
}

class BallSettings {
  public enableBall: boolean = true;
  public ballSize: number = 25;
  public ballColor: string = "#ff0079";
}

class BehaviorSettings {
  public speedMultiplier: number = 1;
  public movementSmoothness: number = 45;
  public enableSocialSpacing: boolean = true;
  public socialSpacingPixels: number = 90;
  public enableCuriosity: boolean = true;
  public curiosityChancePercent: number = 12;
  public enableZoomies: boolean = true;
  public zoomiesChancePercent: number = 8;
  public enableCursorAttraction: boolean = false;
  public cursorAttractRadius: number = 140;
}

class VisualEffectsSettings {
  public enableTrails: boolean = false;
  public trailLength: number = 5;
}

class DataPointStore {
  public measureStartValue: Record<string, number> = {}
}
