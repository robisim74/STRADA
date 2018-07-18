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
        let ways: any[] = this.extractWays(elements);
        ways = this.reverseNoForward(ways);
        // Merges continuous ways.
        ways = this.mergeWays(ways, elements);
        // Gets the list of nodes.
        const nodes: any[] = this.extractNodes(elements);

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
                    const junction = way['tags']['junction'];
                    const oneway = way['tags']['oneway'];
                    // First direction.
                    this.splitWay(filteredWayNodes, nodes, way);
                    // Second direction (two-way).
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
        try {
            for (let i = 0; i < data.length; i++) {
                const value: any = data[i];
                edges[i].distance = value.distance;
                edges[i].duration = value.duration;

                // Decodes polyline paths.
                if (value.polylines && value.polylines.length > 0) {
                    const path = this.decodePolyline(value.polylines);
                    // Updates drawing options.
                    this.drawEdge(edges[i], path);
                }
            }
        } catch (error) {
            return throwError('updateGraph');
        }
        return of(null);
    }

    /**
     * Remove from the graph invalidated edges and dead nodes.
     */
    public cleanGraph(): Observable<any> {
        try {
            this.graph.removeInvalidatedEdges();
            this.graph.removeDeadNodes();
        } catch (error) {
            return throwError('cleanGraph');
        }
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

    private extractWays(elements: any[]): any[] {
        return elements.filter((element: any) => element['type'] == 'way');
    }

    private extractNodes(elements: any[]): any[] {
        return elements.filter((element: any) => element['type'] == 'node');
    }

    private extractTotalWaysNodes(ways: any[], elements: any[]): number[] {
        let totalWaysNodes: number[] = [];
        for (const way of ways) {
            totalWaysNodes = totalWaysNodes.concat(way['nodes']);
        }
        return totalWaysNodes;
    }

    /**
     * oneway = -1 to vehicle:forward=no
     * @param ways OSM ways
     */
    private reverseNoForward(ways: any[]): any[] {
        for (const way of ways) {
            let oneway = way['tags']['oneway'];
            if (oneway == '-1') {
                way['nodes'].reverse();
                oneway = 'yes';
            }
        }
        return ways;
    }

    /**
     * Merges continuous ways.
     * @param ways Array of OpenStreetMap ways
     * @param elements Array of OpenStreetMap elements
     */
    private mergeWays(ways: any[], elements: any[]): any[] {
        const totalWaysNodes = this.extractTotalWaysNodes(ways, elements);
        if (ways.length > 1) {
            let i = 0;
            do {
                const wayName: string = ways[i]['tags']['name'];
                const wayOneway: string = ways[i]['tags']['oneway'];
                const wayNodes: number[] = ways[i]['nodes'];
                let n = i + 1;
                do {
                    const nextWayName: string = ways[n]['tags']['name'];
                    const nextWayOneway: string = ways[n]['tags']['oneway'];
                    const nextWayNodes: number[] = ways[n]['nodes'];
                    // Checks that they have the same name and direction.
                    if (wayName === nextWayName && wayOneway === nextWayOneway) {
                        if (wayNodes[wayNodes.length - 1] == nextWayNodes[0] &&
                            totalWaysNodes.filter(value => value == nextWayNodes[0]).length == 2) {
                            this.fillWays(ways[i], ways[n]);
                            ways.splice(n, 1);
                            n = i + 1;
                        }
                        if (wayNodes[0] == nextWayNodes[nextWayNodes.length - 1] &&
                            totalWaysNodes.filter(value => value == wayNodes[0]).length == 2) {
                            this.fillWays(ways[n], ways[i]);
                            ways.splice(i, 1);
                            n = ways.length - 1;
                        }
                    }
                    n++;
                } while (n < ways.length);
                i++;
            } while (i < ways.length - 1);
        }
        return ways;
    }

    private fillWays(way: any, nextWay: any): void {
        way = deepFillIn(way, nextWay);
        way['nodes'] = combine(way['nodes'], nextWay['nodes']);
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
            ways[wayIndex].push({ lat: edges[0].origin.lat, lng: edges[0].origin.lon });
            ways[wayIndex].push({ lat: edges[0].destination.lat, lng: edges[0].destination.lon });
            for (let i = 1; i < edges.length; i++) {
                // Checks if same way.
                if (edges[i].origin.nodeId == edges[i - 1].destination.nodeId &&
                    edges[i].destination.nodeId != edges[i - 1].origin.nodeId
                ) {
                    ways[wayIndex].push({ lat: edges[i].destination.lat, lng: edges[i].destination.lon });
                } else {
                    wayIndex++;
                    ways[wayIndex] = [];
                    ways[wayIndex].push({ lat: edges[i].origin.lat, lng: edges[i].origin.lon });
                    ways[wayIndex].push({ lat: edges[i].destination.lat, lng: edges[i].destination.lon });
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
            index === self.findIndex(p => value.equals(p))
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
                const translatedPoly = transformTranslate(poly, 0.004, angle);
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
                    strokeWeight: 3
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
