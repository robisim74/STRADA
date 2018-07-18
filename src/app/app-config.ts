/**
 * @ignore
 * App configuration.
 */
export const appConfig = {
    firebase: {
        projectId: 'YOUR_PROJECT_ID'
    },
    apis: {
        overpassApi: {
            url: 'https://lz4.overpass-api.de/api/interpreter',
            timeout: 5000,
            /**
             * The main key used for identifying any kind of road.
             * https://wiki.openstreetmap.org/wiki/Key:highway
             *
             * Excluded: 'motorway', 'residential' and 'service'.
             */
            highways: [
                'trunk',
                'primary',
                'secondary',
                'tertiary',
                'unclassified',
                'trunk_link',
                'primary_link',
                'secondary_link',
                'tertiary_link'
            ]
        },
        googleMaps: {
            url: 'https://maps.googleapis.com/maps/api/js',
            apiKey: 'YOUR_API_KEY'
        },
        openWeatherMap: {
            weatherUrl: 'https://api.openweathermap.org/data/2.5/weather',
            forecastUrl: 'https://api.openweathermap.org/data/2.5/forecast',
            apiKey: 'YOUR_API_KEY',
            iconUrl: 'https://openweathermap.org/img/w'
        }
    }
};
