import { appConfig } from "../app/app-config";

export const environment = {
    production: true,
    functions: {
        trafficData: {
            url: 'https://us-central1-' + appConfig.firebase.projectId + '.cloudfunctions.net/trafficData'
        }
    }
};
