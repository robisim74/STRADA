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
         * Traffic demand.
         */
        expectedFlow: number;
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
         * Number of expected vehicles.
         */
        expectedFlow: number;
    };

    /**
     * The amount of vehicles that are transferred from incoming links to outgoing links.
     */
    public transitionFlows: any = {};

    public reset(): void {
        this.origin = null;
        this.destination = null;
        this.transitionFlows = {};
    }

    /**
     * Calculates the transition flows of the node.
     * @param fractions Traffic fractions
     */
    public calcTransitionFlows(fractions: any): void {
        this.transitionFlows = {};
        for (const incomingEdge of this.incomingEdges) {
            this.transitionFlows[incomingEdge.label] = {};
            // To destination.
            if (this.destination) {
                if (this.toDestinationFraction(incomingEdge, fractions) > 0) {
                    this.transitionFlows[incomingEdge.label][this.label] = this.calcOutgoingFlow(incomingEdge, fractions);
                }
            }
            // Link to link.
            for (const outgoingEdge of this.outgoingEdges) {
                if (this.linkToLinkFraction(incomingEdge, outgoingEdge, fractions) > 0) {
                    this.transitionFlows[incomingEdge.label][outgoingEdge.label] =
                        this.calcTransitionFlow(incomingEdge, outgoingEdge, fractions);
                }
            }
        }
        // From origin.
        for (const outgoingEdge of this.outgoingEdges) {
            if (this.origin) {
                if (this.fromOriginFraction(outgoingEdge, fractions) > 0) {
                    this.transitionFlows[this.label] = {};
                    this.transitionFlows[this.label][outgoingEdge.label] = this.calcIncomingFlow(outgoingEdge, fractions);
                }
            }
        }
    }

    private calcTransitionFlow(incomingEdge: LtmEdge, outgoingEdge: LtmEdge, fractions: any): number {
        let sum = 0;
        for (let i = 0; i < this.incomingEdges.length; i++) {
            for (let j = 0; j < this.outgoingEdges.length; j++) {
                const pij = this.linkToLinkFraction(this.incomingEdges[i], this.outgoingEdges[j], fractions);
                sum += pij * this.incomingEdges[i].sendingFlow;
            }
        }
        const sums: number[] = [];
        if (sum > 0) {
            for (let n = 0; n < this.outgoingEdges.length; n++) {
                if (this.linkToLinkFraction(incomingEdge, this.outgoingEdges[n], fractions) > 0) {
                    sums.push(this.outgoingEdges[n].receivingFlow * incomingEdge.sendingFlow / sum);
                }
            }
        }
        let min = 0;
        if (sums.length > 0) {
            min = Math.min(...sums);
        }

        const p = this.linkToLinkFraction(incomingEdge, outgoingEdge, fractions);
        return p *
            Math.min(
                min,
                incomingEdge.sendingFlow
            );
    }

    /**
     * At the destination node.
     */
    private calcOutgoingFlow(incomingEdge: LtmEdge, fractions: any): number {
        const p = this.toDestinationFraction(incomingEdge, fractions);
        return p * incomingEdge.sendingFlow;
    }

    /**
     * At the origin node.
     */
    private calcIncomingFlow(outgoingEdge: LtmEdge, fractions: any): number {
        const p = this.fromOriginFraction(outgoingEdge, fractions);
        return p *
            Math.min(
                this.origin.expectedFlow - outgoingEdge.upstream[outgoingEdge.upstream.length - 1],
                outgoingEdge.receivingFlow
            );
    }

    private toDestinationFraction(incomingEdge: LtmEdge, fractions: any): number {
        if (fractions[incomingEdge.label]) {
            return fractions[incomingEdge.label][this.label] || 0;
        }
        return 0;
    }

    private fromOriginFraction(outgoingEdge: LtmEdge, fractions: any): number {
        if (fractions[this.label]) {
            return fractions[this.label][outgoingEdge.label] || 0;
        }
        return 0;
    }

    private linkToLinkFraction(incomingEdge: LtmEdge, outgoingEdge: LtmEdge, fractions: any): number {
        if (fractions[incomingEdge.label]) {
            return fractions[incomingEdge.label][outgoingEdge.label] || 0;
        }
        return 0;
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
    public sendingFlow: number;

    /**
     * Max amount of vehicles that could enter the upstream end during time interval.
     */
    public receivingFlow: number;

    /**
     * The cumulative vehicles number at the upstream link end.
     */
    public upstream: number[] = [];

    /**
     * The cumulative vehicles number at the downstream link end.
     */
    public downstream: number[] = [];

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
        this.upstream = [];
        this.downstream = [];
        this.trafficVolume = 0;
        this.trafficCount = 0;
        this.moderateTrafficCount = 0;
        this.heavyTrafficCount = 0;
        this.draw(uiConfig.links.baseColor);
    }

    /**
     * Calculates the sending flow of the incoming link.
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     */
    public calcSendingFlow(timePeriod: number[], timeInterval: number): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval - this.duration;
        const capacity = this.getCapacity(timeInterval);
        const interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.upstream) : [0];
        let sendingFlow = 0;
        // The sending flow should only be calculated in the presence of vehicles on the link.
        if (this.trafficVolume > 0) {
            sendingFlow = Math.min(
                interpolation[0] > 0 ? interpolation[0] : 0 -
                    this.downstream[this.downstream.length - 1],
                capacity
            );
            // The sending flow should not exceed the number of vehicles on the link.
            if (sendingFlow > this.trafficVolume) {
                sendingFlow = this.trafficVolume;
            }
            // The sending flow should not be less than zero.
            if (sendingFlow < 0) {
                sendingFlow = 0;
            }
        }
        this.sendingFlow = sendingFlow;
    }

    /**
     * Calculates the receiving flow of the outgoing link.
     * @param timePeriod The cumulated time period
     * @param timeInterval The time interval
     */
    public calcReceivingFlow(timePeriod: number[], timeInterval: number): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval + this.duration;
        const capacity = this.getCapacity(timeInterval);
        const interpolation = timePeriod.length > 1 ? linear([time], timePeriod, this.downstream) : [0];
        let receivingFlow = Math.min(
            interpolation[0] > 0 ? interpolation[0] : 0 +
                this.getKjam() * this.distance -
                this.upstream[this.upstream.length - 1],
            capacity
        );
        // The receiving flow should no be exceed the real capacity.
        if (receivingFlow > this.getCapacity(this.duration) - this.trafficVolume) {
            receivingFlow = this.getCapacity(this.duration) - this.trafficVolume;
        }
        this.receivingFlow = receivingFlow;
    }

    /**
     * Updates the cumulative vehicles number at the upstream link end.
     * @param transitionFlow The sum of transition flows from incoming links.
     */
    public updateUpstream(transitionFlow: number): void {
        this.upstream.push(this.upstream[this.upstream.length - 1] + transitionFlow);
    }

    /**
     * Updates the cumulative vehicles number at the downstream link end.
     * @param transitionFlow The sum of transition flows to outgoing links.
     */
    public updateDownstream(transitionFlow: number): void {
        this.downstream.push(this.downstream[this.downstream.length - 1] + transitionFlow);
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

}

/**
 * Simulation (LTM) graph.
 */
export class LtmGraph extends Graph {

    protected nodes: LtmNode[] = [];

    protected edges: LtmEdge[] = [];

    protected shortestPaths: LtmEdge[][][] = [];

    /**
     * The object with the traffic fraction for each:
     * - origin to link
     * - link to link
     * - link to destination
     */
    private fractions: any = {};

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

    public getFractions(): any {
        return this.fractions;
    }

    public setFractions(fractions: any): void {
        this.fractions = fractions;
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