/**
 * User interface configuration.
 */
export const uiConfig = {
    /**
     * Initial map.
     */
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
    areaMaxLimit: 30,
    areaMinLimit: 3,
    edges: {
        baseColor: '#babdbe',
        noTrafficColor: '#76d219',
        moderateTrafficColor: '#d27519',
        heavyTrafficColor: '#d2191a'
    },
    /**
     * Minimum edge distance for traffic data.
     */
    minDistance: 20,
    /**
     * Minimum edge duration for traffic data.
     */
    minDuration: 2,
    /**
     * Maximum number of O/D pairs that the user can select.
     */
    maxOdPairs: 5,
    /**
     * The number of shortest paths to compute.
     */
    k: 3,
    /**
     * Multinomial logit parameter.
     */
    theta: 2,
    /**
     * Minimum spacing between subsequent vehicles.
     */
    sp: 5,
    /**
     * Weather Adjustment Factor Coefficients for capacity.
     * "Traffic Analysis Toolbox. Volume XI: Weather and Traffic Analysis, Modeling and Simulation"
     */
    adjustmentFactorCoefficients: [0.91, 0.009, -0.404, -1.455, 0, 0],
    /**
     * Rain rating in mm.
     */
    rainIntensity: {
        min: 1,
        max: 70
    },
    /**
     * Snow rating in mm.
     */
    snowIntensity: {
        min: 10,
        max: 20
    },
    /**
     * Shortest paths.
     */
    paths: {
        /**
         * Highly, Medium, Poorly
         */
        colors: [
            '#004ba0',
            '#1976d2',
            '#63a4ff'
        ]
    }
};
