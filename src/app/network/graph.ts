import { Observable, of, throwError } from 'rxjs';

import * as combine from 'mout/array/combine';

import { Heap, Path } from './k-shortest-path';
import { round } from '../ui/utils';
import { environment } from '../../environments/environment';
import { uiConfig } from '../ui/ui-config';

export enum PathType {
    distance = 'distance',
    duration = 'duration'
}

/**
 * An O/D pair is described by the origin and destination nodes, and the type of path.
 */
export interface OdPair {

    origin: string;
    destination: string;
    pathType: PathType;

}

export interface LinkFlow {

    /**
     * linkFlow attribute.
     */
    value: number;
    /**
     * Variance is the inverse of density.
     */
    variance: number;

}

/**
 * Tag describes the meaning of the particular element to which it is attached.
 */
export interface Tag {

    key: string;
    value: string;

}

/**
 * Relation's member.
 */
export interface Member {

    type: string;
    ref: number;
    role: string;

}

/**
 * Node represents a specific point on the earth's surface defined by its latitude and longitude.
 */
export class Node {

    public nodeId: number;

    public label: string;

    public lat: number;

    public lon: number;

    public tags: Tag[] = [];

    public incomingEdges: Edge[] = [];

    public outgoingEdges: Edge[] = [];

    public drawingOptions: { marker?: google.maps.Marker } = {};

    /**
     * Used by the k shortest path routing.
     */
    public count = 0;

    constructor(nodeId: number) {
        this.nodeId = nodeId;
    }

}

/**
 * Link between two nodes.
 */
export class Edge {

    public edgeId: number;

    public label: string;

    public origin: Node;

    public destination: Node;

    public tags: Tag[] = [];

    /**
     * Indicates the distance in meters.
     */
    public distance: number;

    /**
     * Indicates the duration in seconds.
     */
    public duration: number;

    /**
     * Indicates the total duration of the edge, taking into account current traffic conditions.
     */
    public durationInTraffic: number;

    /**
     * Free flow velocity (m/s).
     */
    public velocity: number;

    public density: number;

    public flow: number;

    public linkFlow: number;

    /**
     * Maximum flow of the link.
     */
    public maxFlow: number;

    public drawingOptions: {
        path?: google.maps.LatLng[],
        polyline?: google.maps.Polyline,
        marker?: google.maps.Marker,
        infowindow?: google.maps.InfoWindow
    } = {};

    constructor(edgeId: number) {
        this.edgeId = edgeId;
    }

    /**
     * Calculates the value of the link flow.
     */
    public calcLinkFlow(): void {
        // Min distance is 1 meter.
        if (this.distance == 0) { this.distance = 1; }
        // Min duration is 1 second.
        if (this.duration == 0) {
            this.duration = round(this.distance / (50 / 3.6)) > 1 ? round(this.distance / (50 / 3.6)) : 1;
        }
        // Calculates free flow velocity (m/s).
        this.velocity = round(this.distance / this.duration, 2);
        if (this.durationInTraffic > 0 && this.durationInTraffic >= this.duration) {
            // Calculates velocity (m/s).
            const velocity = round(this.distance / this.durationInTraffic, 2);
            // Calculates density.
            this.density = round(this.getKjam() * (this.velocity - velocity) / this.velocity, 2);
            // Calculates flow.
            this.flow = round(this.density * velocity, 2);
            // Calculates link flow.
            this.linkFlow = round(this.density * this.distance);
        } else {
            this.density = 0;
            this.flow = 0;
            this.linkFlow = 0;
        }
    }

    /**
     * Calculates the max flow of the edge.
     * @param factor Weather Adjustment Factor
     */
    public calcMaxFlow(factor: number): void {
        const maxFlow = this.getKjam() * this.velocity;
        this.maxFlow = round(maxFlow * factor, 2);
    }

    /**
     * Gets the variance of measurement error of link flow.
     */
    public getVariance(): number {
        return this.density > 0 ? round(1 / this.density, 2) : 1;
    }

    protected getKjam(): number {
        return round(1 / uiConfig.sp, 2);
    }

    protected getCapacity(timeInterval: number): number {
        return this.maxFlow * timeInterval;
    }

    protected draw(color: string, zIndex = 10): void {
        this.drawingOptions.polyline.set('strokeColor', color);
        this.drawingOptions.polyline.set('zIndex', zIndex);
        this.drawingOptions.marker.set('visible', true);
    }

}

/**
 * Relation is a multi-purpose data structure that documents a relationship between two or more data elements.
 */
export class Relation {

    public relationId: number;

    public members: Member[];

    public tags: Tag[] = [];

    constructor(relationId: number) {
        this.relationId = relationId;
    }

}

/**
 * Graph of the transport network.
 */
export class Graph {

    protected nodes: Node[] = [];

    protected edges: Edge[] = [];

    protected relations: Relation[] = [];

    /**
     * Paths for each O/D pair [pairs,paths,edges].
     */
    protected shortestPaths: Edge[][][] = [];

    protected incidenceMatrix: boolean[][][] = [];

    protected assignmentMatrix: number[][][] = [];

    private heap: Heap;

    /**
     * Shortest paths drawing options.
     */
    private drawingOptions: {
        polylines?: google.maps.Polyline[][];
    } = {};

    public getNodes(): Node[] {
        return this.nodes;
    }

    public getEdges(): Edge[] {
        return this.edges;
    }

    public getRelations(): Relation[] {
        return this.relations;
    }

    public getNode(nodeId: number): Node | undefined {
        return this.nodes.find((node: Node) => node.nodeId == nodeId);
    }

    public addOrUpdateNode(node: Node): void {
        const existingNode = this.getNode(node.nodeId);
        if (existingNode) {
            existingNode.incomingEdges = combine(existingNode.incomingEdges, node.incomingEdges);
            existingNode.outgoingEdges = combine(existingNode.outgoingEdges, node.outgoingEdges);
        } else {
            this.nodes.push(node);
        }
    }

    public getEdge(edgeId: number): Edge {
        return this.edges.find((edge: Edge) => edge.edgeId == edgeId);
    }

    public addEdge(edge: Edge): void {
        this.edges.push(edge);
    }

    /**
     * https://wiki.openstreetmap.org/wiki/Key:oneway
     * @param edgeId Id of the edge
     */
    public isOneway(edgeId: number): boolean {
        return !!this.getEdge(edgeId).tags.find(tag => tag.key == 'oneway' && tag.value != 'no') ||
            this.isRoundabout(edgeId);
    }

    /**
     * https://wiki.openstreetmap.org/wiki/Tag:junction%3Droundabout
     * @param edgeId Id of the edge
     */
    public isRoundabout(edgeId: number): boolean {
        return this.getEdge(edgeId).tags.find(tag => tag.key == 'junction' && tag.value == 'roundabout') ||
            this.getEdge(edgeId).tags.find(tag => tag.key == 'junction' && tag.value == 'circular') ?
            true : false;
    }

    public getOdNode(label: string): Node {
        return this.nodes.find((node: Node) => node.label == label);
    }

    public getOdNodes(): Node[] {
        return this.nodes.filter((node: Node) => node.label);
    }

    /**
     * Calculates the set of minimum paths.
     * @param odPairs The O/D pairs
     */
    public calcShortestPaths(odPairs: OdPair[]): Observable<any> {
        try {
            for (let i = 0; i < odPairs.length; i++) {
                const origin = this.getOdNode(odPairs[i].origin);
                const destination = this.getOdNode(odPairs[i].destination);
                const shortestPaths = this.ksp(origin, destination, odPairs[i].pathType, uiConfig.k);
                // Filters the paths.
                this.filterPaths(shortestPaths);
                // Extracts the paths.
                this.shortestPaths[i] = [];
                for (const path of shortestPaths) {
                    this.shortestPaths[i].push(path.edges);
                }
            }
            // Draws the paths.
            if (!environment.testing) {
                this.drawPaths();
            }
            // Sets the edges of the paths.
            this.setPathsEdges();

            if (this.getPathsEdges().length == 0) {
                return throwError('calcShortestPaths');
            }
        } catch (error) {
            return throwError('calcShortestPaths');
        }
        return of(null);
    }

    public getShortestPaths(): Edge[][][] {
        return this.shortestPaths;
    }

    public getPathsEdges(): Edge[] {
        return this.edges.filter((edge: Edge) => edge.label);
    }

    /**
     * Calculates the incidence matrix of paths for O/D pairs.
     */
    public calcIncidenceMatrix(): Observable<any> {
        const edges = this.getPathsEdges();
        for (let z = 0; z < this.shortestPaths.length; z++) {
            this.incidenceMatrix[z] = [];
            for (let n = 0; n < this.shortestPaths[z].length; n++) {
                this.incidenceMatrix[z][n] = [];
                for (let m = 0; m < edges.length; m++) {
                    if (this.shortestPaths[z][n].find(value => value.edgeId == edges[m].edgeId)) {
                        // The path crosses the edge.
                        this.incidenceMatrix[z][n][m] = true;
                    } else {
                        // The path does not cross the edge.
                        this.incidenceMatrix[z][n][m] = false;
                    }
                }
            }
        }
        return of(null);
    }

    public getIncidenceMatrix(): boolean[][][] {
        return this.incidenceMatrix;
    }

    /**
     * Calculates the assignment matrix.
     * @param odPairs The O/D pairs
     */
    public calcAssignmentMatrix(odPairs: OdPair[]): Observable<any> {
        // Calculates the probabilities of shortest paths.
        const shortestPathsProbabilities = this.calcShortestPathsProbabilities(odPairs);

        // Assignment matrix.
        for (let z = 0; z < this.incidenceMatrix.length; z++) {
            this.assignmentMatrix[z] = [];
            for (let n = 0; n < this.incidenceMatrix[z].length; n++) {
                this.assignmentMatrix[z][n] = [];
                for (let m = 0; m < this.incidenceMatrix[z][n].length; m++) {
                    if (this.incidenceMatrix[z][n][m]) {
                        this.assignmentMatrix[z][n][m] = shortestPathsProbabilities[z][n];
                    } else {
                        this.assignmentMatrix[z][n][m] = 0;
                    }
                }
            }
        }
        return of(null);
    }

    public getAssignmentMatrix(): number[][][] {
        return this.assignmentMatrix;
    }

    /**
     * Gets shortest paths polylines.
     */
    public getPolylines(): google.maps.Polyline[][] {
        return this.drawingOptions ? this.drawingOptions.polylines : [];
    }

    /**
     * Calculates the max flow for each edge.
     * @param factor Weather Adjustment Factor
     */
    public calcMaxflows(factor: number): Observable<any> {
        for (const edge of this.edges) {
            edge.calcMaxFlow(factor);
        }
        return of(null);
    }

    /**
     * Calculates the set of minimum paths between a source and destination node based on the link distance or duration attribute.
     * k Shortest Paths algorithm in the Eppstein version.
     * @param o Source node
     * @param d Destination node
     * @param pathType Distance or duration
     * @param k The number of shortest paths to compute
     * @returns The set of shortest paths
     */
    private ksp(o: Node, d: Node, pathType: String, k: number): Path[] {
        // Sets to zero the count property of the nodes.
        this.resetCount();
        // Instantiates the heap.
        this.heap = new Heap();
        // Inserts the path of origin into heap with cost 0.
        this.heap.push({ pathId: 0, node: o, edges: [], cost: 0 });
        // Walks the graph.
        return this.walk(o, d, pathType, k);
    }

    /**
     * Breadth First Search (BFS) algorithm for traversing and searching tree data
     * explores the neighbor nodes first, before moving to the next level neighbors.
     */
    private walk(o: Node, d: Node, pathType, k): Path[] {
        // Set of shortest paths from origin to destination.
        const shortestPaths: Path[] = [];

        let pathId = 1;
        let node: Node;
        while (this.heap.getPaths().length > 0 && d.count < k) {
            // Lets nodePath be the shortest cost path in heap by cost.
            const nodePath = this.heap.getShortestPath();
            node = nodePath.node;
            // Removes the path from the heap.
            this.heap.pop(nodePath.pathId);
            node.count++;

            // The path has been found.
            if (node.nodeId == d.nodeId) {
                shortestPaths.push(nodePath);
            }

            if (node.count <= k) {
                for (const edge of node.outgoingEdges) {
                    // Checks that the node has not already been crossed.
                    if (this.isValidNode(edge.destination, nodePath)) {
                        const path: Path = {
                            pathId: pathId++,
                            node: edge.destination,
                            edges: nodePath.edges.concat([edge]),
                            cost: nodePath.cost + edge[pathType]
                        };
                        this.heap.push(path);
                    }
                }
            }
        }
        return shortestPaths;
    }

    private isValidNode(node: Node, path: Path): boolean {
        return path.edges.find((edge: Edge) => edge.origin.nodeId == node.nodeId) ? false : true;
    }

    private resetCount(): void {
        for (const node of this.nodes) {
            node.count = 0;
        }
    }

    private filterPaths(shortestPaths: Path[]): void {
        if (shortestPaths.length > 1) {
            let i = 0;
            do {
                const pathA = shortestPaths[i].edges;
                const pathB = shortestPaths[i + 1].edges;
                const sharedEdges: Edge[] = pathA.filter((edgeOfA: Edge) =>
                    pathB.find((edgeOfB: Edge) =>
                        edgeOfB.edgeId == edgeOfA.edgeId));
                if (pathA.length - sharedEdges.length <= 1 && pathB.length - sharedEdges.length <= 2) {
                    shortestPaths.splice(i + 1, 1);
                    i = 0;
                } else {
                    i++;
                }
            } while (i < shortestPaths.length - 1);
        }
    }

    /**
     * Draws the polyline for each shortest path.
     */
    private drawPaths(): void {
        const lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2
        };
        const icons = [{
            icon: lineSymbol,
            offset: '100%'
        }];
        this.drawingOptions.polylines = [];
        for (let z = 0; z < this.shortestPaths.length; z++) {
            this.drawingOptions.polylines[z] = [];

            for (let n = 0; n < this.shortestPaths[z].length; n++) {
                let path: google.maps.LatLng[] = [];
                let distance = 0;
                let duration = 0;
                for (let m = 0; m < this.shortestPaths[z][n].length; m++) {
                    const edge = this.shortestPaths[z][n][m];
                    path = path.concat(edge.drawingOptions.path);
                    distance += edge.distance;
                    duration += edge.duration;
                }
                const polyline = new google.maps.Polyline(
                    {
                        path: path,
                        icons: icons,
                        strokeColor: uiConfig.paths.colors[n],
                        strokeOpacity: 1,
                        strokeWeight: 3,
                        zIndex: 10 - n
                    });
                this.drawingOptions.polylines[z][n] = polyline;
            }
        }
    }

    private setPathsEdges(): void {
        const edges: Edge[] = [];
        let count = 1;
        for (const pair of this.shortestPaths) {
            for (const path of pair) {
                for (const edge of path) {
                    if (!edges.find(value => value.edgeId == edge.edgeId)) {
                        edges.push(edge);
                        edge.label = 'E' + count++;
                        if (!environment.testing) {
                            edge.drawingOptions.infowindow.setContent('Edge: ' + edge.label);
                        }
                    }
                }
            }
        }
    }

    /**
     * Multinomial logit model.
     * @param odPairs The O/D pairs
     */
    private calcShortestPathsProbabilities(odPairs: OdPair[]): number[][] {
        // Gets the the total cost of paths.
        const pathCosts = this.calcPathCosts(odPairs);
        const shortestPathsProbabilities: number[][] = [];
        // Theta parameter.
        const parameter = uiConfig.theta * 100;
        // Calculates numerator.
        const exps: number[][] = [];
        for (let z = 0; z < pathCosts.length; z++) {
            exps[z] = pathCosts[z].map((value: number) => {
                return value > 0 ? Math.exp(-value / parameter) : 0;
            });
        }
        // Calculates denominator.
        const sumExps: number[] = [];
        for (let z = 0; z < exps.length; z++) {
            const sum = exps[z].reduce((a, b) => a + b, 0);
            sumExps.push(sum);
        }
        // Probabilities.
        for (let z = 0; z < exps.length; z++) {
            shortestPathsProbabilities[z] = [];
            for (let n = 0; n < exps[z].length; n++) {
                const p = sumExps[z] > 0 ? round(exps[z][n] / sumExps[z], 3) : 0;
                shortestPathsProbabilities[z].push(p);
            }
        }
        return shortestPathsProbabilities;
    }

    private calcPathCosts(odPairs: OdPair[]): number[][] {
        const pathCosts: number[][] = [];
        for (let z = 0; z < this.shortestPaths.length; z++) {
            pathCosts[z] = [];
            for (let n = 0; n < this.shortestPaths[z].length; n++) {
                let pathCost = 0;
                for (let m = 0; m < this.shortestPaths[z][n].length; m++) {
                    pathCost += this.shortestPaths[z][n][m][odPairs[z].pathType];
                }
                pathCosts[z].push(pathCost);
            }
        }
        return pathCosts;
    }

}
