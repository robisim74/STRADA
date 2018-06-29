import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, Observer, interval } from 'rxjs';
import { map, catchError, take, concatMap } from 'rxjs/operators';

import * as qs from 'qs';
import * as mbxClient from '@mapbox/mapbox-sdk';
import * as mbxGetDirections from '@mapbox/mapbox-sdk/services/directions';

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

    private edgeId = 0;

    /**
     * Google Maps Directions service.
     */
    private directionsService: google.maps.DirectionsService;

    /**
     * Mapbox client.
     */
    private baseClient: any;

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
                    // First direction (two-way).
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
     * Reiterates the invocation of the Route interface method to obtain all link traffic data.
     */
    public getTrafficData(): Observable<any> {
        // Google Maps.
        this.directionsService = new google.maps.DirectionsService();
        // Mapbox.
        this.baseClient = mbxClient({ accessToken: appConfig.apis.mapbox.accessToken });
        this.getDirectionsService = mbxGetDirections(this.baseClient);

        return Observable.create((observer: Observer<any>) => {
            const edges = this.graph.getEdges();

            // Builds the stream of route requests.
            const stream = interval(1000).pipe(
                take(edges.length),
                map((i: number) => edges[i]),
                concatMap((edge: Edge) => this.route(edge))
            );
            // Executes the stream.
            stream.subscribe(
                () => { /* Status OK */ },
                (streamError: any) => {
                    /*
                     * Stops the execution on error.
                     * Fallback stream.
                     */
                    // Buids the fallback stream.
                    const fallbackStream = interval().pipe(
                        take(edges.length),
                        map((i: number) => edges[i]),
                        concatMap((edge: Edge) => this.getDirections(edge))
                    );
                    // Executes the fallback stream.
                    fallbackStream.subscribe(
                        () => { },
                        (fallbackStreamError: any) => {
                            observer.error('getTrafficData');
                        },
                        () => {
                            // TODO remove
                            console.log(edges);

                            observer.next(null);
                            observer.complete();
                        }
                    );
                },
                () => {
                    // TODO remove
                    console.log(edges);

                    observer.next(null);
                    observer.complete();
                }
            );
        });
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

    /**
     * Makes the request to Google Maps Directions API.
     * @param edge The current egde
     */
    private route(edge: Edge): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            this.directionsService.route(
                this.buildRequest(edge),
                (response: google.maps.DirectionsResult, status: google.maps.DirectionsStatus) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        // For routes that contain no waypoints, the route will consist of a single leg.
                        if (response && response.routes[0] && response.routes[0].legs[0]) {
                            const leg = response.routes[0].legs[0];
                            edge.distance = leg.distance.value;
                            edge.duration = leg.duration.value;
                            edge.durationInTraffic = leg.duration_in_traffic.value;
                            observer.next(null);
                            observer.complete();
                        } else {
                            // Missing data.
                        }
                    } else {
                        observer.error('route');
                    }
                }
            );
        });
    }

    /**
     * Builds a Google Maps DirectionsRequest.
     * @param edge The current egde
     */
    private buildRequest(edge: Edge): google.maps.DirectionsRequest {
        return {
            origin: { lat: edge.origin.lat, lng: edge.origin.lon },
            destination: { lat: edge.destination.lat, lng: edge.destination.lon },
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: this.time || new Date(Date.now()),
                trafficModel: google.maps.TrafficModel.PESSIMISTIC
            },
            unitSystem: google.maps.UnitSystem.METRIC
        };
    }

    /**
     * Makes the request to Mapbox Directions API.
     * @param edge The current egde
     */
    private getDirections(edge: Edge): Observable<any> {
        return Observable.create((observer: Observer<any>) => {
            // Gets distance and duration.
            this.getDirectionsService.getDirections(this.buildConfig(edge, 'driving'))
                .send()
                .then(
                    (response: any) => {
                        if (response && response.body && response.body.routes[0] && response.body.routes[0].legs[0]) {
                            const leg = response.body.routes[0].legs[0];
                            edge.distance = leg.distance;
                            edge.duration = leg.duration;

                            // Gets duration in traffic.
                            this.getDirectionsService.getDirections(this.buildConfig(edge, 'driving-traffic'))
                                .send()
                                .then(
                                    (trafficResponse: any) => {
                                        if (trafficResponse &&
                                            trafficResponse.body &&
                                            trafficResponse.body.routes[0] &&
                                            trafficResponse.body.routes[0].legs[0]) {
                                            const trafficLeg = trafficResponse.body.routes[0].legs[0];
                                            // duration-based, with additional penalties for less desirable maneuvers.
                                            edge.durationInTraffic = trafficLeg.weight;

                                            observer.next(null);
                                            observer.complete();
                                        } else {
                                            // Missing data.
                                        }
                                    },
                                    (error: any) => {
                                        observer.error('getDirections');
                                    }
                                );
                        } else {
                            // Missing data.
                        }
                    },
                    (error: any) => {
                        observer.error('getDirections');
                    }
                );
        });
    }

    /**
     * Builds a Mapbox Config object
     * @param edge The current egde
     * @param profile 'driving' or 'driving-traffic'
     */
    private buildConfig(edge: Edge, profile: string): any {
        return {
            profile: profile,
            waypoints: [{ coordinates: [edge.origin.lon, edge.origin.lat] }, { coordinates: [edge.destination.lon, edge.destination.lat] }]
        };
    }

}
