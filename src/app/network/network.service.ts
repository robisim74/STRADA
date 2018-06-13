import { Injectable } from '@angular/core';

/**
 * Creates and develops the graph of the transport network in the selected area.
 */
@Injectable() export class NetworkService {

    /**
     * Rectangle in geographical coordinates of the area.
     */
    private bounds: google.maps.LatLngBounds;

    /**
     * Time of the simulation.
     */
    private time: Date;

    public setBounds(bounds: google.maps.LatLngBounds): void {
        this.bounds = bounds;
    }

    public getTime(): Date {
        return this.time;
    }

    public setTime(time: Date): void {
        this.time = time;
    }

}
