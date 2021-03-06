import { Observable, Observer } from "rxjs";

/**
 * Makes the request to Google Maps Directions API to retrieve traffic information.
 */
export function trafficDirections(edge: any, time: Date, mode: string, googleMapsClient: any): Observable<any> {
    return Observable.create((observer: Observer<any>) => {
        googleMapsClient.directions(buildRequest(edge, time, mode))
            .asPromise()
            .then((response) => {
                // For routes that contain no waypoints, the route will consist of a single leg.
                if (response.json && response.json.routes[0] && response.json.routes[0].legs[0]) {
                    const leg = response.json.routes[0].legs[0];
                    // Traffic information.
                    edge.durationInTraffic = leg.duration_in_traffic ? leg.duration_in_traffic.value : null;
                    observer.next(edge);
                    observer.complete();
                } else {
                    observer.next(edge);
                    observer.complete();
                }
            })
            .catch((error) => {
                observer.error(error);
            });
    });
}

/**
 * Builds a Directions Request object.
 * @param edge The current edge
 * @param time Time of departure
 * @param mode Mode of transport
 */
export function buildRequest(edge: any, time: Date, mode: string): any {
    return {
        origin: { lat: edge.origin.lat, lng: edge.origin.lon },
        destination: { lat: edge.destination.lat, lng: edge.destination.lon },
        mode: mode,
        departure_time: time || new Date(Date.now()),
        traffic_model: 'pessimistic',
        units: 'metric'
    };
}
