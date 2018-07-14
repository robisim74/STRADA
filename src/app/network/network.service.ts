import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, Observer, of, from, interval } from 'rxjs';
import { map, catchError, take, concatMap } from 'rxjs/operators';

import * as qs from 'qs';

import { Graph, Node, Edge, Tag } from './graph';
import { appConfig } from '../app-config';
import { uiConfig } from '../ui/ui-config';
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

    private nodeLabel = 1;

    constructor(private http: HttpClient) { }

    public reset(): void {
        this.graph = null;
        this.bounds = null;
        this.time = null;
        this.edgeId = 0;
        this.nodeLabel = 1;
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

    public getTimeString(): string {
        const time = new Date();
        return this.time ?
            this.time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) :
            time.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
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
        // Checks empty list.
        if (elements.length == 0) { return throwError('createGraph'); }

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
     * Call the networkData cloud function,
     * that reiterates the invocation of the Directions API to obtain all links network data.
     */
    public getNetworkData(): Observable<any> {
        const url: string = environment.functions.networkData.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
        const ways: any[][] = this.getWays();
        const body = JSON.stringify({
            ways: ways
        });

        // To networkData function.
        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getNetworkData'))
        );
    }

    /**
     * Updates graph using the data obtained from Directions API.
     * @param data Network data
     */
    public updateGraph(data: any[]): Observable<any> {
        const edges = this.graph.getEdges();
        return from(data).pipe(
            map((value: any, i: number) => {
                edges[i].distance = value.distance;
                edges[i].duration = value.duration;

                // Decodes polyline paths.
                let path: google.maps.LatLng[] = [];
                for (const polyline of value.polylines) {
                    path = path.concat(google.maps.geometry.encoding.decodePath(polyline.points));
                }
                // Updates drawing options.
                edges[i].drawingOptions.polyline = new google.maps.Polyline(
                    {
                        path: path,
                        geodesic: true,
                        strokeColor: uiConfig.edges.baseColor,
                        strokeOpacity: 1,
                        strokeWeight: 10
                    }
                );
            })
        );
    }

    /**
     * Call the trafficData cloud function,
     * that reiterates the invocation of the Directions API to obtain all links traffic data.
     */
    public getTrafficData(): Observable<any> {
        const url: string = environment.functions.trafficData.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
        const edges = this.graph.getEdges();
        const data = edges.map((v: Edge, i: number, arr: Edge[]) => {
            return {
                origin: { lat: v.origin.lat, lon: v.origin.lon },
                destination: { lat: v.destination.lat, lon: v.destination.lon },
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
            const firstNode = this.graph.getNode(filteredWayNodes[i]) || new Node(filteredWayNodes[i], this.nodeLabel++);
            const secondNode = this.graph.getNode(filteredWayNodes[i + 1]) || new Node(filteredWayNodes[i + 1], this.nodeLabel++);
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
            ways[wayIndex].push(edges[0].origin.lat + ',' + edges[0].origin.lon);
            ways[wayIndex].push(edges[0].destination.lat + ',' + edges[0].destination.lon);
            for (let i = 1; i < edges.length; i++) {
                // Checks if same way.
                if (edges[i].origin.lon == edges[i - 1].destination.lon &&
                    edges[i].origin.lat == edges[i - 1].destination.lat &&
                    edges[i].destination.lon != edges[i - 1].origin.lon &&
                    edges[i].destination.lat != edges[i - 1].origin.lat
                ) {
                    ways[wayIndex].push(edges[i].destination.lat + ',' + edges[i].destination.lon);
                } else {
                    wayIndex++;
                    ways[wayIndex] = [];
                    ways[wayIndex].push(edges[i].origin.lat + ',' + edges[i].origin.lon);
                    ways[wayIndex].push(edges[i].destination.lat + ',' + edges[i].destination.lon);
                }
            }
        }
        return ways;
    }

}
