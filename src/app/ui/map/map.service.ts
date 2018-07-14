import { Injectable, NgZone, EventEmitter, Output } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import area from '@turf/area';
import { point, polygon } from '@turf/helpers';

import { NetworkService } from '../../network/network.service';
import { uiConfig } from '../ui-config';
import { Edge, Node } from '../../network/graph';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    @Output() public resetMap: EventEmitter<any> = new EventEmitter<any>();

    private map: google.maps.Map;

    private rectangle: google.maps.Rectangle;

    private infoWindow: google.maps.InfoWindow;

    private area = new BehaviorSubject<number | null>(null);

    constructor(
        private zone: NgZone,
        private network: NetworkService
    ) { }

    reset(): void {
        this.resetMap.emit(null);
        this.rectangle.setMap(null);
        this.infoWindow.close();
        this.area.next(null);
        const graph = this.network.getGraph();
        if (graph) {
            const edges = graph.getEdges();
            const nodes = graph.getNodes();
            for (const edge of edges) {
                edge.drawingOptions.polyline.setMap(null);
            }
            for (const node of nodes) {
                node.drawingOptions.marker.setMap(null);
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

    public buildBounds(center: google.maps.LatLngLiteral): google.maps.LatLngBoundsLiteral {
        return {
            north: center.lat + 0.0012,
            south: center.lat - 0.0012,
            east: center.lng + 0.003,
            west: center.lng - 0.003
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
        this.infoWindow = new google.maps.InfoWindow();
    }

    public removeRect(): void {
        this.rectangle.setMap(null);
        this.infoWindow.close();
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
            this.showNode(node);
        }
    }

    private drawBaseEdge(edge: Edge): void {
        edge.drawingOptions.polyline.setMap(this.map);
    }

    private showNode(node: Node): void {
        node.drawingOptions.marker = new google.maps.Marker({
            position: { lat: node.lat, lng: node.lon },
            icon: '../../assets/images/add_location.png',
            title: 'Node: ' + node.label,
            map: this.map
        });
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
            this.setInfoWindow(content, ne);

            // Sends the area to subscribers.
            this.area.next(a);
        });
    }

    /**
     * Sets the info window's content and position.
     * @param content Window's content
     * @param position LatLng
     */
    private setInfoWindow(content: string, position: google.maps.LatLng): void {
        this.infoWindow.setContent(content);
        this.infoWindow.setPosition(position);

        this.infoWindow.open(this.map);
    }

    /**
     * Calculates the area in hectares.
     * @param ne north-est coordinates
     * @param sw south-west coordinates
     */
    private calcArea(ne: google.maps.LatLng, sw: google.maps.LatLng): number {
        const p = polygon([[
            [ne.lat(), ne.lng()], [sw.lat(), ne.lng()], [sw.lat(), sw.lng()], [ne.lat(), sw.lng()], [ne.lat(), ne.lng()]
        ]]);
        let a = area(p) / 10000;
        a = Math.round(a * 10) / 10;
        return a;
    }

}
