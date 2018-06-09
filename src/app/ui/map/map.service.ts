import { Injectable } from '@angular/core';

/**
 * Instances the map.
 */
@Injectable() export class MapService {

    private map: google.maps.Map;

    private markers: google.maps.Marker[] = [];

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

    public setCenter(latLng: google.maps.LatLng): void {
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

}
