import * as config from '../../config.json';

export const environment = {
    production: true,
    functions: {
        trafficData: {
            url: 'https://us-central1-' + (<any>config).firebase.projectId + '.cloudfunctions.net/trafficData'
        }
    }
};
