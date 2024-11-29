import { DataTable, Worksheet } from '@tableau/extensions-api-types';

export function openConfig(): Object {
  window.tableau.extensions.ui
    .displayDialogAsync('./config.html', 'null', {
      height: 900,
      width: 400,
      //@ts-ignore can't seem to import the dailogStyle from the tableau
      dialogStyle: 'modeless',
    })
    .then(() => { })
    .catch((error: { errorCode: any; message: any }) => {
      switch (error.errorCode) {
        case window.tableau.ErrorCodes.DialogClosedByUser:
          break;
        default:
          console.error(error.message);
      }
    });
  return {};
}

export function isVizExtension(): boolean {
  return !window.tableau.extensions.dashboardContent;
}

export async function getFieldsOnEncoding(worksheet: Worksheet): Promise<string[]> {
  const visualSpec = await worksheet.getVisualSpecificationAsync();
  const marksCard = visualSpec.marksSpecifications[visualSpec.activeMarksSpecificationIndex];
  const encodings: string[] = [];

  for (const encoding of marksCard.encodings) {
    if (encoding.id === 'dimension') {
      encodings.push(encoding.field.name);
    }
  }

  return encodings;
}

// associated with field names.
export async function getSummaryDataTable(worksheet: Worksheet): Promise<(null | DataTable)> {
  let rows: DataTable | null = null;

  // Fetch the summary data using the DataTableReader
  const dataTableReader = await worksheet.getSummaryDataReaderAsync(undefined, { ignoreSelection: true });
  for (let currentPage = 0; currentPage < dataTableReader.pageCount; currentPage++) {
    const dataTablePage = await dataTableReader.getPageAsync(currentPage);
    rows = dataTablePage;
  }
  await dataTableReader.releaseAsync();

  return rows;
}
