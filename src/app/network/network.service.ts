import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError, Observer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as qs from 'qs';

import { Graph, Node, Edge, Tag } from './graph';
import { appConfig } from '../app-config';

/**
 * Creates and develops the graph of the transport network in the selected area.
 */
@Injectable() export class NetworkService {

    /**
     * The instance of the network graph.
     */
    private graph: Graph;

    /**
     * Rectangle in geographical coordinates of the area.
     */
    private bounds: google.maps.LatLngBoundsLiteral;

    /**
     * Time of the simulation.
     */
    private time: Date | null;

    constructor(private http: HttpClient) { }

    public reset(): void {
        this.graph = null;
        this.bounds = null;
        this.time = null;
    }

    public getGraph(): Graph {
        return this.graph;
    }

    public setBounds(bounds: google.maps.LatLngBoundsLiteral): void {
        this.bounds = bounds;
    }

    public getTime(): Date | null {
        return this.time;
    }

    public setTime(time: Date): void {
        this.time = time;
    }

    /**
     * Calls the Interpreter resource by providing the query in the Overpass language.
     */
    public getNetwork(): Observable<any> {
        const url: string = appConfig.api.overpassApi.url;
        const headers: HttpHeaders = new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded');
        const query: string = this.buildQuery();
        const body: string = this.buildBody(query);

        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError(error))
        );
    }

    /**
     * With the data obtained from the Interpreter resource instantiate the Graph class
     * and the associated classes Node and Edge that model the network graph.
     * @param data Overpass API response
     */
    public createGraph(data: any): Observable<any> {
        this.graph = new Graph();

        // Gets the list of elements.
        const elements: any[] = data.elements;
        // Create a degree list of nodes:
        // a Map object that holds nodeId-degree as key-value pairs.
        const nodesDegrees: Map<number, number> = new Map();
        // Gets the list of ways.
        const ways: any[] = elements.filter((element: any) => element['type'] == 'way');
        // Gets the list of nodes.
        const nodes: any[] = elements.filter((element: any) => element['type'] == 'node');

        // Creation of the graph algorithm.
        return Observable.create((observer: Observer<any>) => {
            try {
                for (const way of ways) {
                    // Gets the list of nodes.
                    const wayNodes: number[] = way['nodes'];
                    for (const node of wayNodes) {
                        const degree = nodesDegrees.get(node);
                        nodesDegrees.set(node, degree ? degree + 1 : 1);
                    }
                }
                let edgeId = 1;
                for (const way of ways) {
                    // Gets the list of nodes.
                    const wayNodes: number[] = way['nodes'];
                    // Removes the nodes that have degree equal to one.
                    const filteredWayNodes = wayNodes.filter((node: number, i: number, arr: number[]) => {
                        return i == 0 || // first node
                            i == arr.length - 1 || // last node
                            nodesDegrees.get(node) > 1; // degree greater than one
                    });
                    for (let i = 0; i < filteredWayNodes.length - 1; i++) {
                        // Gets or creates first and second node.
                        const firstNode = this.graph.getNode(filteredWayNodes[i]) || new Node(filteredWayNodes[i]);
                        const secondNode = this.graph.getNode(filteredWayNodes[i]) || new Node(filteredWayNodes[i + 1]);
                        // Creates the first edge.
                        const firstEdge: Edge = new Edge(edgeId++);
                        firstEdge.origin = firstNode;
                        firstEdge.destination = secondNode;
                        firstEdge.tags = this.extractTags(way['tags']);
                        // Second edge (two-way);
                        let secondEdge: Edge;
                        if (!way['tags']['oneway']) {
                            secondEdge = new Edge(edgeId++);
                            secondEdge.origin = secondNode;
                            secondEdge.destination = firstNode;
                            secondEdge.tags = this.extractTags(way['tags']);
                        }
                        // Updates nodes.
                        const refFirstNode: any = nodes.find((value: any) => value['id'] == filteredWayNodes[i]);
                        const refSecondNode: any = nodes.find((value: any) => value['id'] == filteredWayNodes[i + 1]);
                        if (refFirstNode) {
                            firstNode.lat = refFirstNode['lat'];
                            firstNode.lon = refFirstNode['lon'];
                            firstNode.tags = this.extractTags(refFirstNode['tags']);
                            firstNode.outgoingEdges.push(firstEdge);
                            if (secondEdge) { firstNode.incomingEdges.push(secondEdge); }
                        }
                        if (refSecondNode) {
                            secondNode.lat = refSecondNode['lat'];
                            secondNode.lon = refSecondNode['lon'];
                            secondNode.tags = this.extractTags(refSecondNode['tags']);
                            secondNode.incomingEdges.push(firstEdge);
                            if (secondEdge) { secondNode.outgoingEdges.push(secondEdge); }
                        }
                        // Updates graph.
                        this.graph.addOrUpdateNode(firstNode);
                        this.graph.addOrUpdateNode(secondNode);
                        this.graph.addEdge(firstEdge);
                        if (secondEdge) { this.graph.addEdge(secondEdge); }
                    }
                }
            } catch (error) {
                observer.error('createGraph');
            } finally {
                observer.next(null);
                observer.complete();
            }
        });
    }

    /**
     * Reiterates the invocation of the Route interface method to obtain all link traffic data.
     */
    public getTrafficData(): Observable<any> {

        return of(null);
    }

    /**
     * Returns the values of the linkFlow attribute of the links.
     */
    public getLinkFlows(): number[] {
        return null;
    }

    /**
     * Gets the routes assignment matrix.
     */
    public getAssignmentMatrix(): number[][] {
        return null;
    }

    /**
     * Builds the query in Overpass QL.
     */
    private buildQuery(): string {
        // Result in JSON.
        let query = '[out:json]';
        // Request timeout.
        query += '[timeout:' + appConfig.api.overpassApi.timeout + ']';
        // Bounding box.
        query += '[bbox:' +
            this.bounds.south + ',' +
            this.bounds.west + ',' +
            this.bounds.north + ',' +
            this.bounds.east + ']';
        query += ';';
        // Union.
        query += '(';
        // Roads.
        query += 'way[highway~"^(';
        for (const highway of appConfig.api.overpassApi.highways) {
            query += highway + '|';
        }
        query += ')$"];';
        // Respective nodes.
        query += 'node(w);';
        query += ');';
        // Output.
        query += 'out;';
        return query;
    }

    /**
     * Builds the query string.
     * @param query In Overpass QL
     */
    private buildBody(query: any): string {
        return qs.stringify({ data: query });
    }

    private extractTags(tags: any): Tag[] {
        return tags ? Object.keys(tags).map((key: string) => {
            return { key: key, value: tags[key] as string };
        }) : [];
    }

}
