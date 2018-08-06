import { linear } from 'everpolate';

import * as combine from 'mout/array/combine';

import { Node, Edge, Graph } from "../network/graph";
import { round } from "../ui/utils";
import { uiConfig } from "../ui/ui-config";
import { encodeUriSegment } from '@angular/router/src/url_tree';

/**
 * Simulation (LTM) node.
 */
export class LtmNode extends Node {

    public incomingEdges: LtmEdge[] = [];

    public outgoingEdges: LtmEdge[] = [];

    /**
     * Origin node.
     */
    public origin?: {
        /**
         * Number of vehicles that enters the network.
         */
        sendingFlow: number;
        /**
         * Traffic demand disaggregated by route.
         */
        expectedInflows: number[];
        /**
         * Traffic demand.
         */
        expectedInflow: number;
    };

    /**
     * Destination node.
     */
    public destination?: {
        /**
         * Number of vehicles that leaves the network.
         */
        receivingFlow: number;
        /**
         * Expected vehicles.
         */
        expectedOutFlow: number;
    };

    /**
     * The amount of vehicles that are transferred from incoming links to outgoing links disaggregated by route.
     */
    public transitionFlows: any[] = [];

    public reset(): void {
        this.origin = null;
        this.destination = null;
        this.transitionFlows = [];
    }

    /**
     * Calculates disaggregated transition flows of the node.
     * @param paths Existing paths
     */
    public calcTransitionFlows(paths: any[]): void {
        for (let i = 0; i < paths.length; i++) {
            this.transitionFlows[i] = {};
            for (const incomingEdge of this.incomingEdges) {
                if (!this.transitionFlows[i][incomingEdge.label]) { this.transitionFlows[i][incomingEdge.label] = {}; }
                // To destination.
                if (this.destination) {
                    if (this.toDestination(i, incomingEdge, paths)) {
                        this.transitionFlows[i][incomingEdge.label][this.label] = this.calcOutflow(i, incomingEdge);
                    }
                }
                // Link to link.
                for (const outgoingEdge of this.outgoingEdges) {
                    if (this.linkToLink(i, incomingEdge, outgoingEdge, paths)) {
                        this.transitionFlows[i][incomingEdge.label][outgoingEdge.label] =
                            this.calcTransitionFlow(i, incomingEdge, outgoingEdge, paths);
                    }
                }
            }
            // From origin.
            if (this.origin) {
                for (const outgoingEdge of this.outgoingEdges) {
                    if (this.fromOrigin(i, outgoingEdge, paths)) {
                        if (!this.transitionFlows[i][this.label]) { this.transitionFlows[i][this.label] = {}; }
                        this.transitionFlows[i][this.label][outgoingEdge.label] = this.calcInflow(i, outgoingEdge);
                    }
                }
            }
        }
    }

    /**
     * Updates disaggregated and aggregated cumulative vehicles number.
     * @param paths Existing paths
     */
    public updateCumulativeFlows(paths: any[]): void {
        let transitionFlow: number;
        // Downstream.
        for (const incomingEdge of this.incomingEdges) {
            // Disaggregated.
            transitionFlow = 0;
            for (let i = 0; i < paths.length; i++) {
                let disaggregatedTransitionFlow = 0;
                if (this.destination) {
                    if (this.transitionFlows[i][incomingEdge.label] && this.transitionFlows[i][incomingEdge.label][this.label]) {
                        disaggregatedTransitionFlow = this.transitionFlows[i][incomingEdge.label][this.label];
                        // Updates the number of vechicles that leaves the network.
                        this.destination.receivingFlow += disaggregatedTransitionFlow;
                    }
                }
                for (const outgoingEdge of this.outgoingEdges) {
                    if (this.transitionFlows[i][incomingEdge.label] && this.transitionFlows[i][incomingEdge.label][outgoingEdge.label]) {
                        disaggregatedTransitionFlow = this.transitionFlows[i][incomingEdge.label][outgoingEdge.label];
                    }
                }
                incomingEdge.updateDownstream(disaggregatedTransitionFlow, incomingEdge.downstreams[i]);
                transitionFlow += disaggregatedTransitionFlow;
            }
            // Aggregated.
            incomingEdge.updateDownstream(transitionFlow, incomingEdge.downstream);
        }
        // Upstream.
        for (const outgoingEdge of this.outgoingEdges) {
            // Disaggregated.
            transitionFlow = 0;
            for (let i = 0; i < paths.length; i++) {
                let disaggregatedTransitionFlow = 0;
                if (this.origin) {
                    if (this.transitionFlows[i][this.label] && this.transitionFlows[i][this.label][outgoingEdge.label]) {
                        disaggregatedTransitionFlow = this.transitionFlows[i][this.label][outgoingEdge.label];
                        // Updates the number of vechicles that enters the network.
                        this.origin.sendingFlow += disaggregatedTransitionFlow;
                    }
                }
                for (const incomingEdge of this.incomingEdges) {
                    if (this.transitionFlows[i][incomingEdge.label] && this.transitionFlows[i][incomingEdge.label][outgoingEdge.label]) {
                        disaggregatedTransitionFlow = this.transitionFlows[i][incomingEdge.label][outgoingEdge.label];
                    }
                }
                outgoingEdge.updateUpstream(disaggregatedTransitionFlow, outgoingEdge.upstreams[i]);
                transitionFlow += disaggregatedTransitionFlow;
            }
            // Aggregated.
            outgoingEdge.updateUpstream(transitionFlow, outgoingEdge.upstream);
        }
    }

    /**
     * Calculates transition flow from link to link.
     */
    private calcTransitionFlow(index: number, incomingEdge: LtmEdge, outgoingEdge: LtmEdge, paths: any[]): number {
        let sendingFlow = 0;
        for (const edge of this.incomingEdges) {
            sendingFlow += edge.sendingFlow;
        }
        const receivingFlows: number[] = [];
        if (sendingFlow > 0) {
            for (const edge of this.outgoingEdges) {
                receivingFlows.push(this.calcReceivingFlow(edge.receivingFlow, incomingEdge.sendingFlows[index], sendingFlow));
            }
        }
        let minFlow = 0;
        if (receivingFlows.length > 0) {
            minFlow = Math.min(...receivingFlows);
        }
        return Math.min(
            minFlow,
            incomingEdge.sendingFlows[index]
        );
    }

    private calcReceivingFlow(receivingFlow: number, inflow: number, sendingFlow: number): number {
        return round(receivingFlow * inflow / sendingFlow);
    }

    /**
     * Calculates outflow to destination node.
     */
    private calcOutflow(index: number, incomingEdge: LtmEdge): number {
        return incomingEdge.sendingFlows[index];
    }

    /**
     * Calculates inflow from origin node.
     */
    private calcInflow(index: number, outgoingEdge: LtmEdge): number {
        return Math.min(
            this.origin.expectedInflows[index] -
            outgoingEdge.upstreams[index][outgoingEdge.upstreams[index].length - 1],
            this.calcReceivingFlow(outgoingEdge.receivingFlow, this.origin.expectedInflows[index], this.origin.expectedInflow)
        );
    }

    private linkToLink(index: number, incomingEdge: LtmEdge, outgoingEdge: LtmEdge, paths: any[]): boolean {
        return paths[index][incomingEdge.label] == outgoingEdge.label;
    }

    private toDestination(index: number, incomingEdge: LtmEdge, paths: any[]): boolean {
        return paths[index][incomingEdge.label] == this.label;
    }

    private fromOrigin(index: number, outgoingEdge: LtmEdge, paths: any[]): boolean {
        return paths[index][this.label] == outgoingEdge.label;
    }

}

/**
 * Simulation (LTM) edge.
 */
export class LtmEdge extends Edge {

    public origin: LtmNode;

    public destination: LtmNode;

    /**
     * Max amount of vehicles that could leave the downstream end during time interval disaggregated by route.
     */
    public sendingFlows: number[] = [];

    /**
     * Max amount of vehicles that could leave the downstream end during time interval.
     */
    public sendingFlow: number;

    /**
     * Max amount of vehicles that could enter the upstream end during time interval.
     */
    public receivingFlow: number;

    /**
     * The cumulative vehicles number at the upstream link end disaggregated by route.
     */
    public upstreams: number[][] = [];

    /**
     * The cumulative vehicles number at the upstream link end.
     */
    public upstream: number[] = [];

    /**
     * The cumulative vehicles number at the downstream link end disaggregated by route.
     */
    public downstreams: number[][] = [];

    /**
     * The cumulative vehicles number at the downstream link end.
     */
    public downstream: number[] = [];

    /**
     * The vehicles number of the link.
     */
    public trafficVolume = 0;

    /**
     * Count of vehicles crossing the link during the simulation.
     */
    public trafficCount = 0;

    /**
     * Count of how many times the link reaches a level of moderate traffic.
     */
    public moderateTrafficCount = 0;

    /**
     * Count of how many times the link reaches a level of heavy traffic.
     */
    public heavyTrafficCount = 0;

    public reset(): void {
        this.sendingFlows = [];
        this.upstreams = [];
        this.upstream = [];
        this.downstreams = [];
        this.downstream = [];
        this.trafficVolume = 0;
        this.trafficCount = 0;
        this.moderateTrafficCount = 0;
        this.heavyTrafficCount = 0;
        this.draw(uiConfig.links.baseColor);
    }

    /**
     * Calculates disaggregated and aggregated sending flows of the incoming link.
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     * @param paths Existing paths
     */
    public calcSendingFlows(timePeriod: number[], timeInterval: number, paths: any[]): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval - this.duration;
        const capacity = this.getCapacity(timeInterval);

        let interpolation: number[];
        // Disaggregated.
        for (let i = 0; i < paths.length; i++) {
            interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.upstreams[i]) : [0];
            this.sendingFlows[i] = this.calcSendingFlow(interpolation, capacity, this.upstreams[i], this.downstreams[i]);
        }
        // Aggregated.
        interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.upstream) : [0];
        this.sendingFlow = this.calcSendingFlow(interpolation, capacity, this.upstream, this.downstream);
    }

    /**
     * Calculates the receiving flow of the outgoing link.
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     * @param paths Existing paths
     */
    public calcReceivingFlow(timePeriod: number[], timeInterval: number, paths: any[]): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval + this.duration;
        const capacity = this.getCapacity(timeInterval);
        const maxCapacity = this.getCapacity(this.duration); // kjam * distance
        const interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.downstream) : [0];
        const receivingFlow = Math.min(
            (interpolation[0] > 0 ? interpolation[0] : 0) +
            maxCapacity -
            this.upstream[this.upstream.length - 1],
            capacity
        );
        if (receivingFlow < 0) {
            this.receivingFlow = 0;
        } else if (receivingFlow > 0 && receivingFlow < 1) {
            this.receivingFlow = 1;
        } else {
            this.receivingFlow = round(receivingFlow);
        }
    }

    /**
     * Updates disaggregated or aggregated cumulative vehicles number at the upstream link end.
     * @param transitionFlow The transition flow from incoming link
     * @param upstream The upstream
     */
    public updateUpstream(transitionFlow: number, upstream: any[]): void {
        upstream.push(upstream[upstream.length - 1] + transitionFlow);
    }

    /**
     * Updates disaggregated or aggregate cumulative vehicles number at the downstream link end.
     * @param transitionFlow The transition flow to outgoing link
     * @param downstream The downstream
     */
    public updateDownstream(transitionFlow: number, downstream: any[]): void {
        downstream.push(downstream[downstream.length - 1] + transitionFlow);
    }

    /**
     * Updates the traffic volume as the difference between the cumulative flows.
     */
    public updateTrafficVolume(): void {
        this.trafficVolume = this.upstream[this.upstream.length - 1] - this.downstream[this.downstream.length - 1];
    }

    public updateTrafficCounts(): void {
        // Traffic count is the cumulative flow at the upstream link end.
        this.trafficCount = this.upstream[this.upstream.length - 1];
        // Heavy traffic.
        if (this.trafficVolume > this.getCapacity(this.duration) * uiConfig.heavyTraffic) {
            this.heavyTrafficCount++;
            this.draw(uiConfig.links.heavyTrafficColor, 13);
            // Moderate traffic.
        } else if (this.trafficVolume > this.getCapacity(this.duration) * uiConfig.moderateTraffic) {
            this.moderateTrafficCount++;
            this.draw(uiConfig.links.moderateTrafficColor, 12);
            // No traffic.
        } else if (this.trafficVolume > 0 || this.trafficCount > 0) {
            this.draw(uiConfig.links.noTrafficColor, 11);
        }
    }

    private calcSendingFlow(interpolation: number[], capacity: number, upstream: number[], downstream: number[]): number {
        const trafficVolume = upstream[upstream.length - 1] - downstream[downstream.length - 1];

        let sendingFlow = 0;
        // The sending flow should only be calculated in the presence of vehicles on the link.
        if (trafficVolume > 0) {
            sendingFlow = Math.min(
                (interpolation[0] > 0 ? interpolation[0] : 0) -
                downstream[downstream.length - 1],
                capacity
            );
        }
        if (sendingFlow < 0) {
            return 0;
        } else if (sendingFlow > 0 && sendingFlow < 1) {
            return 1;
        } else {
            return round(sendingFlow);
        }
    }

}

/**
 * Simulation (LTM) graph.
 */
export class LtmGraph extends Graph {

    protected nodes: LtmNode[] = [];

    protected edges: LtmEdge[] = [];

    protected shortestPaths: LtmEdge[][][] = [];

    constructor(graph: Graph) {
        super();

        this.mapGraph(graph);
    }

    public reset(): void {
        for (const node of this.nodes) {
            node.reset();
        }
        for (const edge of this.edges) {
            edge.reset();
        }
    }

    public getNodes(): LtmNode[] {
        return this.nodes;
    }

    public getEdges(): LtmEdge[] {
        return this.edges;
    }

    public getNode(nodeId: number): LtmNode | undefined {
        return this.nodes.find((node: LtmNode) => node.nodeId == nodeId);
    }

    public addOrUpdateNode(node: LtmNode): void {
        const existingNode = this.getNode(node.nodeId);
        if (existingNode) {
            existingNode.incomingEdges = combine(existingNode.incomingEdges, node.incomingEdges);
            existingNode.outgoingEdges = combine(existingNode.outgoingEdges, node.outgoingEdges);
        } else {
            this.nodes.push(node);
        }
    }

    public getEdge(edgeId: number): LtmEdge {
        return this.edges.find((edge: LtmEdge) => edge.edgeId == edgeId);
    }

    public addEdge(edge: LtmEdge): void {
        this.edges.push(edge);
    }

    public getOdNode(label: string): LtmNode {
        return this.nodes.find((node: LtmNode) => node.label == label);
    }

    public getOdNodes(): LtmNode[] {
        return this.nodes.filter((node: LtmNode) => node.label);
    }

    public getShortestPaths(): LtmEdge[][][] {
        return this.shortestPaths;
    }

    private mapGraph(graph: Graph): void {
        // Edges and nodes.
        const edges = graph.getPathsEdges();
        for (let i = 0; i < edges.length; i++) {
            const origin = this.getNode(edges[i].origin.nodeId) || new LtmNode(edges[i].origin.nodeId);
            const destination = this.getNode(edges[i].destination.nodeId) || new LtmNode(edges[i].destination.nodeId);
            const edge = new LtmEdge(edges[i].edgeId);
            edge.origin = origin;
            edge.destination = destination;
            this.mapEdge(edge, edges[i]);
            origin.outgoingEdges.push(edge);
            destination.incomingEdges.push(edge);
            this.mapNode(origin, edges[i].origin);
            this.mapNode(destination, edges[i].destination);
            this.addOrUpdateNode(origin);
            this.addOrUpdateNode(destination);
            this.addEdge(edge);
        }
        // Relations.
        this.relations = graph.getRelations();
        // Shortest paths.
        const shortestPaths = graph.getShortestPaths();
        for (let z = 0; z < shortestPaths.length; z++) {
            this.shortestPaths[z] = [];
            for (let n = 0; n < shortestPaths[z].length; n++) {
                this.shortestPaths[z][n] = [];
                for (let m = 0; m < shortestPaths[z][n].length; m++) {
                    const edge = this.getEdge(shortestPaths[z][n][m].edgeId);
                    this.shortestPaths[z][n][m] = edge;
                }
            }
        }
        // Matrices.
        this.incidenceMatrix = graph.getIncidenceMatrix();
        this.assignmentMatrix = graph.getAssignmentMatrix();
    }

    private mapEdge(edge: LtmEdge, graphEdge: Edge): void {
        edge.label = graphEdge.label;
        edge.tags = graphEdge.tags;
        edge.distance = graphEdge.distance;
        edge.duration = graphEdge.duration;
        edge.durationInTraffic = graphEdge.durationInTraffic;
        edge.velocity = graphEdge.velocity;
        edge.density = graphEdge.density;
        edge.flow = graphEdge.flow;
        edge.linkFlow = graphEdge.linkFlow;
        edge.maxFlow = graphEdge.maxFlow;
        edge.drawingOptions = graphEdge.drawingOptions;
    }

    private mapNode(node: LtmNode, graphNode: Node): void {
        node.label = graphNode.label;
        node.lat = graphNode.lat;
        node.lon = graphNode.lon;
        node.tags = graphNode.tags;
        node.drawingOptions = graphNode.drawingOptions;
        node.count = graphNode.count;
    }

}
