if (document.monetization) {
    document.monetization.addEventListener('monetizationstart', (event) => {
        document.dispatchEvent(new CustomEvent('akita_monetizationstart', { detail: event.detail }));
    });

    document.monetization.addEventListener('monetizationprogress', (event) => {
        document.dispatchEvent(new CustomEvent('akita_monetizationprogress', { detail: event.detail }));
    });

    document.monetization.addEventListener('monetizationstop', (event) => {
        document.dispatchEvent(new CustomEvent('akita_monetizationstop', { detail: event.detail }));
    });
}
