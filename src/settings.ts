export class PetsSettings {
  public displaySettings: DisplaySettings = new DisplaySettings()
}

class DisplaySettings {
  public enableYAxis: boolean = false;
  public enableTooltips: boolean = true;
  public enableRandomSize: boolean = false;
}
