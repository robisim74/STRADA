import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Store } from '@ngrx/store';

import { NetworkService } from '../network/network.service';
import { DemandService } from '../demand/demand.service';
import * as fromSimulation from './models/reducers';
import { SimulationActionTypes } from './models/actions/simulation.actions';
import { Tag } from '../network/graph';
import { LtmGraph, LtmEdge, LtmNode } from './ltm-graph';
import { NumericalSimulation, Counts } from './models/simulation-state';
import { Statistics } from './statistics';
import { round } from '../utils';
import { uiConfig } from '../ui/ui-config';

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
    private timePeriods: number[] = [];

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

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private network: NetworkService,
        private demand: DemandService
    ) { }

    public reset(): void {
        this.graph = null;
        this.timePeriods = [];
        this.timeInterval = 0;
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
        this.timePeriods[0] = 0;
        // Initializes time interval.
        this.initTimeInterval();
        // Initializes existing paths.
        this.initPaths();
        // Initializes paths demand.
        this.initPathsDemand(demand);
        // Initializes O/D nodes expected flows.
        this.initOdNodes();
        // Initializes edges upstream and downstream.
        this.initEdges();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriods: this.timePeriods }
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
        this.updateTimePeriods();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriods: this.timePeriods }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationChanged,
            payload: { simulation: { data: this.numericalSimulation(), counts: this.getCounts(), speed: this.getSpeed() } }
        });
        // Checks if the simulation is finished.
        if (this.endLtm()) {
            // Updates simulation state.
            this.store.dispatch({
                type: SimulationActionTypes.SimulationEnded,
                payload: true
            });
        }
    }

    /**
     * Resets the initial values.
     */
    public resetFlows(): void {
        // Resets.
        this.graph.reset();
        this.timePeriods = [];
        // Reinitializes.
        this.timePeriods[0] = 0;
        this.initOdNodes();
        this.initEdges();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { timeInterval: this.timeInterval, timePeriods: this.timePeriods }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationChanged,
            payload: { simulation: { data: [], counts: {}, speed: null } }
        });
    }

    /**
     * Extracts the network statistics.
     */
    public getStatistics(): any {
        const edges = this.graph.getEdges().filter((edge: LtmEdge) =>
            edge.distance > uiConfig.minDistance && edge.duration > uiConfig.minDuration
        );
        const busiestEdge = Statistics.getBusiestEdge(edges);

        return {
            totalTime: this.timePeriods[this.timePeriods.length - 1],
            heavyTrafficLabels: Statistics.getHeavyTrafficLabels(edges),
            moderateTrafficLabels: Statistics.getModerateTrafficLabels(edges),
            heavyTrafficData: Statistics.getHeavyTrafficData(edges, this.timeInterval),
            moderateTrafficData: Statistics.getModerateyTrafficData(edges, this.timeInterval),
            busiestEdgeLabel: Statistics.getBusiestEdgeLabel(busiestEdge),
            busiestEdgeData: Statistics.getBusiestEdgeData(busiestEdge),
            busiestEdgeCapacity: Statistics.getBusiestEdgeCapacity(busiestEdge),
            busiestEdgeDelay: Statistics.getBusiestEdgeDelay(busiestEdge, this.timePeriods),
            periods: this.timePeriods
        };
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
            edge.calcSendingFlows(this.timePeriods, this.timeInterval, this.paths);
        }
        // Receiving flows.
        for (const edge of node.outgoingEdges) {
            edge.calcReceivingFlow(this.timePeriods, this.timeInterval);
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
     * Initializes the time interval as the smallest connection travel time.
     */
    private initTimeInterval(): void {
        const edges = this.graph.getEdges();
        const edge = edges.reduce((prev: LtmEdge, curr: LtmEdge) => prev.duration < curr.duration ? prev : curr);
        if (edge.duration > uiConfig.maxTimeInterval) {
            this.timeInterval = uiConfig.maxTimeInterval;
        } else {
            this.timeInterval = edge.duration;
        }
    }

    /**
     * Initializes existing paths.
     */
    private initPaths(): void {
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
     * Initializes the demand for paths as the rate of the total demand.
     * @param odMatrix The O/D matrix
     */
    private initPathsDemand(odMatrix: number[]): void {
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

    private initOdNodes(): void {
        const shortestPaths = this.graph.getShortestPaths();

        let i = 0;
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                const origin = shortestPaths[z][n][0].origin;
                const destination = shortestPaths[z][n][shortestPaths[z][n].length - 1].destination;
                if (!origin.origin) {
                    origin.origin = {
                        sendingFlow: 0,
                        expectedInflows: [],
                        expectedInflow: 0
                    };
                }
                origin.origin.expectedInflows[i] = this.pathsDemand[i];
                origin.origin.expectedInflow += this.pathsDemand[i];
                if (!destination.destination) {
                    destination.destination = {
                        receivingFlow: 0,
                        expectedOutFlow: 0
                    };
                }
                destination.destination.expectedOutFlow += this.pathsDemand[i];
                i++;
            }
        }
    }

    private initEdges(): void {
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
            edge.updateTrafficVolume();
            edge.updateTrafficCounts();
            edge.updateMoes(this.timeInterval);
        }
    }

    private updateTimePeriods(): void {
        this.timePeriods.push(this.timePeriods[this.timePeriods.length - 1] + this.timeInterval);
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
                    trafficCount: edge.trafficCount,
                    delay: edge.delay,
                    stops: edge.stops
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

    /**
     * The sum of the densities for the velocity square divided by the sum of the flows.
     */
    private getSpeed(): number {
        const edges = this.graph.getEdges();

        let sum = 0;
        let flow = 0;
        for (const edge of edges) {
            sum += edge.velocity > 0 ?
                (edge.getKjam() * (edge.freeFlowVelocity - edge.velocity) / edge.freeFlowVelocity) * Math.pow(edge.velocity, 2)
                : 0;
            flow += edge.velocity > 0 ?
                (edge.getKjam() * (edge.freeFlowVelocity - edge.velocity) / edge.freeFlowVelocity) * edge.velocity
                : 0;
        }
        return round(sum / flow, 2);
    }

}
