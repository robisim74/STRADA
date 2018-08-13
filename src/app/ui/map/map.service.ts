import { Injectable, NgZone } from '@angular/core';

import { Store } from '@ngrx/store';
import area from '@turf/area';
import centroid from '@turf/centroid';
import center from '@turf/center';
import { polygon, point, featureCollection } from '@turf/helpers';
import { getCoord } from '@turf/invariant';

import { NetworkService } from '../../network/network.service';
import { Edge, Node, OdPair } from '../../network/graph';
import * as fromUi from '../models/reducers';
import { MapActionTypes } from '../models/actions/map.actions';
import { WizardActionTypes } from '../models/actions/wizard.actions';
import { round } from '../../utils';
import { uiConfig } from '../ui-config';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    private map: google.maps.Map;

    private rectangle: google.maps.Rectangle;

    private rectangleInfoWindow: google.maps.InfoWindow;

    /**
     * Centroid of the graph.
     */
    private centroid: google.maps.LatLngLiteral;

    constructor(
        private zone: NgZone,
        private store: Store<fromUi.UiState>,
        private network: NetworkService
    ) { }

    public reset(): void {
        this.hideRect();
        this.hideGraph();
        this.hidePaths();
        this.centroid = null;
        // UI state.
        this.store.dispatch({
            type: MapActionTypes.Reset
        });
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

    public showRect(bounds: google.maps.LatLngBoundsLiteral): void {
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

    /**
     * Shows the graph on the map.
     */
    public showGraph(): void {
        const graph = this.network.getGraph();
        const edges = graph.getEdges();
        const nodes = graph.getOdNodes();
        for (const edge of edges) {
            this.showEdge(edge);
        }
        for (const node of nodes) {
            this.showNode(node);
        }
    }

    public hideGraph(): void {
        const graph = this.network.getGraph();
        if (graph) {
            const edges = graph.getEdges();
            for (const edge of edges) {
                if (edge.drawingOptions.polyline) {
                    edge.drawingOptions.polyline.setMap(null);
                    edge.drawingOptions.marker.setMap(null);
                }
            }
            const nodes = graph.getOdNodes();
            for (const node of nodes) {
                if (node.drawingOptions.marker) { node.drawingOptions.marker.setMap(null); }
            }
        }
        google.maps.event.clearListeners(this.map, 'click');
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
     * Shows/hides the nodes of O/D pairs.
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

    public clearNodesActions(): void {
        const graph = this.network.getGraph();
        if (graph) {
            const nodes = graph.getOdNodes();
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
        const graph = this.network.getGraph();
        const polylines = graph.getPolylines();
        for (let i = 0; i < odPairs.length; i++) {
            if (polylines[i].length > 0) {
                for (let n = 0; n < polylines[i].length; n++) {
                    const polyline = polylines[i][n];
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
        const graph = this.network.getGraph();
        if (graph) {
            const polylines = graph.getPolylines();
            for (let z = 0; z < polylines.length; z++) {
                for (let n = 0; n < polylines[z].length; n++) {
                    const polyline = polylines[z][n];
                    polyline.setMap(null);
                }
            }
        }
    }

    private checkRect(): void {
        // The event of Google maps runs outside Angular zone.
        this.zone.run(() => {
            const ne: google.maps.LatLng = this.rectangle.getBounds().getNorthEast();
            const sw: google.maps.LatLng = this.rectangle.getBounds().getSouthWest();

            // Area.
            const a = this.calcArea(ne, sw);

            // Info window.
            const content = '<b>Area</b><br>' +
                a + ' ha';
            this.setRectangleInfoWindow(content, ne);

            // Checks area limits.
            if (a >= uiConfig.areaMinLimit && a <= uiConfig.areaMaxLimit) {
                // Updates map state.
                this.store.dispatch({
                    type: MapActionTypes.MapChanged,
                    payload: { map: { data: { bounds: this.getBounds() } } }
                });
                this.store.dispatch({
                    type: WizardActionTypes.StepError,
                    payload: null
                });
            } else {
                this.store.dispatch({
                    type: WizardActionTypes.StepError,
                    payload: `The area must be between ${uiConfig.areaMinLimit} and ${uiConfig.areaMaxLimit} hectares`
                });
                this.store.dispatch({
                    type: MapActionTypes.MapChanged,
                    payload: { map: { data: { bounds: null } } }
                });
            }
        });
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

    private getBounds(): google.maps.LatLngBoundsLiteral {
        const bounds: google.maps.LatLngBounds = this.rectangle.getBounds();
        return {
            north: bounds.getNorthEast().lat(),
            south: bounds.getSouthWest().lat(),
            east: bounds.getNorthEast().lng(),
            west: bounds.getSouthWest().lng()
        };
    }

    private showEdge(edge: Edge): void {
        if (edge.drawingOptions.polyline) {
            edge.drawingOptions.polyline.setMap(this.map);
            edge.drawingOptions.marker.setMap(this.map);
            edge.drawingOptions.marker.addListener('click', () => {
                edge.drawingOptions.infowindow.open(this.map, edge.drawingOptions.marker);
            });
        }
    }

    private showNode(node: Node): void {
        node.drawingOptions.marker.setMap(this.map);
        // Adds listener.
        node.drawingOptions.marker.addListener('click', () =>
            // Updates map state.
            this.store.dispatch({
                type: MapActionTypes.MapChanged,
                payload: { map: { data: { selectedNode: node } } }
            })
        );
    }

    private selectNode(node: Node): void {
        node.drawingOptions.marker.setIcon({
            url: '../../assets/images/twotone-place-24px.svg',
            scaledSize: new google.maps.Size(21, 30)
        });
    }

    private deselectNode(node: Node): void {
        node.drawingOptions.marker.setIcon({
            url: '../../assets/images/twotone-add_location-24px.svg',
            scaledSize: new google.maps.Size(21, 30)
        });
    }

}
