import { Observable, Observer } from "rxjs";

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
    console.log(waypoints)
    return {
        origin: way[0],
        destination: way[way.length - 1],
        mode: 'driving',
        units: 'metric',
        waypoints: waypoints
    };
}
