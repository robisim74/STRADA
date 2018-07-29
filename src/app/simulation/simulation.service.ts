import { Injectable } from '@angular/core';

/**
 * Applies the traffic flow propagation algorithm.
 */
@Injectable() export class SimulationService {

    /**
     * Smaller than the smallest link travel time.
     */
    private timeStep: number;

    private stepCount = 0;

    /**
     * Total demand.
     */
    private numberOfVehicles: number;

    /**
     * Simulated running time.
     */
    private simulatedTime: number;

    /**
     * Real running time.
     */
    private realTime: number;

    public reset(): void {
        //
    }

}
