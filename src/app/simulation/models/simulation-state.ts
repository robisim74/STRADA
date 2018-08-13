export interface NumericalSimulation {

    edge: string;
    wayName: string;
    trafficVolume: number;
    trafficCount: number;
    delay: number | string;
    stops: number;

}

export interface Counts {

    startedVehicles: number;
    arrivedVehicles: number;

}

export interface Simulation {

    /**
     * Simulation data.
     */
    data: NumericalSimulation[];
    /**
     * Simulation counts.
     */
    counts: Counts;
    /**
     * Simulation avg. speed.
     */
    speed: number;

}
