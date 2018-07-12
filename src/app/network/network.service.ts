import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, Observer, of, from, interval } from 'rxjs';
import { map, catchError, take, concatMap } from 'rxjs/operators';

import * as qs from 'qs';
import * as mbxClient from '@mapbox/mapbox-sdk';
import * as mbxGetDirections from '@mapbox/mapbox-sdk/services/directions';

import { Graph, Node, Edge, Tag } from './graph';
import { appConfig } from '../app-config';
import { environment } from '../../environments/environment';

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

    private edgeId = 0;

    /**
     * Mapbox client.
     */
    private mapBoxClient: any;

    /**
     * Mapbox getDirections service.
     */
    private getDirectionsService: any;

    constructor(private http: HttpClient) { }

    public reset(): void {
        this.graph = null;
        this.bounds = null;
        this.time = null;
        this.edgeId = 0;
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
        const url: string = appConfig.apis.overpassApi.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
        const query: string = this.buildQuery();
        const body: string = this.buildBody(query);

        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getNetwork'))
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
                // First step.
                for (const way of ways) {
                    // Gets the list of nodes.
                    const wayNodes: number[] = way['nodes'];
                    for (const node of wayNodes) {
                        const degree = nodesDegrees.get(node);
                        nodesDegrees.set(node, degree ? degree + 1 : 1);
                    }
                }
                // Second step.
                for (const way of ways) {
                    // Gets the list of nodes.
                    const wayNodes: number[] = way['nodes'];
                    // Removes the nodes that have degree equal to one.
                    const filteredWayNodes = wayNodes.filter((node: number, i: number, arr: number[]) => {
                        return i == 0 || // first node
                            i == arr.length - 1 || // last node
                            nodesDegrees.get(node) > 1; // degree greater than one
                    });
                    // First direction.
                    this.splitWay(filteredWayNodes, nodes, way);
                    // Second direction (two-way).
                    if (!way['tags']['oneway']) {
                        // Reverse the order of filtered way nodes.
                        this.splitWay(filteredWayNodes.reverse(), nodes, way);
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
     * Call the trafficData cloud function,
     * that reiterates the invocation of the Directions API to obtain all link traffic data.
     */
    public getTrafficData(): Observable<any> {
        const url: string = environment.functions.trafficData.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
        const edges = this.graph.getEdges();
        const data = edges.map((v: Edge, i: number, arr: Edge[]) => {
            return {
                origin: { lat: v.origin.lat, lon: v.origin.lon },
                destination: { lat: v.destination.lat, lon: v.destination.lon },
                distance: null,
                duration: null,
                durationInTraffic: null
            };
        });
        const body = JSON.stringify({
            edges: data,
            time: this.time
        });

        // To trafficData function.
        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getTrafficData'))
        );
    }

    /**
     * Gets network data from Mapbox Directions API.
     */
    public getNetworkData(): Observable<any> {
        // Mapbox.
        this.mapBoxClient = mbxClient({ accessToken: appConfig.apis.mapbox.accessToken });
        this.getDirectionsService = mbxGetDirections(this.mapBoxClient);

        return Observable.create((observer: Observer<any>) => {
            const ways: any[][] = this.getWays();
            const data: any[] = [];

            // Builds the stream of getDirections requests.
            const stream = interval().pipe(
                take(ways.length),
                map((i: number) => ways[i]),
                concatMap((way: any[]) => this.getDirections(way))
            );
            // Executes the stream.
            stream.subscribe(
                (leg: any) => { data.push(leg); },
                (error: any) => {
                    // Stops the execution.
                    observer.error(error);
                },
                () => {
                    observer.next(data);
                    observer.complete();
                }
            );
        });
    }

    /**
     * Updates graph using the data obtained from Mapbox Directions API.
     * @param data Traffic data
     */
    public updateGraph(data: any[]): Observable<any> {
        const edges = this.graph.getEdges();
        return from(data).pipe(
            map((value: any, i: number) => {
                edges[i].distance = value.distance;
                edges[i].duration = value.duration;
            })
        );
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
        query += '[timeout:' + appConfig.apis.overpassApi.timeout + ']';
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
        for (const highway of appConfig.apis.overpassApi.highways) {
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

    private splitWay(filteredWayNodes: number[], nodes: any[], way: any): void {
        for (let i = 0; i < filteredWayNodes.length - 1; i++) {
            // Gets or creates first and second node.
            const firstNode = this.graph.getNode(filteredWayNodes[i]) || new Node(filteredWayNodes[i]);
            const secondNode = this.graph.getNode(filteredWayNodes[i + 1]) || new Node(filteredWayNodes[i + 1]);
            // Creates the edge.
            const edge: Edge = new Edge(this.edgeId++);
            edge.origin = firstNode;
            edge.destination = secondNode;
            edge.tags = this.extractTags(way['tags']);
            // Updates nodes.
            const refFirstNode: any = nodes.find((value: any) => value['id'] == filteredWayNodes[i]);
            const refSecondNode: any = nodes.find((value: any) => value['id'] == filteredWayNodes[i + 1]);
            if (refFirstNode) {
                firstNode.lat = refFirstNode['lat'];
                firstNode.lon = refFirstNode['lon'];
                firstNode.tags = this.extractTags(refFirstNode['tags']);
                firstNode.outgoingEdges.push(edge);
            }
            if (refSecondNode) {
                secondNode.lat = refSecondNode['lat'];
                secondNode.lon = refSecondNode['lon'];
                secondNode.tags = this.extractTags(refSecondNode['tags']);
                secondNode.incomingEdges.push(edge);
            }
            this.graph.addOrUpdateNode(firstNode);
            this.graph.addOrUpdateNode(secondNode);
            // Add edge.
            this.graph.addEdge(edge);
        }
    }

    private extractTags(tags: any): Tag[] {
        return tags ? Object.keys(tags).map((key: string) => {
            return { key: key, value: tags[key] as string };
        }) : [];
    }

    private getWays(): any[][] {
        const edges = this.graph.getEdges();
        const ways: any[][] = [];
        // Gets the ways.
        if (edges.length > 0) {
            let wayIndex = 0;
            ways[wayIndex] = [];
            ways[wayIndex].push({ coordinates: [edges[0].origin.lon, edges[0].origin.lat] });
            ways[wayIndex].push({ coordinates: [edges[0].destination.lon, edges[0].destination.lat] });
            for (let i = 1; i < edges.length; i++) {
                // Checks if same way.
                if (edges[i].origin.lon == edges[i - 1].destination.lon &&
                    edges[i].origin.lat == edges[i - 1].destination.lat &&
                    edges[i].destination.lon != edges[i - 1].origin.lon &&
                    edges[i].destination.lat != edges[i - 1].origin.lat
                ) {
                    ways[wayIndex].push({ coordinates: [edges[i].destination.lon, edges[i].destination.lat] });
                } else {
                    wayIndex++;
                    ways[wayIndex] = [];
                    ways[wayIndex].push({ coordinates: [edges[i].origin.lon, edges[i].origin.lat] });
                    ways[wayIndex].push({ coordinates: [edges[i].destination.lon, edges[i].destination.lat] });
                }
            }
        }
        return ways;
    }

    /**
     * Makes the request to Mapbox Directions API.
     * @param way The current way with waypoints
     */
    private getDirections(way: any[]): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            // Gets distance and duration.
            this.getDirectionsService.getDirections(this.buildConfig(way))
                .send()
                .then(
                    (response: any) => {
                        if (response && response.body && response.body.routes[0] && response.body.routes[0].legs.length > 0) {
                            for (const leg of response.body.routes[0].legs) {
                                observer.next({ distance: leg.distance, duration: leg.duration });
                            }
                            observer.complete();
                        } else {
                            for (let i = 0; i <= way.length - 1; i++) {
                                observer.next({ distance: null, duration: null });
                            }
                            observer.complete();
                        }
                    },
                    (error: any) => {
                        observer.error('getNetworkData');
                    }
                );
        });
    }

    /**
     * Builds a Mapbox Config object
     * @param way The current way with waypoints
     */
    private buildConfig(way: any[]): any {
        return {
            profile: 'driving',
            waypoints: way
        };
    }

}
