import * as functions from 'firebase-functions';
import * as _cors from 'cors';

import { trafficDataFunction } from './traffic-data.function';
import { networkDataFunction } from './network-data.function';

// CORS configuration.
const whitelist: string[] = [
    'http://localhost:4200'
];
const options: _cors.CorsOptions = {
    origin: whitelist
};
const cors = _cors;

/**
 * Get network data.
 */
export const networkData = functions.https.onRequest((request, response) => {
    cors(options)(request, response, () => networkDataFunction(request, response));
});

/**
 * Get traffic data.
 */
export const trafficData = functions.https.onRequest((request, response) => {
    cors(options)(request, response, () => trafficDataFunction(request, response));
});
