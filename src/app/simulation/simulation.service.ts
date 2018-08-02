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

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.graph = null;
        this.timePeriod = [];
        this.timeInterval = 0;
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
        // Gets O/D pairs.
        const odPairs = this.network.getOdPairs();
        // Instances LTM graph from graph.
        this.graph = new LtmGraph(graph);
        // Sets the time period.
        this.timePeriod[0] = 0;
        // Sets time interval.
        this.setTimeInterval();
        // Sets O/D nodes sending and receiving flows.
        this.setOdNodes(demand, odPairs);
        // Sets edges upstream and downstream.
        this.setEdges();
        // Calculates traffic fractions.
        this.calcFractions(demand);
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
        const demand = this.demand.getOdMatrix();
        const odPairs = this.network.getOdPairs();
        this.setOdNodes(demand, odPairs);
        this.setEdges();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriod: this.timePeriod }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationChanged,
            payload: { simulation: { data: [] } }
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
            edge.calcSendingFlow(this.timePeriod, this.timeInterval);
        }
        // Receiving flows.
        for (const edge of node.outgoingEdges) {
            edge.calcReceivingFlow(this.timePeriod, this.timeInterval);
        }
    }

    /**
     * Determines the transition flows from incoming links to outgoing links.
     * @param node The node on the paths
     */
    private takeSecondStep(node: LtmNode): void {
        const fractions = this.graph.getFractions();
        node.calcTransitionFlows(fractions);
    }

    /**
     * Updates the cumulative vehicles number.
     * @param node The node on the paths
     */
    private takeThirdStep(node: LtmNode): void {
        // Downstream of incoming links.
        for (const incomingEdge of node.incomingEdges) {
            let transitionFlow = 0;
            // Destination node.
            if (node.destination) {
                if (node.transitionFlows[incomingEdge.label] && node.transitionFlows[incomingEdge.label][node.label]) {
                    transitionFlow += node.transitionFlows[incomingEdge.label][node.label];
                    node.destination.receivingFlow += node.transitionFlows[incomingEdge.label][node.label];
                }
            }
            for (const outgoingEdge of node.outgoingEdges) {
                if (node.transitionFlows[incomingEdge.label] && node.transitionFlows[incomingEdge.label][outgoingEdge.label]) {
                    transitionFlow += node.transitionFlows[incomingEdge.label][outgoingEdge.label];
                }
            }
            incomingEdge.updateDownstream(transitionFlow);
        }
        // Upstream of outgoing links.
        for (const outgoingEdge of node.outgoingEdges) {
            let transitionFlow = 0;
            // Origin node.
            if (node.origin) {
                if (node.transitionFlows[node.label] && node.transitionFlows[node.label][outgoingEdge.label]) {
                    transitionFlow += node.transitionFlows[node.label][outgoingEdge.label];
                    node.origin.sendingFlow += node.transitionFlows[node.label][outgoingEdge.label];
                }
            }
            for (const incomingEdge of node.incomingEdges) {
                if (node.transitionFlows[incomingEdge.label] && node.transitionFlows[incomingEdge.label][outgoingEdge.label]) {
                    transitionFlow += node.transitionFlows[incomingEdge.label][outgoingEdge.label];
                }
            }
            outgoingEdge.updateUpstream(transitionFlow);
        }
        // Updates the traffic volume of the links.
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            edge.updateTrafficCounts();
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

    private setOdNodes(odMatrix: number[], odPairs: OdPair[]): void {
        for (let i = 0; i < odPairs.length; i++) {
            const origin = this.graph.getOdNode(odPairs[i].origin);
            const destination = this.graph.getOdNode(odPairs[i].destination);
            if (origin) {
                if (origin.origin) {
                    origin.origin.expectedFlow += odMatrix[i] || 0;
                } else {
                    origin.origin = {
                        sendingFlow: 0,
                        expectedFlow: odMatrix[i] || 0
                    };
                }
            }
            if (destination) {
                if (destination.destination) {
                    destination.destination.expectedFlow += odMatrix[i] || 0;
                } else {
                    destination.destination = {
                        receivingFlow: 0,
                        expectedFlow: odMatrix[i] || 0
                    };
                }
            }
        }
    }

    private setEdges(): void {
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            edge.upstream[0] = 0;
            edge.downstream[0] = 0;
        }
    }

    /**
     * Calculates traffic fraction for each:
     * - origin to link
     * - link to link
     * - link to destination
     * @param odMatrix The O/D matrix
     */
    private calcFractions(odMatrix: number[]): void {
        const sharedDomand = this.shareDemand(odMatrix, this.graph.getAssignmentMatrix());
        const shortestPaths = this.graph.getShortestPaths();

        const fractions: any = {};
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    const edge = shortestPaths[z][n][m];
                    if (m == 0) {
                        if (!fractions[edge.origin.label]) { fractions[edge.origin.label] = {}; }
                        fractions[edge.origin.label][edge.label] =
                            this.calcFromOriginFraction(shortestPaths, sharedDomand, edge.origin.nodeId, edge.edgeId);
                    }
                    if (m < shortestPaths[z][n].length - 1) {
                        if (!fractions[edge.label]) { fractions[edge.label] = {}; }
                        fractions[edge.label][shortestPaths[z][n][m + 1].label] =
                            this.calcLinkToLinkFraction(shortestPaths, sharedDomand, edge.edgeId, shortestPaths[z][n][m + 1].edgeId);
                    }
                    if (m == shortestPaths[z][n].length - 1) {
                        if (!fractions[edge.label]) { fractions[edge.label] = {}; }
                        fractions[edge.label][edge.destination.label] =
                            this.calcToDestinationFraction(shortestPaths, sharedDomand, edge.edgeId, edge.destination.nodeId);
                    }
                }
            }
        }
        this.graph.setFractions(fractions);
    }

    private calcFromOriginFraction(shortestPaths: LtmEdge[][][], sharedDemand: number[][], nodeId: number, edgeId: number): number {
        let total = 0;
        let partial = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                if (shortestPaths[z][n][0].origin.nodeId == nodeId) {
                    total += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                }
                if (shortestPaths[z][n][0].edgeId == edgeId) {
                    partial += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                }
            }
        }
        return total > 0 ? partial / total : 0;
    }

    private calcLinkToLinkFraction(
        shortestPaths: LtmEdge[][][],
        sharedDemand: number[][],
        incomingEdgeId: number,
        outgoingEdgeId: number
    ): number {
        let total = 0;
        let partial = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                for (let m = 0; m < shortestPaths[z][n].length - 1; m++) {
                    if (shortestPaths[z][n][m].edgeId == incomingEdgeId) {
                        total += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                    }
                    if (shortestPaths[z][n][m].edgeId == incomingEdgeId && shortestPaths[z][n][m + 1].edgeId == outgoingEdgeId) {
                        partial += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                    }
                }
            }
        }
        return total > 0 ? partial / total : 0;
    }

    private calcToDestinationFraction(shortestPaths: LtmEdge[][][], sharedDemand: number[][], edgeId: number, nodeId: number): number {
        let total = 0;
        let partial = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                if (shortestPaths[z][n][shortestPaths[z][n].length - 1].destination.nodeId == nodeId) {
                    total += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                }
                if (shortestPaths[z][n][shortestPaths[z][n].length - 1].edgeId == edgeId) {
                    partial += sharedDemand[z] ? sharedDemand[z][n] || 0 : 0;
                }
            }
        }
        return total > 0 ? partial / total : 0;
    }

    /**
     * Shares the demand on each path.
     * @param odMatrix The O/D matrix
     * @param assignmentMatrix Assignment matrix [pairs,paths,edges]
     */
    private shareDemand(odMatrix: number[], assignmentMatrix: number[][][]): number[][] {
        const sharedDemand: number[][] = [];
        for (let z = 0; z < assignmentMatrix.length; z++) {
            sharedDemand[z] = [];
            if (odMatrix[z] != null) {
                let sum = 0;
                for (let n = 0; n < assignmentMatrix[z].length; n++) {
                    const p = assignmentMatrix[z][n].find(value => value > 0) || 0;
                    sharedDemand[z][n] = round(p * odMatrix[z]);
                    sum += sharedDemand[z][n];
                }
                if (odMatrix[z] - sum > 0) { sharedDemand[z][0] = odMatrix[z] - sum; }
            }
        }
        return sharedDemand;
    }

    private updateStatistics(): void {
        const edges = this.graph.getEdges();
        for (const edge of edges) {
            edge.updateStatistics();
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
                    trafficVolume: round(edge.trafficVolume),
                    trafficCount: round(edge.trafficCount)
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
            startedVehicles: round(startedVehicles),
            arrivedVehicles: round(arrivedVehicles)
        };
    }

}
