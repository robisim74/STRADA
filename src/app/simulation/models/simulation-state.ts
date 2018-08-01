export interface NumericalSimulation {

    edge: string;
    wayName: string;
    trafficVolume: number;
    totalCount: number;

}

export interface Simulation {

    /**
     * Simulation data.
     */
    data: NumericalSimulation[];

}
