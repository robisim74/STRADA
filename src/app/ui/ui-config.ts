/**
 * User interface configuration.
 */
export const uiConfig = {
    // Initial map.
    map: {
        center: { lat: 41.910943, lng: 12.476358 },
        zoom: 4
    },
    /**
     * Time of simulation limit in hours.
     */
    timeLimit: 24,
    /**
     * Area limit in hectares.
     */
    areaMaxLimit: 50,
    areaMinLimit: 3,
    edges: {
        baseColor: '#babdbe',
        noTrafficColor: '#76d219',
        moderateTrafficColor: '#d27519',
        heavyTrafficColor: '#d2191a'
    }
};
