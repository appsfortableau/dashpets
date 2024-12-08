import { PetsSettings } from "@/settings";

export function getStoredTableauSettings(): PetsSettings {
  const currentSettings = tableau.extensions.settings.getAll();

  const parsedSettings = parseTableauSettingsObject(currentSettings)
  const petSettings = ensureFullPetSettings(parsedSettings)

  return petSettings
}

function parseTableauSettingsObject(settings: Record<string, string>): Partial<PetsSettings> {
  const serializedSettings = settings?.["settings"] ?? "{}";

  let parsedSettings: PetsSettings;
  try {
    parsedSettings = JSON.parse(serializedSettings);
  } catch {
    return {};
  }

  if (typeof parsedSettings !== "object") {
    return {};
  }

  return parsedSettings;
}

function ensureFullPetSettings(potentialSettings: Partial<PetsSettings> | undefined): PetsSettings {
  const defaultSettings = new PetsSettings();
  if (typeof potentialSettings !== "object") {
    return defaultSettings;
  }

  Object.entries(defaultSettings).forEach(([key, value]) => {
    console.log(potentialSettings[key as keyof PetsSettings], value, {
      ...value,
      ...potentialSettings[key as keyof PetsSettings]
    })
    potentialSettings[key as keyof PetsSettings] = {
      ...value,
      ...potentialSettings[key as keyof PetsSettings]
    }
  })

  return potentialSettings as PetsSettings;
}

export function storeSettingsInTableau(settings: RecursivePartial<PetsSettings>): Promise<Record<string, string>> {
  const defaultSettings = new PetsSettings();

  console.log("before storing settings:", settings);
  const settingsToStore = onlyKeepChangedSettings(settings, defaultSettings)

  console.log("storing settings:", settingsToStore);

  tableau.extensions.settings.set('settings', JSON.stringify(settingsToStore));

  return tableau.extensions.settings.saveAsync()
}

function onlyKeepChangedSettings<T>(settings: any, defaultSettings: T): (T | Partial<T> | null) {
  console.log("checking:", settings, defaultSettings)
  if (typeof settings !== typeof defaultSettings) {
    return null
  }

  if (typeof defaultSettings === "object" && defaultSettings !== null) {
    const changedKeys: Record<string, unknown> = {}

    Object.entries(defaultSettings).forEach(([key, defaultValue]) => {
      const newSetting = settings[key]
      const settingsToKeep = onlyKeepChangedSettings(newSetting, defaultValue);
      if (settingsToKeep !== null) {
        changedKeys[key] = newSetting
      }
    })

    console.log(settings, defaultSettings, changedKeys)

    return changedKeys as Partial<T>
  }

  if (settings !== defaultSettings) {
    return settings
  }

  return null;
}
