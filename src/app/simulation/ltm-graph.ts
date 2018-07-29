import { Node, Edge, Graph } from "../network/graph";
import { round } from "../ui/utils";
import { uiConfig } from "../ui/ui-config";

/**
 * Simulation (LTM) node.
 */
export class LtmNode extends Node {

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
         * Traffic fraction.
         */
        p: number;
    };

}

/**
 * Simulation (LTM) edge.
 */
export class LtmEdge extends Edge {

    /**
     * Traffic fraction.
     */
    public p: number;

    /**
     * The vehicles number of the link.
     */
    public trafficVolume = 0;

    /**
     * The cumulative vehicles number at the upstream link end.
     */
    public upstreamCount = 0;

    /**
     * The cumulative vehicles number at the downstream link end.
     */
    public downstreamCount = 0;

    /**
     * Statistics: number of vehicles crossing the link during the simulation.
     */
    public totalCount = 0;

    /**
     * Statistics: count of how many times the link reaches a level of moderate traffic.
     */
    public moderateTrafficCount = 0;

    /**
     * Statistics: count of how many times the link reaches a level of heavy traffic.
     */
    public heavyTrafficCount = 0;

    /**
     * Updates the cumulative vehicles number at the upstream link end.
     * @param transitionFlows The sum of transition flows from incoming links.
     */
    public updateUpstream(transitionFlows: number): void {
        this.upstreamCount += transitionFlows;
    }

    /**
     * Updates the cumulative vehicles number at the downstream link end.
     * @param transitionFlows The sum of transition flows to outgoing links.
     */
    public updateDownstream(transitionFlows: number): void {
        this.downstreamCount += transitionFlows;
    }

    /**
     * Calculates the vehicles number of the link.
     */
    public calTrafficVolume(): void {
        this.trafficVolume = this.upstreamCount - this.downstreamCount;
    }

    public updateStatistics(): void {
        this.totalCount = this.upstreamCount;
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

    protected shortestPathsEdges: LtmEdge[] = [];

    public getShortestPaths(): LtmEdge[][][] {
        return this.shortestPaths;
    }

    public getShortestPathsEgdes(): LtmEdge[] {
        return this.shortestPathsEdges;
    }

}
