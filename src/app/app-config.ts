/**
 * App configuration.
 */
export const appConfig = {
    apis: {
        googleMaps: {
            url: 'https://maps.googleapis.com/maps/api/js',
            apiKey: 'YOUR_API_KEY'
        },
        overpassApi: {
            url: 'https://lz4.overpass-api.de/api/interpreter',
            timeout: 5000,
            /**
             * The main key used for identifying any kind of road.
             * https://wiki.openstreetmap.org/wiki/Key:highway
             */
            highways: ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential']
        },
        openWeatherMap: {
            url: '',
            apiKey: ''
        }
    }
};
