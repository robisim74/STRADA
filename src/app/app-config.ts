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
            apiKey: 'YOUR_API_KEY'
        },
        /**
         * Used as fallback for Google Maps Directions API. Optional.
         */
        mapbox: {
            accessToken: 'YOUR_ACCESS_TOKEN'
        },
        openWeatherMap: {
            url: '',
            apiKey: ''
        }
    }
};
