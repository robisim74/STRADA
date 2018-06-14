import { Injectable } from '@angular/core';

import area from '@turf/area';
import { point, polygon } from '@turf/helpers';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    private map: google.maps.Map;

    private rectangle: google.maps.Rectangle;

    private infoWindow: google.maps.InfoWindow;

    /**
     * Creates a new map inside of the given HTML container.
     *
     * @param el DIV element
     * @param mapOptions MapOptions object specification
     */
    public initMap(el: HTMLElement, mapOptions: any): void {
        this.map = new google.maps.Map(el, mapOptions);

        this.resize();
        // Adds event listener resize when the window changes size.
        google.maps.event.addDomListener(window, "resize", () => this.resize());
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
            google.maps.event.trigger(this.map, "resize");
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

    private checkRect(): void {
        const ne: google.maps.LatLng = this.rectangle.getBounds().getNorthEast();
        const sw: google.maps.LatLng = this.rectangle.getBounds().getSouthWest();

        // Calculates the area in hectares.
        const p = polygon([[
            [ne.lat(), ne.lng()], [sw.lat(), ne.lng()], [sw.lat(), sw.lng()], [ne.lat(), sw.lng()], [ne.lat(), ne.lng()]
        ]]);
        let a = area(p) / 10000;
        a = Math.round(a * 10) / 10;

        // TODO Check limit

        const contentString = '<b>Area</b><br>' +
            a + ' ha';

        // Sets the info window's content and position.
        this.infoWindow.setContent(contentString);
        this.infoWindow.setPosition(ne);

        this.infoWindow.open(this.map);
    }

}
