import './styles/config.css';
import '@/utils/tableau.extensions.1.latest.min.js';
import { getStoredTableauSettings, storeSettingsInTableau } from '@/utils/tableau/settings.js';
import { PetsSettings } from './settings';

document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
    let tableau = window.tableau;
    // Initialize Tableau Extensions
    tableau.extensions.initializeDialogAsync().then(() => {
        const settings = getStoredTableauSettings();
        setAllSettings(settings)

        // Save button functionality
        saveButton.addEventListener('click', () => {
            const toStoreSettings = getAllSettings()

            storeSettingsInTableau(toStoreSettings).then(() => {
                tableau.extensions.ui.closeDialog('Settings Saved');
            });
        });
    });
});

function forAllSettingsElements(func: (el: HTMLElement, group: string, key: string, defaultValue: any) => void) {
    Object.entries(new PetsSettings).forEach(([group, groupValue]) => {
        Object.entries(groupValue).forEach(([key, defaultValue]) => {
            const elements = document.querySelectorAll("#" + key);
            if (elements === null || elements.length === 0) {
                console.error("Could not find the input element for: " + key + ". Please make sure the id of the input element is the same as the key of the setting.");
                return
            }

            elements.forEach(element => {
                func(element as HTMLElement, group, key, defaultValue)
            });
        })
    })
}

function getInputElementProperty(defaultValue: any) {
    switch (typeof defaultValue) {
        case "boolean":
            return "checked"
        default:
            return "value"
    }
}

function getAllSettings(): RecursivePartial<PetsSettings> {
    const settings: RecursivePartial<PetsSettings> = {}

    forAllSettingsElements((element, group, key, defaultValue) => {
        const propToGet = getInputElementProperty(defaultValue)

        // @ts-expect-error | Dynamic search of dom so the type is unknown
        const settingValue = element?.[propToGet] ?? defaultValue

        if (settingValue !== defaultValue) {
            settings[group as keyof PetsSettings] ??= {}

            // @ts-expect-error
            settings[group as keyof PetsSettings][key] = settingValue
        }
    })

    return settings
}

function setAllSettings(settings: PetsSettings) {
    forAllSettingsElements((element, group, key, defaultValue) => {
        const propToSet = getInputElementProperty(defaultValue);

        // @ts-expect-error
        element[propToSet] = settings[group][key]
    })
}

