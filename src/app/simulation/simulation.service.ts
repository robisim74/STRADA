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
     * Traffic fractions for each [path][link].
     */
    private fractions: any[] = [];

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

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.graph = null;
        this.timePeriod = [];
        this.timeInterval = 0;
        this.fractions = [];
        this.paths = [];
        this.pathsDemand = [];
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
        // Calculates paths demand.
        this.calcPathsDemand(demand);
        // Calculates traffic fractions.
        this.calcFractions();
        // Builds existing paths.
        this.buildPaths();
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
        // For each path.
        for (let i = 0; i < this.paths.length; i++) {
            // For each node on the path.
            for (const node of nodes) {
                this.takeFirstStep(i, node);
                this.takeSecondStep(i, node);
                this.takeThirdStep(i, node);
            }
        }
    }

    /**
     * Calculates sending and receiving flows.
     * @param index The path
     * @param node The node on the path
     */
    private takeFirstStep(index: number, node: LtmNode): void {
        // Sending flows.
        for (const edge of node.incomingEdges) {
            edge.calcSendingFlow(index, this.timePeriod, this.timeInterval, this.fractions);
        }
        // Receiving flows.
        for (const edge of node.outgoingEdges) {
            edge.calcReceivingFlow(index, this.timePeriod, this.timeInterval, this.fractions);
        }
    }

    /**
     * Determines the transition flows from incoming links to outgoing links.
     * @param index The path
     * @param node The node on the path
     */
    private takeSecondStep(index: number, node: LtmNode): void {
        node.calcTransitionFlows(index, this.paths);
    }

    /**
     * Updates the cumulative vehicles number.
     * @param index The path
     * @param node The node on the path
     */
    private takeThirdStep(index: number, node: LtmNode): void {
        // Downstream of incoming links.
        for (const incomingEdge of node.incomingEdges) {
            let transitionFlow = 0;
            // Destination node.
            if (node.destination) {
                if (node.transitionFlows[index][incomingEdge.label] && node.transitionFlows[index][incomingEdge.label][node.label]) {
                    transitionFlow = node.transitionFlows[index][incomingEdge.label][node.label];
                    node.destination.receivingFlow += transitionFlow;
                }
            }
            for (const outgoingEdge of node.outgoingEdges) {
                if (node.transitionFlows[index][incomingEdge.label] &&
                    node.transitionFlows[index][incomingEdge.label][outgoingEdge.label]) {
                    transitionFlow = node.transitionFlows[index][incomingEdge.label][outgoingEdge.label];
                }
            }
            incomingEdge.updateDownstream(index, transitionFlow);
        }
        // Upstream of outgoing links.
        for (const outgoingEdge of node.outgoingEdges) {
            let transitionFlow = 0;
            // Origin node.
            if (node.origin) {
                if (node.transitionFlows[index][node.label] && node.transitionFlows[index][node.label][outgoingEdge.label]) {
                    transitionFlow = node.transitionFlows[index][node.label][outgoingEdge.label];
                    node.origin.sendingFlow += transitionFlow;
                }
            }
            for (const incomingEdge of node.incomingEdges) {
                if (node.transitionFlows[index][incomingEdge.label] &&
                    node.transitionFlows[index][incomingEdge.label][outgoingEdge.label]) {
                    transitionFlow = node.transitionFlows[index][incomingEdge.label][outgoingEdge.label];
                }
            }
            outgoingEdge.updateUpstream(index, transitionFlow);
        }
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
     * Calculates traffic fractions.
     */
    private calcFractions(): void {
        const shortestPaths = this.graph.getShortestPaths();

        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                this.fractions[i] = {};
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    const edge = shortestPaths[z][n][m];
                    // Fractions.
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
                        if (!this.paths[i][edge.origin.label]) { this.paths[i][edge.origin.label] = {}; }
                        this.paths[i][edge.origin.label][edge.label] = true;
                    }
                    if (m < shortestPaths[z][n].length - 1) {
                        if (!this.paths[i][edge.label]) { this.paths[i][edge.label] = {}; }
                        this.paths[i][edge.label][shortestPaths[z][n][m + 1].label] = true;
                    }
                    if (m == shortestPaths[z][n].length - 1) {
                        if (!this.paths[i][edge.label]) { this.paths[i][edge.label] = {}; }
                        this.paths[i][edge.label][edge.destination.label] = true;
                    }
                }
                i++;
            }
        }
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
                        expectedFlow: []
                    };
                }
                origin.origin.expectedFlow[i] = this.pathsDemand[i];
                if (!destination.destination) {
                    destination.destination = {
                        receivingFlow: 0,
                        expectedFlow: []
                    };
                }
                destination.destination.expectedFlow[i] = this.pathsDemand[i];
                i++;
            }
        }
    }

    private setEdges(): void {
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            for (let i = 0; i < this.paths.length; i++) {
                edge.upstream[i] = [];
                edge.upstream[i][0] = 0;
                edge.downstream[i] = [];
                edge.downstream[i][0] = 0;
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
