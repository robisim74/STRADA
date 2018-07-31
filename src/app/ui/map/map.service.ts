import { Injectable, NgZone } from '@angular/core';
import { Observable, of } from 'rxjs';

import area from '@turf/area';
import centroid from '@turf/centroid';
import center from '@turf/center';
import { polygon, point, featureCollection } from '@turf/helpers';
import { getCoord } from '@turf/invariant';

import { WizardService } from '../wizard/wizard.service';
import { NetworkService } from '../../network/network.service';
import { Edge, Node, OdPair } from '../../network/graph';
import { round } from '../utils';
import { uiConfig } from '../ui-config';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    private map: google.maps.Map;

    private rectangle: google.maps.Rectangle;

    private rectangleInfoWindow: google.maps.InfoWindow;

    /**
     * Shortest paths polylines.
     */
    private paths: google.maps.Polyline[][] = [];

    /**
     * Centroid of the graph.
     */
    private centroid: google.maps.LatLngLiteral;

    constructor(
        private zone: NgZone,
        private wizard: WizardService,
        private network: NetworkService
    ) { }

    public reset(): void {
        this.hideGraph();
        this.hidePaths();
        this.hideRect();
        this.paths = [];
        this.centroid = null;
    }

    /**
     * Update the map after obtaining network data.
     */
    public updateMap(): Observable<any> {
        // Shows graph.
        this.showGraph();
        // Sets centroid.
        this.setCentroid();
        // Sets map.
        this.setCenter(this.getCentroid());
        this.setZoom(17);
        return of(null);
    }

    /**
     * Draws the polyline for each shortest path.
     */
    public drawPaths(): Observable<any> {
        const lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2
        };
        const icons = [{
            icon: lineSymbol,
            offset: '100%'
        }];
        const graph = this.network.getGraph();
        const paths = graph.getShortestPaths();
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
                        icons: icons,
                        strokeColor: uiConfig.paths.colors[n],
                        strokeOpacity: 1,
                        strokeWeight: 3,
                        zIndex: 10 - n
                    });
                this.paths[z][n] = polyline;
            }
        }
        return of(null);
    }

    /**
     * Creates a new map inside of the given HTML container.
     * @param el DIV element
     * @param mapOptions MapOptions object specification
     */
    public initMap(el: HTMLElement, mapOptions: any): void {
        this.map = new google.maps.Map(el, mapOptions);
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

    public buildBounds(centerMap: google.maps.LatLngLiteral): google.maps.LatLngBoundsLiteral {
        return {
            north: centerMap.lat + 0.0012,
            south: centerMap.lat - 0.0012,
            east: centerMap.lng + 0.003,
            west: centerMap.lng - 0.003
        };
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

    public hideRect(): void {
        if (this.rectangle) {
            this.rectangle.setMap(null);
            this.rectangleInfoWindow.close();
            this.rectangle = null;
            this.rectangleInfoWindow = null;
        }
    }

    public getCentroid(): google.maps.LatLngLiteral {
        return this.centroid;
    }

    public setCentroid(): void {
        const graph = this.network.getGraph();
        const odNodes = graph.getOdNodes();
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
     * Shows the graph on the map.
     */
    public showGraph(): void {
        const graph = this.network.getGraph();
        const edges = graph.getEdges();
        const nodes = graph.getNodes();
        for (const edge of edges) {
            this.showEdge(edge);
        }
        for (const node of nodes) {
            // Shows only O/D nodes.
            if (node.label) {
                this.showNode(node);
            }
        }
    }

    public hideGraph(): void {
        const graph = this.network.getGraph();
        if (graph) {
            const edges = graph.getEdges();
            for (const edge of edges) {
                if (edge.drawingOptions.polyline) { edge.drawingOptions.polyline.setMap(null); }
            }
            this.hideNodes();
        }
    }

    /**
     * Shows/hides nodes of O/D pairs.
     * @param odPairs The O/D pairs
     */
    public showNodes(odPairs: OdPair[]): void {
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

    public hideNodes(): void {
        const graph = this.network.getGraph();
        if (graph) {
            const nodes = graph.getNodes();
            for (const node of nodes) {
                if (node.drawingOptions.marker) { node.drawingOptions.marker.setMap(null); }
            }
        }
    }

    public clearNodesActions(): void {
        const graph = this.network.getGraph();
        if (graph) {
            const nodes = graph.getNodes();
            for (const node of nodes) {
                if (node.drawingOptions.marker) { google.maps.event.clearInstanceListeners(node.drawingOptions.marker); }
            }
        }
    }

    /**
     * Shows/hides the paths of O/D pairs.
     * @param odPairs The O/D pairs
     */
    public showPaths(odPairs: any[]): void {
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

    public hidePaths(): void {
        for (let z = 0; z < this.paths.length; z++) {
            for (let n = 0; n < this.paths[z].length; n++) {
                const polyline = this.paths[z][n];
                polyline.setMap(null);
            }
        }
    }

    private showEdge(edge: Edge): void {
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
        node.drawingOptions.marker.addListener('click', () =>
            // Updates map state.
            this.wizard.updateMap({ selectedNode: node })
        );
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

            // Checks area limits.
            if (a >= uiConfig.areaMinLimit && a <= uiConfig.areaMaxLimit) {
                // Updates map state.
                this.wizard.updateMap({ bounds: this.getBounds() });
            } else {
                this.wizard.putInError(`The area must be between ${uiConfig.areaMinLimit} and ${uiConfig.areaMaxLimit} hectares`);
                this.wizard.updateMap({ bounds: null });
            }
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
        a = round(a, 1);
        return a;
    }

}
