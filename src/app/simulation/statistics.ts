import { LtmEdge } from "./ltm-graph";
import { round } from "../utils";

/**
 * Extracts statistics from the graph.
 */
export class Statistics {

    public static getHeavyTrafficLabels(edges: LtmEdge[]): string[] {
        return this.getHeavyTrafficEdges(edges).map((edge: LtmEdge) => edge.label);
    }

    public static getModerateTrafficLabels(edges: LtmEdge[]): string[] {
        return this.getModerateTrafficEdges(edges).map((edge: LtmEdge) => edge.label);
    }

    public static getHeavyTrafficData(edges: LtmEdge[], timeInterval: number): number[] {
        return this.getHeavyTrafficEdges(edges).map((edge: LtmEdge) => edge.heavyTrafficCount * timeInterval);
    }

    public static getModerateyTrafficData(edges: LtmEdge[], timeInterval: number): number[] {
        return this.getModerateTrafficEdges(edges).map((edge: LtmEdge) => edge.moderateTrafficCount * timeInterval);
    }

    public static getBusiestEdge(edges: LtmEdge[]): LtmEdge {
        return edges.reduce((prev: LtmEdge, curr: LtmEdge) =>
            prev.heavyTrafficCount + prev.moderateTrafficCount > curr.heavyTrafficCount + curr.moderateTrafficCount ? prev : curr
        );
    }

    public static getBusiestEdgeLabel(edge: LtmEdge): string {
        return edge.label;
    }

    public static getBusiestEdgeData(edge: LtmEdge): number[] {
        return this.getTrafficVolumes(edge);
    }

    public static getBusiestEdgeCapacity(edge: LtmEdge): number {
        return round(edge.maxFlow * edge.duration) > 1 ?
            round(edge.maxFlow * edge.duration) :
            1;
    }

    public static getBusiestEdgeDelay(edge: LtmEdge, timePeriods: number[]): number {
        const trafficVolumes = this.getTrafficVolumes(edge);

        let i = 0;
        let first: number;
        let last: number;
        do {
            if (trafficVolumes[i] > 0 && first == null) {
                first = i;
            }
            if (trafficVolumes[i] > 0) {
                last = i + 1;
            }
            i++;
        } while (i < trafficVolumes.length);

        const travelTime = timePeriods[last] - timePeriods[first];
        const delay = travelTime - edge.duration;
        const targetTime = timePeriods[last] - delay;
        const period = timePeriods.reduce((prev, curr) => Math.abs(curr - targetTime) < Math.abs(prev - targetTime) ? curr : prev);
        return period;

    }

    private static getHeavyTrafficEdges(edges: LtmEdge[]): LtmEdge[] {
        return edges.filter((edge: LtmEdge) => edge.heavyTrafficCount > 0);
    }

    private static getModerateTrafficEdges(edges: LtmEdge[]): LtmEdge[] {
        return edges.filter((edge: LtmEdge) => edge.moderateTrafficCount > 0);
    }

    private static getTrafficVolumes(edge: LtmEdge): number[] {
        return edge.upstream.map((value: number, i: number) => value - edge.downstream[i]);
    }

}
