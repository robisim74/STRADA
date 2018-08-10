import * as functions from 'firebase-functions';
import * as _cors from 'cors';

import { trafficDataFunction } from './traffic-data.function';
import { networkDataFunction } from './network-data.function';
import { functionsConfig } from './functions-config';

// CORS configuration.
const options: _cors.CorsOptions = {
    origin: functionsConfig.whitelist
};
const cors = _cors;

/**
 * Gets network data.
 */
export const networkData = functions.https.onRequest((request, response) => {
    cors(options)(request, response, () => networkDataFunction(request, response));
});

/**
 * Gets traffic data.
 */
export const trafficData = functions.https.onRequest((request, response) => {
    cors(options)(request, response, () => trafficDataFunction(request, response));
});
