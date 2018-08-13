import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as qs from 'qs';
import * as deepFillIn from 'mout/object/deepFillIn';
import * as combine from 'mout/array/combine';
import transformTranslate from '@turf/transform-translate';
import bearing from '@turf/bearing';
import distance from '@turf/distance';
import { getCoords } from '@turf/invariant';
import { point, lineString } from '@turf/helpers';

import { WeatherService } from './weather/weather.service';
import { Graph, Node, Edge, Tag, OdPair, LinkFlow } from './graph';
import { round } from '../utils';
import { environment } from '../../environments/environment';
import { appConfig } from '../app-config';
import { uiConfig } from '../ui/ui-config';

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

    /**
     * The O/D pairs.
     */
    private odPairs: OdPair[] = [];

    private edgeId: number = 0;

    constructor(private http: HttpClient, private weather: WeatherService) { }

    public reset(): void {
        this.graph = null;
        this.bounds = null;
        this.time = null;
        this.odPairs = [];
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
        const query = this.buildQuery();
        const body = this.buildBody(query);

        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getNetwork'))
        );
    }

    /**
     * With the data obtained from the Interpreter resource instantiates the Graph class
     * and the associated classes Node and Edge that model the network graph.
     * @param data Overpass API response
     */
    public createGraph(data: any): Observable<any> {
        try {
            this.graph = new Graph();

            // Gets the list of elements.
            const elements: any[] = data.elements;
            // Checks empty list.
            if (elements.length == 0) { return throwError('createGraph'); }

            // Creates a degree list of nodes:
            // a Map object that holds nodeId-degree as key-value pairs.
            const nodesDegrees: Map<number, number> = new Map();
            // Gets the list of ways.
            let ways = this.extractWays(elements);
            ways = this.reverseNoForward(ways);
            // Merges continuous ways.
            ways = this.mergeWays(ways, elements);
            // Gets the list of nodes.
            const nodes = this.extractNodes(elements);

            // Creation of the graph algorithm.
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
                    // Reverses the order of filtered way nodes.
                    this.splitWay(filteredWayNodes.reverse(), nodes, way);
                }
            }
        } catch (error) {
            return throwError('createGraph');
        }

        // Sets O/D nodes.
        this.setOdNodes();

        return of(null);
    }

    /**
     * Calls the networkData cloud function,
     * that reiterates the invocation of the Directions API to obtain links network data.
     */
    public getNetworkData(): Observable<any> {
        const url: string = environment.functions.networkData.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
        const ways = this.getWays();
        const mode = 'driving';
        const body = JSON.stringify({
            ways: ways,
            mode: mode
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
        for (let i = 0; i < edges.length; i++) {
            edges[i].distance = data[i].distance;
            edges[i].duration = data[i].duration;

            // Decodes polyline paths.
            if (data[i].polylines && data[i].polylines.length > 0) {
                const path = this.decodePolyline(data[i].polylines);
                // Updates drawing options.
                this.drawEdge(edges[i], path);
            }
        }
        return of(null);
    }

    /**
     * Corrects the graph data.
     */
    public correctGraph(): Observable<any> {
        try {
            const edges = this.graph.getEdges();

            for (const edge of edges) {
                if (!edge.distance || !edge.drawingOptions.polyline) {
                    // Assigns geodesic distance.
                    edge.distance = this.calcGeodesicDistance(edge);
                    edge.duration = 0;
                    // Updates drawing options.
                    if (!environment.testing) {
                        const path = [
                            new google.maps.LatLng(edge.origin.lat, edge.origin.lon),
                            new google.maps.LatLng(edge.destination.lat, edge.destination.lon)
                        ];
                        this.drawEdge(edge, path);
                    }
                }
            }
        } catch (error) {
            return throwError('correctGraph');
        }
        return of(null);
    }

    /**
     * Calls the trafficData cloud function,
     * that reiterates the invocation of the Directions API to obtain links traffic data.
     */
    public getTrafficData(): Observable<any> {
        const url: string = environment.functions.trafficData.url;
        const headers: HttpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });
        const edges = this.graph.getPathsEdges();
        const filteredEdges = edges
            .filter((edge: Edge) => edge.distance > uiConfig.minDistance && edge.duration > uiConfig.minDuration);

        const data = filteredEdges.map((v: Edge, i: number, arr: Edge[]) => {
            return {
                edgeId: v.edgeId,
                origin: { lat: v.origin.lat, lon: v.origin.lon },
                destination: { lat: v.destination.lat, lon: v.destination.lon },
                durationInTraffic: null
            };
        });
        const mode = 'driving';
        const body = JSON.stringify({
            edges: data,
            time: this.time,
            mode: mode
        });

        // To trafficData function.
        return this.http.post(url, body, { headers: headers }).pipe(
            map((response: any) => response),
            catchError((error: any) => throwError('getTrafficData'))
        );
    }

    /**
     * Calculates link flow of paths.
     * @param data Traffic data
     */
    public calcLinkFlows(data: any[]): Observable<any> {
        const edges = this.graph.getPathsEdges();
        // Assigns traffic data.
        for (const edge of edges) {
            for (const value of data) {
                if (value.edgeId == edge.edgeId) {
                    edge.durationInTraffic = value.durationInTraffic || 0;
                    break;
                }
            }
            // Calculates link flow.
            edge.calcLinkFlow();
        }
        return of(null);
    }

    /**
     * Returns the value of the link flow and the corresponding variance of the paths.
     */
    public getLinkFlows(): LinkFlow[] {
        const edges = this.graph.getPathsEdges();
        return edges.map((edge: Edge) => {
            return { value: edge.linkFlow, variance: edge.getVariance() };
        });
    }

    /**
     * Gets the routes assignment matrix.
     */
    public getAssignmentMatrix(): number[][][] {
        return this.graph.getAssignmentMatrix();
    }

    public getOdPairs(): OdPair[] {
        return this.odPairs;
    }

    public setOdPairs(odPairs: OdPair[]): void {
        this.odPairs = odPairs;
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
        if (ways.length > 1) {
            let i = 0;
            do {
                const wayName: string = ways[i]['tags']['name'];
                const wayOneway: string = ways[i]['tags']['oneway'];
                const wayNodes: number[] = ways[i]['nodes'];
                let n = i + 1;
                let inverse = false;
                do {
                    const nextWayName: string = ways[n]['tags']['name'];
                    const nextWayOneway: string = ways[n]['tags']['oneway'];
                    const nextWayNodes: number[] = ways[n]['nodes'];
                    // Checks that they have the same name and direction.
                    if (wayName === nextWayName && wayOneway === nextWayOneway) {
                        // Checks the first and last node.
                        if (wayNodes[wayNodes.length - 1] == nextWayNodes[0]) {
                            this.fillWays(ways[i], ways[n]);
                            ways.splice(n, 1);
                            n = i + 1;
                        } else if (wayNodes[0] == nextWayNodes[nextWayNodes.length - 1]) {
                            this.fillWays(ways[n], ways[i]);
                            ways.splice(i, 1);
                            n = ways.length;
                            inverse = true;
                        } else {
                            n++;
                        }
                    } else {
                        n++;
                    }
                } while (n < ways.length);
                if (inverse) {
                    i = 0;
                    inverse = false;
                } else {
                    i++;
                }
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
            const edge = new Edge(this.edgeId++);
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
            // Adds edge.
            this.graph.addEdge(edge);
        }
    }

    private extractTags(tags: any): Tag[] {
        return tags ? Object.keys(tags).map((key: string) => {
            return { key: key, value: tags[key] as string };
        }) : [];
    }

    private setOdNodes(): void {
        const nodes = this.graph.getNodes();
        let count = 1;
        for (const node of nodes) {
            // Only nodes at the end of the ways.
            if (node.incomingEdges.length + node.outgoingEdges.length <= 2) {
                node.label = 'N' + count++;
                if (!environment.testing) {
                    node.drawingOptions.marker = new google.maps.Marker({
                        position: { lat: node.lat, lng: node.lon },
                        icon: { url: '../../assets/images/twotone-add_location-24px.svg', scaledSize: new google.maps.Size(21, 30) },
                        title: 'Node: ' + node.label
                    });
                }
            }
        }
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

    private calcGeodesicDistance(edge: Edge): number {
        const origin = point([edge.origin.lon, edge.origin.lat]);
        const destination = point([edge.destination.lon, edge.destination.lat]);
        const geodesicDistance = round(distance(origin, destination) * 1000);
        return geodesicDistance;
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
            const lineSymbol = {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 2
            };
            const icons = edge.distance > uiConfig.minDistance ? [{
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

            edge.drawingOptions.path = path;
            edge.drawingOptions.polyline = new google.maps.Polyline({
                path: path,
                icons: icons,
                strokeColor: uiConfig.links.baseColor,
                strokeOpacity: 1,
                strokeWeight: 3,
                zIndex: 5
            });
            edge.drawingOptions.marker = new google.maps.Marker({
                position: path[Math.round(path.length / 2)],
                icon: { url: '../../assets/images/twotone-info-24px.svg', scaledSize: new google.maps.Size(24, 24) },
                visible: false
            });
            edge.drawingOptions.infowindow = new google.maps.InfoWindow({
                content: ''
            });
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
     * Converts a list of LatLng to a GeoJSON LineString.
     * @param path Array of google.maps.LatLng
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
