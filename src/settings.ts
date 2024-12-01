export class PetsSettings {
  public displaySettings: DisplaySettings = new DisplaySettings();
  public dynamicSizeSettings: DynamicSizeSettings = new DynamicSizeSettings();
}

export class DynamicSizeSettings {
  // This setting overwrites the size measure
  public enableRandomSize: boolean = false;
  public minSizePercent: number = 50;
  public maxSizePercent: number = 150;
}

class DisplaySettings {
  public enableYAxis: boolean = false;
  public enableTooltips: boolean = true;

  public petSizePixels: number = 50;
}
