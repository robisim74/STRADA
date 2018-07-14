import filter from 'mout/object/filter';

import { appConfig } from './app-config';

export function loadScripts(): Function {
    const scripts: Array<Promise<any>> = [];
    // Adds scripts.
    scripts.push(getScript(appConfig.apis.googleMaps.url + '?key=' + appConfig.apis.googleMaps.apiKey + '&libraries=geometry'));

    return () => Promise.all(scripts);
}

export function getScript(src: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.defer = true;
        script.src = src;
        script.onload = () => {
            resolve();
        };
        document.getElementsByTagName('head')[0].appendChild(script);
    });
}
