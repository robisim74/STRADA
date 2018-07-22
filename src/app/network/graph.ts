import { Observable, of, throwError } from 'rxjs';

import * as combine from 'mout/array/combine';
import * as math from 'mathjs';

import { uiConfig } from '../ui/ui-config';
import { Heap, Path } from './k-shortest-path';

export enum PathType {
    distance = 'distance',
    duration = 'duration'
}

/**
 * An O/D pair is described by the origin and destination nodes and the type of path.
 */
export interface OdPair {

    origin: number;
    destination: number;
    pathType: PathType;

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

    public label: number;

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

    public velocity: number;

    public density: number;

    public flow: number;

    public linkFlow: number;

    public drawingOptions: { polyline?: google.maps.Polyline } = {};

    constructor(edgeId: number) {
        this.edgeId = edgeId;
    }

    /**
     * Calculates the value of the arc flow and assigns it to the linkFlow attribute.
     */
    public calcLinkFlow(): void {

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

    private nodes: Node[] = [];

    private edges: Edge[] = [];

    private relations: Relation[] = [];

    /**
     * Arrays of paths for each O/D pair.
     */
    private shortestPaths: Edge[][][] = [];

    private shortestPathsEdges: Edge[] = [];

    private shortestPathsProbabilities: number[][] = [];

    private incidenceMatrix: boolean[][][] = [];

    private assignmentMatrix: number[][][] = [];

    private heap: Heap;

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
            existingNode.lat = node.lat;
            existingNode.lon = node.lon;
            existingNode.tags = combine(existingNode.tags, node.tags);
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

    public getOdNode(label: number): Node {
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
                this.ksp(odPairs[i].origin, odPairs[i].destination, odPairs[i].pathType, uiConfig.k, i);
            }

            // Checks empty paths.
            let count = 0;
            for (const pair of this.shortestPaths) {
                if (pair.length > 0) { count++; }
            }
            if (count == 0) { return throwError('calcShortestPaths'); }
        } catch (error) {
            return throwError('calcShortestPaths');
        }
        return of(null);
    }

    public getShortestPaths(): Edge[][][] {
        return this.shortestPaths;
    }

    /**
     * Calculates the incidence matrix of paths for O/D pairs.
     */
    public calcIncidenceMatrix(): Observable<any> {
        // Gets the array of edges in the paths.
        this.shortestPathsEdges = this.getEdgesfromShortestPaths();

        // Builds the matrix (pairs,paths,edges);
        for (let z = 0; z < this.shortestPaths.length; z++) {
            this.incidenceMatrix[z] = [];
            for (let n = 0; n < this.shortestPaths[z].length; n++) {
                this.incidenceMatrix[z][n] = [];
                for (let m = 0; m < this.shortestPathsEdges.length; m++) {
                    if (this.shortestPaths[z][n].find(value => value.edgeId == this.shortestPathsEdges[m].edgeId)) {
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
        // Gets the array of the total cost of paths.
        const pathCosts = this.calcPathCosts(odPairs);
        // Theta parameter.
        const parameter = uiConfig.theta;
        // Calcs numerator.
        const exps: number[][] = [];
        for (let z = 0; z < pathCosts.length; z++) {
            exps[z] = pathCosts[z].map((value: number) => {
                return value > 0 ? math.exp(-value / parameter) : 0;
            });
        }
        // Calcs denominator.
        const sumExps: number[] = [];
        for (let z = 0; z < exps.length; z++) {
            const sum = exps[z].reduce((a, b) => a + b, 0);
            sumExps.push(sum);
        }
        // Array of probabilities.
        for (let z = 0; z < exps.length; z++) {
            this.shortestPathsProbabilities[z] = [];
            for (let n = 0; n < exps[z].length; n++) {
                const p = sumExps[z] > 0 ? math.round(exps[z][n] / sumExps[z], 3) as number : 0;
                this.shortestPathsProbabilities[z].push(p);
            }
        }
        // Assignment matrix.
        for (let z = 0; z < this.incidenceMatrix.length; z++) {
            this.assignmentMatrix[z] = [];
            for (let n = 0; n < this.incidenceMatrix[z].length; n++) {
                this.assignmentMatrix[z][n] = [];
                for (let m = 0; m < this.incidenceMatrix[z][n].length; m++) {
                    if (this.incidenceMatrix[z][n][m]) {
                        this.assignmentMatrix[z][n][m] = this.shortestPathsProbabilities[z][n];
                    } else {
                        this.assignmentMatrix[z][n][m] = 0;
                    }
                }
            }
        }
        console.log(this.assignmentMatrix);
        return of(null);
    }

    public getAssignmentMatrix(): number[][][] {
        return this.assignmentMatrix;
    }

    /**
     * Calculates the set of minimum paths between a source and destination node based on the link distance or duration attribute.
     * k Shortest Paths algorithm in the Eppstein version.
     * @param origin Source node
     * @param destination Destination node
     * @param pathType Distance or duration
     * @param k The number of shortest paths to compute
     * @param i Index of O/D pair
     */
    private ksp(origin: number, destination: number, pathType: String, k: number, i: number): void {
        const o = this.getOdNode(origin);
        const d = this.getOdNode(destination);
        // Sets to zero the count property of the nodes.
        this.resetCount();
        // Instantiates the heap.
        this.heap = new Heap();
        // Inserts the path of origin into heap with cost 0.
        this.heap.push({ pathId: 0, node: o, edges: [], cost: 0 });
        // Walks the graph.
        const shortestPaths = this.walk(o, d, pathType, k);
        // Extracts the paths.
        this.shortestPaths[i] = [];
        for (let n = 0; n < k; n++) {
            if (shortestPaths[n]) {
                this.shortestPaths[i].push(shortestPaths[n].edges);
            }
        }
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

    /**
     * Returns the edges without repetitions in the paths.
     */
    private getEdgesfromShortestPaths(): Edge[] {
        const edges: Edge[] = [];
        for (const pair of this.shortestPaths) {
            for (const path of pair) {
                for (const edge of path) {
                    if (!edges.find(value => value.edgeId == edge.edgeId)) {
                        edges.push(edge);
                    }
                }
            }
        }
        return edges;
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
