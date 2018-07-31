import { polynomial } from 'everpolate';

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
         * Number of vehicles that would like to enter the network.
         */
        sendingFlow: number;
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
    public transitionFlows: number[][];

    public reset(): void {
        this.origin = null;
        this.destination = null;
    }

    public calcTransitionFlows(shortestPaths: LtmEdge[][][]): void {
        this.transitionFlows = [];
        for (const incomingEdge of this.incomingEdges) {
            this.transitionFlows[incomingEdge.label] = [];
            // Destination node.
            if (this.destination) {
                this.transitionFlows[incomingEdge.label][this.label] = this.calcOutgoingFlow(incomingEdge);
            }
            // Link to link.
            for (const outgoingEdge of this.outgoingEdges) {
                if (this.areOnPath(incomingEdge, outgoingEdge, shortestPaths)) {
                    this.transitionFlows[incomingEdge.label][outgoingEdge.label] = this.calcTransitionFlow(incomingEdge, outgoingEdge);
                }
            }
        }
        // Origin node.
        for (const outgoingEdge of this.outgoingEdges) {
            if (this.origin) {
                this.transitionFlows[this.label] = [];
                this.transitionFlows[this.label][outgoingEdge.label] = this.calcIncomingFlow(outgoingEdge);
            }
        }
    }

    private calcTransitionFlow(incomingEdge: LtmEdge, outgoingEdge: LtmEdge): number {
        let sum = 0;
        for (let i = 0; i < this.incomingEdges.length; i++) {
            sum += outgoingEdge.p * this.incomingEdges[i].sendingFlow;
        }
        return outgoingEdge.p *
            Math.min(
                sum > 0 ?
                    outgoingEdge.receivingFlow * incomingEdge.sendingFlow / sum :
                    0,
                incomingEdge.sendingFlow
            );
    }

    /**
     * At the destination node.
     * @param incomingEdge The incoming link
     */
    private calcOutgoingFlow(incomingEdge: LtmEdge): number {
        return incomingEdge.sendingFlow;
    }

    /**
     * At the origin node.
     * @param outgoingEdge The outgoing link
     */
    private calcIncomingFlow(outgoingEdge: LtmEdge): number {
        return Math.min(
            this.origin.sendingFlow - outgoingEdge.upstream[outgoingEdge.upstream.length - 1],
            outgoingEdge.receivingFlow
        );
    }

    private areOnPath(incomingEdge: LtmEdge, outgoingEdge: LtmEdge, shortestPaths: LtmEdge[][][]): boolean {
        for (let z = 0; z < shortestPaths.length; z++) {
            for (let n = 0; n < shortestPaths[z].length; n++) {
                for (let m = 0; m < shortestPaths[z][n].length - 1; m++) {
                    if (shortestPaths[z][n][m].edgeId == incomingEdge.edgeId &&
                        shortestPaths[z][n][m + 1].edgeId == outgoingEdge.edgeId
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

}

/**
 * Simulation (LTM) edge.
 */
export class LtmEdge extends Edge {

    public origin: LtmNode;

    public destination: LtmNode;

    /**
     * Traffic fraction.
     */
    public p: number;

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
    public totalCount = 0;

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
        this.totalCount = 0;
        this.moderateTrafficCount = 0;
        this.heavyTrafficCount = 0;
    }

    public calcSendingFlow(timePeriod: number[], timeInterval: number): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval - this.duration;
        const capacity = this.getCapacity(timeInterval);
        this.sendingFlow = Math.min(
            timePeriod.length > 1 ? polynomial([time], timePeriod, this.upstream) : 0 -
                this.downstream[this.downstream.length - 1],
            capacity
        );
    }

    public calcReceivingFlow(timePeriod: number[], timeInterval: number): void {
        const time = timePeriod[timePeriod.length - 1] + timeInterval + this.duration;
        const capacity = this.getCapacity(timeInterval);
        this.receivingFlow = Math.min(
            timePeriod.length > 1 ? polynomial([time], timePeriod, this.downstream) : 0 +
                this.getKjam() * this.distance -
                this.upstream[this.upstream.length - 1],
            capacity
        );
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

    public updateStatistics(): void {
        this.trafficVolume = round(this.upstream[this.upstream.length - 1] - this.downstream[this.downstream.length - 1]);
        this.totalCount = round(this.upstream[this.upstream.length - 1]);
        // Heavy traffic.
        if (this.trafficVolume > round(this.getCapacity(this.duration) * uiConfig.heavyTraffic)) {
            this.heavyTrafficCount++;
            this.draw(uiConfig.links.heavyTrafficColor);
            // Moderate traffic.
        } else if (this.trafficVolume > round(this.getCapacity(this.duration) * uiConfig.moderateTraffic)) {
            this.moderateTrafficCount++;
            this.draw(uiConfig.links.moderateTrafficColor);
            // No traffic.
        } else {
            this.draw(uiConfig.links.noTrafficColor);
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
            const destination = this.getNode(edges[i].origin.nodeId) || new LtmNode(edges[i].destination.nodeId);
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
