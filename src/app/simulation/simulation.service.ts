import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Store } from '@ngrx/store';

import { NetworkService } from '../network/network.service';
import { DemandService } from '../demand/demand.service';
import * as fromSimulation from './models/reducers';
import { SimulationActionTypes } from './models/actions/simulation.actions';
import { Graph, OdPair, Tag } from '../network/graph';
import { LtmGraph, LtmEdge, LtmNode } from './ltm-graph';
import { NumericalSimulation, Counts } from './models/simulation-state';
import { round } from '../ui/utils';

/**
 * Applies the traffic flow propagation algorithm.
 */
@Injectable() export class SimulationService {

    /**
     * Ltm graph instance.
     */
    private graph: LtmGraph;

    /**
     * The cumulated time period.
     */
    private timePeriod: number[] = [];

    /**
     * The time period is divided into time intervals.
     */
    private timeInterval: number;

    /**
     * Existing paths for each:
     * - [path][origin][link]
     * - [path][link][link]
     * - [path][link][destination]
     */
    private paths: any[] = [];

    /**
     * Demand of each path.
     */
    private pathsDemand: number[] = [];

    /**
     * Demand fractions for each [path][link].
     */
    private fractions: any[] = [];

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.graph = null;
        this.timePeriod = [];
        this.timeInterval = 0;
        this.paths = [];
        this.pathsDemand = [];
        this.fractions = [];
        // Simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.Reset
        });
    }

    /**
     * Initializes the simulation.
     */
    public init(): Observable<any> {
        // Gets graph from network.
        const graph = this.network.getGraph();
        // Gets O/D matrix from demand.
        const demand = this.demand.getOdMatrix();
        // Instances LTM graph from graph.
        this.graph = new LtmGraph(graph);
        // Sets the time period.
        this.timePeriod[0] = 0;
        // Sets time interval.
        this.setTimeInterval();
        // Builds existing paths.
        this.buildPaths();
        // Calculates paths demand.
        this.calcPathsDemand(demand);
        // Calculates demand fractions.
        this.calcFractions();
        // Sets O/D nodes expected flows.
        this.setOdNodes();
        // Sets edges upstream and downstream.
        this.setEdges();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriod: this.timePeriod }
        });
        return of(null);
    }

    /**
     * Performs a flows propagation cycle.
     */
    public propagateFlows(): void {
        // Performs a LTM algorithm cycle.
        this.ltm();
        // Updates statistics.
        this.updateStatistics();
        // Updates time period.
        this.updateTimePeriod();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriod: this.timePeriod }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationChanged,
            payload: { simulation: { data: this.numericalSimulation(), counts: this.getCounts() } }
        });
        // Checks if the simulation is finished.
        if (this.endLtm()) {
            // Updates simulation state.
            this.store.dispatch({
                type: SimulationActionTypes.SimulationEnded,
                payload: true
            });
        }

        console.log(this.graph);
    }

    /**
     * Resets the initial values.
     */
    public resetFlows(): void {
        // Resets.
        this.graph.reset();
        this.timePeriod = [];
        // Reinitializes.
        this.timePeriod[0] = 0;
        this.setOdNodes();
        this.setEdges();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriod: this.timePeriod }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationChanged,
            payload: { simulation: { data: [], counts: {} } }
        });
    }

    public updateTimePeriod(): void {
        this.timePeriod.push(this.timePeriod[this.timePeriod.length - 1] + this.timeInterval);
    }

    /**
     * Link Transmission Model algorithm.
     */
    private ltm(): void {
        const nodes = this.graph.getNodes();
        // For each node on the paths.
        for (const node of nodes) {
            this.takeFirstStep(node);
            this.takeSecondStep(node);
            this.takeThirdStep(node);
        }
    }

    /**
     * Calculates sending and receiving flows.
     * @param node The node on the paths
     */
    private takeFirstStep(node: LtmNode): void {
        // Sending flows.
        for (const edge of node.incomingEdges) {
            edge.calcSendingFlows(this.timePeriod, this.timeInterval, this.paths, this.fractions);
        }
        // Receiving flows.
        for (const edge of node.outgoingEdges) {
            edge.calcReceivingFlows(this.timePeriod, this.timeInterval, this.paths, this.fractions);
        }
    }

    /**
     * Determines the transition flows from incoming links to outgoing links.
     * @param node The node on the paths
     */
    private takeSecondStep(node: LtmNode): void {
        node.calcTransitionFlows(this.paths);
    }

    /**
     * Updates the cumulative vehicles number.
     * @param node The node on the paths
     */
    private takeThirdStep(node: LtmNode): void {
        node.updateCumulativeFlows(this.paths);

        // Updates the traffic volume of the links.
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            edge.updateTrafficVolume();
        }
    }

    /**
     * The algorithm ends when there is no more traffic volume on the links.
     */
    private endLtm(): boolean {
        const edges = this.graph.getEdges();
        return edges.filter(
            (edge: LtmEdge) =>
                edge.trafficVolume > 0
        ).length > 0 ? false : true;
    }

    /**
     * Calculate the time interval as the smallest connection travel time.
     */
    private setTimeInterval(): void {
        const edges = this.graph.getEdges();
        const edge = edges.reduce((prev: LtmEdge, curr: LtmEdge) => prev.duration < curr.duration ? prev : curr);
        this.timeInterval = edge.duration;
    }

    /**
     * Calculates paths demand.
     * @param odMatrix The O/D matrix
     */
    private calcPathsDemand(odMatrix: number[]): void {
        const assignmentMatrix = this.graph.getAssignmentMatrix();

        let i = 0;
        for (let z = 0; z < assignmentMatrix.length; z++) {
            if (odMatrix[z] != null) {
                const pos = i;

                let sum = 0;
                for (let n = 0; n < assignmentMatrix[z].length; n++) {
                    const p = assignmentMatrix[z][n].find(value => value > 0) || 0;
                    this.pathsDemand[i] = round(p * odMatrix[z]);
                    sum += this.pathsDemand[i];
                    i++;
                }
                if (odMatrix[z] - sum > 0) { this.pathsDemand[pos] = odMatrix[z] - sum; }
            }
        }
    }

    /**
     * Builds existing paths.
     */
    private buildPaths(): void {
        const shortestPaths = this.graph.getShortestPaths();

        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                this.paths[i] = {};
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    const edge = shortestPaths[z][n][m];
                    if (m == 0) {
                        this.paths[i][edge.origin.label] = edge.label;
                    }
                    if (m < shortestPaths[z][n].length - 1) {
                        this.paths[i][edge.label] = shortestPaths[z][n][m + 1].label;
                    }
                    if (m == shortestPaths[z][n].length - 1) {
                        this.paths[i][edge.label] = edge.destination.label;
                    }
                }
                i++;
            }
        }
    }

    /**
     * Calculates demand fractions.
     */
    private calcFractions(): void {
        const shortestPaths = this.graph.getShortestPaths();

        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                this.fractions[i] = {};
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    const edge = shortestPaths[z][n][m];
                    this.fractions[i][edge.label] = this.calcFraction(i, edge.edgeId, shortestPaths);
                }
                i++;
            }
        }
    }

    private calcFraction(index: number, edgeId: number, shortestPaths: LtmEdge[][][]): number {
        let total = 0;
        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    if (shortestPaths[z][n][m].edgeId == edgeId) {
                        total += this.pathsDemand[i];
                    }
                }
                i++;
            }
        }
        return total > 0 ? this.pathsDemand[index] / total : 0;
    }

    private setOdNodes(): void {
        const shortestPaths = this.graph.getShortestPaths();

        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                const origin = shortestPaths[z][n][0].origin;
                const destination = shortestPaths[z][n][shortestPaths[z][n].length - 1].destination;
                if (!origin.origin) {
                    origin.origin = {
                        sendingFlow: 0,
                        expectedInflows: []
                    };
                }
                origin.origin.expectedInflows[i] = this.pathsDemand[i];
                if (!destination.destination) {
                    destination.destination = {
                        receivingFlow: 0,
                        expectedOutFlows: []
                    };
                }
                destination.destination.expectedOutFlows[i] = this.pathsDemand[i];
                i++;
            }
        }
    }

    private setEdges(): void {
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            for (let i = 0; i < this.paths.length; i++) {
                edge.upstreams[i] = [];
                edge.upstreams[i][0] = 0;
                edge.upstream[0] = 0;
                edge.downstreams[i] = [];
                edge.downstreams[i][0] = 0;
                edge.downstream[0] = 0;
            }
        }
    }

    private updateStatistics(): void {
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            edge.updateTrafficCounts();
        }
    }

    private numericalSimulation(): NumericalSimulation[] {
        const data: NumericalSimulation[] = [];

        const edges = this.graph.getEdges();
        for (const edge of edges) {
            const wayTag = edge.tags.find((tag: Tag) => tag.key == 'name');
            const wayName = wayTag ? wayTag.value : '';
            data.push(
                {
                    edge: edge.label,
                    wayName: wayName,
                    trafficVolume: edge.trafficVolume,
                    trafficCount: edge.trafficCount
                }
            );
        }
        return data;
    }

    private getCounts(): Counts {
        let startedVehicles = 0;
        let arrivedVehicles = 0;

        const nodes = this.graph.getNodes();
        for (const node of nodes) {
            if (node.origin) {
                startedVehicles += node.origin.sendingFlow;
            }
            if (node.destination) {
                arrivedVehicles += node.destination.receivingFlow;
            }
        }
        return {
            startedVehicles: startedVehicles,
            arrivedVehicles: arrivedVehicles
        };
    }

}
