import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Store } from '@ngrx/store';

import { NetworkService } from '../network/network.service';
import { DemandService } from '../demand/demand.service';
import * as fromSimulation from './models/reducers';
import { SimulationActionTypes } from './models/actions/simulation.actions';
import { Graph, OdPair } from '../network/graph';
import { LtmGraph, LtmEdge, LtmNode } from './ltm-graph';
import { round } from '../ui/utils';

/**
 * Applies the traffic flow propagation algorithm.
 */
@Injectable() export class SimulationService {

    /**
     * Ltm graph instance.
     */
    private ltmGraph: LtmGraph;

    /**
     * Time period.
     */
    public timePeriod: number[] = [];

    /**
     * The time period is divided into time intervals.
     */
    public timeInterval: number;

    /**
     * PropagateFlow processing time.
     */
    public processingTime: number;

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.ltmGraph = null;
        this.timePeriod = [];
        this.timeInterval = 0;
        this.processingTime = 0;
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
        this.ltmGraph = new LtmGraph(graph);
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
     * Performs a flow propagation cycle.
     */
    public propagateFlows(): void {
        const startTime = Date.now();

        // Performs a LTM algorithm cycle.
        this.ltm();
        // Updates statistics.
        this.updateStatistics();

        const endTime = Date.now();
        // Updates processing time.
        this.processingTime = endTime - startTime;
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriod: this.timePeriod }
        });
        // Checks if the simulation is finished.
        if (this.endLtm()) {
            // Updates simulation state.
            this.store.dispatch({
                type: SimulationActionTypes.SimulationEnded,
                payload: true
            });
        }

        console.log(this.ltmGraph);
    }

    /**
     * Resets the initial values.
     */
    public resetFlows(): void {
        // Resets.
        this.ltmGraph.reset();
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
    }

    public updateTimePeriod(): void {
        this.timePeriod.push(this.timePeriod[this.timePeriod.length - 1] + this.timeInterval);
    }

    /**
     * Link Transmission Model algorithm.
     */
    private ltm(): void {
        const nodes = this.ltmGraph.getNodes();
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
        const shortestPaths = this.ltmGraph.getShortestPaths();
        node.calcTransitionFlows(shortestPaths);
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
                if (node.transitionFlows[incomingEdge.label][node.label]) {
                    transitionFlow += node.transitionFlows[incomingEdge.label][node.label];
                    node.destination.receivingFlow += node.transitionFlows[incomingEdge.label][node.label];
                }
            }
            for (const outgoingEdge of node.outgoingEdges) {
                if (node.transitionFlows[incomingEdge.label][outgoingEdge.label]) {
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
                if (node.transitionFlows[node.label][outgoingEdge.label]) {
                    transitionFlow += node.transitionFlows[node.label][outgoingEdge.label];
                    node.origin.sendingFlow -= node.transitionFlows[node.label][outgoingEdge.label];
                }
            }
            for (const incomingEdge of node.incomingEdges) {
                if (node.transitionFlows[incomingEdge.label][outgoingEdge.label]) {
                    transitionFlow += node.transitionFlows[incomingEdge.label][outgoingEdge.label];
                }
            }
            outgoingEdge.updateUpstream(transitionFlow);
        }
    }

    private endLtm(): boolean {
        const nodes = this.ltmGraph.getOdNodes();
        return nodes.filter(
            (node: LtmNode) =>
                node.destination &&
                node.destination.receivingFlow < node.destination.expectedFlow
        ).length > 0 ? false : true;
    }

    /**
     * Calculate the time interval as the smallest connection travel time.
     */
    private setTimeInterval(): void {
        const edges = this.ltmGraph.getEdges();
        const edge = edges.reduce((prev: LtmEdge, curr: LtmEdge) => prev.duration < curr.duration ? prev : curr);
        this.timeInterval = edge.duration;
    }

    private setOdNodes(odMatrix: number[], odPairs: OdPair[]): void {
        for (let i = 0; i < odPairs.length; i++) {
            const origin = this.ltmGraph.getOdNode(odPairs[i].origin);
            const destination = this.ltmGraph.getOdNode(odPairs[i].destination);
            if (origin.origin) {
                origin.origin.sendingFlow += odMatrix[i];
            } else {
                origin.origin = {
                    sendingFlow: odMatrix[i]
                };
            }
            if (destination.destination) {
                destination.destination.expectedFlow += odMatrix[i];
            } else {
                destination.destination = {
                    receivingFlow: 0,
                    expectedFlow: odMatrix[i]
                };
            }
        }
    }

    private setEdges(): void {
        const edges = this.ltmGraph.getEdges();
        for (const edge of edges) {
            edge.upstream[0] = 0;
            edge.downstream[0] = 0;
        }
    }

    /**
     * Calculates traffic fraction for each edge of the paths.
     * @param odMatrix The O/D matrix
     */
    private calcFractions(odMatrix: number[]): void {
        const sharedDomand = this.shareDemand(odMatrix, this.ltmGraph.getAssignmentMatrix());
        const shortestPaths = this.ltmGraph.getShortestPaths();
        const edges = this.ltmGraph.getEdges();
        for (const edge of edges) {
            const nodeId = edge.origin.nodeId;
            const edgeId = edge.edgeId;
            edge.p = this.calcFraction(shortestPaths, sharedDomand, nodeId, edgeId);
        }
    }

    /**
     * Calculates the fraction as the ratio between the partial of the demand that crosses the link
     * and the total of the demand that crosses the node of origin of the link.
     * @param shortestPaths The shortest paths
     * @param sharedDemand The demand shared on each path
     * @param nodeId The origin node of the edge
     * @param edgeId The id of the edge
     */
    private calcFraction(shortestPaths: LtmEdge[][][], sharedDemand: number[][], nodeId: number, edgeId: number): number {
        let total = 0;
        let partial = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    // Total of the paths and destinations that cross the node.
                    if (shortestPaths[z][n][m].origin.nodeId == nodeId) {
                        total += sharedDemand[z][n];
                    }
                    if (shortestPaths[z][n][m].origin.destination) {
                        total += shortestPaths[z][n][m].origin.destination.expectedFlow;
                    }
                    // Partial of the paths that cross the link.
                    if (shortestPaths[z][n][m].edgeId == edgeId) {
                        partial += sharedDemand[z][n];
                    }
                }
            }
        }
        return round(partial / total, 3);
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
        const edges = this.ltmGraph.getEdges();
        for (const edge of edges) {
            edge.updateStatistics();
        }
    }

}
