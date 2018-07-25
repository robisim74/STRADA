import { Injectable, NgZone, EventEmitter, Output } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import area from '@turf/area';
import centroid from '@turf/centroid';
import center from '@turf/center';
import { polygon, point, featureCollection } from '@turf/helpers';
import { getCoord } from '@turf/invariant';

import { NetworkService } from '../../network/network.service';
import { uiConfig } from '../ui-config';
import { Edge, Node, OdPair, OdPairShowing } from '../../network/graph';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    @Output() public mapReset: EventEmitter<any> = new EventEmitter<any>();

    @Output() public nodeSelected: EventEmitter<Node> = new EventEmitter<Node>();

    private map: google.maps.Map;

    private rectangle: google.maps.Rectangle;

    private rectangleInfoWindow: google.maps.InfoWindow;

    private area = new BehaviorSubject<number | null>(null);

    private paths: google.maps.Polyline[][] = [];

    /**
     * Centroid of the graph.
     */
    private centroid: google.maps.LatLngLiteral;

    constructor(
        private zone: NgZone,
        private network: NetworkService
    ) { }

    public reset(): void {
        this.mapReset.emit(null);
        if (this.rectangle) { this.rectangle.setMap(null); }
        if (this.rectangleInfoWindow) { this.rectangleInfoWindow.close(); }
        this.area.next(null);

        // Markers and Polylines.
        const graph = this.network.getGraph();
        if (graph) {
            const edges = graph.getEdges();
            const nodes = graph.getNodes();
            for (const edge of edges) {
                if (edge.drawingOptions.polyline) { edge.drawingOptions.polyline.setMap(null); }
            }
            for (const node of nodes) {
                if (node.drawingOptions.marker) { node.drawingOptions.marker.setMap(null); }
            }
        }
        for (let z = 0; z < this.paths.length; z++) {
            for (let n = 0; n < this.paths[z].length; n++) {
                const polyline = this.paths[z][n];
                polyline.setMap(null);
            }
        }
    }

    /**
     * Creates a new map inside of the given HTML container.
     * @param el DIV element
     * @param mapOptions MapOptions object specification
     */
    public initMap(el: HTMLElement, mapOptions: any): void {
        this.map = new google.maps.Map(el, mapOptions);

        this.resize();
        // Adds event listener resize when the window changes size.
        google.maps.event.addDomListener(window, 'resize', () => this.resize());
    }

    public setCenter(latLng: google.maps.LatLngLiteral): void {
        if (this.map != null && latLng != null) {
            // Changes the center of the map to the given LatLng.
            this.map.panTo(latLng);
        }
    }

    public setZoom(zoom: number): void {
        if (this.map != null) {
            this.map.setZoom(zoom);
        }
    }

    public resize(): void {
        // Saves the center.
        const latLng: google.maps.LatLng = this.map.getCenter();
        // Triggers resize event.
        setTimeout(() => {
            google.maps.event.trigger(this.map, 'resize');
            // Restores the center.
            this.map.setCenter(latLng);
        });
    }

    public buildBounds(centerMap: google.maps.LatLngLiteral): google.maps.LatLngBoundsLiteral {
        return {
            north: centerMap.lat + 0.0012,
            south: centerMap.lat - 0.0012,
            east: centerMap.lng + 0.003,
            west: centerMap.lng - 0.003
        };
    }

    public showRect(bounds: google.maps.LatLngBoundsLiteral) {
        // Defines the rectangle and set its editable property to true.
        this.rectangle = new google.maps.Rectangle({
            bounds: bounds,
            editable: true,
            draggable: true
        });
        this.rectangle.setMap(this.map);

        // Adds an event listener on the rectangle.
        this.rectangle.addListener('bounds_changed', () => this.checkRect());

        // Defines an info window on the map.
        this.rectangleInfoWindow = new google.maps.InfoWindow();
    }

    public removeRect(): void {
        this.rectangle.setMap(null);
        this.rectangleInfoWindow.close();
    }

    public getArea(): Observable<number> {
        return this.area.asObservable();
    }

    public getBounds(): google.maps.LatLngBoundsLiteral {
        const bounds: google.maps.LatLngBounds = this.rectangle.getBounds();
        return {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng()
        };
    }

    /**
     * Draws the graph on the map.
     */
    public drawGraph(): void {
        const graph = this.network.getGraph();
        const edges = graph.getEdges();
        const nodes = graph.getNodes();
        for (const edge of edges) {
            this.drawBaseEdge(edge);
        }
        for (const node of nodes) {
            // Shows only O/D nodes.
            if (node.label) {
                this.showNode(node);
            }
        }
    }

    public getCentroid(): google.maps.LatLngLiteral {
        return this.centroid;
    }

    public setCentroid(odNodes: Node[]): void {
        if (odNodes.length > 0) {
            const positions = odNodes.map((node: Node) => {
                return [node.lon, node.lat];
            });
            let geojsonCentroid: any;
            if (positions.length >= 3) {
                // First and last position must be equivalent.
                positions.push([odNodes[0].lon, odNodes[0].lat]);
                const poly = polygon([positions]);
                geojsonCentroid = centroid(poly);
            } else {
                const points = positions.map((value: number[]) => {
                    return point(value);
                });
                const collection = featureCollection(points);
                geojsonCentroid = center(collection);
            }
            const coord = getCoord(geojsonCentroid);
            this.centroid = { lat: coord[1], lng: coord[0] };
        } else {
            this.centroid = null;
        }
    }

    /**
     * Updates nodes of O/D pairs.
     * @param odPairs The O/D pairs
     */
    public updateOdNodes(odPairs: OdPair[]): void {
        const graph = this.network.getGraph();
        const odNodes = graph.getOdNodes();
        for (const node of odNodes) {
            if (odPairs.find(pair => pair.origin == node.label) ||
                odPairs.find(pair => pair.destination && pair.destination == node.label)
            ) {
                this.selectNode(node);
            } else {
                this.deselectNode(node);
            }
        }
    }

    /**
     * Builds the polyline for each shortest path.
     * @param paths Shortest paths
     */
    public buildPaths(paths: Edge[][][]): void {
        for (let z = 0; z < paths.length; z++) {
            this.paths[z] = [];

            for (let n = 0; n < paths[z].length; n++) {
                let path: google.maps.LatLng[] = [];
                let distance = 0;
                let duration = 0;
                for (let m = 0; m < paths[z][n].length; m++) {
                    const edge = paths[z][n][m];
                    path = path.concat(edge.drawingOptions.path);
                    distance += edge.distance;
                    duration += edge.duration;
                }
                const polyline = new google.maps.Polyline(
                    {
                        path: path,
                        strokeColor: uiConfig.paths.colors[n],
                        strokeOpacity: 1,
                        strokeWeight: 3,
                        zIndex: 10 - n
                    });
                this.paths[z][n] = polyline;
            }
        }
    }

    /**
     * Updates shortest paths of O/D pairs.
     * @param odPairs The O/D pairs
     */
    public updateOdPaths(odPairs: OdPairShowing[]): void {
        for (let i = 0; i < odPairs.length; i++) {
            if (this.paths[i].length > 0) {
                for (let n = 0; n < this.paths[i].length; n++) {
                    const polyline = this.paths[i][n];
                    if (odPairs[i].showPaths) {
                        polyline.setMap(this.map);
                    } else {
                        polyline.setMap(null);
                    }
                }
            }
        }
    }

    private drawBaseEdge(edge: Edge): void {
        if (edge.drawingOptions.polyline) {
            edge.drawingOptions.polyline.setMap(this.map);
        }
    }

    private showNode(node: Node): void {
        node.drawingOptions.marker = new google.maps.Marker({
            position: { lat: node.lat, lng: node.lon },
            icon: '../../assets/images/add_location.png',
            title: 'Node: ' + node.label,
            map: this.map
        });
        // Adds listener.
        node.drawingOptions.marker.addListener('click', () => this.sendNodeEvent(node));
    }

    /**
     * Sends an event with the selected node.
     * @param node Selected node
     */
    private sendNodeEvent(node: Node): void {
        this.nodeSelected.emit(node);
    }

    private selectNode(node: Node): void {
        node.drawingOptions.marker.setIcon('../../assets/images/place.png');
    }

    private deselectNode(node: Node): void {
        node.drawingOptions.marker.setIcon('../../assets/images/add_location.png');
    }

    private checkRect(): void {
        // The event of Google maps runs outside Angular zone.
        this.zone.run(() => {
            const ne: google.maps.LatLng = this.rectangle.getBounds().getNorthEast();
            const sw: google.maps.LatLng = this.rectangle.getBounds().getSouthWest();

            // Area.
            const a: number = this.calcArea(ne, sw);

            // Info window.
            const content: string = '<b>Area</b><br>' +
                a + ' ha';
            this.setRectangleInfoWindow(content, ne);

            // Sends the area to subscribers.
            this.area.next(a);
        });
    }

    /**
     * Sets the rectangle info window's content and position.
     * @param content Window's content
     * @param position LatLng
     */
    private setRectangleInfoWindow(content: string, position: google.maps.LatLng): void {
        this.rectangleInfoWindow.setContent(content);
        this.rectangleInfoWindow.setPosition(position);

        this.rectangleInfoWindow.open(this.map);
    }

    /**
     * Calculates the area in hectares.
     * @param ne north-est coordinates
     * @param sw south-west coordinates
     */
    private calcArea(ne: google.maps.LatLng, sw: google.maps.LatLng): number {
        const p = polygon([[
            [ne.lng(), ne.lat()], [sw.lng(), ne.lat()], [sw.lng(), sw.lat()], [ne.lng(), sw.lat()], [ne.lng(), ne.lat()]
        ]]);
        let a = area(p) / 10000;
        a = Math.round(a * 10) / 10;
        return a;
    }

}
