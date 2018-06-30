import * as config from '../../config.json';

/**
 * App configuration.
 */
export const appConfig = {
    apis: {
        overpassApi: {
            url: 'https://lz4.overpass-api.de/api/interpreter',
            timeout: 5000,
            /**
             * The main key used for identifying any kind of road.
             * https://wiki.openstreetmap.org/wiki/Key:highway
             */
            highways: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential']
        },
        googleMaps: {
            url: 'https://maps.googleapis.com/maps/api/js',
            apiKey: (<any>config).googleMaps.apiKey
        },
        openWeatherMap: {
            url: '',
            apiKey: (<any>config).openWeatherMap.apiKey
        }
    }
};
