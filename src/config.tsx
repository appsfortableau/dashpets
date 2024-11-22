import './utils/tableau.extensions.1.latest.min.js';

document.addEventListener('DOMContentLoaded', () => {
  const enableTooltipsCheckbox = document.getElementById('enableTooltips') as HTMLInputElement;
  const enableYAxisCheckbox = document.getElementById('enableYAxis') as HTMLInputElement;
  const enableRandomSizeCheckbox = document.getElementById('enableRandomSize') as HTMLInputElement;
  const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
  const cancelButton = document.getElementById('cancelButton') as HTMLButtonElement;
  let tableau = window.tableau;
  // Initialize Tableau Extensions
  tableau.extensions.initializeDialogAsync().then(() => {
    // Load current settings from Tableau's settings store
    const currentSettings = tableau.extensions.settings.getAll();
    const settingsObj =
      'settings' in currentSettings
        ? JSON.parse(currentSettings.settings)
        : { tooltipsEnabled: true, enableYAxis: false, enableRandomSize: false };

    enableTooltipsCheckbox.checked = settingsObj?.tooltipsEnabled;
    enableYAxisCheckbox.checked = settingsObj?.enableYAxis;
    enableRandomSizeCheckbox.checked = settingsObj?.enableRandomSize;

    // Save button functionality
    saveButton.addEventListener('click', () => {
      tableau.extensions.settings.set(
        'settings',
        JSON.stringify({
          tooltipsEnabled: enableTooltipsCheckbox.checked,
          enableYAxis: enableYAxisCheckbox.checked,
          enableRandomSize: enableRandomSizeCheckbox.checked,
        })
      );
      tableau.extensions.settings.saveAsync().then(() => {
        tableau.extensions.ui.closeDialog('Settings Saved');
      });
    });

    // Cancel button functionality
    cancelButton.addEventListener('click', () => {
      tableau.extensions.ui.closeDialog('Canceled');
    });
  });
});
