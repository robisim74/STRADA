import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, Observer, of, from, interval } from 'rxjs';
import { map, catchError, take, concatMap } from 'rxjs/operators';

import * as qs from 'qs';
import * as deepFillIn from 'mout/object/deepFillIn';
import * as combine from 'mout/array/combine';
import transformTranslate from '@turf/transform-translate';
import bearing from '@turf/bearing';
import { getCoords } from '@turf/invariant';
import { point, lineString } from '@turf/helpers';

import { Graph, Node, Edge, Tag } from './graph';
import { appConfig } from '../app-config';
import { uiConfig } from '../ui/ui-config';
import { environment } from '../../environments/environment';
import { getRandomColor } from '../utils';

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
        let ways: any[] = elements.filter((element: any) => element['type'] == 'way');
        // Merges continuous ways.
        ways = this.mergeWays(ways);
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
                    // Roundabouts are oneway.
                    const junction = way['tags']['junction'];
                    const oneway = way['tags']['oneway'];
                    if ((!oneway || oneway == 'no') && (junction != 'roundabout' && junction != 'circular')) {
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
        console.log(ways);
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
        for (let i = 0; i < data.length; i++) {
            const value: any = data[i];
            edges[i].distance = value.distance;
            edges[i].duration = value.duration;

            // Decodes polyline paths.
            if (value.polylines.length > 0) {
                const path = this.decodePolyline(value.polylines);
                // Updates drawing options.
                this.drawEdge(edges[i], path);
            }
        }
        return of(null);
    }

    /**
     * Remove from the graph invalidated edges and dead nodes.
     */
    public cleanGraph(): Observable<any> {
        this.graph.removeInvalidatedEdges();
        this.graph.removeDeadNodes();
        return of(null);
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

    /**
     * Merges continuous ways.
     * @param ways Array of OpenStreetMap ways
     */
    private mergeWays(ways: any[]) {
        if (ways.length > 1) {
            let continuos: boolean;
            do {
                continuos = false;
                // Iterates in revers order.
                for (let i = ways.length - 1; i >= 1; i--) {
                    const wayNodes: number[] = ways[i]['nodes'];
                    const previousWayNodes: number[] = ways[i - 1]['nodes'];
                    const wayTag = ways[i]['tags']['oneway'];
                    const previousWayTag = ways[i - 1]['tags']['oneway'];
                    // Checks if the first node of the way is equal to the last of the previous way.
                    if (wayNodes[0] == previousWayNodes[previousWayNodes.length - 1] && wayTag == previousWayTag) {
                        ways[i - 1] = deepFillIn(ways[i - 1], ways[i]);
                        ways[i - 1]['nodes'] = combine(ways[i - 1]['nodes'], ways[i]['nodes']);
                        ways.splice(i, 1);
                        continuos = true;
                    }
                }
            } while (continuos);
        }
        return ways;
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
            ways[wayIndex].push(edges[0].origin.lat + ',' + edges[0].origin.lon);
            ways[wayIndex].push(edges[0].destination.lat + ',' + edges[0].destination.lon);
            for (let i = 1; i < edges.length; i++) {
                // Checks if same way.
                if (edges[i].origin.nodeId == edges[i - 1].destination.nodeId &&
                    edges[i].destination.nodeId != edges[i - 1].origin.nodeId
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

    private decodePolyline(polylines: any[]): google.maps.LatLng[] {
        let path: google.maps.LatLng[] = [];
        for (const polyline of polylines) {
            path = path.concat(google.maps.geometry.encoding.decodePath(polyline.points));
        }
        return this.cleanPath(path);
    }

    /**
     * Removes duplicates from path.
     * @param path Array of google.maps.LatLng
     */
    private cleanPath(path: google.maps.LatLng[]): google.maps.LatLng[] {
        return path.filter((value, index, self) =>
            index === self.findIndex((p) => (value.equals(p)))
        );
    }

    private drawEdge(edge: Edge, path: google.maps.LatLng[]): void {
        if (edge.distance > 0) {
            // Arrows only if greater than 10 meters.
            const lineSymbol = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2
            };
            const icons = edge.distance > 10 ? [{
                icon: lineSymbol,
                offset: '100%'
            }] : null;

            // Two-way streets.
            if (!this.graph.isOneway(edge.edgeId)) {
                // Gets bearing.
                const pos = this.getBearing(path);
                const angle = pos + 90;
                // Converts to GeoJSON LineString.
                const poly = this.toLineString(path);
                // Translates the polyline.
                const translatedPoly = transformTranslate(poly, 0.003, angle);
                // converts to LatLng points.
                path = this.toLatLng(translatedPoly);
            }

            edge.drawingOptions.polyline = new google.maps.Polyline(
                {
                    path: path,
                    icons: icons,
                    strokeColor: uiConfig.edges.baseColor,
                    /* strokeColor: getRandomColor(), */
                    strokeOpacity: 1,
                    strokeWeight: 2
                }
            );
        }
    }

    /**
     * Finds the geographic bearing, the angle measured in degrees from the north line (0 degrees).
     * @param path Array of google.maps.LatLng
     */
    private getBearing(path: google.maps.LatLng[]): number {
        const origin = point([path[0].lng(), path[0].lat()]);
        const destination = point([path[path.length - 1].lng(), path[path.length - 1].lat()]);
        return bearing(origin, destination);
    }

    /**
     * Convert a list of LatLng to a GeoJSON LineString.
     * @param path  Array of google.maps.LatLng
     */
    private toLineString(path: google.maps.LatLng[]): any {
        const points = path.map((value: google.maps.LatLng) => {
            return [value.lng(), value.lat()];
        });
        return lineString(points);
    }

    private toLatLng(poly: any): google.maps.LatLng[] {
        const coords = getCoords(poly);
        return coords.map((value: number[]) => {
            return new google.maps.LatLng(value[1], value[0]);
        });
    }

}
