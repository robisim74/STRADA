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
         * Traffic demand for each path.
         */
        expectedFlow: number[];
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
         * Number of expected vehicles for each path.
         */
        expectedFlow: number[];
    };

    /**
     * The amount of vehicles that are transferred from incoming links to outgoing links.
     */
    public transitionFlows: any[] = [];

    public reset(): void {
        this.origin = null;
        this.destination = null;
        this.transitionFlows = [];
    }

    /**
     * Calculates the transition flows of the node.
     * @param index The path
     * @param paths Existing paths
     */
    public calcTransitionFlows(index: number, paths: any[]): void {
        this.transitionFlows[index] = {};
        for (const incomingEdge of this.incomingEdges) {
            if (!this.transitionFlows[index][incomingEdge.label]) { this.transitionFlows[index][incomingEdge.label] = {}; }
            // To destination.
            if (this.destination) {
                if (this.toDestination(index, incomingEdge, paths)) {
                    this.transitionFlows[index][incomingEdge.label][this.label] = this.calcOutgoingFlow(index, incomingEdge);
                }
            }
            // Link to link.
            for (const outgoingEdge of this.outgoingEdges) {
                if (this.linkToLink(index, incomingEdge, outgoingEdge, paths)) {
                    this.transitionFlows[index][incomingEdge.label][outgoingEdge.label] =
                        this.calcTransitionFlow(index, incomingEdge, outgoingEdge, paths);
                }
            }
        }
        // From origin.
        for (const outgoingEdge of this.outgoingEdges) {
            if (this.origin) {
                if (this.fromOrigin(index, outgoingEdge, paths)) {
                    if (!this.transitionFlows[index][this.label]) { this.transitionFlows[index][this.label] = {}; }
                    this.transitionFlows[index][this.label][outgoingEdge.label] = this.calcIncomingFlow(index, outgoingEdge);
                }
            }
        }
    }

    /**
     * From link to link.
     */
    private calcTransitionFlow(index: number, incomingEdge: LtmEdge, outgoingEdge: LtmEdge, paths: any[]): number {
        return Math.min(
            outgoingEdge.receivingFlow[index],
            incomingEdge.sendingFlow[index]
        );
    }

    /**
     * At the destination node.
     */
    private calcOutgoingFlow(index: number, incomingEdge: LtmEdge): number {
        return incomingEdge.sendingFlow[index];
    }

    /**
     * At the origin node.
     */
    private calcIncomingFlow(index: number, outgoingEdge: LtmEdge): number {
        return Math.min(
            this.origin.expectedFlow[index] -
            outgoingEdge.upstream[index][outgoingEdge.upstream[index].length - 1],
            outgoingEdge.receivingFlow[index]
        );
    }

    private toDestination(index: number, incomingEdge: LtmEdge, paths: any[]): boolean {
        if (paths[index][incomingEdge.label]) {
            return paths[index][incomingEdge.label][this.label] || false;
        }
    }

    private fromOrigin(index: number, outgoingEdge: LtmEdge, paths: any[]): boolean {
        if (paths[index][this.label]) {
            return paths[index][this.label][outgoingEdge.label] || false;
        }
    }

    private linkToLink(index: number, incomingEdge: LtmEdge, outgoingEdge: LtmEdge, paths: any[]): boolean {
        if (paths[index][incomingEdge.label]) {
            return paths[index][incomingEdge.label][outgoingEdge.label] || false;
        }
    }

}

/**
 * Simulation (LTM) edge.
 */
export class LtmEdge extends Edge {

    public origin: LtmNode;

    public destination: LtmNode;

    /**
     * Max amount of vehicles that could leave the downstream end during time interval.
     */
    public sendingFlow: number[] = [];

    /**
     * Max amount of vehicles that could enter the upstream end during time interval.
     */
    public receivingFlow: number[] = [];

    /**
     * The cumulative vehicles number at the upstream link end.
     */
    public upstream: number[][] = [];

    public upstreamCount = 0;

    /**
     * The cumulative vehicles number at the downstream link end.
     */
    public downstream: number[][] = [];

    public downstreamCount = 0;

    /**
     * The vehicles number of the link.
     */
    public trafficVolume = 0;

    /**
     * Number of vehicles crossing the link during the simulation.
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
        this.sendingFlow = [];
        this.receivingFlow = [];
        this.upstream = [];
        this.upstreamCount = 0;
        this.downstream = [];
        this.downstreamCount = 0;
        this.trafficVolume = 0;
        this.trafficCount = 0;
        this.moderateTrafficCount = 0;
        this.heavyTrafficCount = 0;
        this.draw(uiConfig.links.baseColor);
    }

    /**
     * Calculates the sending flow of the incoming link.
     * @param index The path
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     * @param fractions Traffic fractions
     */
    public calcSendingFlow(index: number, timePeriod: number[], timeInterval: number, fractions: any[]): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval - this.duration;
        const capacity = fractions[index][this.label] * this.getCapacity(timeInterval);
        const interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.upstream[index]) : [0];
        const trafficVolume = this.upstream[index][this.upstream[index].length - 1] -
            this.downstream[index][this.downstream[index].length - 1];

        let sendingFlow = 0;
        // The sending flow should only be calculated in the presence of vehicles on the link.
        if (trafficVolume > 0) {
            sendingFlow = Math.min(
                interpolation[0] > 0 ? interpolation[0] : 0 -
                    this.downstream[index][this.downstream[index].length - 1],
                capacity
            );
            // The sending flow should not exceed the number of vehicles on the link.
            if (sendingFlow > trafficVolume) {
                sendingFlow = trafficVolume;
            }
            // The sending flow should not be less than zero.
            if (sendingFlow < 0) {
                sendingFlow = 0;
            }
        }
        if (sendingFlow > 0 && sendingFlow < 1) {
            this.sendingFlow[index] = 1;
        } else {
            this.sendingFlow[index] = round(sendingFlow);
        }
    }

    /**
     * Calculates the receiving flow of the outgoing link.
     * @param index The path
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     * @param fractions Traffic fractions
     */
    public calcReceivingFlow(index: number, timePeriod: number[], timeInterval: number, fractions: any[]): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval + this.duration;
        const capacity = fractions[index][this.label] * this.getCapacity(timeInterval);
        const interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.downstream[index]) : [0];
        const trafficVolume = this.upstream[index][this.upstream[index].length - 1] -
            this.downstream[index][this.downstream[index].length - 1];

        let receivingFlow = Math.min(
            interpolation[0] > 0 ? interpolation[0] : 0 +
                fractions[index][this.label] * this.getKjam() * this.distance -
                this.upstream[index][this.upstream[index].length - 1],
            capacity
        );
        // The receiving flow should no be exceed the real capacity.
        if (receivingFlow > fractions[index][this.label] * this.getCapacity(this.duration) - trafficVolume) {
            receivingFlow = fractions[index][this.label] * this.getCapacity(this.duration) - trafficVolume;
        }
        if (receivingFlow > 0 && receivingFlow < 1) {
            this.receivingFlow[index] = 1;
        } else {
            this.receivingFlow[index] = round(receivingFlow);
        }
    }

    /**
     * Updates the cumulative vehicles number at the upstream link end.
     * @param index The path
     * @param transitionFlow The transition flow from incoming link
     */
    public updateUpstream(index: number, transitionFlow: number): void {
        this.upstream[index].push(this.upstream[index][this.upstream[index].length - 1] + transitionFlow);
        this.upstreamCount += transitionFlow;
    }

    /**
     * Updates the cumulative vehicles number at the downstream link end.
     * @param index The path
     * @param transitionFlow The transition flow to outgoing link
     */
    public updateDownstream(index: number, transitionFlow: number): void {
        this.downstream[index].push(this.downstream[index][this.downstream[index].length - 1] + transitionFlow);
        this.downstreamCount += transitionFlow;
    }

    /**
     * Updates the traffic volume as the difference between the cumulative flows.
     */
    public updateTrafficVolume(): void {
        this.trafficVolume = this.upstreamCount - this.downstreamCount;
    }

    public updateTrafficCounts(): void {
        // Traffic count is the cumulative flow at the upstream link end.
        this.trafficCount = this.upstreamCount;
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
