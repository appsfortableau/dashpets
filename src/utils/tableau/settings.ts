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
  if (typeof potentialSettings !== "object") {
    return new PetsSettings();
  }

  const combinedPetSettings = {
    ...new PetsSettings(),
    ...potentialSettings
  };

  // TODO: Ensure all the subsettings are also set correctly with objects

  return combinedPetSettings;
}

export function storeSettingsInTableau(settings: RecursivePartial<PetsSettings>): Promise<Record<string, string>> {
  const defaultSettings = new PetsSettings();

  const settingsToStore = onlyKeepChangedSettings(settings, defaultSettings)

  tableau.extensions.settings.set('settings', JSON.stringify(settingsToStore));

  return tableau.extensions.settings.saveAsync()
}

function onlyKeepChangedSettings<T>(settings: any, defaultSettings: T): (T | Partial<T> | null) {
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

    return changedKeys as Partial<T>
  }

  if (settings !== defaultSettings) {
    return settings
  }

  return null;
}
