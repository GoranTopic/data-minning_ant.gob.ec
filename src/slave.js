import scap_cedula from './scripts/scrap_cedula.js';
import slavery from 'slavery-js';

slavery({
    host: 'localhost', // '192.168.50.239',
    port : 3005,
    numberOfSlaves: 1,
}).slave( async ({ proxy, cedula }, slave ) => {
    console.log(`scrapping cedula ${cedula} with proxy ${proxy}`);
    // scrap cedula
    let data = await scap_cedula(cedula, { proxy: null })
    // return cedula
    return { cedula, data };
})

