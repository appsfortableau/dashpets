
export function fallbackNoInTableau() {
    const app = document.getElementById('app');

    const container = document.createElement('div')
    container.classList.add('msg-container');
    app?.append(container);

    const img = document.createElement('figure')
    img.innerHTML = '<img src="/assets/cat/sit.png" alt="" />';

    const msg = document.createElement('div')
    msg.classList.add('msg-content');
    msg.innerHTML = 'This extension is designed exclusively for use with Tableau.<br>Please ensure you are working within Tableau to access its full functionality.';

    container?.append(img);
    container?.append(msg);
}
