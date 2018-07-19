import { Observable, Observer } from "rxjs";
import distance from '@turf/distance';
import { point } from '@turf/helpers';

/**
 * Makes the request to Google Maps Directions API
 * to retrieve network data.
 */
export function networkDirections(way: any[], googleMapsClient: any): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
        googleMapsClient.directions(buildRequest(way))
            .asPromise()
            .then((response) => {
                if (response.json && response.json.routes[0] && response.json.routes[0].legs.length > 0) {
                    for (let i = 0; i < response.json.routes[0].legs.length; i++) {
                        const leg = response.json.routes[0].legs[i];
                        // To avoid inconsistencies between data in the OpenStreetMap network and data from Google Maps.
                        if (!isInconsistency(leg)) {
                            // Gets polyline for each step.
                            let polylines = [];
                            for (const step of leg.steps) {
                                polylines = polylines.concat(step.polyline);
                            }
                            observer.next({
                                distance: leg.distance.value,
                                duration: leg.duration.value,
                                polylines: polylines
                            });
                        } else {
                            observer.next({ distance: null, duration: null, polylines: null });
                        }
                    }
                    observer.complete();
                } else {
                    for (let i = 0; i <= way.length - 1; i++) {
                        observer.next({ distance: null, duration: null, polylines: null });
                    }
                    observer.complete();
                }
            })
            .catch((error) => {
                observer.error(error);
            });
    });
}

/**
 * Builds a Directions Request object
 * @param way The current way with waypoints
 */
export function buildRequest(way: any[]): any {
    const waypoints = way.filter((waypoint: any, i: number) => {
        return i != 0 && i != way.length - 1;
    });
    return {
        origin: way[0],
        destination: way[way.length - 1],
        mode: 'driving',
        units: 'metric',
        waypoints: waypoints
    };
}

/**
 * Checks inconsistency in the data.
 * @param leg The current leg in the waypoints
 */
export function isInconsistency(leg: any): boolean {
    // The number of indications is greater than expected.
    if (!leg.steps || leg.steps.length > 3) return true;
    // The distance of the leg is much greater than the geodesic distance.
    const from = point([leg.start_location.lat, leg.start_location.lng]);
    const to = point([leg.end_location.lat, leg.end_location.lng]);
    const geodesicDistance = distance(from, to) * 1000;
    if (geodesicDistance > 0 && leg.distance.value > geodesicDistance * 3) return true;
    return false;
}
