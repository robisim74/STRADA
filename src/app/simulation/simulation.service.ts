import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { NetworkService } from '../network/network.service';
import { DemandService } from '../demand/demand.service';
import { OdPair } from '../network/graph';
import { LtmGraph, LtmEdge } from './ltm-graph';

/**
 * Applies the traffic flow propagation algorithm.
 */
@Injectable() export class SimulationService {

    /**
     * Ltm graph instance.
     */
    private ltmGraph: LtmGraph;

    /**
     * The simulation time period is divided into time intervals.
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

    constructor(
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.timeStep = 0;
        this.stepCount = 0;
        this.numberOfVehicles = 0;
        this.simulatedTime = 0;
        this.realTime = 0;
    }

    /**
     * Initializes the simulation.
     */
    public init(): Observable<any> {
        this.ltmGraph = new LtmGraph();
        // Gets graph from network.
        this.ltmGraph = this.network.getGraph() as LtmGraph;
        // Gets O/D matrix from demand.
        const demand = this.demand.getOdMatrix();
        // Sets time step.
        const edges = this.ltmGraph.getShortestPathsEgdes();
        this.setTimeStep(edges);

        return of(null);
    }

    /**
     * Performs a flow propagation cycle.
     */
    public propagateFlows(): void {

    }

    /**
     * Resets the initial values of the graph.
     */
    public resetFlows(): void {

    }

    /**
     * Calculate the time interval as the smallest connection travel time.
     * @param edges The edges of the paths.
     */
    private setTimeStep(edges: LtmEdge[]): void {
        const edge = edges.reduce((prev: LtmEdge, curr: LtmEdge) => prev.duration < curr.duration ? prev : curr);
        this.timeStep = edge.duration;
    }

    private calcFractions(demand: number[]): void {

    }

    private setOdNodes(demand: number[], OdPairs: OdPair[]): void {

    }

}
